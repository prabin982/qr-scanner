import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import { ErrorBox, Spinner } from '../components/ui';

export default function Companies() {
  const [companies, setCompanies] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ company_name: '', prefix: '', count: 10 });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setCompanies(await api.companies(search));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250); // small debounce for the search box
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api.createCompany({
        company_name: form.company_name,
        prefix: form.prefix,
        count: Number(form.count),
      });
      setForm({ company_name: '', prefix: '', count: 10 });
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.company_name}" and all ${c.allocated} of its invitations? This cannot be undone.`)) return;
    try {
      await api.deleteCompany(c.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-description">Manage organizations and the QR invitations assigned to each.</p>
        </div>
      </div>

      <form onSubmit={create} className="card grid gap-4 p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <div>
          <label className="mb-1 block text-sm font-medium">Company name</label>
          <input
            className="input"
            placeholder="e.g. Acme Pvt. Ltd."
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">ID prefix (optional)</label>
          <input
            className="input uppercase"
            placeholder="auto"
            maxLength={8}
            value={form.prefix}
            onChange={(e) => setForm({ ...form, prefix: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Invitations</label>
          <input
            type="number"
            min={1}
            max={500}
            className="input"
            value={form.count}
            onChange={(e) => setForm({ ...form, count: e.target.value })}
            required
          />
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? <Spinner className="!text-white" /> : <Plus size={16} />} Generate
        </button>
        {formError && (
          <div className="md:col-span-4">
            <ErrorBox message={formError} />
          </div>
        )}
      </form>

      <div className="card">
        <div className="border-b border-slate-100 p-4">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input className="input pl-9" placeholder="Search company" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {error && (
          <div className="p-4">
            <ErrorBox message={error} onRetry={load} />
          </div>
        )}
        {!companies && !error ? (
          <Spinner className="mx-auto my-10" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Company</th>
                  <th className="th">Prefix</th>
                  <th className="th text-right">Allocated</th>
                  <th className="th text-right">Scanned</th>
                  <th className="th text-right">Remaining</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(companies || []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td font-medium">
                      <Link to={`/companies/${c.id}`} className="text-blue-700 hover:text-blue-900 hover:underline">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="td text-slate-500">{c.prefix}</td>
                    <td className="td text-right">{c.allocated}</td>
                    <td className="td text-right text-emerald-600">{c.scanned}</td>
                    <td className="td text-right">{c.remaining}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/companies/${c.id}`} className="btn-secondary !px-3 !py-1.5">
                          Open
                        </Link>
                        <button className="btn-danger !px-3 !py-1.5" onClick={() => remove(c)} title="Delete company">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies && !companies.length && (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-slate-400">
                      No companies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
