/**
 * Insights & Alertas
 *
 * Structured alerts generated from consolidation and cross-check data.
 * Shows performance changes, cost trends, conversion issues, and data quality.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface Insight {
  id: string;
  type: 'performance_improved' | 'performance_declined' | 'cost_increased' |
        'conversion_dropped' | 'budget_risk' | 'missing_data' |
        'field_not_applicable' | 'target_at_risk' | 'target_on_track';
  severity: 'info' | 'attention' | 'critical';
  area: 'aquisição' | 'funil' | 'orçamento' | 'receita' | 'dados';
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  previousValue?: number;
  delta?: number;
  likelyMeaning: string;
  recommendedAction: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

function getSeverityColor(severity: 'info' | 'attention' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-200';
    case 'attention':
      return 'bg-amber-50 border-amber-200';
    case 'info':
      return 'bg-blue-50 border-blue-200';
  }
}

function getSeverityIcon(severity: 'info' | 'attention' | 'critical') {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={20} className="text-red-600" />;
    case 'attention':
      return <AlertTriangle size={20} className="text-amber-600" />;
    case 'info':
      return <Info size={20} className="text-blue-600" />;
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'performance_improved': 'Performance Melhorou',
    'performance_declined': 'Performance Decaiu',
    'cost_increased': 'Custo Aumentou',
    'conversion_dropped': 'Conversão Caiu',
    'budget_risk': 'Risco de Orçamento',
    'missing_data': 'Dados Faltando',
    'field_not_applicable': 'Campo Não Aplicável',
    'target_at_risk': 'Meta em Risco',
    'target_on_track': 'Meta no Caminho',
  };
  return labels[type] || type;
}

function getAreaColor(area: 'aquisição' | 'funil' | 'orçamento' | 'receita' | 'dados'): string {
  const colors: Record<string, string> = {
    'aquisição': 'bg-purple-100 text-purple-800',
    'funil': 'bg-blue-100 text-blue-800',
    'orçamento': 'bg-orange-100 text-orange-800',
    'receita': 'bg-emerald-100 text-emerald-800',
    'dados': 'bg-gray-100 text-gray-800',
  };
  return colors[area] || 'bg-gray-100 text-gray-800';
}

function InsightCard({ insight }: { insight: Insight }) {
  const fmtNum = (n: number | undefined) => n ? n.toLocaleString('pt-BR') : '—';

  return (
    <Card className={`p-4 border ${getSeverityColor(insight.severity)}`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-1">
          {getSeverityIcon(insight.severity)}
        </div>

        <div className="flex-1">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            </div>
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-1 rounded ${getAreaColor(insight.area)}`}>
                {insight.area}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                insight.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' :
                insight.confidence === 'medium' ? 'bg-amber-100 text-amber-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {insight.confidence === 'high' ? 'Confiante' : insight.confidence === 'medium' ? 'Moderado' : 'Baixo'}
              </span>
            </div>
          </div>

          {/* Metric Details */}
          {insight.metric && (
            <div className="bg-white/50 rounded px-3 py-2 mb-3 text-sm">
              <strong>{insight.metric}:</strong> {fmtNum(insight.currentValue)}
              {insight.previousValue !== undefined && (
                <>
                  {' '} <span className="text-gray-500">(anterior: {fmtNum(insight.previousValue)})</span>
                  {insight.delta !== undefined && (
                    <>
                      {' '} <span className={insight.delta > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {insight.delta > 0 ? '↑' : '↓'} {Math.abs(insight.delta).toFixed(1)}%
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Likely Meaning */}
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-800 mb-1">Provavelmente significa:</p>
            <p className="text-sm text-gray-700">{insight.likelyMeaning}</p>
          </div>

          {/* Recommended Action */}
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-800 mb-1">Ação recomendada:</p>
            <p className="text-sm text-gray-700">{insight.recommendedAction}</p>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500">
            {new Date(insight.timestamp).toLocaleDateString('pt-BR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function InsightsAlertas() {
  const { selectedSite } = useSite();
  const { dateRange } = useTimeFilter('all');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'attention' | 'info'>('all');
  const [filterArea, setFilterArea] = useState<'all' | 'aquisição' | 'funil' | 'orçamento' | 'receita' | 'dados'>('all');

  useEffect(() => {
    if (!selectedSite?.id || !dateRange?.start || !dateRange?.end) return;

    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await api.get<Insight[]>('/analysis/insights', {
          siteId: selectedSite.id,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
        });
        setInsights(response || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [selectedSite?.id, dateRange]);

  if (!selectedSite) {
    return (
      <div className="p-6 text-center text-gray-400">
        Selecione um site no painel lateral
      </div>
    );
  }

  // Filter insights
  const filtered = insights.filter((i) => {
    if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
    if (filterArea !== 'all' && i.area !== filterArea) return false;
    return true;
  });

  // Count by severity
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const attentionCount = insights.filter(i => i.severity === 'attention').length;
  const infoCount = insights.filter(i => i.severity === 'info').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights & Alertas</h1>
        <p className="text-gray-600">Alertas estruturados gerados a partir de dados de consolidação e cruzamentos</p>
      </div>

      {/* Time Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TimeFilter />
      </div>

      {/* Status Summary */}
      {!loading && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs font-semibold text-red-900 uppercase">Críticos</p>
            <p className="text-3xl font-bold text-red-700 mt-2">{criticalCount}</p>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-900 uppercase">Atenção</p>
            <p className="text-3xl font-bold text-amber-700 mt-2">{attentionCount}</p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-xs font-semibold text-blue-900 uppercase">Informativo</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">{infoCount}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      {!loading && insights.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-sm font-medium text-gray-700">Severidade:</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todos</option>
              <option value="critical">Críticos</option>
              <option value="attention">Atenção</option>
              <option value="info">Informativo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Área:</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value as any)}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todos</option>
              <option value="aquisição">Aquisição</option>
              <option value="funil">Funil</option>
              <option value="orçamento">Orçamento</option>
              <option value="receita">Receita</option>
              <option value="dados">Dados</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Gerando insights...</div>
      ) : insights.length === 0 ? (
        <Card className="text-center py-12 text-gray-400">
          Nenhum insight gerado para o período selecionado
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12 text-gray-400">
          Nenhum insight corresponde aos filtros selecionados
        </Card>
      ) : (
        /* Insights List */
        <div className="space-y-4">
          {filtered.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && insights.length > 0 && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-3">Legenda de Confiança:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="inline-block px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">Confiante</span>
              <p className="text-gray-600 mt-1">Baseado em múltiplas evidências correlatas</p>
            </div>
            <div>
              <span className="inline-block px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">Moderado</span>
              <p className="text-gray-600 mt-1">Baseado em padrões parciais</p>
            </div>
            <div>
              <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">Baixo</span>
              <p className="text-gray-600 mt-1">Baseado em uma única métrica</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
