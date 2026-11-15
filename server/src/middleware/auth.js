import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { HttpError, publicUser } from '../lib.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please sign in');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  // Re-read the user so deleted accounts or changed roles take effect immediately.
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: publicUser });
  if (!user) throw new HttpError(401, 'Please sign in');
  req.user = user;
  next();
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) throw new HttpError(403, 'You do not have permission to do this');
  next();
};

export const supervisorOnly = requireRole('SUPERVISOR');
export const employeeOnly = requireRole('EMPLOYEE');
