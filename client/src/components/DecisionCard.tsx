/**
 * Decision Card
 * Reusable card for Demand, Efficiency, Pipeline, Channels, Budget sections
 * Shows primary metric, supporting metrics, status, and insight
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DecisionCard as DecisionCardType, DecisionCardMetric, HealthStatus } from '../types/dashboardTypes';

interface Props {
  card: DecisionCardType;
  compact?: boolean; // Show in compact mode
}

export function DecisionCard({ card, compact = false }: Props) {
  const statusConfig: Record<HealthStatus, { bg: string; textColor: string; borderColor: string }> = {
    healthy: {
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
    },
    attention: {
      bg: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
    },
    critical: {
      bg: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
    },
  };

  const status = statusConfig[card.status];

  const formatValue = (metric: DecisionCardMetric): string => {
    if (metric.value === null) return '—';
    if (metric.format === 'money') {
      return metric.value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: metric.value < 100 ? 2 : 0,
      });
    }
    if (metric.format === 'pct') {
      return `${metric.value.toFixed(1)}%`;
    }
    return metric.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const getDelta = (metric: DecisionCardMetric): React.ReactNode => {
    if (metric.value === null || metric.previous === null || metric.previous === 0) {
      return <Minus size={12} className="text-gray-300" />;
    }
    const pct = ((metric.value - metric.previous) / metric.previous) * 100;
    if (Math.abs(pct) < 0.5) return <Minus size={12} className="text-gray-300" />;

    const isPositive = pct > 0;
    const color = isPositive ? 'text-emerald-600' : 'text-red-600';
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(pct).toFixed(0)}%
      </span>
    );
  };

  if (compact) {
    return (
      <div className={`${status.bg} border border-gray-200 rounded-lg p-4`}>
        <h3 className={`text-xs font-bold ${status.textColor} mb-2`}>{card.title}</h3>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-xs text-gray-600">{card.primaryMetric.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{formatValue(card.primaryMetric)}</span>
              {getDelta(card.primaryMetric)}
            </div>
          </div>
          {!card.primaryMetric.isConnected && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle size={11} />
              Métrica não conectada
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full card layout
  return (
    <div className={`${status.bg} border ${status.borderColor} border rounded-lg p-5 space-y-4`}>
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{card.title}</h3>
          <p className="text-xs text-gray-600 mt-1">{card.area}</p>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.textColor}`}>
          {card.status === 'healthy' && '✓ No alvo'}
          {card.status === 'attention' && '⚠ Atenção'}
          {card.status === 'critical' && '✕ Crítico'}
        </div>
      </div>

      {/* Primary Metric (Large) */}
      <div className="bg-white rounded-lg p-4 space-y-2">
        <div className="text-xs text-gray-600 font-medium">{card.primaryMetric.label}</div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-gray-900">{formatValue(card.primaryMetric)}</span>
          {getDelta(card.primaryMetric)}
        </div>
        {!card.primaryMetric.isConnected && (
          <div className="text-xs text-amber-600 flex items-center gap-1 pt-2 border-t border-gray-200">
            <AlertCircle size={12} />
            <span>Métrica não conectada</span>
            {card.primaryMetric.source && (
              <span className="text-gray-500">— Fonte: {card.primaryMetric.source}</span>
            )}
          </div>
        )}
      </div>

      {/* Supporting Metrics (Grid) */}
      {card.supportingMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {card.supportingMetrics.map((metric, idx) => (
            <div key={idx} className="bg-white rounded p-3 text-xs space-y-1">
              <div className="text-gray-600">{metric.label}</div>
              <div className="flex items-end justify-between">
                <span className="font-bold text-gray-900">{formatValue(metric)}</span>
                {getDelta(metric)}
              </div>
              {!metric.isConnected && (
                <div className="text-gray-500 text-[11px] flex items-center gap-0.5">
                  <AlertCircle size={10} />
                  Não conectada
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Insight / Alert */}
      {card.insight && (
        <div className="bg-white rounded p-3 border-l-2 border-blue-500 text-xs text-gray-800">
          <div className="font-semibold text-gray-900 mb-1">💡 Insight</div>
          <div>{card.insight}</div>
        </div>
      )}

      {/* Recommended Action */}
      {card.recommendedAction && (
        <div className="bg-blue-50 rounded p-3 border border-blue-200 text-xs text-blue-900">
          <div className="font-semibold mb-1">→ Próxima ação</div>
          <div>{card.recommendedAction}</div>
        </div>
      )}
    </div>
  );
}
