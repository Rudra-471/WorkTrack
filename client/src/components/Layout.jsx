import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Bell, CheckCheck, ClipboardList, LayoutDashboard, LogOut, Menu, NotebookPen, PlusCircle, UserCircle, Users, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import { Avatar } from './ui.jsx';

const NAV = {
  SUPERVISOR: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/tasks', label: 'All Tasks', icon: ClipboardList, end: true },
    { to: '/tasks/new', label: 'New Task', icon: PlusCircle },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/logs', label: 'Daily Reports', icon: NotebookPen },
  ],
  EMPLOYEE: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/tasks', label: 'My Tasks', icon: ClipboardList },
    { to: '/logs', label: 'Daily Log', icon: NotebookPen },
  ],
};

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
        <CheckCheck size={18} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">WorkTrack</span>
    </Link>
  );
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Logo />
      <nav className="flex flex-1 flex-col gap-1">
        {NAV[user.role].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <NavLink to="/notifications" className={linkClass} onClick={onNavigate}>
          <Bell size={18} /> Notifications
        </NavLink>
      </nav>
      <div className="border-t border-slate-200 pt-4">
        <NavLink to="/profile" className={linkClass} onClick={onNavigate}>
          <UserCircle size={18} /> Profile
        </NavLink>
        <button onClick={logout} className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  );
}

function NotificationBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const load = () => api('/notifications').then(setData).catch(() => {});

  // Check for new notifications every 30 seconds and whenever the page changes.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    load();
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api('/notifications/read-all', { method: 'POST' });
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        aria-label={`Notifications (${data.unread} unread)`}
      >
        <Bell size={20} />
        {data.unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-900">Notifications</span>
            {data.unread > 0 && (
              <button onClick={readAll} className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</li>}
            {data.items.slice(0, 8).map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-indigo-50/50'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-700">{n.message}</span>
                    <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2.5 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button onClick={() => setMenuOpen(false)} className="absolute top-5 right-4 cursor-pointer text-slate-500" aria-label="Close menu">
              <X size={20} />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenuOpen(true)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="lg:hidden"><Logo /></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <div className="hidden items-center gap-2.5 sm:flex">
            <Avatar name={user.name} />
            <div className="leading-tight">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role === 'SUPERVISOR' ? 'Supervisor' : 'Employee'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
