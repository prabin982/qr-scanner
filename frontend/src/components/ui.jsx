import { Loader2, AlertTriangle } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin text-indigo-600 ${className}`} size={20} />;
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`rounded-lg p-3 ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    checked_in: ['Checked in', 'bg-emerald-100 text-emerald-700'],
    unused: ['Not checked in', 'bg-slate-100 text-slate-600'],
    success: ['Checked in', 'bg-emerald-100 text-emerald-700'],
    duplicate: ['Already checked in', 'bg-amber-100 text-amber-700'],
    invalid: ['Invalid', 'bg-red-100 text-red-700'],
  };
  const [label, cls] = map[status] || [status, 'bg-slate-100 text-slate-600'];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
