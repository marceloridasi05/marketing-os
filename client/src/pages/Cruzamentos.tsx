/**
 * Cruzamentos (Cross-Checks)
 *
 * Analyzes relationships between metrics from different operational sources
 * to identify patterns, bottlenecks, and efficiency issues.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface Cruzamento {
  id: string;
  label: string;
  metricALabel: string;
  metricBLabel: string;
  currentA: number | null;
  currentB: number | null;
  previousA: number | null;
  previousB: number | null;
  derivedMetric?: {
    label: string;
    value: number | null;
    previousValue: number | null;
    unit?: string;
  };
  conversionRate?: number | null;
  trend: 'up' | 'down' | 'flat' | null;
  trendPercent: number | null;
  status: 'healthy' | 'attention' | 'critical' | 'no-data';
  interpretation: string;
  dataReadiness: 'complete' | 'partial' | 'missing';
  missingFields?: string[];
}

const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—';
const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtPct = (n: number | null) => n !== null ? `${n.toFixed(1)}%` : '—';

function StatusBadge({ status }: { status: 'healthy' | 'attention' | 'critical' | 'no-data' }) {
  const styles = {
    healthy: 'bg-emerald-100 text-emerald-800',
    attention: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800',
    'no-data': 'bg-gray-100 text-gray-800',
  };

  const labels = {
    healthy: '✓ Saudável',
    attention: '⚠ Atenção',
    critical: '✗ Crítico',
    'no-data': '? Sem dados',
  };

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function TrendIndicator({ trend, percent }: { trend: 'up' | 'down' | 'flat' | null; percent: number | null }) {
  if (!trend || percent === null) return <span className="text-gray-400 text-xs">—</span>;

  const color = trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600';
  const icon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return <span className={`${color} text-xs font-medium`}>{icon} {Math.abs(percent).toFixed(1)}%</span>;
}

function CruzamentoRow({ cruzamento }: { cruzamento: Cruzamento }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {/* Name & Status */}
      <td className="py-3 px-4 text-left">
        <div className="font-medium text-gray-900">{cruzamento.label}</div>
        <div className="text-xs text-gray-500 mt-1">{cruzamento.interpretation}</div>
      </td>

      {/* Metric A */}
      <td className="py-3 px-4 text-right">
        <div className="text-sm text-gray-600">{cruzamento.metricALabel}</div>
        <div className="text-lg font-semibold text-gray-900">{fmtNum(cruzamento.currentA)}</div>
      </td>

      {/* Metric B */}
      <td className="py-3 px-4 text-right">
        <div className="text-sm text-gray-600">{cruzamento.metricBLabel}</div>
        <div className="text-lg font-semibold text-gray-900">{fmtNum(cruzamento.currentB)}</div>
      </td>

      {/* Derived Metric or Conversion Rate */}
      {cruzamento.derivedMetric ? (
        <td className="py-3 px-4 text-right">
          <div className="text-sm text-gray-600">{cruzamento.derivedMetric.label}</div>
          <div className="text-lg font-semibold text-orange-600">
            {cruzamento.derivedMetric.unit ? fmtMoney(cruzamento.derivedMetric.value) : fmtNum(cruzamento.derivedMetric.value)}
          </div>
          {cruzamento.derivedMetric.previousValue && (
            <div className="text-xs text-gray-500 mt-1">Anterior: {fmtMoney(cruzamento.derivedMetric.previousValue)}</div>
          )}
        </td>
      ) : (
        <td className="py-3 px-4 text-right">
          <div className="text-sm text-gray-600">Taxa Conversão</div>
          <div className="text-lg font-semibold text-blue-600">{fmtPct(cruzamento.conversionRate)}</div>
        </td>
      )}

      {/* Trend */}
      <td className="py-3 px-4 text-right">
        <TrendIndicator trend={cruzamento.trend} percent={cruzamento.trendPercent} />
      </td>

      {/* Status */}
      <td className="py-3 px-4 text-right">
        <StatusBadge status={cruzamento.status} />
      </td>

      {/* Data Readiness */}
      <td className="py-3 px-4 text-center">
        {cruzamento.dataReadiness === 'complete' ? (
          <span className="text-xs text-emerald-600 font-medium">✓ Completo</span>
        ) : cruzamento.dataReadiness === 'partial' ? (
          <span className="text-xs text-amber-600 font-medium">⚠ Parcial</span>
        ) : (
          <span className="text-xs text-red-600 font-medium">✗ Faltando</span>
        )}
        {cruzamento.missingFields && cruzamento.missingFields.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">{cruzamento.missingFields.join(', ')}</div>
        )}
      </td>
    </tr>
  );
}

export default function Cruzamentos() {
  const { selectedSite } = useSite();
  const { dateRange } = useTimeFilter('all');
  const [cruzamentos, setCruzamentos] = useState<Cruzamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSite?.id || !dateRange?.start || !dateRange?.end) return;

    const fetchCruzamentos = async () => {
      try {
        setLoading(true);
        const response = await api.get<Cruzamento[]>('/analysis/cruzamentos', {
          siteId: selectedSite.id,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
        });
        setCruzamentos(response || []);
      } catch (err) {
        console.error('Error fetching cruzamentos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCruzamentos();
  }, [selectedSite?.id, dateRange]);

  if (!selectedSite) {
    return (
      <div className="p-6 text-center text-gray-400">
        Selecione um site no painel lateral
      </div>
    );
  }

  // Count status badges for summary
  const healthyCount = cruzamentos.filter(c => c.status === 'healthy').length;
  const attentionCount = cruzamentos.filter(c => c.status === 'attention').length;
  const criticalCount = cruzamentos.filter(c => c.status === 'critical').length;
  const noDataCount = cruzamentos.filter(c => c.status === 'no-data').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cruzamentos</h1>
        <p className="text-gray-600">Análise de relacionamentos entre métricas de diferentes fontes operacionais</p>
      </div>

      {/* Time Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TimeFilter />
      </div>

      {/* Status Summary */}
      {!loading && cruzamentos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900 uppercase">Saudáveis</p>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{healthyCount}</p>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-900 uppercase">Atenção</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">{attentionCount}</p>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs font-semibold text-red-900 uppercase">Críticos</p>
            <p className="text-2xl font-bold text-red-700 mt-2">{criticalCount}</p>
          </Card>
          <Card className="p-4 bg-gray-50 border-gray-200">
            <p className="text-xs font-semibold text-gray-900 uppercase">Sem Dados</p>
            <p className="text-2xl font-bold text-gray-700 mt-2">{noDataCount}</p>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando cruzamentos...</div>
      ) : cruzamentos.length === 0 ? (
        <Card className="text-center py-12 text-gray-400">
          Nenhum cruzamento calculado para o período selecionado
        </Card>
      ) : (
        /* Cruzamentos Table */
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Cruzamento</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Métrica A</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Métrica B</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Derivado</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Tendência</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Dados</th>
              </tr>
            </thead>
            <tbody>
              {cruzamentos.map((cruzamento) => (
                <CruzamentoRow key={cruzamento.id} cruzamento={cruzamento} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Interpretation Guide */}
      {!loading && cruzamentos.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900 font-semibold mb-2">Como ler os cruzamentos:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Saudável</strong>: Métrica derivada estável ou melhorando</li>
            <li>• <strong>Atenção</strong>: Mudança moderada que requer monitoramento</li>
            <li>• <strong>Crítico</strong>: Mudança significativa que requer ação</li>
            <li>• <strong>Tendência</strong>: Direção da métrica derivada (↑ = pior para custo, ↓ = melhor para custo)</li>
            <li>• <strong>Dados</strong>: Completo = ambas as métricas preenchidas, Parcial = faltando uma, Faltando = faltam ambas</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
