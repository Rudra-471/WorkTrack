import { Router } from 'express';
import { prisma } from '../db.js';
import { idParam } from '../lib.js';

const router = Router();

router.get('/', async (req, res) => {
  const where = { userId: req.user.id };
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  res.json({ items, unread });
});

router.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  // updateMany scoped to the user so nobody can mark someone else's notifications.
  await prisma.notification.updateMany({
    where: { id: idParam(req.params.id), userId: req.user.id },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default router;
