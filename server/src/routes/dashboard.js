import { Router } from 'express';
import { prisma } from '../db.js';
import { withOverdue } from '../lib.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

router.get('/', async (req, res) => {
  const isEmployee = req.user.role === 'EMPLOYEE';
  const tasks = (
    await prisma.task.findMany({
      where: isEmployee ? { assigneeId: req.user.id } : {},
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { deadline: 'asc' },
    })
  ).map(withOverdue);

  const by = (s) => tasks.filter((t) => t.status === s);
  const open = tasks.filter((t) => t.status !== 'COMPLETED');
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const stats = {
    total: tasks.length,
    todo: by('TODO').length,
    inProgress: by('IN_PROGRESS').length,
    blocked: by('BLOCKED').length,
    submitted: by('SUBMITTED').length,
    completed: by('COMPLETED').length,
    overdue: open.filter((t) => t.overdue).length,
  };
  const overdue = open.filter((t) => t.overdue);
  const dueSoon = open.filter((t) => !t.overdue && new Date(t.deadline) - now <= 7 * DAY);

  if (isEmployee) {
    return res.json({
      stats,
      overdue,
      dueToday: open.filter((t) => !t.overdue && new Date(t.deadline) <= endOfToday),
      dueSoon,
      needsAttention: open.filter((t) => t.status === 'TODO' || t.status === 'BLOCKED' || t.changesRequested),
    });
  }

  const recentActivity = await prisma.activity.findMany({
    take: 12,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
  });

  res.json({
    stats,
    overdue,
    dueSoon,
    awaitingApproval: by('SUBMITTED'),
    blocked: by('BLOCKED'),
    pendingExtensions: tasks.filter((t) => t.extensionStatus === 'PENDING'),
    recentActivity,
  });
});

export default router;
