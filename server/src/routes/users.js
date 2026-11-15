import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError, idParam, isOverdue, oneOf, publicUser, str } from '../lib.js';
import { supervisorOnly } from '../middleware/auth.js';

const router = Router();
router.use(supervisorOnly);

// Employees with a quick summary of their work, for the Team page and assignee picker.
router.get('/employees', async (_req, res) => {
  const [employees, tasks] = await Promise.all([
    prisma.user.findMany({ where: { role: 'EMPLOYEE' }, select: { ...publicUser, passwordHash: true }, orderBy: { name: 'asc' } }),
    prisma.task.findMany({ select: { assigneeId: true, status: true, deadline: true, progress: true, updatedAt: true } }),
  ]);

  const result = employees.map(({ passwordHash, ...e }) => {
    const mine = tasks.filter((t) => t.assigneeId === e.id);
    const completed = mine.filter((t) => t.status === 'COMPLETED').length;
    const open = mine.filter((t) => t.status !== 'COMPLETED');
    const lastUpdate = mine.reduce((max, t) => (t.updatedAt > max ? t.updatedAt : max), null);
    return {
      ...e,
      hasPassword: Boolean(passwordHash),
      stats: {
        total: mine.length,
        completed,
        open: open.length,
        overdue: open.filter(isOverdue).length,
        blocked: open.filter((t) => t.status === 'BLOCKED').length,
        completionRate: mine.length ? Math.round((completed / mine.length) * 100) : 0,
        avgProgress: open.length ? Math.round(open.reduce((s, t) => s + t.progress, 0) / open.length) : 0,
        lastUpdate,
      },
    };
  });
  res.json(result);
});

// New accounts have no password: the person creates one the first time they sign in.
router.post('/', async (req, res) => {
  const name = str(req.body.name, 'Name', { max: 100 });
  const email = str(req.body.email, 'Email', { max: 150 }).toLowerCase();
  const role = oneOf(req.body.role || 'EMPLOYEE', ['EMPLOYEE', 'SUPERVISOR'], 'Role');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email is not valid');
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'A user with this email already exists');
  }

  const user = await prisma.user.create({ data: { name, email, role }, select: publicUser });
  res.status(201).json(user);
});

// "Forgot password": clears an employee's password so they create a new one at next sign-in.
router.post('/:id/reset-password', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: idParam(req.params.id) } });
  if (!user || user.role !== 'EMPLOYEE') throw new HttpError(404, 'Employee not found');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: null } });
  res.json({ ok: true });
});

export default router;
