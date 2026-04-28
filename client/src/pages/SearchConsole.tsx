import { useEffect, useState } from 'react';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';
import { UtmCampaignFilter } from '../components/UtmCampaignFilter';
import { Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

type Tab = 'queries' | 'pages' | 'insights';

interface Property {
  id: number;
  propertyUrl: string;
  propertyType: string;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
}

interface Summary {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  uniqueQueries: number;
  uniquePages: number;
}

interface GscQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface GscPage {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface GscInsight {
  id: number;
  insightType: string;
  dimensionValue: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metrics: any;
  recommendation?: string;
}

export default function SearchConsolePage() {
  const { selectedSite } = useSite();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('queries');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '30d-ago', to: 'today' });

  const [summary, setSummary] = useState<Summary | null>(null);
  const [queries, setQueries] = useState<GscQuery[]>([]);
  const [pages, setPages] = useState<GscPage[]>([]);
  const [insights, setInsights] = useState<GscInsight[]>([]);

  // Load properties on mount/site change
  useEffect(() => {
    if (!selectedSite) return;
    loadProperties();
  }, [selectedSite?.id]);

  async function loadProperties() {
    try {
      setLoading(true);
      const props = await api.get<Property[]>(`/gsc/properties?siteId=${selectedSite!.id}`);
      setProperties(props);
      if (props.length > 0 && !selectedProperty) {
        setSelectedProperty(props[0].id);
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedProperty) return;
    try {
      setSyncing(true);
      await api.post(`/gsc/sync?siteId=${selectedSite!.id}&propertyId=${selectedProperty}`, {});
      // Reload data after sync
      loadData();
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function loadData() {
    if (!selectedProperty) return;
    try {
      setLoading(true);

      // Load summary
      const sum = await api.get<Summary>(
        `/gsc/summary?siteId=${selectedSite!.id}&propertyId=${selectedProperty}&dateFrom=2024-01-01&dateTo=2025-12-31`
      );
      setSummary(sum);

      // Load queries
      const q = await api.get<GscQuery[]>(
        `/gsc/queries?siteId=${selectedSite!.id}&propertyId=${selectedProperty}&dateFrom=2024-01-01&dateTo=2025-12-31&sort=impressions`
      );
      setQueries(q);

      // Load pages
      const p = await api.get<GscPage[]>(
        `/gsc/pages?siteId=${selectedSite!.id}&propertyId=${selectedProperty}&dateFrom=2024-01-01&dateTo=2025-12-31&sort=impressions`
      );
      setPages(p);

      // Load insights
      const ins = await api.get<GscInsight[]>(`/gsc/insights?siteId=${selectedSite!.id}&propertyId=${selectedProperty}`);
      setInsights(ins);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedProperty]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      warning: 'bg-amber-100 text-amber-800 border-amber-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[severity] || colors.info;
  };

  const getSeverityBadgeColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500',
      warning: 'bg-amber-500',
      info: 'bg-blue-500',
    };
    return colors[severity] || 'bg-blue-500';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Search size={24} className="text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Google Search Console</h1>
          </div>
          <p className="text-sm text-gray-500 mt-2">Analise o desempenho de buscas orgânicas e oportunidades de SEO</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !selectedProperty}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Property Selector */}
      <div className="flex gap-4 items-center">
        {properties.length > 0 ? (
          <div className="flex-1">
            <select
              value={selectedProperty || ''}
              onChange={(e) => setSelectedProperty(+(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.propertyUrl} - Sincronizado {p.lastSyncedAt || 'nunca'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 text-sm font-medium">Nenhuma propriedade GSC conectada</p>
            <p className="text-blue-700 text-xs mt-1">Configure a autenticação do Google Search Console para começar</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Impressões</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR').format(summary.impressions)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Cliques</p>
            <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-BR').format(summary.clicks)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">CTR</p>
            <p className="text-2xl font-bold text-gray-900">{summary.ctr.toFixed(2)}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Posição Média</p>
            <p className="text-2xl font-bold text-gray-900">{summary.position.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab('queries')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'queries' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Buscas ({queries.length})
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pages' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Páginas ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'insights' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Insights ({insights.length})
        </button>
      </div>

      {/* Queries Tab */}
      {activeTab === 'queries' && (
        <div className="space-y-3">
          {queries.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Busca</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Impressões</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Cliques</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">CTR</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Posição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queries.slice(0, 30).map((q) => (
                    <tr key={q.query} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{q.query}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {new Intl.NumberFormat('pt-BR').format(q.impressions)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {new Intl.NumberFormat('pt-BR').format(q.clicks)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-semibold ${
                          q.ctr < 0.01 ? 'text-red-600' : q.ctr < 0.03 ? 'text-amber-600' : 'text-green-600'
                        }`}
                      >
                        {(q.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma busca encontrada. Sincronize dados para começar.</p>
            </div>
          )}
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="space-y-3">
          {pages.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Página</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Impressões</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Cliques</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">CTR</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Posição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pages.slice(0, 30).map((p) => (
                    <tr key={p.page} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium truncate">{p.page}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {new Intl.NumberFormat('pt-BR').format(p.impressions)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {new Intl.NumberFormat('pt-BR').format(p.clicks)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-semibold ${
                          p.ctr < 1 ? 'text-red-600' : p.ctr < 3 ? 'text-amber-600' : 'text-green-600'
                        }`}
                      >
                        {p.ctr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{p.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma página encontrada. Sincronize dados para começar.</p>
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${getSeverityBadgeColor(insight.severity)}`} />
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                    </div>
                    <p className="text-sm mb-3 opacity-90">{insight.description}</p>
                    {insight.recommendation && (
                      <div className="bg-white bg-opacity-50 rounded p-2 mb-3">
                        <p className="text-xs font-medium mb-1">Recomendação:</p>
                        <p className="text-xs">{insight.recommendation}</p>
                      </div>
                    )}
                    <div className="flex gap-2 text-xs opacity-75 flex-wrap">
                      {insight.metrics.impressions && <span>Impressões: {insight.metrics.impressions}</span>}
                      {insight.metrics.ctr && <span>CTR: {insight.metrics.ctr}</span>}
                      {insight.metrics.position && <span>Posição: {insight.metrics.position}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum insight gerado. Sincronize e gere insights para começar.</p>
              <button
                onClick={async () => {
                  if (selectedProperty) {
                    try {
                      await api.post(
                        `/gsc/insights/generate?siteId=${selectedSite!.id}&propertyId=${selectedProperty}`,
                        {}
                      );
                      loadData();
                    } catch (err) {
                      console.error('Failed to generate insights:', err);
                    }
                  }
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Gerar Insights
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="mt-3">Carregando dados...</p>
        </div>
      )}
    </div>
  );
}
