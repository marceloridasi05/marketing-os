/**
 * Funnel-specific type definitions used across components and utilities
 */

export type ObjStatus = 'good' | 'stable' | 'warning' | 'critical' | 'neutral';

export interface MetricValue {
  value: number | null;
  prev: number | null | undefined;
  label: string;
  key: string;
  fmt: 'num' | 'money' | 'pct';
  lowerIsBetter?: boolean;
}

export interface TransitionMetrics {
  rate: number | null;           // Conversion rate (0-1 scale, e.g., 0.25 = 25%)
  delta: number | null;           // % change vs previous period
  numeratorKey: string;
  denominatorKey: string;
}

export interface StageMetrics {
  stageId: string;
  stageMeta: {
    label: string;
    description: string;
    color: string;
    borderColor: string;
    iconColor: string;
    order: number;
  };
  heroMetric: MetricValue | null;
  heroMetricKey: string | null;
  supportingMetrics: MetricValue[];
  conversionToNextStage: TransitionMetrics | null;
  status: ObjStatus;
  metricsMapped: string[];        // Track which metrics are displayed (for deduplication)
  isBottleneck?: boolean;
}

export interface BottleneckAnalysis {
  fromStageId: string;
  toStageId: string;
  fromStageLabel: string;
  toStageLabel: string;
  conversionRate: number | null;
  conversionDelta: number | null;
  severity: 'critical' | 'warning' | 'info' | 'none';
  evidence: string[];
  likelyCause: string;
  recommendedActions: string[];
}

export interface FunnelAdaptiveSummary {
  text: string;
  keyInsight: string;
  bottomline: string;
}
