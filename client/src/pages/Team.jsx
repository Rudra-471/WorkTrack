import { useState } from 'react';
import { Link } from 'react-router';
import { Loader2, UserPlus, X } from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { Avatar, Empty, ErrorBox, Loading, PageHeader, ProgressBar } from '../components/ui.jsx';

function AddEmployee({ onDone, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/users', { method: 'POST', body: form });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mb-6 space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Add an employee</h2>
        <button type="button" onClick={onCancel} className="cursor-pointer text-slate-400 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
      </div>
      <ErrorBox message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" required value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required value={form.email} onChange={set('email')} />
        </div>
      </div>
      <p className="text-xs text-slate-500">They'll create their own password the first time they sign in with this email.</p>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Add employee</button>
      </div>
    </form>
  );
}

export default function Team() {
  const { data: employees, error, loading, reload } = useApi('/users/employees');
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState('');

  const resetPassword = async (e) => {
    if (!window.confirm(`Reset ${e.name}'s password? They'll create a new one the next time they sign in.`)) return;
    setActionError('');
    try {
      await api(`/users/${e.id}/reset-password`, { method: 'POST' });
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading && !employees) return <Loading />;

  return (
    <>
      <PageHeader title="Team" subtitle="Your employees and how their work is going">
        {!adding && <button className="btn-primary" onClick={() => setAdding(true)}><UserPlus size={16} /> Add employee</button>}
      </PageHeader>
      <ErrorBox message={error || actionError} />
      {adding && <AddEmployee onCancel={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}

      {employees?.length === 0 ? (
        <div className="card"><Empty>No employees yet</Empty></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees?.map((e) => (
            <div key={e.id} className="card space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={e.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{e.name}</p>
                  <p className="truncate text-sm text-slate-500">{e.email}</p>
                </div>
              </div>
              {e.hasPassword ? null : (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Hasn't signed in yet. They'll create a password on their first sign-in.
                </p>
              )}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ['Open', e.stats.open, 'text-slate-900'],
                  ['Done', e.stats.completed, 'text-emerald-600'],
                  ['Overdue', e.stats.overdue, e.stats.overdue ? 'text-rose-600' : 'text-slate-900'],
                  ['Blocked', e.stats.blocked, e.stats.blocked ? 'text-rose-600' : 'text-slate-900'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-2">
                    <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Completion rate</span>
                </div>
                <ProgressBar value={e.stats.completionRate} size="sm" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>{e.stats.lastUpdate ? `Last activity ${timeAgo(e.stats.lastUpdate)}` : 'No tasks yet'}</span>
                <span className="flex gap-3">
                  {e.hasPassword && (
                    <button onClick={() => resetPassword(e)} className="cursor-pointer font-medium text-slate-500 hover:text-slate-800">Reset password</button>
                  )}
                  <Link to={`/tasks?assigneeId=${e.id}`} className="font-medium text-indigo-600 hover:underline">View tasks</Link>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
