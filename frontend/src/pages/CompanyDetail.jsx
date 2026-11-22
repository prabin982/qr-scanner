import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, FileArchive, FileSpreadsheet, Plus, Search } from 'lucide-react';
import { api } from '../api';
import { downloadPdf, downloadPng, downloadZip } from '../lib/exports';
import { formatDateTime, usePolling } from '../hooks';
import { ErrorBox, ProgressBar, Spinner, StatusBadge } from '../components/ui';

export default function CompanyDetail() {
  const { id } = useParams();
  const { data: company, error: companyError, reload: reloadCompany } = usePolling(() => api.company(id), 5000, [id]);
  const [invitations, setInvitations] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [addCount, setAddCount] = useState(10);
  const [busy, setBusy] = useState('');

  const loadInvitations = async () => {
    try {
      setInvitations(await api.invitations({ company_id: id, include_qr: 'true', limit: 1000 }));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    setInvitations(null);
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // keep check-in status of the list fresh without refetching QR images
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await api.invitations({ company_id: id, limit: 1000 });
        const map = new Map(fresh.map((f) => [f.id, f]));
        setInvitations((prev) =>
          prev ? prev.map((p) => (map.has(p.id) ? { ...p, status: map.get(p.id).status, checked_in_at: map.get(p.id).checked_in_at } : p)) : prev
        );
      } catch {
        /* ignore background refresh errors */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [id]);

  const visible = useMemo(() => {
    if (!invitations) return [];
    return invitations.filter(
      (i) =>
        (!status || i.status === status) &&
        (!search || i.invitation_code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [invitations, status, search]);

  const run = async (name, fn) => {
    setBusy(name);
    setActionError('');
    try {
      await fn();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };

  const addMore = (e) => {
    e.preventDefault();
    run('add', async () => {
      await api.addInvitations(id, Number(addCount));
      await Promise.all([loadInvitations(), reloadCompany()]);
    });
  };

  if (companyError && !company) return <ErrorBox message={companyError} onRetry={reloadCompany} />;
  if (!company) return <Spinner className="mx-auto mt-20" />;

  const pct = company.allocated ? (company.scanned / company.allocated) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/companies" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft size={16} /> All companies
        </Link>
        <h1 className="page-title">{company.company_name}</h1>
        <p className="page-description">ID prefix: {company.prefix}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Allocated</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{company.allocated}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Scanned</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums text-emerald-700">{company.scanned}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Remaining</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{company.remaining}</div>
          <div className="mt-2">
            <ProgressBar value={pct} />
          </div>
        </div>
      </div>

      <div className="card flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={!invitations?.length || !!busy}
            onClick={() => run('pdf', async () => downloadPdf(company.company_name, invitations))}
          >
            <FileText size={16} /> {busy === 'pdf' ? 'Preparing...' : 'Printable PDF'}
          </button>
          <button
            className="btn-secondary"
            disabled={!invitations?.length || !!busy}
            onClick={() => run('zip', () => downloadZip(company.company_name, invitations))}
          >
            <FileArchive size={16} /> {busy === 'zip' ? 'Preparing...' : 'All QR images (ZIP)'}
          </button>
          <button
            className="btn-secondary"
            disabled={!!busy}
            onClick={() => run('csv', () => api.download(`/reports/invitations.csv?company_id=${id}`, `${company.prefix}-report.csv`))}
          >
            <FileSpreadsheet size={16} /> Report CSV
          </button>
        </div>
        <form onSubmit={addMore} className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Add more QR codes</label>
            <input
              type="number"
              min={1}
              max={500}
              className="input w-28"
              value={addCount}
              onChange={(e) => setAddCount(e.target.value)}
              required
            />
          </div>
          <button className="btn-secondary" disabled={!!busy}>
            {busy === 'add' ? <Spinner /> : <Plus size={16} />} Add
          </button>
        </form>
      </div>

      <ErrorBox message={actionError || error} onRetry={error ? loadInvitations : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-9" placeholder="Search invitation ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="unused">Not checked in</option>
          <option value="checked_in">Checked in</option>
        </select>
        <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
          {['grid', 'table'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 capitalize transition-colors ${view === v ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {!invitations && !error ? (
        <Spinner className="mx-auto my-10" />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {visible.map((inv) => (
            <div key={inv.id} className="card p-3 text-center">
              <img src={inv.qr_code_data} alt={inv.invitation_code} loading="lazy" className="mx-auto w-full max-w-[160px]" />
              <div className="mt-2 text-sm font-semibold">{inv.invitation_code}</div>
              <div className="mt-1">
                <StatusBadge status={inv.status} />
              </div>
              <button className="btn-secondary mt-3 w-full !py-1.5 text-xs" onClick={() => downloadPng(inv)}>
                <Download size={14} /> PNG
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Invitation ID</th>
                <th className="th">Status</th>
                <th className="th">Checked in at</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((inv) => {
                const { date, time } = formatDateTime(inv.checked_in_at);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="td font-medium">{inv.invitation_code}</td>
                    <td className="td">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="td text-slate-500">{inv.checked_in_at ? `${date} ${time}` : '-'}</td>
                    <td className="td text-right">
                      <button className="btn-secondary !px-3 !py-1.5" onClick={() => downloadPng(inv)}>
                        <Download size={14} /> PNG
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {invitations && !visible.length && <p className="py-6 text-center text-sm text-slate-400">No invitations match.</p>}
    </div>
  );
}
