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
  Check,
  Table2,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import type { Site, SheetMeta, SectionKey } from '../context/SiteContext';
import { NewSiteModal } from './NewSiteModal';

// ── Specialised route mapping for known section types ─────────────────────────

interface NavDef {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  cap?: SectionKey; // legacy: only used when sheets[] is absent
}

const TYPE_ROUTES: Record<string, NavDef> = {
  siteData:     { to: '/site-data',     label: 'Desempenho do Site',   icon: Globe },
  adsKpis:      { to: '/performance',   label: 'KPIs Ads',             icon: BarChart3 },
  linkedinPage: { to: '/linkedin-page', label: 'LinkedIn Page',        icon: Linkedin },
  planSchedule: { to: '/plan',          label: 'Plano de Marketing',   icon: CalendarRange },
  budgetItems:  { to: '/budget',        label: 'Orçamento',            icon: DollarSign },
  adsBudgets:   { to: '/ads-budgets',   label: 'Verbas Ads',           icon: Wallet },
};

/** Always-visible sections (manual data, not sheet-dependent) */
const MANUAL_NAV: NavDef[] = [
  { to: '/experiments', label: 'Experimentos',         icon: FlaskConical },
  { to: '/ideas',       label: 'Log de Ideias',        icon: Lightbulb },
  { to: '/suppliers',   label: 'Fornecedores e Tools', icon: Briefcase },
];

/** Legacy nav — shown when site has no sheets[] metadata */
const LEGACY_MAIN: NavDef[] = [
  { to: '/',              label: 'Painel',              icon: LayoutDashboard },
  { to: '/site-data',     label: 'Desempenho do Site',  icon: Globe,           cap: 'siteData' },
  { to: '/performance',   label: 'KPIs Ads',            icon: BarChart3,       cap: 'adsKpis' },
  { to: '/ads-budgets',   label: 'Verbas Ads',          icon: Wallet,          cap: 'adsBudgets' },
  { to: '/linkedin-page', label: 'LinkedIn Page',       icon: Linkedin,        cap: 'linkedinPage' },
  { to: '/budget',        label: 'Orçamento',           icon: DollarSign,      cap: 'budgetItems' },
  { to: '/plan',          label: 'Plano de Marketing',  icon: CalendarRange,   cap: 'planSchedule' },
];

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ to, label, icon: Icon }: Pick<NavDef, 'to' | 'label' | 'icon'>) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50 hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// ── SiteSelector ──────────────────────────────────────────────────────────────

function SiteSelector() {
  const { sites, selectedSite, setSelectedSite, refreshSites } = useSite();
  const [open, setOpen]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (site: Site) => {
    setSelectedSite(site);
    setOpen(false);
    window.location.reload();
  };

  const handleCreated = async (site: Site) => {
    setShowModal(false);
    await refreshSites();
    setSelectedSite(site);
    window.location.reload();
  };

  return (
    <>
      <div ref={containerRef} className="relative px-3 mb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
        >
          <span className="truncate font-medium">{selectedSite?.name ?? '…'}</span>
          <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-md shadow-xl overflow-hidden">
            {sites.map(site => (
              <button
                key={site.id}
                onClick={() => handleSelect(site)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors text-left"
              >
                {selectedSite?.id === site.id && <Check size={12} className="text-indigo-400 shrink-0" />}
                <span className={`truncate ${selectedSite?.id === site.id ? 'text-white font-medium' : ''}`}>
                  {site.name}
                </span>
              </button>
            ))}
            <div className="border-t border-gray-700">
              <button
                onClick={() => { setOpen(false); setShowModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:bg-gray-700 hover:text-indigo-300 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Novo site…
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewSiteModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

// ── Build nav from discovered sheets ─────────────────────────────────────────

function buildSheetNav(sheets: SheetMeta[]): NavDef[] {
  return sheets.map(sheet => {
    // Known type → use specialised route
    if (sheet.type && TYPE_ROUTES[sheet.type]) {
      return { ...TYPE_ROUTES[sheet.type] };
    }
    // Unknown tab → generic sheet page
    return {
      to:    `/sheet/${sheet.gid}`,
      label: sheet.name,
      icon:  Table2,
    };
  });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { selectedSite, siteSchema, hasSection } = useSite();
  const siteName = selectedSite?.name ?? 'Mkt';

  // Dynamic mode: site has a sheets[] from the new inspector
  const hasSheetsSchema = Array.isArray(siteSchema.sheets) && siteSchema.sheets.length > 0;

  const sheetNavItems: NavDef[] = hasSheetsSchema
    ? buildSheetNav(siteSchema.sheets!)
    : [];

  // Legacy mode: use hasSection() to filter the fixed nav
  const legacyNavItems = LEGACY_MAIN.filter(item =>
    !item.cap || hasSection(item.cap as SectionKey)
  );

  const mainItems: NavDef[] = hasSheetsSchema
    ? [{ to: '/', label: 'Painel', icon: LayoutDashboard }, ...sheetNavItems]
    : legacyNavItems;

  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white text-lg font-semibold tracking-tight">{siteName} Marketing</h1>
        <p className="text-gray-400 text-xs mt-0.5">Mkt Flight Control Center</p>
      </div>
      <div className="pt-3">
        <SiteSelector />
      </div>
      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
        {mainItems.map(item => <NavItem key={item.to} {...item} />)}
        {MANUAL_NAV.map(item => <NavItem key={item.to} {...item} />)}
      </nav>
      <div className="px-3 pb-2 pt-2 border-t border-gray-800">
        <NavItem to="/settings" label="Configurações" icon={Settings} />
      </div>
      <div className="px-5 py-3 text-xs text-gray-500">Mkt FCC v1.0</div>
    </aside>
  );
}
