// Shared helpers: errors, validation, task access, activity + notifications.
import { prisma } from './db.js';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'SUBMITTED', 'COMPLETED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const publicUser = { id: true, name: true, email: true, role: true, createdAt: true };

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- validation ----------

export function str(value, field, { max = 200, optional = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (optional) return '';
    throw new HttpError(400, `${field} is required`);
  }
  const s = String(value).trim();
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
}

export function num(value, field, { min, max, integer = false } = {}) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(n)) {
    throw new HttpError(400, `${field} must be a number`);
  }
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `${field} must be a whole number`);
  if (min !== undefined && n < min) throw new HttpError(400, `${field} must be at least ${min}`);
  if (max !== undefined && n > max) throw new HttpError(400, `${field} must be at most ${max}`);
  return n;
}

// Accepts "YYYY-MM-DD"; deadlines mean "by the end of that day".
export function deadlineDate(value, field = 'Deadline') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new HttpError(400, `${field} must be a date (YYYY-MM-DD)`);
  }
  const d = new Date(`${value}T23:59:59`);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${field} is not a valid date`);
  return d;
}

export function oneOf(value, list, field) {
  if (!list.includes(value)) throw new HttpError(400, `${field} must be one of ${list.join(', ')}`);
  return value;
}

export function idParam(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'Not found');
  return id;
}

export const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);

// ---------- tasks ----------

export const isOverdue = (t) => t.status !== 'COMPLETED' && new Date(t.deadline) < new Date();
export const withOverdue = (t) => ({ ...t, overdue: isOverdue(t) });

// Loads a task the current user is allowed to see. Employees only see their own
// tasks; anything else is reported as "not found" so ids can't be probed.
export async function findTaskFor(user, id, db = prisma) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new HttpError(404, 'Task not found');
  if (user.role === 'EMPLOYEE' && task.assigneeId !== user.id) {
    throw new HttpError(404, 'Task not found');
  }
  return task;
}

export function logActivity(db, taskId, userId, action) {
  return db.activity.create({ data: { taskId, userId, action } });
}

// Never notifies the person who triggered the event.
export function notify(db, { to, from, message, link }) {
  if (!to || to === from) return null;
  return db.notification.create({ data: { userId: to, message, link } });
}
