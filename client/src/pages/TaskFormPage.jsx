import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { ErrorBox, Loading, PageHeader } from '../components/ui.jsx';

const EMPTY = { title: '', description: '', assigneeId: '', priority: 'MEDIUM', deadline: '' };

// Used for both "New task" and "Edit task".
export default function TaskFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [employees, setEmployees] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/users/employees').then(setEmployees).catch((e) => setError(e.message));
    if (editing) {
      api(`/tasks/${id}`)
        .then((t) => setForm({
          title: t.title, description: t.description, assigneeId: String(t.assigneeId),
          priority: t.priority, deadline: toInputDate(t.deadline),
        }))
        .catch((e) => setError(e.message));
    }
  }, [id, editing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const task = await api(editing ? `/tasks/${id}` : '/tasks', { method: editing ? 'PUT' : 'POST', body: form });
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!employees && !error) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={editing ? `/tasks/${id}` : '/tasks'} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back
      </Link>
      <PageHeader title={editing ? 'Edit task' : 'New task'} subtitle={editing ? 'The employee will be notified of changes' : 'The employee will be notified when you create it'} />

      <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" required maxLength={150} value={form.title} onChange={set('title')} placeholder="e.g. Prepare monthly sales report" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description and expected result</label>
          <textarea id="description" className="input min-h-32" maxLength={5000} value={form.description} onChange={set('description')} placeholder="What needs to be done, and what should the finished work look like?" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label" htmlFor="assignee">Assign to</label>
            <select id="assignee" className="input" required value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Choose an employee</option>
              {employees?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {employees?.length === 0 && (
              <p className="mt-1.5 text-xs text-slate-500">No employees yet. <Link to="/team" className="text-indigo-600 hover:underline">Add one on the Team page</Link>.</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="priority">Priority</label>
            <select id="priority" className="input" value={form.priority} onChange={set('priority')}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="deadline">Deadline</label>
            <input id="deadline" type="date" className="input" required min={editing ? undefined : toInputDate()} value={form.deadline} onChange={set('deadline')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <Link to={editing ? `/tasks/${id}` : '/tasks'} className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} {editing ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  );
}
