import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { api, setToken } from '../api';
import { ErrorBox, Spinner } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(username, password);
      setToken(token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="rounded-xl bg-indigo-600 p-3 text-white">
            <QrCode size={28} />
          </div>
          <h1 className="text-xl font-semibold">Invitation Admin</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>
        <ErrorBox message={error} />
        <div>
          <label className="mb-1 block text-sm font-medium">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner className="!text-white" /> : 'Sign in'}
        </button>
        <p className="text-center text-xs text-slate-400">The first login may take ~30s if the server is waking up.</p>
      </form>
    </div>
  );
}
