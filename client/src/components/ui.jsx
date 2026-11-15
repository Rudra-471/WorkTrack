import { AlertCircle, Loader2 } from 'lucide-react';
import { PRIORITY, STATUS, initials } from '../lib/format.js';

const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap';

export function StatusBadge({ status }) {
  const s = STATUS[status];
  return <span className={`${pill} ${s.className}`}>{s.label}</span>;
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority];
  return <span className={`${pill} ${p.className}`}>{p.label}</span>;
}

export function Tag({ children, tone = 'rose' }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  };
  return <span className={`${pill} ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, size = 'md' }) {
  const color = value >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-500 tabular-nums">{value}%</span>
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const s = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white ${s}`}>
      {initials(name)}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-slate-900 tabular-nums sm:text-2xl">{value}</p>
        <p className="text-xs leading-tight text-slate-500 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16 text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Empty({ children }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-400">{children}</p>;
}
