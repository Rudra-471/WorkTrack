import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PlusCircle, Search } from 'lucide-react';
import { api, useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, Loading, PageHeader } from '../components/ui.jsx';
import TaskList from '../components/TaskList.jsx';

const STATUS_TABS = [
  ['', 'All'],
  ['OPEN', 'Open'],
  ['TODO', 'To Do'],
  ['IN_PROGRESS', 'In Progress'],
  ['BLOCKED', 'Blocked'],
  ['SUBMITTED', 'Submitted'],
  ['COMPLETED', 'Completed'],
  ['OVERDUE', 'Overdue'],
];

export default function Tasks() {
  const { isSupervisor } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [employees, setEmployees] = useState([]);

  const status = params.get('status') || '';
  const priority = params.get('priority') || '';
  const assigneeId = params.get('assigneeId') || '';
  const q = params.get('q') || '';

  const query = new URLSearchParams(Object.entries({ status, priority, assigneeId, q }).filter(([, v]) => v)).toString();
  const { data: tasks, error, loading } = useApi(`/tasks${query ? `?${query}` : ''}`);

  useEffect(() => {
    if (isSupervisor) api('/users/employees').then(setEmployees).catch(() => {});
  }, [isSupervisor]);

  // Search as you type, with a short delay.
  useEffect(() => {
    const t = setTimeout(() => setFilter('q', search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setFilter(key, value) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  return (
    <>
      <PageHeader title={isSupervisor ? 'All tasks' : 'My tasks'} subtitle={tasks ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : ' '}>
        {isSupervisor && <Link to="/tasks/new" className="btn-primary"><PlusCircle size={16} /> New task</Link>}
      </PageHeader>

      <div className="card">
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {STATUS_TABS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter('status', value)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  status === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input sm:w-40" value={priority} onChange={(e) => setFilter('priority', e.target.value)} aria-label="Priority">
              <option value="">Any priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {isSupervisor && (
              <select className="input sm:w-48" value={assigneeId} onChange={(e) => setFilter('assigneeId', e.target.value)} aria-label="Assignee">
                <option value="">All employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-4"><ErrorBox message={error} /></div>
        ) : loading && !tasks ? (
          <Loading />
        ) : (
          <TaskList tasks={tasks} showAssignee={isSupervisor} emptyText="No tasks match these filters" />
        )}
      </div>
    </>
  );
}
