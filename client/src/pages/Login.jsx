import { useState } from 'react';
import { ArrowLeft, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox } from '../components/ui.jsx';

// Sign-in has two steps: enter your email, then either your password or,
// on your first visit, create one.
export default function Login() {
  const { login, setupAccount } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'password' | 'setup'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const checkEmail = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api('/auth/check', { method: 'POST', body: { email } });
      if (r.next === 'setup') setName(r.name || '');
      setStep(r.next);
    });
  };

  const signIn = (e) => {
    e.preventDefault();
    run(() => login(email, password));
  };

  const createPassword = (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("The passwords don't match");
    run(() => setupAccount(email, name, password));
  };

  const back = () => {
    setStep('email');
    setPassword('');
    setConfirm('');
    setError('');
  };

  const titles = {
    email: ['Sign in to WorkTrack', 'Assign, track and review work in one place'],
    password: ['Welcome back', email],
    setup: ['Create your password', `First time signing in as ${email}`],
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <CheckCheck size={24} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">{titles[step][0]}</h1>
          <p className="mt-1 text-sm break-all text-slate-500">{titles[step][1]}</p>
        </div>

        <div className="card space-y-4 p-6">
          <ErrorBox message={error} />

          {step === 'email' && (
            <form onSubmit={checkEmail} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" className="input" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value.trim())} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />} Continue
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={signIn} className="space-y-4">
              <input type="email" value={email} autoComplete="username" readOnly hidden />
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" className="input" autoComplete="current-password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />} Sign in
              </button>
              <p className="text-center text-xs text-slate-400">Forgot your password? Ask your supervisor to reset it.</p>
            </form>
          )}

          {step === 'setup' && (
            <form onSubmit={createPassword} className="space-y-4">
              <input type="email" value={email} autoComplete="username" readOnly hidden />
              <div>
                <label className="label" htmlFor="name">Your name</label>
                <input id="name" className="input" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="new-password">New password</label>
                <input id="new-password" type="password" className="input" autoComplete="new-password" autoFocus required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">At least 8 characters</p>
              </div>
              <div>
                <label className="label" htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />} Create password and sign in
              </button>
            </form>
          )}

          {step !== 'email' && (
            <button type="button" onClick={back} className="mx-auto flex cursor-pointer items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft size={14} /> Use a different email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
