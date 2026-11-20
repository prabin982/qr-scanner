import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ScanLine, History, LogOut, QrCode } from 'lucide-react';
import { clearToken } from '../api';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/scanner', label: 'Scanner', icon: ScanLine },
  { to: '/history', label: 'Scan History', icon: History },
];

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-slate-900 text-slate-200 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-6">
          <div className="flex items-center gap-2 text-white">
            <QrCode size={24} className="text-indigo-400" />
            <span className="text-lg font-semibold">Invitations</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white md:hidden">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 md:absolute md:bottom-4 md:block md:w-full">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
