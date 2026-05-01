import React from 'react';
import { CheckCircle, AlertCircle, Clock, HelpCircle } from 'lucide-react';

export type DataStatus = 'automatic' | 'manual' | 'missing' | 'incomplete' | 'stale' | 'not_mapped';
export type Confidence = 'high' | 'medium' | 'low';

interface MetricStatusBadgeProps {
  metricKey: string;
  dataStatus: DataStatus;
  confidence: Confidence;
  lastUpdated?: string;
  isManual?: boolean;
  compact?: boolean;
  tooltip?: boolean;
}

const STATUS_CONFIG: Record<DataStatus, { icon: React.ReactNode; color: string; label: string }> =
  {
    automatic: {
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'bg-emerald-100 text-emerald-700',
      label: 'Auto-synced',
    },
    manual: {
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-700',
      label: 'Manually entered',
    },
    missing: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'bg-red-100 text-red-700',
      label: 'Missing',
    },
    incomplete: {
      icon: <HelpCircle className="w-4 h-4" />,
      color: 'bg-amber-100 text-amber-700',
      label: 'Incomplete',
    },
    stale: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-700',
      label: 'Stale (not updated)',
    },
    not_mapped: {
      icon: <HelpCircle className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-700',
      label: 'Not mapped',
    },
  };

const CONFIDENCE_CONFIG: Record<Confidence, { color: string; label: string }> = {
  high: {
    color: 'text-emerald-700',
    label: 'High Confidence',
  },
  medium: {
    color: 'text-amber-700',
    label: 'Medium Confidence',
  },
  low: {
    color: 'text-red-700',
    label: 'Low Confidence',
  },
};

function formatLastUpdated(isoString: string | undefined): string {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function MetricStatusBadge({
  metricKey,
  dataStatus,
  confidence,
  lastUpdated,
  isManual = false,
  compact = false,
  tooltip = true,
}: MetricStatusBadgeProps) {
  const statusConfig = STATUS_CONFIG[dataStatus];
  const confidenceConfig = CONFIDENCE_CONFIG[confidence];
  const formattedTime = formatLastUpdated(lastUpdated);

  const tooltipText =
    `${statusConfig.label} • ${confidenceConfig.label}\n` +
    `Last updated: ${formattedTime}\n` +
    `${isManual ? 'Manually entered' : 'Auto-synced from data source'}`;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}
        title={tooltip ? tooltipText : ''}
      >
        {statusConfig.icon}
        <span>{statusConfig.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border ${statusConfig.color} border-opacity-30`}
      title={tooltip ? tooltipText : ''}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{statusConfig.icon}</div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{statusConfig.label}</div>

          <div className="text-xs opacity-75 mt-0.5 space-y-1">
            <div>Confidence: {confidenceConfig.label}</div>
            <div>Last updated: {formattedTime}</div>
            <div>{isManual ? '📝 Manually entered' : '🔄 Auto-synced'}</div>
          </div>
        </div>

        {/* Confidence indicator dot */}
        <div
          className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${
            confidence === 'high'
              ? 'bg-emerald-600'
              : confidence === 'medium'
                ? 'bg-amber-600'
                : 'bg-red-600'
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Compact row view for displaying multiple metric statuses
 */
export function MetricStatusRow({
  metrics,
}: {
  metrics: Array<{
    key: string;
    status: DataStatus;
    confidence: Confidence;
    lastUpdated?: string;
    isManual?: boolean;
  }>;
}) {
  return (
    <div className="space-y-2">
      {metrics.map(metric => (
        <div key={metric.key} className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">{metric.key}</span>
          <MetricStatusBadge
            metricKey={metric.key}
            dataStatus={metric.status}
            confidence={metric.confidence}
            lastUpdated={metric.lastUpdated}
            isManual={metric.isManual}
            compact={true}
          />
        </div>
      ))}
    </div>
  );
}
