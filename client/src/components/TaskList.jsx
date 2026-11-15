import { Link } from 'react-router';
import { dueLabel } from '../lib/format.js';
import { Avatar, Empty, PriorityBadge, ProgressBar, StatusBadge, Tag } from './ui.jsx';

function Due({ task }) {
  return (
    <span className={`text-sm whitespace-nowrap ${task.overdue ? 'font-medium text-rose-600' : 'text-slate-600'}`}>
      {dueLabel(task)}
    </span>
  );
}

function Flags({ task }) {
  return (
    <>
      {task.changesRequested && task.status !== 'COMPLETED' && <Tag tone="amber">Changes requested</Tag>}
      {task.extensionStatus === 'PENDING' && <Tag tone="violet">Extension requested</Tag>}
    </>
  );
}

// Table on larger screens, cards on phones.
export default function TaskList({ tasks, showAssignee, emptyText = 'No tasks to show' }) {
  if (!tasks.length) return <Empty>{emptyText}</Empty>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Task</th>
              {showAssignee && <th className="px-3 py-3 font-medium">Assignee</th>}
              <th className="px-3 py-3 font-medium">Priority</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="w-40 px-3 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/70">
                <td className="max-w-xs px-5 py-3">
                  <Link to={`/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {t.title}
                  </Link>
                  {t.description && <p className="truncate text-xs text-slate-500">{t.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-1 empty:hidden"><Flags task={t} /></div>
                </td>
                {showAssignee && (
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap text-slate-700">
                      <Avatar name={t.assignee.name} size="sm" /> {t.assignee.name}
                    </span>
                  </td>
                )}
                <td className="px-3 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-3 py-3"><ProgressBar value={t.progress} size="sm" /></td>
                <td className="px-5 py-3"><Due task={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link to={`/tasks/${t.id}`} className="block space-y-2.5 px-4 py-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">{t.title}</p>
                <StatusBadge status={t.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={t.priority} />
                <Flags task={t} />
                <span className="ml-auto"><Due task={t} /></span>
              </div>
              {showAssignee && <p className="text-xs text-slate-500">Assigned to {t.assignee.name}</p>}
              <ProgressBar value={t.progress} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
