import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatDate } from '../lib/format.js';
import { Avatar, ErrorBox, PageHeader, Section } from '../components/ui.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (form.newPassword !== form.confirm) return setError("The new passwords don't match");
    setBusy(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: form });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" />
      <div className="card flex items-center gap-4 p-5">
        <Avatar name={user.name} />
        <div>
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">
            {user.email} · {user.role === 'SUPERVISOR' ? 'Supervisor' : 'Employee'} · Joined {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <Section title="Change password">
        <form onSubmit={submit} className="space-y-4 p-5">
          <ErrorBox message={error} />
          {done && <p className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 size={16} /> Password changed</p>}
          <div>
            <label className="label" htmlFor="cur">Current password</label>
            <input id="cur" type="password" className="input" required autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new">New password</label>
              <input id="new" type="password" className="input" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm new password</label>
              <input id="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Change password</button>
          </div>
        </form>
      </Section>
    </div>
  );
}
