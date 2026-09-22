import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
      >
        <h1 className="mb-6 text-2xl font-semibold text-slate-100">Log in</h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-900/50 bg-red-950/50 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <label className="mb-4 flex flex-col gap-1.5 text-sm text-slate-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
          />
        </label>

        <label className="mb-6 flex flex-col gap-1.5 text-sm text-slate-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-violet-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          No account?{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
