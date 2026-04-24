import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import type { Site } from '../context/SiteContext';
import { api } from '../lib/api';

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

function SiteSelector() {
  const { sites, selectedSite, setSelectedSite, refreshSites } = useSite();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (site: Site) => {
    setSelectedSite(site);
    setOpen(false);
    window.location.reload();
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const site = await api.post<Site>('/sites', { name });
    await refreshSites();
    setSelectedSite(site);
    setNewName('');
    setAdding(false);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div ref={containerRef} className="relative px-3 mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
      >
        <span className="truncate font-medium">{selectedSite?.name ?? '...'}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden">
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => handleSelect(site)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors text-left"
            >
              {selectedSite?.id === site.id && <Check size={12} className="text-indigo-400 shrink-0" />}
              <span className={`truncate ${selectedSite?.id === site.id ? 'text-white font-medium' : ''}`}>{site.name}</span>
            </button>
          ))}
          <div className="border-t border-gray-700">
            {adding ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                  placeholder="Nome do site"
                  className="flex-1 bg-gray-900 text-white text-xs px-2 py-1 rounded outline-none border border-gray-600 focus:border-indigo-500"
                />
                <button onClick={handleAdd} className="text-indigo-400 hover:text-indigo-300 p-1"><Check size={13} /></button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Plus size={12} /> Novo site
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { selectedSite } = useSite();
  const siteName = selectedSite?.name ?? 'Mkt';

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white text-lg font-semibold tracking-tight">{siteName} Marketing</h1>
        <p className="text-gray-400 text-xs mt-0.5">Mkt Flight Control Center</p>
      </div>
      <div className="pt-3">
        <SiteSelector />
      </div>
      <nav className="flex-1 py-2 px-3 space-y-1">
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>
      <div className="px-3 pb-2 pt-2 border-t border-gray-800">
        {bottomNav.map(item => <NavItem key={item.to} {...item} />)}
      </div>
      <div className="px-5 py-3 text-xs text-gray-500">
        Mkt FCC v1.0
      </div>
    </aside>
  );
}
