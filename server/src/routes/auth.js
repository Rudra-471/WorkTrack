import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { HttpError, publicUser, str } from '../lib.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();
const MIN_PASSWORD = 8;

const readEmail = (body) => str(body.email, 'Email', { max: 150 }).toLowerCase();

function readNewPassword(value, field = 'Password') {
  const pw = str(value, field, { max: 100 });
  if (pw.length < MIN_PASSWORD) throw new HttpError(400, `${field} must be at least ${MIN_PASSWORD} characters`);
  return pw;
}

const session = (user) => {
  const { passwordHash: _omit, ...safe } = user;
  return { token: signToken(user), user: safe };
};

// Step 1 of sign-in: tells the login page whether to ask for a password or to
// let the user create one. Unknown emails get "password" so the response
// doesn't reveal which emails have accounts.
router.post('/check', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: readEmail(req.body) } });
  if (user && !user.passwordHash) return res.json({ next: 'setup', name: user.name });
  res.json({ next: 'password' });
});

// First sign-in: an account that has no password yet gets one here.
router.post('/setup', async (req, res) => {
  const email = readEmail(req.body);
  const name = str(req.body.name, 'Name', { max: 100 });
  const password = readNewPassword(req.body.password);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new HttpError(404, 'No account exists for this email. Ask your supervisor to add you.');

  // Only succeeds if the password is still unset, even if two requests race.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: null },
    data: { name, passwordHash: await bcrypt.hash(password, 10) },
  });
  if (!count) throw new HttpError(409, 'This account already has a password. Sign in instead.');

  res.json(session(await prisma.user.findUnique({ where: { id: user.id } })));
});

router.post('/login', async (req, res) => {
  const email = readEmail(req.body);
  const password = str(req.body.password, 'Password');

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) throw new HttpError(409, 'You need to create your password first.');
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Incorrect email or password');

  res.json(session(user));
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const current = str(req.body.currentPassword, 'Current password');
  const next = readNewPassword(req.body.newPassword, 'New password');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
    select: publicUser,
  });
  res.json({ ok: true });
});

export default router;
