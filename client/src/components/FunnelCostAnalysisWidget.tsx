import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from './Card';

interface CostMetrics {
  cpl: number | null;
  cac: number | null;
  revenue_per_spend: number | null;
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
}

interface EfficiencySummary {
  current: CostMetrics | null;
  previous: CostMetrics | null;
  cplTrend: 'up' | 'down' | 'flat' | null;
  cacTrend: 'up' | 'down' | 'flat' | null;
  rpsHealthStatus: 'healthy' | 'at-risk' | 'critical' | null;
}

function formatCurrency(value: number | null, decimals = 2): string {
  if (value === null) return '—';
  return `R$ ${value.toFixed(decimals).replace('.', ',')}`;
}

function formatPercent(value: number | null, decimals = 1): string {
  if (value === null) return '—';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

function getTrendColor(trend: string | null): string {
  if (trend === 'up') return 'text-red-500';
  if (trend === 'down') return 'text-green-500';
  return 'text-gray-400';
}

function getEfficiencyColor(efficiency: string | null): string {
  if (efficiency === 'excellent') return 'bg-green-100 text-green-800';
  if (efficiency === 'good') return 'bg-blue-100 text-blue-800';
  if (efficiency === 'fair') return 'bg-yellow-100 text-yellow-800';
  if (efficiency === 'poor') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function getHealthColor(status: string | null): string {
  if (status === 'healthy') return 'text-green-600';
  if (status === 'at-risk') return 'text-yellow-600';
  if (status === 'critical') return 'text-red-600';
  return 'text-gray-400';
}

export function FunnelCostAnalysisWidget({ siteId }: { siteId: number | null }) {
  const [data, setData] = useState<EfficiencySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const response = await api.get<EfficiencySummary>(
          `/commercial-funnel/analysis/efficiency-summary?siteId=${siteId}&month=${month}`
        );

        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [siteId]);

  if (!siteId) return null;

  if (loading) {
    return (
      <Card>
        <div className="p-4 animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-4 flex items-center gap-2 text-orange-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      </Card>
    );
  }

  if (!data?.current) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-500 text-sm">
          Nenhum dado de custo disponível
        </div>
      </Card>
    );
  }

  const current = data.current;
  const previous = data.previous;

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900">Análise de Custo do Funil</h3>
          </div>
          <a
            href="/commercial-funnel-analysis"
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            Ver detalhes →
          </a>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* CPL */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-medium mb-1">CPL</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(current.cpl)}
              </span>
              {data.cplTrend && (
                <div className={`flex items-center gap-0.5 ${getTrendColor(data.cplTrend)}`}>
                  {data.cplTrend === 'up' ? (
                    <ArrowUpRight size={14} />
                  ) : data.cplTrend === 'down' ? (
                    <ArrowDownLeft size={14} />
                  ) : (
                    <span className="text-xs">→</span>
                  )}
                </div>
              )}
            </div>
            {previous?.cpl && (
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(previous.cpl)} antes
              </div>
            )}
          </div>

          {/* CAC */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-medium mb-1">CAC</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(current.cac)}
              </span>
              {data.cacTrend && (
                <div className={`flex items-center gap-0.5 ${getTrendColor(data.cacTrend)}`}>
                  {data.cacTrend === 'up' ? (
                    <ArrowUpRight size={14} />
                  ) : data.cacTrend === 'down' ? (
                    <ArrowDownLeft size={14} />
                  ) : (
                    <span className="text-xs">→</span>
                  )}
                </div>
              )}
            </div>
            {previous?.cac && (
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(previous.cac)} antes
              </div>
            )}
          </div>

          {/* Revenue Per Spend */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-medium mb-1">RPS</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-gray-900">
                {formatPercent(current.revenue_per_spend ? current.revenue_per_spend * 100 : null, 0)}
              </span>
              {data.rpsHealthStatus && (
                <span
                  className={`text-xs font-semibold ${getHealthColor(data.rpsHealthStatus)}`}
                >
                  {data.rpsHealthStatus === 'healthy' ? '✓' : data.rpsHealthStatus === 'critical' ? '!' : '⚠'}
                </span>
              )}
            </div>
            {previous?.revenue_per_spend && (
              <div className="text-xs text-gray-500 mt-1">
                {formatPercent(previous.revenue_per_spend * 100, 0)} antes
              </div>
            )}
          </div>
        </div>

        {/* Efficiency Badge */}
        {current.efficiency && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Eficiência:</span>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${getEfficiencyColor(
                current.efficiency
              )}`}
            >
              {current.efficiency === 'excellent'
                ? 'Excelente'
                : current.efficiency === 'good'
                  ? 'Boa'
                  : current.efficiency === 'fair'
                    ? 'Razoável'
                    : 'Fraca'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
