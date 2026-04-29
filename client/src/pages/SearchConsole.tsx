/**
 * Google Search Console Integration
 * Connect GSC account and analyze organic search performance
 */

import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { GscConnect } from '../components/GscConnect';
import { useSite } from '../context/SiteContext';

interface GscProperty {
  id: number;
  propertyUrl: string;
  propertyType: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  nextSyncAt: string;
}

export default function SearchConsolePage() {
  const { selectedSite } = useSite();
  const [properties, setProperties] = useState<GscProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (selectedSite?.id) {
      fetchProperties();
    }
  }, [selectedSite?.id]);

  const fetchProperties = async () => {
    if (!selectedSite?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/gsc/properties?siteId=${selectedSite.id}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : (data.data || []));
        setConnected(true);
      } else {
        setProperties([]);
        setConnected(false);
      }
    } catch (err) {
      console.error('Error fetching GSC properties:', err);
      setProperties([]);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (propertyId: number) => {
    if (!selectedSite?.id) return;
    try {
      const res = await fetch(
        `/api/gsc/sync?siteId=${selectedSite.id}&propertyId=${propertyId}`,
        { method: 'POST' }
      );
      if (res.ok) {
        fetchProperties();
      }
    } catch (err) {
      console.error('Error syncing GSC data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Google Search Console"
        description="Analyze organic search performance, queries, and ranking opportunities"
      />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Connection Status */}
        {!connected ? (
          <GscConnect onConnected={fetchProperties} />
        ) : (
          <Card className="bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <p className="text-emerald-800 font-medium">
                ✓ Google Search Console conectado
              </p>
            </div>
          </Card>
        )}

        {/* Properties List */}
        {connected && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Propriedades Conectadas ({properties.length})
              </h2>

              {properties.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                  Nenhuma propriedade sincronizada ainda. Você pode registrar uma nova propriedade.
                </Card>
              ) : (
                <div className="space-y-4">
                  {properties.map(prop => (
                    <Card key={prop.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Search size={16} className="text-blue-600" />
                            {prop.propertyUrl}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Tipo: {prop.propertyType === 'SITE' ? 'Site completo' : 'Prefixo URL'}
                          </p>
                          {prop.lastSyncedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Última sincronização: {prop.lastSyncedAt}
                            </p>
                          )}
                          {prop.nextSyncAt && (
                            <p className="text-xs text-gray-500">
                              Próxima sincronização: {prop.nextSyncAt}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSync(prop.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Sincronizar
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <Card className="bg-blue-50 border-blue-200 p-4">
              <h3 className="font-medium text-blue-900 mb-2">Próximos passos</h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Sincronize suas propriedades para visualizar queries e posicionamento</li>
                <li>Acesse a página de <a href="/unit-economics" className="underline">Unit Economics</a> para analisar CAC e LTV</li>
                <li>Analise oportunidades de otimização de SEO</li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
