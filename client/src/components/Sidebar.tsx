import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Trash2,
  X,
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

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

interface NewSiteModalProps {
  onClose: () => void;
  onCreated: (site: Site) => void;
}

function NewSiteModal({ onClose, onCreated }: NewSiteModalProps) {
  const [name, setName] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Nome é obrigatório'); return; }
    setSaving(true);
    setError('');
    try {
      const spreadsheetId = sheetUrl.trim() ? extractSpreadsheetId(sheetUrl.trim()) : null;
      const sheetConfig = spreadsheetId
        ? { spreadsheetId, gids: {} }
        : undefined;
      const site = await api.post<Site>('/sites', {
        name: trimmedName,
        url: null,
        ...(sheetConfig ? { sheetConfig } : {}),
      });
      onCreated(site);
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Novo Site</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome do site <span className="text-red-500">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
              placeholder="Ex: Minha Empresa"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Link da Planilha Google Sheets <span className="text-gray-400">(opcional)</span></label>
            <input
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {sheetUrl.trim() && !extractSpreadsheetId(sheetUrl.trim()) && (
              <p className="mt-1 text-xs text-amber-600">URL inválida — cole o link completo da planilha</p>
            )}
            {sheetUrl.trim() && extractSpreadsheetId(sheetUrl.trim()) && (
              <p className="mt-1 text-xs text-green-600">ID detectado: {extractSpreadsheetId(sheetUrl.trim())}</p>
            )}
            <p className="mt-1 text-[11px] text-gray-400">Você poderá configurar as abas específicas depois em Configurações</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Criando...' : 'Criar Site'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SiteSelector() {
  const { sites, selectedSite, setSelectedSite, refreshSites } = useSite();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
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

  const handleDelete = async (e: React.MouseEvent, site: Site) => {
    e.stopPropagation();
    if (deletingId === site.id) {
      // Confirmed — delete
      try {
        await api.del(`/sites/${site.id}`);
        const remaining = sites.filter(s => s.id !== site.id);
        if (selectedSite?.id === site.id && remaining.length > 0) {
          setSelectedSite(remaining[0]);
        }
        await refreshSites();
        if (selectedSite?.id === site.id) {
          window.location.reload();
        }
      } catch {
        // ignore
      }
      setDeletingId(null);
    } else {
      setDeletingId(site.id);
    }
  };

  const handleCreated = async (site: Site) => {
    await refreshSites();
    setSelectedSite(site);
    setShowModal(false);
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      {showModal && <NewSiteModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
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
              <div
                key={site.id}
                className="flex items-center gap-1 hover:bg-gray-700 transition-colors group"
              >
                <button
                  onClick={() => handleSelect(site)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-gray-300 text-left min-w-0"
                >
                  {selectedSite?.id === site.id && <Check size={12} className="text-indigo-400 shrink-0" />}
                  <span className={`truncate ${selectedSite?.id === site.id ? 'text-white font-medium' : ''}`}>{site.name}</span>
                </button>
                <button
                  onClick={(e) => handleDelete(e, site)}
                  title={deletingId === site.id ? 'Clique para confirmar exclusão' : 'Excluir site'}
                  className={`px-2 py-2 transition-colors shrink-0 ${
                    deletingId === site.id
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {deletingId !== null && (
              <div className="px-3 py-1.5 text-[10px] text-red-400 border-t border-gray-700 bg-gray-900">
                Clique no ícone novamente para confirmar exclusão
                <button
                  onClick={() => setDeletingId(null)}
                  className="ml-2 text-gray-400 hover:text-gray-200 underline"
                >
                  cancelar
                </button>
              </div>
            )}
            <div className="border-t border-gray-700">
              <button
                onClick={() => { setOpen(false); setShowModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Plus size={12} /> Novo site
              </button>
            </div>
          </div>
        )}
      </div>
    </>
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
