import { Router } from 'express';
import { prisma } from '../db.js';
import {
  HttpError, PRIORITIES, STATUSES, deadlineDate, findTaskFor, fmtDate, idParam,
  logActivity, notify, num, oneOf, str, withOverdue,
} from '../lib.js';
import { employeeOnly, supervisorOnly } from '../middleware/auth.js';

const router = Router();
const person = { select: { id: true, name: true, role: true } };
const taskLink = (id) => `/tasks/${id}`;

// ---------- list / read ----------

router.get('/', async (req, res) => {
  const { status, priority, assigneeId, q } = req.query;
  const where = {};

  if (req.user.role === 'EMPLOYEE') where.assigneeId = req.user.id;
  else if (assigneeId) where.assigneeId = Number(assigneeId) || -1;

  if (status === 'OVERDUE') {
    where.status = { not: 'COMPLETED' };
    where.deadline = { lt: new Date() };
  } else if (status === 'OPEN') {
    where.status = { not: 'COMPLETED' };
  } else if (STATUSES.includes(status)) {
    where.status = status;
  }
  if (PRIORITIES.includes(priority)) where.priority = priority;
  if (q) where.title = { contains: String(q).slice(0, 100), mode: 'insensitive' };

  const tasks = await prisma.task.findMany({
    where,
    include: { assignee: person },
    orderBy: [{ deadline: 'asc' }, { id: 'asc' }],
  });
  res.json(tasks.map(withOverdue));
});

router.get('/:id', async (req, res) => {
  const id = idParam(req.params.id);
  await findTaskFor(req.user, id);

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: person,
      createdBy: person,
      progressUpdates: { include: { user: person }, orderBy: { createdAt: 'desc' } },
      comments: { include: { author: person }, orderBy: { createdAt: 'asc' } },
      activities: { include: { user: person }, orderBy: { createdAt: 'desc' } },
    },
  });
  res.json(withOverdue(task));
});

// ---------- create / edit / delete (supervisor) ----------

async function readTaskBody(body) {
  const data = {
    title: str(body.title, 'Title', { max: 150 }),
    description: str(body.description, 'Description', { max: 5000, optional: true }),
    priority: oneOf(body.priority || 'MEDIUM', PRIORITIES, 'Priority'),
    deadline: deadlineDate(body.deadline),
    assigneeId: num(body.assigneeId, 'Assignee', { integer: true, min: 1 }),
  };
  const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
  if (!assignee || assignee.role !== 'EMPLOYEE') throw new HttpError(400, 'Choose an employee to assign this task to');
  return { data, assignee };
}

router.post('/', supervisorOnly, async (req, res) => {
  const { data, assignee } = await readTaskBody(req.body);

  const task = await prisma.$transaction(async (tx) => {
    const t = await tx.task.create({ data: { ...data, createdById: req.user.id } });
    await logActivity(tx, t.id, req.user.id, `created the task and assigned it to ${assignee.name}`);
    await notify(tx, {
      to: assignee.id, from: req.user.id, link: taskLink(t.id),
      message: `New task assigned: "${t.title}" (due ${fmtDate(t.deadline)})`,
    });
    return t;
  });
  res.status(201).json(task);
});

router.put('/:id', supervisorOnly, async (req, res) => {
  const id = idParam(req.params.id);
  const before = await findTaskFor(req.user, id);
  const { data, assignee } = await readTaskBody(req.body);

  const task = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({ where: { id }, data });
    const changes = [];
    if (fmtDate(before.deadline) !== fmtDate(t.deadline)) {
      changes.push(`changed the deadline from ${fmtDate(before.deadline)} to ${fmtDate(t.deadline)}`);
    }
    if (before.assigneeId !== t.assigneeId) changes.push(`reassigned the task to ${assignee.name}`);
    if (before.priority !== t.priority) changes.push(`changed priority to ${t.priority}`);
    if (before.title !== t.title || before.description !== t.description) changes.push('edited the task details');
    for (const c of changes) await logActivity(tx, id, req.user.id, c);

    if (before.assigneeId !== t.assigneeId) {
      await notify(tx, { to: t.assigneeId, from: req.user.id, link: taskLink(id), message: `New task assigned: "${t.title}"` });
    } else if (changes.length) {
      await notify(tx, { to: t.assigneeId, from: req.user.id, link: taskLink(id), message: `"${t.title}" was updated: ${changes.join(', ')}` });
    }
    return t;
  });
  res.json(task);
});

router.delete('/:id', supervisorOnly, async (req, res) => {
  const id = idParam(req.params.id);
  await findTaskFor(req.user, id);
  await prisma.task.delete({ where: { id } });
  res.json({ ok: true });
});

// ---------- status workflow ----------
// Employees can never mark a task COMPLETED: they submit, the supervisor approves.

const ACTIONS = {
  start: { role: 'EMPLOYEE', from: ['TODO', 'BLOCKED'], to: 'IN_PROGRESS', text: 'started working on the task' },
  submit: { role: 'EMPLOYEE', from: ['IN_PROGRESS'], to: 'SUBMITTED', text: 'submitted the task for review' },
  approve: { role: 'SUPERVISOR', from: ['SUBMITTED'], to: 'COMPLETED', text: 'approved the task' },
  request_changes: { role: 'SUPERVISOR', from: ['SUBMITTED'], to: 'IN_PROGRESS', text: 'requested changes', needsNote: true },
};

router.post('/:id/actions', async (req, res) => {
  const id = idParam(req.params.id);
  const rule = ACTIONS[req.body.action];
  if (!rule) throw new HttpError(400, 'Unknown action');
  if (req.user.role !== rule.role) throw new HttpError(403, 'You do not have permission to do this');

  const task = await findTaskFor(req.user, id);
  if (!rule.from.includes(task.status)) {
    throw new HttpError(409, `This can't be done while the task is ${task.status.replace('_', ' ').toLowerCase()}`);
  }
  const note = rule.needsNote
    ? str(req.body.note, 'A note explaining the changes', { max: 2000 })
    : str(req.body.note, 'Note', { max: 2000, optional: true });

  const updated = await prisma.$transaction(async (tx) => {
    const data = { status: rule.to };
    if (req.body.action === 'submit') Object.assign(data, { progress: 100, changesRequested: false });
    if (req.body.action === 'request_changes') data.changesRequested = true;
    const t = await tx.task.update({ where: { id }, data });

    await logActivity(tx, id, req.user.id, rule.text);
    if (note) await tx.comment.create({ data: { taskId: id, authorId: req.user.id, text: note } });

    const link = taskLink(id);
    if (req.body.action === 'submit') {
      await notify(tx, { to: t.createdById, from: req.user.id, link, message: `${req.user.name} submitted "${t.title}" for review` });
    } else if (req.body.action === 'approve') {
      await notify(tx, { to: t.assigneeId, from: req.user.id, link, message: `"${t.title}" was approved` });
    } else if (req.body.action === 'request_changes') {
      await notify(tx, { to: t.assigneeId, from: req.user.id, link, message: `Changes requested on "${t.title}"` });
    }
    return t;
  });
  res.json(withOverdue(updated));
});

// ---------- progress updates (employee) ----------

router.post('/:id/progress', employeeOnly, async (req, res) => {
  const id = idParam(req.params.id);
  const task = await findTaskFor(req.user, id);
  if (!['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(task.status)) {
    throw new HttpError(409, 'Progress can only be updated on tasks that are still being worked on');
  }

  const percentage = num(req.body.percentage, 'Progress', { min: 0, max: 100, integer: true });
  const note = str(req.body.note, 'Work done', { max: 3000 });
  const hoursSpent = req.body.hoursSpent === '' || req.body.hoursSpent == null
    ? 0
    : num(req.body.hoursSpent, 'Hours spent', { min: 0, max: 24 });

  await prisma.$transaction(async (tx) => {
    await tx.progressUpdate.create({ data: { taskId: id, userId: req.user.id, percentage, note, hoursSpent } });
    const data = { progress: percentage };
    if (task.status === 'TODO') {
      data.status = 'IN_PROGRESS';
      await logActivity(tx, id, req.user.id, 'started working on the task');
    }
    await tx.task.update({ where: { id }, data });
    await logActivity(tx, id, req.user.id, `updated progress to ${percentage}%`);
    await notify(tx, {
      to: task.createdById, from: req.user.id, link: taskLink(id),
      message: `${req.user.name} updated "${task.title}" to ${percentage}%`,
    });
  });
  res.status(201).json({ ok: true });
});

// ---------- comments & problem reports ----------

router.post('/:id/comments', async (req, res) => {
  const id = idParam(req.params.id);
  const task = await findTaskFor(req.user, id);
  const text = str(req.body.text, 'Comment', { max: 3000 });
  const isProblem = req.user.role === 'EMPLOYEE' && Boolean(req.body.isProblem);

  await prisma.$transaction(async (tx) => {
    await tx.comment.create({ data: { taskId: id, authorId: req.user.id, text, isProblem } });
    const link = taskLink(id);

    if (isProblem) {
      // A reported problem blocks the task until the employee resumes it.
      if (['TODO', 'IN_PROGRESS'].includes(task.status)) {
        await tx.task.update({ where: { id }, data: { status: 'BLOCKED' } });
        await logActivity(tx, id, req.user.id, 'reported a problem and marked the task as blocked');
      } else {
        await logActivity(tx, id, req.user.id, 'reported a problem');
      }
      await notify(tx, { to: task.createdById, from: req.user.id, link, message: `${req.user.name} reported a problem on "${task.title}"` });
    } else {
      await logActivity(tx, id, req.user.id, 'added a comment');
      const to = req.user.role === 'EMPLOYEE' ? task.createdById : task.assigneeId;
      await notify(tx, { to, from: req.user.id, link, message: `${req.user.name} commented on "${task.title}"` });
    }
  });
  res.status(201).json({ ok: true });
});

// ---------- deadline extensions ----------

router.post('/:id/extension', employeeOnly, async (req, res) => {
  const id = idParam(req.params.id);
  const task = await findTaskFor(req.user, id);
  if (task.status === 'COMPLETED') throw new HttpError(409, 'This task is already completed');
  if (task.extensionStatus === 'PENDING') throw new HttpError(409, 'An extension request is already waiting for a decision');

  const requestedDeadline = deadlineDate(req.body.requestedDeadline, 'New deadline');
  if (requestedDeadline <= task.deadline) throw new HttpError(400, 'The new deadline must be after the current one');
  const extensionReason = str(req.body.reason, 'Reason', { max: 1000 });

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data: { extensionStatus: 'PENDING', requestedDeadline, extensionReason } });
    await logActivity(tx, id, req.user.id, `requested a deadline extension to ${fmtDate(requestedDeadline)}`);
    await notify(tx, {
      to: task.createdById, from: req.user.id, link: taskLink(id),
      message: `${req.user.name} asked to extend "${task.title}" to ${fmtDate(requestedDeadline)}`,
    });
  });
  res.status(201).json({ ok: true });
});

router.post('/:id/extension/decision', supervisorOnly, async (req, res) => {
  const id = idParam(req.params.id);
  const task = await findTaskFor(req.user, id);
  if (task.extensionStatus !== 'PENDING') throw new HttpError(409, 'There is no pending extension request');
  const approve = req.body.approve === true;

  await prisma.$transaction(async (tx) => {
    const data = { extensionStatus: approve ? 'APPROVED' : 'REJECTED' };
    if (approve) data.deadline = task.requestedDeadline;
    await tx.task.update({ where: { id }, data });
    await logActivity(
      tx, id, req.user.id,
      approve
        ? `approved the extension: deadline moved from ${fmtDate(task.deadline)} to ${fmtDate(task.requestedDeadline)}`
        : 'rejected the deadline extension request',
    );
    await notify(tx, {
      to: task.assigneeId, from: req.user.id, link: taskLink(id),
      message: approve
        ? `Extension approved for "${task.title}": new deadline ${fmtDate(task.requestedDeadline)}`
        : `Extension request for "${task.title}" was rejected`,
    });
  });
  res.json({ ok: true });
});

export default router;
