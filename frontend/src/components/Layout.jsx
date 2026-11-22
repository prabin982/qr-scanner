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
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] md:flex-row">
      <aside className="app-sidebar border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-6">
          <div className="flex items-center gap-3 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <QrCode size={20} strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Invitations</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link whitespace-nowrap ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 md:absolute md:bottom-4 md:block md:w-full">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="app-main min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-9">
        <div className="mx-auto w-full max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
