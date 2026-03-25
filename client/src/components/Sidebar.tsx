import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  CalendarRange,
  Globe,
  Linkedin,
  Settings,
  Wallet,
  Briefcase,
  Lightbulb,
  FlaskConical,
} from 'lucide-react';

const mainNav = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/site-data', label: 'Desempenho do Site', icon: Globe },
  { to: '/performance', label: 'KPIs Ads', icon: BarChart3 },
  { to: '/ads-budgets', label: 'Verbas Ads', icon: Wallet },
  { to: '/linkedin-page', label: 'LinkedIn Page', icon: Linkedin },
  { to: '/budget', label: 'Orçamento', icon: DollarSign },
  { to: '/plan', label: 'Plano de Marketing', icon: CalendarRange },
  { to: '/experiments', label: 'Experimentos', icon: FlaskConical },
  { to: '/ideas', label: 'Log de Ideias', icon: Lightbulb },
  { to: '/suppliers', label: 'Fornecedores e Tools', icon: Briefcase },
];

const bottomNav = [
  { to: '/settings', label: 'Configurações', icon: Settings },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof LayoutDashboard }) {
  return (
    <NavLink
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
  );
}

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white text-lg font-semibold tracking-tight">Brick Marketing</h1>
        <p className="text-gray-400 text-xs mt-0.5">Flight Control Center</p>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>
      <div className="px-3 pb-2 pt-2 border-t border-gray-800">
        {bottomNav.map(item => <NavItem key={item.to} {...item} />)}
      </div>
      <div className="px-5 py-3 text-xs text-gray-500">
        Brick Marketing v1.0
      </div>
    </aside>
  );
}
