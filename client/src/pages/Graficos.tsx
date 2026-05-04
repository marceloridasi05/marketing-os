/**
 * Gráficos (Charts)
 *
 * Flexible time-series charting view with metric selection,
 * period selection, and channel filtering.
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface ChartDataPoint {
  date: string;
  value: number | null;
  label?: string;
}

const METRIC_OPTIONS = [
  { value: 'sessions', label: 'Acessos', color: '#3b82f6' },
  { value: 'leads', label: 'Leads', color: '#8b5cf6' },
  { value: 'mqls', label: 'MQLs', color: '#06b6d4' },
  { value: 'sqls', label: 'SQLs', color: '#10b981' },
  { value: 'opportunities', label: 'Oportunidades', color: '#f59e0b' },
  { value: 'revenue', label: 'Receita', color: '#ec4899' },
  { value: 'spend', label: 'Gasto', color: '#ef4444' },
  { value: 'cpl', label: 'CPL (Custo por Lead)', color: '#6366f1' },
];

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

export default function Graficos() {
  const { selectedSite } = useSite();
  const { dateRange } = useTimeFilter('all');
  const [metric, setMetric] = useState('leads');
  const [period, setPeriod] = useState('weekly');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const metricInfo = METRIC_OPTIONS.find(m => m.value === metric);

  useEffect(() => {
    if (!selectedSite?.id || !dateRange?.start || !dateRange?.end) return;

    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await api.get<ChartDataPoint[]>('/analysis/chart-data', {
          siteId: selectedSite.id,
          metric,
          period,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
        });
        setChartData(response || []);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedSite?.id, metric, period, dateRange]);

  if (!selectedSite) {
    return (
      <div className="p-6 text-center text-gray-400">
        Selecione um site no painel lateral
      </div>
    );
  }

  // Calculate summary stats
  const validValues = chartData.filter(d => d.value !== null).map(d => d.value as number);
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const previousValue = chartData.length > 1 ? chartData[chartData.length - 2].value : null;
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;
  const avgValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;

  const delta = currentValue !== null && previousValue !== null && previousValue !== 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : null;

  const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—';
  const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
  const fmtPct = (n: number | null) => n !== null ? `${n.toFixed(1)}%` : '—';

  const isCurrencyMetric = ['revenue', 'spend', 'cpl'].includes(metric);
  const formatter = isCurrencyMetric ? fmtMoney : fmtNum;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gráficos</h1>
        <p className="text-gray-600">Análise de tendências com visualizações flexíveis</p>
      </div>

      {/* Time Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TimeFilter />
      </div>

      {/* Controls */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Metric Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {METRIC_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PERIOD_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Gráfico</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="line">Linha</option>
              <option value="bar">Barras</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-xs font-semibold text-blue-900 uppercase">Atual</p>
            <p className="text-2xl font-bold text-blue-700 mt-2">{formatter(currentValue)}</p>
            {delta !== null && (
              <p className={`text-xs mt-1 font-medium ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
              </p>
            )}
          </Card>

          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-xs font-semibold text-purple-900 uppercase">Máximo</p>
            <p className="text-2xl font-bold text-purple-700 mt-2">{formatter(maxValue)}</p>
          </Card>

          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-900 uppercase">Mínimo</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">{formatter(minValue)}</p>
          </Card>

          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900 uppercase">Média</p>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{formatter(avgValue)}</p>
          </Card>
        </div>
      )}

      {/* Chart Container */}
      <Card className="p-6">
        {loading ? (
          <div className="h-96 flex items-center justify-center text-gray-400">
            Carregando dados...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-400">
            Nenhum dado disponível para este período
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={chartData.length > 10 ? -45 : 0}
                    height={chartData.length > 10 ? 80 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value) => formatter(value)}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={metricInfo?.color || '#3b82f6'}
                    strokeWidth={2}
                    dot={{ fill: metricInfo?.color || '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name={metricInfo?.label}
                    connectNulls
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={chartData.length > 10 ? -45 : 0}
                    height={chartData.length > 10 ? 80 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value) => formatter(value)}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={metricInfo?.color || '#3b82f6'}
                    name={metricInfo?.label}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Help Text */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Dica:</strong> Use este gráfico para explorar tendências ao longo do tempo. Selecione uma métrica, escolha
          a granularidade (diária, semanal ou mensal) e veja como a métrica evoluiu no período selecionado. Métricas em moeda
          (Receita, Gasto, CPL) são formatadas automaticamente.
        </p>
      </Card>
    </div>
  );
}
