import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatDate, toInputDate } from '../lib/format.js';
import { Avatar, Empty, ErrorBox, Loading, PageHeader, Section } from '../components/ui.jsx';

// Log dates are calendar dates stored as UTC midnight; show them without timezone shifts.
const logDate = (d) => formatDate(`${d.slice(0, 10)}T12:00:00`);

function LogCard({ log, showName }) {
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {showName && <Avatar name={log.user.name} size="sm" />}
          <div>
            {showName && <p className="text-sm font-semibold text-slate-900">{log.user.name}</p>}
            <p className={showName ? 'text-xs text-slate-500' : 'text-sm font-semibold text-slate-900'}>{logDate(log.date)}</p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{log.hours} hours</span>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="sm:col-span-3">
          <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">Work done</dt>
          <dd className="whitespace-pre-line text-slate-700">{log.workDone}</dd>
        </div>
        {log.challenges && (
          <div className="sm:col-span-3 md:col-span-1">
            <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">Challenges</dt>
            <dd className="whitespace-pre-line text-slate-700">{log.challenges}</dd>
          </div>
        )}
        {log.planNext && (
          <div className="sm:col-span-3 md:col-span-2">
            <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">Plan for next day</dt>
            <dd className="whitespace-pre-line text-slate-700">{log.planNext}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

function LogForm({ logs, reload }) {
  const [date, setDate] = useState(toInputDate());
  const blank = { workDone: '', hours: '', challenges: '', planNext: '' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // If a log already exists for the chosen date, load it so it can be edited.
  const existing = logs.find((l) => l.date.slice(0, 10) === date);
  useEffect(() => {
    setForm(existing ? { workDone: existing.workDone, hours: String(existing.hours), challenges: existing.challenges, planNext: existing.planNext } : blank);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/logs', { method: 'POST', body: { ...form, date } });
      await reload();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <ErrorBox message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" className="input" required max={toInputDate()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="hours">Hours worked</label>
          <input id="hours" type="number" min="0" max="24" step="0.5" className="input" required value={form.hours} onChange={set('hours')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="work">What did you work on and finish?</label>
        <textarea id="work" className="input min-h-24" required value={form.workDone} onChange={set('workDone')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="challenges">Challenges (optional)</label>
          <textarea id="challenges" className="input min-h-20" value={form.challenges} onChange={set('challenges')} />
        </div>
        <div>
          <label className="label" htmlFor="plan">Plan for next working day (optional)</label>
          <textarea id="plan" className="input min-h-20" value={form.planNext} onChange={set('planNext')} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={16} /> Saved</span>}
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} {existing ? 'Update log' : 'Submit log'}
        </button>
      </div>
    </form>
  );
}

export default function DailyLog() {
  const { isSupervisor } = useAuth();
  const [userId, setUserId] = useState('');
  const [employees, setEmployees] = useState([]);
  const { data: logs, error, loading, reload } = useApi(`/logs${userId ? `?userId=${userId}` : ''}`);

  useEffect(() => {
    if (isSupervisor) api('/users/employees').then(setEmployees).catch(() => {});
  }, [isSupervisor]);

  if (loading && !logs) return <Loading />;

  return (
    <>
      <PageHeader
        title={isSupervisor ? 'Daily reports' : 'Daily work log'}
        subtitle={isSupervisor ? "Your team's daily work reports" : 'Record what you did each day. Submitting again for the same date updates it.'}
      >
        {isSupervisor && (
          <select className="input w-52" value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Employee">
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
      </PageHeader>
      <ErrorBox message={error} />

      <div className={`grid gap-6 ${isSupervisor ? '' : 'lg:grid-cols-5'}`}>
        {!isSupervisor && logs && (
          <Section title="Write a log" className="h-fit lg:col-span-3">
            <LogForm logs={logs} reload={reload} />
          </Section>
        )}
        <Section title={isSupervisor ? 'Reports' : 'Your past logs'} className={isSupervisor ? '' : 'lg:col-span-2'}>
          {logs?.length ? (
            <ul className="divide-y divide-slate-100">
              {logs.map((l) => <LogCard key={l.id} log={l} showName={isSupervisor} />)}
            </ul>
          ) : (
            <Empty>No logs yet</Empty>
          )}
        </Section>
      </div>
    </>
  );
}
