/**
 * Marketing Health Summary
 * Top-of-dashboard overview: status, main reason, recommended action, data confidence
 */

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

// Inline types to avoid Vite bundler issues
type HealthStatus = 'healthy' | 'attention' | 'critical';
type DataConfidence = 'high' | 'medium' | 'low';
interface HealthSummaryType {
  status: HealthStatus;
  mainReason: string;
  recommendedAction: string;
  dataConfidence: DataConfidence;
  metrics: {
    topPositive: { label: string; value: string; change: number };
    topNegative: { label: string; value: string; change: number };
  };
}

interface Props {
  health: HealthSummaryType;
  modelName: string;
}

export function MarketingHealthSummary({ health, modelName }: Props) {
  const statusConfig: Record<HealthStatus, {
    bg: string;
    border: string;
    icon: React.ReactNode;
    label: string;
    labelColor: string;
  }> = {
    healthy: {
      bg: 'bg-emerald-50',
      border: 'border-l-4 border-emerald-500',
      icon: <CheckCircle2 size={24} className="text-emerald-600" />,
      label: 'Saudável',
      labelColor: 'bg-emerald-100 text-emerald-700',
    },
    attention: {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-500',
      icon: <AlertTriangle size={24} className="text-amber-600" />,
      label: 'Atenção',
      labelColor: 'bg-amber-100 text-amber-700',
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      icon: <AlertCircle size={24} className="text-red-600" />,
      label: 'Crítico',
      labelColor: 'bg-red-100 text-red-700',
    },
  };

  const confidenceConfig: Record<DataConfidence, string> = {
    high: '🟢 Alta',
    medium: '🟡 Média',
    low: '🔴 Baixa',
  };

  const config = statusConfig[health.status];

  return (
    <div className={`${config.bg} ${config.border} rounded-lg p-6 mb-6`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 pt-1">{config.icon}</div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Status + Model + Confidence */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.labelColor}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-600 font-medium">{modelName}</span>
            <span className="text-xs text-gray-500 ml-auto">
              Confiança: {confidenceConfig[health.dataConfidence]}
            </span>
          </div>

          {/* Main Reason */}
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {health.mainReason}
          </h3>

          {/* Top Metrics (2 columns) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Top Positive */}
            <div className="bg-white rounded px-3 py-2 text-xs">
              <div className="text-gray-600 mb-1">Melhor Métrica</div>
              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                {health.metrics.topPositive.label}
                {health.metrics.topPositive.change > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <TrendingUp size={14} />
                    {(health.metrics.topPositive.change).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* Top Negative */}
            <div className="bg-white rounded px-3 py-2 text-xs">
              <div className="text-gray-600 mb-1">Maior Queda</div>
              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                {health.metrics.topNegative.label}
                {health.metrics.topNegative.change < 0 && (
                  <span className="flex items-center gap-0.5 text-red-600">
                    <TrendingDown size={14} />
                    {Math.abs(health.metrics.topNegative.change).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="bg-white bg-opacity-70 rounded px-3 py-2 text-xs border-l-2 border-gray-300">
            <div className="text-gray-600 mb-1 font-semibold">Ação Recomendada</div>
            <div className="text-gray-800">{health.recommendedAction}</div>
          </div>
        </div>

        {/* Right side: Close button or icon */}
        <button
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
