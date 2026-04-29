import { createContext, useContext, useEffect, useState } from 'react';
import { useSite } from './SiteContext';
import { api } from '../lib/api';
import type { FunnelModel, FunnelStageConfig, FunnelModelId } from '../lib/funnelModels';

export interface FunnelContextType {
  funnelModelId: string;
  funnelConfig: FunnelModel | null;
  customFunnels: any[];
  loading: boolean;
  error: string | null;
  setFunnelModel(modelId: string): Promise<void>;
  createCustomFunnel(config: FunnelModel): Promise<void>;
}

const FunnelContext = createContext<FunnelContextType | undefined>(undefined);

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const { selectedSite } = useSite();
  const STORAGE_KEY = selectedSite ? `funnel_${selectedSite.id}` : null;

  const [funnelModelId, setFunnelModelId] = useState<string>(() => {
    if (!STORAGE_KEY) return 'sales_led';
    return localStorage.getItem(STORAGE_KEY) || 'sales_led';
  });

  const [funnelConfig, setFunnelConfig] = useState<FunnelModel | null>(null);
  const [customFunnels, setCustomFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load funnel model from server first time site loads
  useEffect(() => {
    if (!selectedSite) return;

    setLoading(true);
    api
      .get<{ funnelModelId: string }>(`/api/sites/${selectedSite.id}`)
      .then(response => {
        const serverModelId = response.funnelModelId || 'sales_led';
        setFunnelModelId(serverModelId);
        if (STORAGE_KEY) {
          localStorage.setItem(STORAGE_KEY, serverModelId);
        }
      })
      .catch(() => {
        // Fallback to localStorage/default if fetch fails
      })
      .finally(() => setLoading(false));
  }, [selectedSite, STORAGE_KEY]);

  // Load funnel config when site or model changes
  useEffect(() => {
    if (!selectedSite) {
      setFunnelConfig(null);
      return;
    }

    console.log('[FunnelContext] Loading config for model:', funnelModelId, 'site:', selectedSite.id);
    setLoading(true);
    setError(null);

    api
      .get<{ model: FunnelModel; customFunnels: any[] }>(
        `/api/funnels/${funnelModelId}?siteId=${selectedSite.id}`
      )
      .then(response => {
        console.log('[FunnelContext] Config loaded successfully:', {
          modelId: response.model.id,
          name: response.model.name,
          stages: response.model.stages.length,
        });
        setFunnelConfig(response.model);
        setCustomFunnels(response.customFunnels || []);
      })
      .catch(err => {
        setError(String(err));
        console.error('[FunnelContext] Failed to load funnel config:', err);
      })
      .finally(() => setLoading(false));
  }, [funnelModelId, selectedSite]);

  const handleSetFunnelModel = async (modelId: string) => {
    if (!selectedSite) return;

    try {
      setLoading(true);
      await api.post(`/api/funnels/set?siteId=${selectedSite.id}`, { modelId });
      setFunnelModelId(modelId);
      if (STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, modelId);
      }
    } catch (err) {
      setError(String(err));
      console.error('Failed to set funnel model:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomFunnel = async (config: FunnelModel) => {
    if (!selectedSite) return;

    try {
      setLoading(true);
      const result = await api.post<any>(`/api/funnels/custom?siteId=${selectedSite.id}`, config);
      setCustomFunnels(prev => [...prev, result]);
    } catch (err) {
      setError(String(err));
      console.error('Failed to create custom funnel:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FunnelContext.Provider
      value={{
        funnelModelId,
        funnelConfig,
        customFunnels,
        loading,
        error,
        setFunnelModel: handleSetFunnelModel,
        createCustomFunnel: handleCreateCustomFunnel,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}

export function useFunnel(): FunnelContextType {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error('useFunnel must be used within FunnelProvider');
  }
  return context;
}
