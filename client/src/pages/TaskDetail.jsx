import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  AlertOctagon, ArrowLeft, CalendarPlus, Check, CheckCircle2, Loader2, Pencil, Play, RotateCcw, Send, Trash2, X,
} from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { dueLabel, formatDate, formatDateTime, timeAgo, toInputDate } from '../lib/format.js';
import {
  Avatar, Empty, ErrorBox, Loading, PriorityBadge, ProgressBar, Section, StatusBadge, Tag,
} from '../components/ui.jsx';

// Small helper so every form on the page handles busy/error the same way.
function useSubmit(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onDone();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

const Spin = ({ show }) => (show ? <Loader2 size={16} className="animate-spin" /> : null);

// ---------- what the current user can do next ----------

function NextStep({ task, reload }) {
  const { isSupervisor } = useAuth();
  const [mode, setMode] = useState(null); // 'submit' | 'changes'
  const [note, setNote] = useState('');
  const { busy, error, run } = useSubmit(reload);

  const act = (action) =>
    run(() => api(`/tasks/${task.id}/actions`, { method: 'POST', body: { action, note } })).then((ok) => {
      if (ok) { setMode(null); setNote(''); }
    });

  let content = null;
  if (!isSupervisor) {
    if (task.status === 'TODO') {
      content = (
        <Banner tone="indigo" text="This task is waiting for you to start.">
          <button className="btn-primary" disabled={busy} onClick={() => act('start')}><Spin show={busy} /><Play size={16} /> Start work</button>
        </Banner>
      );
    } else if (task.status === 'BLOCKED') {
      content = (
        <Banner tone="rose" text="You reported a problem on this task. Resume when it's sorted out.">
          <button className="btn-primary" disabled={busy} onClick={() => act('start')}><Spin show={busy} /><Play size={16} /> Resume work</button>
        </Banner>
      );
    } else if (task.status === 'IN_PROGRESS') {
      content = mode === 'submit' ? (
        <div className="space-y-3">
          <label className="label" htmlFor="submit-note">Note for your supervisor (optional)</label>
          <textarea id="submit-note" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where to find the work, anything they should check…" />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setMode(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => act('submit')}><Spin show={busy} /><Send size={16} /> Submit for review</button>
          </div>
        </div>
      ) : (
        <Banner
          tone={task.changesRequested ? 'amber' : 'indigo'}
          text={task.changesRequested ? 'Your supervisor asked for changes. See the comments below, then submit again.' : 'Finished? Submit the task so your supervisor can review it.'}
        >
          <button className="btn-primary" onClick={() => setMode('submit')}><Send size={16} /> Submit for review</button>
        </Banner>
      );
    } else if (task.status === 'SUBMITTED') {
      content = <Banner tone="amber" text="Submitted. Waiting for your supervisor to review it." />;
    }
  } else if (task.status === 'SUBMITTED') {
    content = mode === 'changes' ? (
      <div className="space-y-3">
        <label className="label" htmlFor="changes-note">What needs to change?</label>
        <textarea id="changes-note" className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setMode(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || !note.trim()} onClick={() => act('request_changes')}><Spin show={busy} /> Send back</button>
        </div>
      </div>
    ) : (
      <Banner tone="amber" text={`${task.assignee.name} submitted this task. Review the work and approve it or ask for changes.`}>
        <button className="btn-secondary" onClick={() => setMode('changes')}><RotateCcw size={16} /> Request changes</button>
        <button className="btn-success" disabled={busy} onClick={() => act('approve')}><Spin show={busy} /><Check size={16} /> Approve</button>
      </Banner>
    );
  }

  if (task.status === 'COMPLETED') {
    content = <Banner tone="emerald" text="This task has been approved and is complete." icon={CheckCircle2} />;
  }
  if (!content) return null;

  return (
    <div className="card space-y-3 p-4">
      <ErrorBox message={error} />
      {content}
    </div>
  );
}

function Banner({ tone, text, icon: Icon, children }) {
  const tones = { indigo: 'text-indigo-700', rose: 'text-rose-700', amber: 'text-amber-700', emerald: 'text-emerald-700' };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className={`flex items-center gap-2 text-sm font-medium ${tones[tone]}`}>{Icon && <Icon size={18} />}{text}</p>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// ---------- progress ----------

function ProgressForm({ task, reload }) {
  const [form, setForm] = useState({ percentage: task.progress, note: '', hoursSpent: '' });
  const { busy, error, run } = useSubmit(reload);
  const submit = (e) => {
    e.preventDefault();
    run(() => api(`/tasks/${task.id}/progress`, { method: 'POST', body: form })).then((ok) => ok && setForm((f) => ({ ...f, note: '', hoursSpent: '' })));
  };
  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <ErrorBox message={error} />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0" htmlFor="pct">Progress</label>
          <span className="text-sm font-semibold text-indigo-600 tabular-nums">{form.percentage}%</span>
        </div>
        <input id="pct" type="range" min="0" max="100" step="5" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })} className="w-full accent-indigo-600" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <label className="label" htmlFor="pnote">What did you do?</label>
          <textarea id="pnote" className="input min-h-20" required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Work completed, what you're doing now, what's left" />
        </div>
        <div>
          <label className="label" htmlFor="hours">Hours spent</label>
          <input id="hours" type="number" min="0" max="24" step="0.5" className="input" value={form.hoursSpent} onChange={(e) => setForm({ ...form, hoursSpent: e.target.value })} placeholder="0" />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}><Spin show={busy} /> Save update</button>
      </div>
    </form>
  );
}

function ProgressHistory({ updates }) {
  if (!updates.length) return <Empty>No progress updates yet</Empty>;
  return (
    <ul className="divide-y divide-slate-100">
      {updates.map((u) => (
        <li key={u.id} className="px-5 py-4">
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-indigo-600 tabular-nums">{u.percentage}%</span>
            {u.hoursSpent > 0 && <span className="text-slate-500">{u.hoursSpent}h</span>}
            <span className="text-xs text-slate-400">{u.user.name} · {formatDateTime(u.createdAt)}</span>
          </div>
          <p className="text-sm whitespace-pre-line text-slate-700">{u.note}</p>
        </li>
      ))}
    </ul>
  );
}

// ---------- comments ----------

function Comments({ task, reload }) {
  const { user, isSupervisor } = useAuth();
  const [text, setText] = useState('');
  const [isProblem, setIsProblem] = useState(false);
  const { busy, error, run } = useSubmit(reload);

  const submit = (e) => {
    e.preventDefault();
    run(() => api(`/tasks/${task.id}/comments`, { method: 'POST', body: { text, isProblem } })).then((ok) => {
      if (ok) { setText(''); setIsProblem(false); }
    });
  };

  return (
    <>
      {task.comments.length === 0 ? (
        <Empty>No comments yet. Ask a question or share an update.</Empty>
      ) : (
        <ul className="space-y-4 p-5">
          {task.comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author.name} size="sm" />
              <div className={`min-w-0 flex-1 rounded-2xl px-4 py-2.5 ${c.isProblem ? 'bg-rose-50 ring-1 ring-rose-200' : c.author.id === user.id ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-900">{c.author.name}</span>
                  <span className="text-slate-400">{timeAgo(c.createdAt)}</span>
                  {c.isProblem && <Tag>Problem reported</Tag>}
                </div>
                <p className="text-sm whitespace-pre-line text-slate-700">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-3 border-t border-slate-100 p-5">
        <ErrorBox message={error} />
        <textarea className="input min-h-20" required value={text} onChange={(e) => setText(e.target.value)} placeholder={isProblem ? 'Describe the problem and what help you need' : 'Write a comment'} aria-label="Comment" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!isSupervisor && task.status !== 'COMPLETED' ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isProblem} onChange={(e) => setIsProblem(e.target.checked)} className="h-4 w-4 accent-rose-600" />
              <AlertOctagon size={15} className="text-rose-500" /> Report this as a problem
              {['TODO', 'IN_PROGRESS'].includes(task.status) && <span className="text-xs text-slate-400">(marks the task Blocked)</span>}
            </label>
          ) : <span />}
          <button className={isProblem ? 'btn-danger' : 'btn-primary'} disabled={busy}>
            <Spin show={busy} /> {isProblem ? 'Report problem' : 'Post comment'}
          </button>
        </div>
      </form>
    </>
  );
}

// ---------- deadline extension ----------

function Extension({ task, reload }) {
  const { isSupervisor } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ requestedDeadline: '', reason: '' });
  const { busy, error, run } = useSubmit(reload);

  const decide = (approve) => run(() => api(`/tasks/${task.id}/extension/decision`, { method: 'POST', body: { approve } }));
  const request = (e) => {
    e.preventDefault();
    run(() => api(`/tasks/${task.id}/extension`, { method: 'POST', body: form })).then((ok) => ok && setOpen(false));
  };

  const pending = task.extensionStatus === 'PENDING';
  if (task.status === 'COMPLETED' && !pending) return null;
  if (isSupervisor && !pending) return null;

  const minDate = new Date(task.deadline);
  minDate.setDate(minDate.getDate() + 1);

  return (
    <Section title="Deadline extension">
      <div className="space-y-3 p-5 text-sm">
        <ErrorBox message={error} />
        {pending ? (
          <>
            <p className="text-slate-600">
              {isSupervisor ? `${task.assignee.name} asked` : 'You asked'} to move the deadline from{' '}
              <b className="text-slate-900">{formatDate(task.deadline)}</b> to <b className="text-slate-900">{formatDate(task.requestedDeadline)}</b>.
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">“{task.extensionReason}”</p>
            {isSupervisor ? (
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" disabled={busy} onClick={() => decide(false)}><X size={16} /> Reject</button>
                <button className="btn-success flex-1" disabled={busy} onClick={() => decide(true)}><Check size={16} /> Approve</button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Waiting for your supervisor's decision.</p>
            )}
          </>
        ) : open ? (
          <form onSubmit={request} className="space-y-3">
            <div>
              <label className="label" htmlFor="newdl">New deadline</label>
              <input id="newdl" type="date" className="input" required min={toInputDate(minDate)} value={form.requestedDeadline} onChange={(e) => setForm({ ...form, requestedDeadline: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="reason">Reason</label>
              <textarea id="reason" className="input min-h-20" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={busy}><Spin show={busy} /> Send request</button>
            </div>
          </form>
        ) : (
          <>
            {task.extensionStatus === 'REJECTED' && <p className="text-rose-600">Your last extension request was rejected.</p>}
            {task.extensionStatus === 'APPROVED' && <p className="text-emerald-600">Your last extension request was approved.</p>}
            <p className="text-slate-500">Need more time? Ask your supervisor to move the deadline.</p>
            <button className="btn-secondary w-full" onClick={() => setOpen(true)}><CalendarPlus size={16} /> Request extension</button>
          </>
        )}
      </div>
    </Section>
  );
}

// ---------- page ----------

function Detail({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{children}</span>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();
  const { data: task, error, loading, reload } = useApi(`/tasks/${id}`);
  const [tab, setTab] = useState('comments');

  if (loading && !task) return <Loading />;
  if (error && !task) {
    return (
      <div className="space-y-4">
        <ErrorBox message={error} />
        <Link to="/tasks" className="text-sm text-indigo-600 hover:underline">Back to tasks</Link>
      </div>
    );
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${task.title}"? This removes its comments and history and can't be undone.`)) return;
    await api(`/tasks/${task.id}`, { method: 'DELETE' });
    navigate('/tasks');
  };

  const canUpdateProgress = !isSupervisor && ['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(task.status);
  const tabs = [
    ['comments', `Comments (${task.comments.length})`],
    ['progress', `Progress (${task.progressUpdates.length})`],
    ['activity', 'History'],
  ];

  return (
    <>
      <Link to="/tasks" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> All tasks
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.overdue && <Tag>Overdue</Tag>}
            {task.changesRequested && task.status !== 'COMPLETED' && <Tag tone="amber">Changes requested</Tag>}
          </div>
          <h1 className="text-2xl font-semibold break-words text-slate-900">{task.title}</h1>
        </div>
        {isSupervisor && (
          <div className="flex shrink-0 gap-2">
            <Link to={`/tasks/${task.id}/edit`} className="btn-secondary"><Pencil size={16} /> Edit</Link>
            <button onClick={remove} className="btn-danger" aria-label="Delete task"><Trash2 size={16} /></button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <NextStep task={task} reload={reload} />

          <Section title="Description">
            <p className="px-5 py-4 text-sm whitespace-pre-line text-slate-700">{task.description || <span className="text-slate-400">No description</span>}</p>
          </Section>

          {canUpdateProgress && (
            <Section title="Update progress">
              <ProgressForm key={task.progress} task={task} reload={reload} />
            </Section>
          )}

          <section className="card">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap ${
                    tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'comments' && <Comments task={task} reload={reload} />}
            {tab === 'progress' && <ProgressHistory updates={task.progressUpdates} />}
            {tab === 'activity' && (
              <ol className="space-y-4 p-5">
                {task.activities.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                    <div>
                      <p className="text-slate-700"><span className="font-medium text-slate-900">{a.user.name}</span> {a.action}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <Section title="Details">
            <div className="divide-y divide-slate-100 px-5 py-1">
              <Detail label="Assigned to"><span className="inline-flex items-center gap-2"><Avatar name={task.assignee.name} size="sm" />{task.assignee.name}</span></Detail>
              <Detail label="Assigned by">{task.createdBy.name}</Detail>
              <Detail label="Assigned on">{formatDate(task.createdAt)}</Detail>
              <Detail label="Deadline">
                <span className={task.overdue ? 'font-medium text-rose-600' : ''}>{formatDate(task.deadline)}</span>
                <span className="block text-xs text-slate-400">{dueLabel(task)}</span>
              </Detail>
              <div className="py-3">
                <p className="mb-2 text-sm text-slate-500">Progress</p>
                <ProgressBar value={task.progress} />
              </div>
            </div>
          </Section>
          <Extension task={task} reload={reload} />
        </div>
      </div>
    </>
  );
}
