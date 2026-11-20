import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import { formatDateTime, usePolling } from '../hooks';
import { ErrorBox, Spinner, StatusBadge } from '../components/ui';

export default function History() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, loading, reload } = usePolling(() => api.scans(status), 5000, [status]);

  const rows = (data || []).filter((s) => {
    const q = search.toLowerCase();
    return !q || (s.invitation_code || '').toLowerCase().includes(q) || (s.company_name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan History</h1>
        <p className="text-sm text-slate-500">Latest 300 scans, including repeated and invalid attempts.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-9" placeholder="Search company or invitation ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All results</option>
          <option value="success">Checked in</option>
          <option value="duplicate">Already checked in</option>
          <option value="invalid">Invalid</option>
        </select>
      </div>

      <ErrorBox message={error} onRetry={reload} />

      {loading && !data ? (
        <Spinner className="mx-auto my-10" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Invitation ID</th>
                <th className="th">Company</th>
                <th className="th">Date</th>
                <th className="th">Time</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => {
                const { date, time } = formatDateTime(s.scanned_at);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="td font-medium">{s.invitation_code || <span className="text-slate-400">Unknown code</span>}</td>
                    <td className="td">{s.company_name || '-'}</td>
                    <td className="td">{date}</td>
                    <td className="td">{time}</td>
                    <td className="td">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="td py-10 text-center text-slate-400">
                    No scans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
