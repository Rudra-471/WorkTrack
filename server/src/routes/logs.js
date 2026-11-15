import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError, num, str } from '../lib.js';
import { employeeOnly } from '../middleware/auth.js';

const router = Router();

// Employees see their own logs; supervisors see everyone's (optionally filtered).
router.get('/', async (req, res) => {
  const where = {};
  if (req.user.role === 'EMPLOYEE') where.userId = req.user.id;
  else if (req.query.userId) where.userId = Number(req.query.userId) || -1;
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')) where.date = new Date(req.query.date);

  const logs = await prisma.dailyLog.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });
  res.json(logs);
});

// One log per employee per day: submitting again for the same date updates it.
router.post('/', employeeOnly, async (req, res) => {
  const dateStr = String(req.body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new HttpError(400, 'Date is required');
  const date = new Date(dateStr); // stored as a calendar date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date > tomorrow) throw new HttpError(400, "You can't log work for a future date");

  const data = {
    workDone: str(req.body.workDone, 'Work done', { max: 5000 }),
    hours: num(req.body.hours, 'Hours worked', { min: 0, max: 24 }),
    challenges: str(req.body.challenges, 'Challenges', { max: 3000, optional: true }),
    planNext: str(req.body.planNext, 'Plan for tomorrow', { max: 3000, optional: true }),
  };

  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: req.user.id, date } },
    create: { ...data, date, userId: req.user.id },
    update: data,
  });
  res.status(201).json(log);
});

export default router;
