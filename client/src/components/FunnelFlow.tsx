/**
 * FunnelFlow Component
 *
 * Renders a visual representation of the funnel stages with conversion metrics
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { MetricStatusBadge } from './MetricStatusBadge';
import type { StageMetrics } from '../types/funnelTypes';

const STATUS_CFG = {
  good: { badge: 'No Alvo', cls: 'bg-emerald-100 text-emerald-700' },
  stable: { badge: 'Estável', cls: 'bg-gray-100 text-gray-500' },
  warning: { badge: 'Atenção', cls: 'bg-amber-100 text-amber-700' },
  critical: { badge: 'Crítico', cls: 'bg-red-100 text-red-700' },
  neutral: { badge: 'Sem Dados', cls: 'bg-gray-100 text-gray-400' }
};

function StatusBadge({ status }: { status: string }) {
  const { badge, cls } = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.neutral;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{badge}</span>
  );
}

function DeltaBadge({
  value,
  prev,
  size = 'sm'
}: {
  value: number | null;
  prev: number | null;
  size?: 'sm' | 'xs';
}) {
  if (value == null || prev == null || prev === 0) return null;
  const pct = ((value - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <Minus size={10} className="text-gray-300" />;
  const isPositive = pct > 0;
  const cls = isPositive ? 'text-emerald-600' : 'text-red-500';
  const textCls = size === 'xs' ? 'text-[11px]' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${cls} ${textCls}`}>
      {pct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

interface FunnelFlowStageProps {
  stageMetrics: StageMetrics;
  isBottleneck?: boolean;
  isLastStage: boolean;
  showConversionBelow?: boolean;
}

/**
 * Individual stage card in the funnel
 */
function FunnelFlowStage({
  stageMetrics,
  isBottleneck = false,
  isLastStage,
  showConversionBelow = true
}: FunnelFlowStageProps) {
  const { stageMeta, heroMetric, supportingMetrics, conversionToNextStage, status } = stageMetrics;

  return (
    <div className="flex-shrink-0 w-64">
      <div
        className={`
          rounded-lg border-t-4 p-4 bg-white shadow-sm hover:shadow-md transition-shadow
          ${isBottleneck ? 'border-red-500 ring-2 ring-red-200' : stageMeta.borderColor}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{stageMeta.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{stageMeta.description}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Hero Metric */}
        {heroMetric ? (
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">{heroMetric.value === null ? '—' : heroMetric.fmt === 'money' ? heroMetric.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : heroMetric.fmt === 'pct' ? `${heroMetric.value.toFixed(1)}%` : heroMetric.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-600">{heroMetric.label}</span>
              {heroMetric.prev !== null && <DeltaBadge value={heroMetric.value} prev={heroMetric.prev} />}
            </div>
          </div>
        ) : (
          <div className="mb-3 py-2 text-sm text-gray-400 italic">No data mapped</div>
        )}

        {/* Supporting Metrics */}
        {supportingMetrics.length > 0 && (
          <div className="space-y-1.5 mb-3 py-2 border-t border-gray-100">
            {supportingMetrics.map(metric => (
              <div key={metric.key} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{metric.label}</span>
                  <span className="font-semibold text-gray-900">{metric.value === null ? '—' : metric.fmt === 'money' ? metric.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : metric.fmt === 'pct' ? `${metric.value.toFixed(1)}%` : metric.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Metric Status Badges (Data Quality Indicators) */}
        {(stageMetrics as any).metricStatuses && (stageMetrics as any).metricStatuses.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
            <p className="text-xs font-semibold text-gray-700 uppercase">Metric Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(stageMetrics as any).metricStatuses.slice(0, 4).map((metric: any) => (
                <MetricStatusBadge
                  key={metric.key}
                  metricKey={metric.key}
                  dataStatus={metric.dataStatus || 'not_mapped'}
                  confidence={metric.confidence || 'low'}
                  lastUpdated={metric.lastUpdated}
                  isManual={metric.isManual}
                  compact={true}
                  tooltip={true}
                />
              ))}
              {(stageMetrics as any).metricStatuses.length > 4 && (
                <span className="text-xs text-gray-500 self-center">
                  +{(stageMetrics as any).metricStatuses.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Conversion to Next Stage */}
        {!isLastStage && conversionToNextStage && showConversionBelow && (
          <div className="mt-3 pt-2 border-t border-amber-100 bg-amber-50 rounded p-2">
            <div className="text-xs font-semibold text-gray-700">Conversion to next:</div>
            <div className="text-sm font-bold text-amber-700 mt-0.5">
              {conversionToNextStage.rate === null ? '—' : `${(conversionToNextStage.rate * 100).toFixed(1)}%`}
            </div>
            {conversionToNextStage.delta !== null && (
              <div className="flex items-center gap-1 mt-1">
                <DeltaBadge value={conversionToNextStage.rate !== null ? conversionToNextStage.rate * 100 : null} prev={conversionToNextStage.rate && conversionToNextStage.delta ? ((conversionToNextStage.rate * 100) / (1 + conversionToNextStage.delta / 100)) : null} size="xs" />
                <span className="text-xs text-gray-600">vs previous</span>
              </div>
            )}
          </div>
        )}

        {/* Bottleneck Indicator */}
        {isBottleneck && (
          <div className="mt-3 pt-2 border-t border-red-200 flex items-center gap-1.5 text-red-700">
            <AlertTriangle size={14} />
            <span className="text-xs font-semibold">Bottleneck</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface FunnelFlowProps {
  stages: Map<string, StageMetrics>;
  bottleneckStageId?: string;
  compact?: boolean;
}

/**
 * Main FunnelFlow component - renders all stages in sequence
 */
export function FunnelFlow({ stages, bottleneckStageId, compact = false }: FunnelFlowProps) {
  if (stages.size === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500">No funnel data available</p>
      </Card>
    );
  }

  // Sort stages by order
  const sortedStages = Array.from(stages.values()).sort((a, b) => a.stageMeta.order - b.stageMeta.order);

  return (
    <div className="w-full">
      {/* Desktop: Horizontal scroll */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-min">
          {sortedStages.map((stage, idx) => (
            <React.Fragment key={stage.stageId}>
              <FunnelFlowStage
                stageMetrics={stage}
                isBottleneck={bottleneckStageId === stage.stageId}
                isLastStage={idx === sortedStages.length - 1}
              />
              {/* Arrow between stages */}
              {idx < sortedStages.length - 1 && (
                <div className="flex items-center">
                  <div className="text-gray-400 font-bold text-lg">→</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile/Tablet: Vertical stack */}
      <div className="md:hidden space-y-3">
        {sortedStages.map((stage, idx) => (
          <React.Fragment key={stage.stageId}>
            <div className="w-full">
              <FunnelFlowStage
                stageMetrics={stage}
                isBottleneck={bottleneckStageId === stage.stageId}
                isLastStage={idx === sortedStages.length - 1}
              />
            </div>
            {/* Chevron between stages */}
            {idx < sortedStages.length - 1 && (
              <div className="flex justify-center py-2">
                <div className="text-gray-400 font-bold text-lg">↓</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
