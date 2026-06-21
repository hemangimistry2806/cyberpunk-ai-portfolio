import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowUpRight, ArrowDownLeft, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/expenses', icon: ArrowDownLeft, label: 'Expenses' },
    { to: '/income', icon: ArrowUpRight, label: 'Income' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="p-2 bg-primary-500 rounded-lg text-white">
          <Wallet size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">VibeTracker</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 mt-auto"
      >
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
