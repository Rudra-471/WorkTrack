import { Link } from 'react-router';
import {
  AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock, Hourglass, ListTodo, PlusCircle,
} from 'lucide-react';
import { useApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { dueLabel, formatDate, timeAgo } from '../lib/format.js';
import { Avatar, Empty, ErrorBox, Loading, PageHeader, Section, StatCard, StatusBadge } from '../components/ui.jsx';
import TaskList from '../components/TaskList.jsx';

// Compact list of tasks used in dashboard panels.
function MiniList({ tasks, empty, showAssignee, extra }) {
  if (!tasks.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link to={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
              <p className="truncate text-xs text-slate-500">
                {showAssignee && `${t.assignee.name} · `}
                {extra ? extra(t) : dueLabel(t)}
              </p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SupervisorDashboard({ d }) {
  const s = d.stats;
  return (
    <>
      <PageHeader title="Dashboard" subtitle="An overview of your team's work">
        <Link to="/tasks/new" className="btn-primary"><PlusCircle size={16} /> New task</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total tasks" value={s.total} icon={ClipboardList} tone="indigo" />
        <StatCard label="Completed" value={s.completed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="To do" value={s.todo} icon={ListTodo} tone="slate" />
        <StatCard label="In progress" value={s.inProgress} icon={Clock} tone="blue" />
        <StatCard label="Overdue" value={s.overdue} icon={AlertTriangle} tone="rose" />
        <StatCard label="Awaiting approval" value={s.submitted} icon={Hourglass} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Awaiting your approval">
          <MiniList tasks={d.awaitingApproval} showAssignee empty="Nothing waiting for review" />
        </Section>
        <Section title="Overdue">
          <MiniList tasks={d.overdue} showAssignee empty="No overdue tasks" />
        </Section>
        <Section title="Blocked: problems reported">
          <MiniList tasks={d.blocked} showAssignee empty="No blocked tasks" />
        </Section>
        <Section title="Deadline extension requests">
          <MiniList
            tasks={d.pendingExtensions}
            showAssignee
            empty="No pending requests"
            extra={(t) => `${formatDate(t.deadline)} → ${formatDate(t.requestedDeadline)}`}
          />
        </Section>
        <Section title="Due in the next 7 days">
          <MiniList tasks={d.dueSoon} showAssignee empty="Nothing due this week" />
        </Section>
        <Section title="Recent activity">
          {d.recentActivity.length === 0 ? (
            <Empty>No activity yet</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="flex gap-3 px-5 py-3">
                  <Avatar name={a.user.name} size="sm" />
                  <div className="min-w-0 text-sm">
                    <p className="text-slate-700">
                      <span className="font-medium text-slate-900">{a.user.name}</span> {a.action}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      <Link to={`/tasks/${a.task.id}`} className="hover:text-indigo-600">{a.task.title}</Link> · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function EmployeeDashboard({ d, name }) {
  const s = d.stats;
  return (
    <>
      <PageHeader title={`Hello, ${name.split(' ')[0]}`} subtitle="Here's what's on your plate">
        <Link to="/logs" className="btn-secondary">Write today's log</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="To do" value={s.todo} icon={ListTodo} tone="slate" />
        <StatCard label="In progress" value={s.inProgress} icon={Clock} tone="blue" />
        <StatCard label="Blocked" value={s.blocked} icon={AlertOctagon} tone="rose" />
        <StatCard label="Submitted" value={s.submitted} icon={Hourglass} tone="amber" />
        <StatCard label="Completed" value={s.completed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Overdue" value={s.overdue} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Needs your attention" className="lg:col-span-2">
          <TaskList tasks={d.needsAttention} emptyText="You're all caught up" />
        </Section>
        <Section title="Overdue & due today">
          <MiniList tasks={[...d.overdue, ...d.dueToday]} empty="Nothing due today" />
        </Section>
        <Section title={<span className="flex items-center gap-2"><CalendarClock size={16} /> Upcoming this week</span>}>
          <MiniList
            tasks={d.dueSoon.filter((t) => !d.dueToday.some((x) => x.id === t.id))}
            empty="Nothing else due this week"
          />
        </Section>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user, isSupervisor } = useAuth();
  const { data, error, loading } = useApi('/dashboard');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  return isSupervisor ? <SupervisorDashboard d={data} /> : <EmployeeDashboard d={data} name={user.name} />;
}
