import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, QrCode, CheckCircle2, Hourglass, Percent, Download, Search } from 'lucide-react';
import { api } from '../api';
import { usePolling, formatDateTime } from '../hooks';
import { ErrorBox, ProgressBar, Spinner, StatCard, StatusBadge } from '../components/ui';

export default function Dashboard() {
  const { data, error, loading, reload } = usePolling(() => api.stats(), 5000);
  const [search, setSearch] = useState('');
  const [exportError, setExportError] = useState('');

  if (loading && !data) return <Spinner className="mx-auto mt-20" />;
  if (!data) return <ErrorBox message={error} onRetry={reload} />;

  const { totals, companies, recent } = data;
  const filtered = companies.filter((c) => c.company_name.toLowerCase().includes(search.toLowerCase()));

  const exportSummary = async () => {
    setExportError('');
    try {
      await api.download('/reports/summary.csv', 'company-summary.csv');
    } catch (e) {
      setExportError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Live check-in counts, refreshed every 5 seconds.</p>
        </div>
        <button className="btn-secondary" onClick={exportSummary}>
          <Download size={16} /> Export summary CSV
        </button>
      </div>

      <ErrorBox message={error || exportError} onRetry={error ? reload : undefined} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Building2} label="Companies" value={totals.companies} tone="slate" />
        <StatCard icon={QrCode} label="Invitations generated" value={totals.allocated} tone="indigo" />
        <StatCard icon={CheckCircle2} label="Checked in" value={totals.scanned} tone="green" />
        <StatCard icon={Hourglass} label="Remaining" value={totals.remaining} tone="amber" />
        <StatCard icon={Percent} label="Check-in rate" value={`${totals.percentage}%`} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="font-semibold">Company-wise statistics</h2>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Company</th>
                  <th className="th text-right">Allocated</th>
                  <th className="th text-right">Scanned</th>
                  <th className="th text-right">Remaining</th>
                  <th className="th w-40">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link to={`/companies/${c.id}`} className="font-medium text-indigo-600 hover:underline">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="td text-right">{c.allocated}</td>
                    <td className="td text-right font-medium text-emerald-600">{c.scanned}</td>
                    <td className="td text-right">{c.remaining}</td>
                    <td className="td">
                      <ProgressBar value={c.allocated ? (c.scanned / c.allocated) * 100 : 0} />
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="td py-10 text-center text-slate-400">
                      {companies.length ? 'No company matches your search.' : 'No companies yet. Add one in Companies.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {companies.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="td">Total</td>
                    <td className="td text-right">{totals.allocated}</td>
                    <td className="td text-right text-emerald-600">{totals.scanned}</td>
                    <td className="td text-right">{totals.remaining}</td>
                    <td className="td" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="card">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-semibold">Recent scanning activity</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => {
              const { date, time } = formatDateTime(s.scanned_at);
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.invitation_code || 'Unknown code'}</div>
                    <div className="truncate text-xs text-slate-500">
                      {s.company_name || '-'} - {date} {time}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              );
            })}
            {!recent.length && <li className="px-4 py-10 text-center text-sm text-slate-400">No scans yet.</li>}
          </ul>
          <div className="border-t border-slate-100 p-3 text-center">
            <Link to="/history" className="text-sm font-medium text-indigo-600 hover:underline">
              View full history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
