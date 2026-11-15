import { Link, Navigate, Route, Routes } from 'react-router';
import { useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import TaskFormPage from './pages/TaskFormPage.jsx';
import DailyLog from './pages/DailyLog.jsx';
import Team from './pages/Team.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';

function SupervisorOnly({ children }) {
  const { isSupervisor } = useAuth();
  return isSupervisor ? children : <Navigate to="/" replace />;
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold text-slate-900">Page not found</p>
      <Link to="/" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">Back to dashboard</Link>
    </div>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/new" element={<SupervisorOnly><TaskFormPage /></SupervisorOnly>} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="tasks/:id/edit" element={<SupervisorOnly><TaskFormPage /></SupervisorOnly>} />
        <Route path="logs" element={<DailyLog />} />
        <Route path="team" element={<SupervisorOnly><Team /></SupervisorOnly>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
