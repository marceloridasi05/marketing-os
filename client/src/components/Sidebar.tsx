import { NavLink, useLocation } from 'react-router-dom';
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
  Layers,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  X,
  Pencil,
  AlertTriangle,
  Rocket,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import type { Site } from '../context/SiteContext';
import { api } from '../lib/api';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: 'diagnostics',
    label: 'Diagnóstico',
    icon: AlertTriangle,
    items: [
      { to: '/insights', label: 'Insights & Alertas', icon: Zap },
    ],
  },
  {
    id: 'analysis',
    label: 'Análise',
    icon: BarChart3,
    items: [
      { to: '/site-data', label: 'Desempenho do Site', icon: Globe },
      { to: '/performance', label: 'KPIs Ads', icon: BarChart3 },
      { to: '/ads-budgets', label: 'Verbas Ads', icon: Wallet },
      { to: '/linkedin-page', label: 'LinkedIn Page', icon: Linkedin },
      { to: '/budget', label: 'Orçamento', icon: DollarSign },
      { to: '/unit-economics', label: 'Unit Economics', icon: TrendingUp },
      { to: '/growth-loops', label: 'Growth Loops', icon: Zap },
    ],
  },
  {
    id: 'execution',
    label: 'Execução',
    icon: Rocket,
    items: [
      { to: '/plan', label: 'Plano de Marketing', icon: CalendarRange },
      { to: '/search-console', label: 'Search Console', icon: Search },
      { to: '/utm-builder', label: 'UTM Builder', icon: Zap },
      { to: '/utm-library', label: 'UTM Library', icon: Layers },
      { to: '/utm-attribution', label: 'UTM Attribution', icon: BarChart3 },
      { to: '/experiments', label: 'Experimentos', icon: FlaskConical },
      { to: '/ideas', label: 'Log de Ideias', icon: Lightbulb },
      { to: '/suppliers', label: 'Fornecedores & Tools', icon: Briefcase },
    ],
  },
];

const settingsSection: NavSection = {
  id: 'settings',
  label: 'Configurações',
  icon: Settings,
  items: [
    { to: '/data-mapping', label: 'Mapeamento de Dados', icon: Layers },
    { to: '/settings', label: 'Configurações', icon: Settings },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  return section.items.some(item => {
    if (item.to === '/') return pathname === '/';
    return pathname === item.to || pathname.startsWith(item.to + '/');
  });
}

const STORAGE_KEY = 'nav-collapsed-sections';

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── NavLink item ─────────────────────────────────────────────────────────────

function SectionNavItem({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 pl-6 pr-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
          isActive
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
        }`
      }
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </NavLink>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function NavSection({
  section,
  collapsed,
  onToggle,
}: {
  section: NavSection;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon size={13} className="shrink-0" />
          {section.label}
        </span>
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronDown size={12} />}
      </button>

      {!collapsed && (
        <div className="mt-0.5 space-y-0.5">
          {section.items.map(item => (
            <SectionNavItem key={item.to} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Site selector & modal (unchanged) ───────────────────────────────────────

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
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

  const startRename = (e: React.MouseEvent, site: Site) => {
    e.stopPropagation();
    setEditingId(site.id);
    setEditingName(site.name);
    setDeletingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async (site: Site) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === site.name) { cancelRename(); return; }
    try {
      await api.put(`/sites/${site.id}`, { name: trimmed });
      await refreshSites();
      if (selectedSite?.id === site.id) {
        setSelectedSite({ ...site, name: trimmed });
      }
    } catch { /* ignore */ }
    cancelRename();
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
                {editingId === site.id ? (
                  <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(site);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); saveRename(site); }}
                      title="Salvar"
                      className="px-1.5 py-1 text-green-400 hover:text-green-300 shrink-0"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                      title="Cancelar"
                      className="px-1.5 py-1 text-gray-400 hover:text-gray-200 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelect(site)}
                      className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-gray-300 text-left min-w-0"
                    >
                      {selectedSite?.id === site.id && <Check size={12} className="text-indigo-400 shrink-0" />}
                      <span className={`truncate ${selectedSite?.id === site.id ? 'text-white font-medium' : ''}`}>{site.name}</span>
                    </button>
                    <button
                      onClick={(e) => startRename(e, site)}
                      title="Renomear site"
                      className="px-1.5 py-2 text-gray-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-colors shrink-0"
                    >
                      <Pencil size={12} />
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
                  </>
                )}
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

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function Sidebar() {
  const { selectedSite } = useSite();
  const location = useLocation();
  const siteName = selectedSite?.name ?? 'Mkt';

  // Collapsed state per section, persisted in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const stored = loadCollapsed();
    // Default: all sections open
    const defaults: Record<string, boolean> = {};
    [...navSections, settingsSection].forEach(s => {
      defaults[s.id] = stored[s.id] ?? false;
    });
    return defaults;
  });

  // Auto-expand the section containing the active route
  useEffect(() => {
    const allSections = [...navSections, settingsSection];
    const activeSection = allSections.find(s => sectionContainsPath(s, location.pathname));
    if (activeSection && collapsed[activeSection.id]) {
      setCollapsed(prev => {
        const next = { ...prev, [activeSection.id]: false };
        saveCollapsed(next);
        return next;
      });
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (id: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveCollapsed(next);
      return next;
    });
  };

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white text-lg font-semibold tracking-tight">{siteName} Marketing</h1>
        <p className="text-gray-400 text-xs mt-0.5">Mkt Flight Control Center</p>
      </div>

      {/* Site selector */}
      <div className="pt-3">
        <SiteSelector />
      </div>

      {/* Dashboard — standalone top-level link */}
      <div className="px-3 pt-2 pb-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={16} className="shrink-0" />
          Dashboard
        </NavLink>
      </div>

      {/* Main nav sections */}
      <nav className="flex-1 py-1 px-3 space-y-1 overflow-y-auto">
        {navSections.map(section => (
          <NavSection
            key={section.id}
            section={section}
            collapsed={collapsed[section.id] ?? false}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </nav>

      {/* Settings section — pinned to bottom */}
      <div className="px-3 pt-2 pb-2 border-t border-gray-800">
        <NavSection
          section={settingsSection}
          collapsed={collapsed[settingsSection.id] ?? false}
          onToggle={() => toggleSection(settingsSection.id)}
        />
      </div>

      <div className="px-5 py-3 text-xs text-gray-500">
        Mkt FCC v1.0
      </div>
    </aside>
  );
}
