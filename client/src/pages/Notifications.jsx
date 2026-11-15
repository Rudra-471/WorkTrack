import { useNavigate } from 'react-router';
import { api, useApi } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { Empty, ErrorBox, Loading, PageHeader } from '../components/ui.jsx';

export default function Notifications() {
  const { data, error, loading, reload } = useApi('/notifications');
  const navigate = useNavigate();

  const open = async (n) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    if (n.link) navigate(n.link);
    else reload();
  };

  if (loading && !data) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" subtitle={data ? `${data.unread} unread` : ''}>
        {data?.unread > 0 && (
          <button className="btn-secondary" onClick={() => api('/notifications/read-all', { method: 'POST' }).then(reload)}>
            Mark all as read
          </button>
        )}
      </PageHeader>
      <ErrorBox message={error} />
      <div className="card overflow-hidden">
        {!data?.items.length ? (
          <Empty>No notifications yet</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full cursor-pointer gap-3 px-5 py-4 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-indigo-50/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : 'bg-indigo-500'}`} />
                  <span>
                    <span className={`block text-sm ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{n.message}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
