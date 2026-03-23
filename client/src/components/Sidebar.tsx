import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  CalendarRange,
  Globe,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/site-data', label: 'Desempenho do Site', icon: Globe },
  { to: '/performance', label: 'KPIs Ads', icon: BarChart3 },
  { to: '/budget', label: 'Orçamento', icon: DollarSign },
  { to: '/plan', label: 'Plano de Marketing', icon: CalendarRange },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white text-lg font-semibold tracking-tight">Marketing OS</h1>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'hover:bg-gray-800/50 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-800 text-xs text-gray-500">
        Marketing OS v1.0
      </div>
    </aside>
  );
}
