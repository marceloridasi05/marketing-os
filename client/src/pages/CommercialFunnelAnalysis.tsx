import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';

interface CostMetricResult {
  period: string;
  dateFrom: string;
  dateTo: string;
  channel?: string;
  leads: number | null;
  mqls: number | null;
  sqls: number | null;
  opportunities: number | null;
  revenue: number | null;
  totalSpend: number;
  cpl: number | null;
  cpm_mql: number | null;
  cpm_sql: number | null;
  cac: number | null;
  revenue_per_spend: number | null;
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
}

interface EfficiencySummary {
  current: CostMetricResult | null;
  previous: CostMetricResult | null;
  cplTrend: 'up' | 'down' | 'flat' | null;
  cacTrend: 'up' | 'down' | 'flat' | null;
  rpsHealthStatus: 'healthy' | 'at-risk' | 'critical' | null;
}

export default function CommercialFunnelAnalysis() {
  const [siteId, setSiteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [efficiency, setEfficiency] = useState<EfficiencySummary | null>(null);
  const [costMetrics, setCostMetrics] = useState<CostMetricResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get siteId from localStorage or URL
    const stored = localStorage.getItem('selectedSiteId');
    if (stored) {
      setSiteId(parseInt(stored));
    }
  }, []);

  useEffect(() => {
    if (!siteId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current month
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Fetch efficiency summary
        const effData = await api.get<EfficiencySummary>(
          `/commercial-funnel/analysis/efficiency-summary?siteId=${siteId}&month=${month}`
        );
        setEfficiency(effData);

        // Fetch cost metrics by channel
        if (effData?.current?.dateFrom && effData?.current?.dateTo) {
          const costData = await api.get<CostMetricResult[]>(
            `/commercial-funnel/analysis/cost-metrics-by-channel?siteId=${siteId}&dateFrom=${effData.current.dateFrom}&dateTo=${effData.current.dateTo}`
          );
          setCostMetrics(costData);
        }
      } catch (err) {
        console.error('Error fetching commercial funnel analysis:', err);
        setError('Failed to load commercial funnel analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId]);

  if (!siteId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-600">Please select a site first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="bg-red-50 border-red-200">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      </div>
    );
  }

  const formatCurrency = (n: number | null) => {
    if (n === null) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const getEfficiencyBadge = (efficiency: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-300',
      good: 'bg-blue-100 text-blue-800 border-blue-300',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      poor: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[efficiency as keyof typeof colors] || colors.fair;
  };

  const getTrendIcon = (trend: string | null) => {
    if (trend === 'up') return <TrendingUp className="inline text-red-600" size={16} />;
    if (trend === 'down') return <TrendingDown className="inline text-green-600" size={16} />;
    return <span className="text-gray-400">→</span>;
  };

  const getHealthBadge = (status: string | null) => {
    if (status === 'healthy') return 'bg-green-100 text-green-800';
    if (status === 'at-risk') return 'bg-yellow-100 text-yellow-800';
    if (status === 'critical') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Custo do Funil"
        subtitle="Métricas de custo, eficiência e progressão do funil"
      />

      {/* Summary Cards */}
      {efficiency?.current && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Custo Por Lead</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(efficiency.current.cpl)}
              </div>
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                {getTrendIcon(efficiency.cplTrend)}
                <span>
                  {efficiency.cplTrend === 'up'
                    ? ' Aumentando'
                    : efficiency.cplTrend === 'down'
                      ? ' Diminuindo'
                      : ' Estável'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Custo de Aquisição</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(efficiency.current.cac)}
              </div>
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                {getTrendIcon(efficiency.cacTrend)}
                <span>
                  {efficiency.cacTrend === 'up'
                    ? ' Aumentando'
                    : efficiency.cacTrend === 'down'
                      ? ' Diminuindo'
                      : ' Estável'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Receita Por Gasto</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {efficiency.current.revenue_per_spend
                  ? `${efficiency.current.revenue_per_spend.toFixed(2)}x`
                  : '—'}
              </div>
              <div
                className={`text-sm mt-2 px-2 py-1 rounded border ${getHealthBadge(
                  efficiency.rpsHealthStatus
                )}`}
              >
                {efficiency.rpsHealthStatus === 'healthy'
                  ? '✓ Saudável'
                  : efficiency.rpsHealthStatus === 'at-risk'
                    ? '⚠ Risco'
                    : '✗ Crítico'}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm text-gray-600">Eficiência Geral</div>
              <div
                className={`mt-3 px-3 py-2 rounded text-center border ${getEfficiencyBadge(
                  efficiency.current.efficiency
                )}`}
              >
                <span className="font-semibold capitalize">
                  {efficiency.current.efficiency === 'excellent'
                    ? 'Excelente'
                    : efficiency.current.efficiency === 'good'
                      ? 'Boa'
                      : efficiency.current.efficiency === 'fair'
                        ? 'Razoável'
                        : 'Fraca'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cost Efficiency Tab */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Eficiência de Custo</h2>

          {efficiency?.current && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-4">
                  <div className="text-sm text-gray-600">Custo Por Lead (CPL)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(efficiency.current.cpl)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {efficiency.current.leads ? `${efficiency.current.leads} leads` : 'Sem dados'}
                  </div>
                </div>

                <div className="border rounded p-4">
                  <div className="text-sm text-gray-600">Custo Por MQL</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(efficiency.current.cpm_mql)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {efficiency.current.mqls ? `${efficiency.current.mqls} MQLs` : 'Sem dados'}
                  </div>
                </div>

                <div className="border rounded p-4">
                  <div className="text-sm text-gray-600">Custo Por SQL</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(efficiency.current.cpm_sql)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {efficiency.current.sqls ? `${efficiency.current.sqls} SQLs` : 'Sem dados'}
                  </div>
                </div>
              </div>

              {efficiency.previous && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Comparação Mês a Mês</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-gray-600">CPL Anterior: {formatCurrency(efficiency.previous.cpl)}</div>
                      <div className="text-gray-600">CPL Atual: {formatCurrency(efficiency.current.cpl)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-600">
                        CAC Anterior: {formatCurrency(efficiency.previous.cac)}
                      </div>
                      <div className="text-gray-600">CAC Atual: {formatCurrency(efficiency.current.cac)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-600">
                        RPS Anterior: {efficiency.previous.revenue_per_spend?.toFixed(2)}x
                      </div>
                      <div className="text-gray-600">
                        RPS Atual: {efficiency.current.revenue_per_spend?.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Funnel Progression Tab */}
      <Card>
        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Progressão do Funil com Custos</h2>

          {efficiency?.current && (
            <>
              <div className="flex items-center justify-between border rounded p-4 bg-blue-50">
                <div>
                  <div className="text-sm text-gray-600">Leads</div>
                  <div className="text-lg font-semibold text-gray-900">{efficiency.current.leads || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Custo por unidade</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(efficiency.current.cpl)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded p-4 bg-indigo-50">
                <div>
                  <div className="text-sm text-gray-600">MQLs</div>
                  <div className="text-lg font-semibold text-gray-900">{efficiency.current.mqls || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Custo por unidade</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(efficiency.current.cpm_mql)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded p-4 bg-purple-50">
                <div>
                  <div className="text-sm text-gray-600">SQLs</div>
                  <div className="text-lg font-semibold text-gray-900">{efficiency.current.sqls || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Custo por unidade</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(efficiency.current.cpm_sql)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded p-4 bg-pink-50">
                <div>
                  <div className="text-sm text-gray-600">Oportunidades</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {efficiency.current.opportunities || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Custo de Aquisição</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(efficiency.current.cac)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded p-4 bg-green-50">
                <div>
                  <div className="text-sm text-gray-600">Receita Fechada</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(efficiency.current.revenue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Retorno sobre Gasto</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {efficiency.current.revenue_per_spend
                      ? `${efficiency.current.revenue_per_spend.toFixed(2)}x`
                      : '—'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Channel Comparison Tab */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Custo por Canal</h2>

          {costMetrics && costMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Canal</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Gasto</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Leads</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">CPL</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">CAC</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">RPS</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {costMetrics.map((metric, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{metric.channel || 'Geral'}</td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(metric.totalSpend)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">{metric.leads || '—'}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {formatCurrency(metric.cpl)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {formatCurrency(metric.cac)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {metric.revenue_per_spend ? `${metric.revenue_per_spend.toFixed(2)}x` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getEfficiencyBadge(
                            metric.efficiency
                          )}`}
                        >
                          {metric.efficiency === 'excellent'
                            ? 'EXCELENTE'
                            : metric.efficiency === 'good'
                              ? 'BOA'
                              : metric.efficiency === 'fair'
                                ? 'RAZOÁVEL'
                                : 'FRACA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              Nenhum dado de canal disponível ainda. Adicione dados de gasto diário para ver a análise por canal.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
