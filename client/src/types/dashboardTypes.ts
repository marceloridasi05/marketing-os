/**
 * Dashboard Types - Model-aware data structures
 */

// ── Health Status ──────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'attention' | 'critical';
export type DataConfidence = 'high' | 'medium' | 'low';

export interface MarketingHealthSummary {
  status: HealthStatus;
  mainReason: string;           // e.g., "Leads grew 116%, but CPL rose 84%"
  recommendedAction: string;    // e.g., "Review campaigns with high spend and low conversion"
  dataConfidence: DataConfidence;
  metrics: {
    topPositive: { label: string; value: string; change: number };
    topNegative: { label: string; value: string; change: number };
  };
}

// ── Decision Cards ─────────────────────────────────────────────────────────────

export type DecisionCardArea = 'demand' | 'efficiency' | 'pipeline' | 'channels' | 'budget';

export interface DecisionCardMetric {
  label: string;
  value: number | null;
  previous: number | null;
  format: 'num' | 'money' | 'pct';
  status?: HealthStatus;
  isConnected: boolean;  // Is data source connected?
  source?: string;       // "GA", "CRM", "Manual", "Missing"
}

export interface DecisionCard {
  area: DecisionCardArea;
  title: string;
  status: HealthStatus;
  primaryMetric: DecisionCardMetric;
  supportingMetrics: DecisionCardMetric[];
  insight?: string;      // Key finding or alert
  recommendedAction?: string;
}

// ── KPI Definition ─────────────────────────────────────────────────────────────

export interface KPIDefinition {
  key: string;
  label: string;
  format: 'num' | 'money' | 'pct';
  isRequired: boolean;   // Critical for model understanding?
  defaultSource: string; // "GA", "CRM", "Manual", etc.
}

// ── Model-Specific Configuration ───────────────────────────────────────────────

export interface ModelKPIConfig {
  modelId: string;
  priorityAreas: DecisionCardArea[];
  demandKPIs: KPIDefinition[];
  efficiencyKPIs: KPIDefinition[];
  pipelineKPIs: KPIDefinition[];
  channelMetrics: string[];
  funnelStages: string[];
  criticalAlerts: string[];
}

// ── Recommendation ─────────────────────────────────────────────────────────────

export interface ModelAwareRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  relatedMetrics: string[];
  estimatedImpact?: string;
}

// ── Missing Data ───────────────────────────────────────────────────────────────

export type DataAbsenceReason =
  | 'not_connected'      // Data source not connected
  | 'missing_in_period'  // No data for this time period
  | 'manual_input_needed' // Requires manual entry
  | 'no_data_yet';       // Feature not used

export interface MetricAbsence {
  reason: DataAbsenceReason;
  suggestedSource?: string;      // Where to get this data
  suggestedAction?: string;      // What user should do
}
