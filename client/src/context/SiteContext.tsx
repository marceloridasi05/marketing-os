import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Site {
  id: number;
  name: string;
  url: string | null;
  createdAt: string;
}

interface SiteContextType {
  sites: Site[];
  selectedSite: Site | null;
  setSelectedSite: (site: Site) => void;
  loading: boolean;
  refreshSites: () => Promise<void>;
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

  const refreshSites = async () => {
    await loadSites();
  };

  return (
    <SiteContext.Provider value={{ sites, selectedSite, setSelectedSite, loading, refreshSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
