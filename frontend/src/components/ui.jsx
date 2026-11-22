import { Loader2, AlertTriangle } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin text-blue-700 ${className}`} size={20} />;
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
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
    indigo: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-50 text-sky-700',
  };
  return (
    <div className="card flex min-w-0 items-center gap-3.5 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
        <Icon size={19} strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div className="text-[1.4rem] font-semibold leading-7 tracking-tight tabular-nums text-slate-900">{value}</div>
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    checked_in: ['Checked in', 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'],
    unused: ['Not checked in', 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'],
    success: ['Checked in', 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'],
    duplicate: ['Already checked in', 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200'],
    invalid: ['Invalid', 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'],
  };
  const [label, cls] = map[status] || [status, 'bg-slate-100 text-slate-600'];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
