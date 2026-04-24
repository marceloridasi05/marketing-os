import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface Site {
  id: number;
  name: string;
  url: string | null;
  sheetConfig: string | null;
  createdAt: string;
}

/** Which sections + columns were discovered in the connected sheet */
export interface SiteSchema {
  spreadsheetId?: string;
  gids?: Record<string, number>;
  /** null = no sheet configured → show all sections (don't hide anything) */
  tabs: string[] | null;
  columns: Record<string, string[]>;
}

export const ALL_SECTIONS = ['siteData', 'adsKpis', 'linkedinPage', 'planSchedule', 'budgetItems', 'adsBudgets'] as const;
export type SectionKey = typeof ALL_SECTIONS[number];

function parseSiteSchema(sheetConfig: string | null): SiteSchema {
  if (!sheetConfig) return { tabs: null, columns: {} };
  try {
    const cfg = JSON.parse(sheetConfig);
    return {
      spreadsheetId: cfg.spreadsheetId,
      gids: cfg.gids,
      // tabs array present → scoped; missing → legacy config → show all
      tabs: Array.isArray(cfg.tabs) ? cfg.tabs : null,
      columns: cfg.columns ?? {},
    };
  } catch {
    return { tabs: null, columns: {} };
  }
}

interface SiteContextType {
  sites: Site[];
  selectedSite: Site | null;
  setSelectedSite: (site: Site) => void;
  loading: boolean;
  refreshSites: () => Promise<void>;
  siteSchema: SiteSchema;
  /** Returns true when a section should be visible for the selected site */
  hasSection: (key: SectionKey) => boolean;
  /** Returns the detected columns for a section, or null if all should show */
  sectionColumns: (key: SectionKey) => string[] | null;
}

const SiteContext = createContext<SiteContextType | null>(null);

export const SITE_STORAGE_KEY = 'mkt_selected_site_id';

export function SiteProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSiteState] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSites = async () => {
    const data: Site[] = await fetch('/api/sites').then(r => r.json());
    setSites(data);
    const savedId = localStorage.getItem(SITE_STORAGE_KEY);
    const saved = savedId ? data.find(s => s.id === +savedId) : null;
    const site = saved || data[0] || null;
    setSelectedSiteState(site);
    if (site) localStorage.setItem(SITE_STORAGE_KEY, String(site.id));
    return data;
  };

  useEffect(() => {
    loadSites().finally(() => setLoading(false));
  }, []);

  const setSelectedSite = (site: Site) => {
    setSelectedSiteState(site);
    localStorage.setItem(SITE_STORAGE_KEY, String(site.id));
  };

  const refreshSites = async () => { await loadSites(); };

  const siteSchema = useMemo(() => parseSiteSchema(selectedSite?.sheetConfig ?? null), [selectedSite]);

  const hasSection = (key: SectionKey): boolean => {
    // No tabs array → legacy site or no sheet → show everything
    if (siteSchema.tabs === null) return true;
    return siteSchema.tabs.includes(key);
  };

  const sectionColumns = (key: SectionKey): string[] | null => {
    const cols = siteSchema.columns[key];
    return cols && cols.length > 0 ? cols : null;
  };

  return (
    <SiteContext.Provider value={{ sites, selectedSite, setSelectedSite, loading, refreshSites, siteSchema, hasSection, sectionColumns }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
