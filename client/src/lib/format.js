export const STATUS = {
  TODO: { label: 'To Do', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  BLOCKED: { label: 'Blocked', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  SUBMITTED: { label: 'Submitted', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

export const PRIORITY = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  MEDIUM: { label: 'Medium', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  HIGH: { label: 'High', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

export const formatDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Local YYYY-MM-DD, for <input type="date"> values.
export const toInputDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

// "Due today", "Due in 3 days", "2 days overdue"
export function dueLabel(task) {
  if (task.status === 'COMPLETED') return formatDate(task.deadline);
  const startOf = (x) => new Date(new Date(x).toDateString());
  const days = Math.round((startOf(task.deadline) - startOf(new Date())) / 86400000);
  if (task.overdue) return days === 0 ? 'Overdue today' : `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;
  return formatDate(task.deadline);
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
