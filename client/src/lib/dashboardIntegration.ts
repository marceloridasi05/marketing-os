/**
 * Dashboard Integration
 * Bridges Dashboard data to new Marketing Command Center components
 */

// Inline types to avoid circular dependencies
interface MarketingHealthSummary {
  status: 'healthy' | 'attention' | 'critical';
  mainReason: string;
  recommendedAction: string;
  dataConfidence: 'high' | 'medium' | 'low';
  metrics: {
    topPositive: { label: string; value: string; change: number };
    topNegative: { label: string; value: string; change: number };
  };
}

interface DecisionCardMetric {
  label: string;
  value: number | null;
  previous: number | null;
  format: 'num' | 'money' | 'pct';
  status?: 'healthy' | 'attention' | 'critical';
  isConnected: boolean;
  source?: string;
}

interface DecisionCard {
  area: 'demand' | 'efficiency' | 'pipeline' | 'channels' | 'budget';
  title: string;
  status: 'healthy' | 'attention' | 'critical';
  primaryMetric: DecisionCardMetric;
  supportingMetrics: DecisionCardMetric[];
  insight?: string;
  recommendedAction?: string;
}

import { calculateHealthStatus } from './dashboardHealthLogic';
import { buildDecisionCards } from './decisionCardBuilder';

interface DashboardMetricsInput {
  // Current period
  totalSessions: number | null;
  totalLeads: number | null;
  newUsers: number | null;
  gaClicks: number | null;
  gaImpressions: number | null;
  cpl: number | null;
  cvr: number | null;
  totalGaConversions: number | null;
  totalAdsSpend: number | null;
  budgetPlanned: number | null;
  budgetActual: number | null;
  googleAdsSpend?: number | null;
  metaSpend?: number | null;
  linkedinSpend?: number | null;

  // Previous period
  prevSessions: number | null;
  prevLeads: number | null;
  prevNewUsers: number | null;
  prevGaClicks: number | null;
  prevCpl: number | null;
  prevCvr: number | null;
  prevGaConversions: number | null;
  prevAdsSpend: number | null;

  // CRM / Advanced metrics (if available)
  mql?: number | null;
  sql?: number | null;
  opportunities?: number | null;
  pipeline?: number | null;
  revenue?: number | null;
  prevMql?: number | null;
  prevSql?: number | null;
  prevOpportunities?: number | null;
  prevPipeline?: number | null;
  prevRevenue?: number | null;
}

/**
 * Calculate Health Summary for Dashboard
 */
export function calculateDashboardHealth(
  modelId: string,
  metrics: DashboardMetricsInput
): HealthSummaryType {
  // Map dashboard metrics to health calculation format
  const healthMetrics: Record<string, { current: number | null; previous: number | null }> = {
    sessions: { current: metrics.totalSessions, previous: metrics.prevSessions },
    leadsGenerated: { current: metrics.totalLeads, previous: metrics.prevLeads },
    newUsers: { current: metrics.newUsers, previous: metrics.prevNewUsers },
    gaClicks: { current: metrics.gaClicks, previous: metrics.prevGaClicks },
    cpl: { current: metrics.cpl, previous: metrics.prevCpl },
    cvr: { current: metrics.cvr ? metrics.cvr * 100 : null, previous: metrics.prevCvr ? metrics.prevCvr * 100 : null },
    mql: { current: metrics.mql || null, previous: metrics.prevMql || null },
    sql: { current: metrics.sql || null, previous: metrics.prevSql || null },
    opportunities: { current: metrics.opportunities || null, previous: metrics.prevOpportunities || null },
    pipeline: { current: metrics.pipeline || null, previous: metrics.prevPipeline || null },
    revenue: { current: metrics.revenue || null, previous: metrics.prevRevenue || null },
  };

  // Calculate data completeness (% of required metrics available)
  const requiredMetricKeys = ['sessions', 'leadsGenerated', 'cpl'];
  const availableRequired = requiredMetricKeys.filter(
    (key) => healthMetrics[key].current !== null
  ).length;
  const dataCompleteness = (availableRequired / requiredMetricKeys.length) * 100;

  return calculateHealthStatus({
    modelId,
    metrics: healthMetrics,
    dataCompleteness,
  });
}

/**
 * Build Decision Cards for Dashboard
 */
export function buildDashboardDecisionCards(
  modelId: string,
  metrics: DashboardMetricsInput
) {
  // Map dashboard metrics to card builder format
  const cardMetrics: Record<string, { current: number | null; previous: number | null }> = {
    // Demand metrics
    sessions: { current: metrics.totalSessions, previous: metrics.prevSessions },
    leadsGenerated: { current: metrics.totalLeads, previous: metrics.prevLeads },
    newUsers: { current: metrics.newUsers, previous: metrics.prevNewUsers },

    // Efficiency metrics
    cpl: { current: metrics.cpl, previous: metrics.prevCpl },
    gaClicks: { current: metrics.gaClicks, previous: metrics.prevGaClicks },
    gaImpressions: { current: metrics.gaImpressions, previous: null },

    // Pipeline metrics
    mql: { current: metrics.mql || null, previous: metrics.prevMql || null },
    sql: { current: metrics.sql || null, previous: metrics.prevSql || null },
    opportunities: { current: metrics.opportunities || null, previous: metrics.prevOpportunities || null },
    pipeline: { current: metrics.pipeline || null, previous: metrics.prevPipeline || null },
    revenue: { current: metrics.revenue || null, previous: metrics.prevRevenue || null },

    // Channels (estimated from total spend distribution)
    googleAds: { current: metrics.googleAdsSpend || null, previous: null },
    metaAds: { current: metrics.metaSpend || null, previous: null },
    linkedinAds: { current: metrics.linkedinSpend || null, previous: null },
    organic: { current: null, previous: null },
    direct: { current: null, previous: null },

    // Budget
    budgetPlanned: { current: metrics.budgetPlanned, previous: null },
    budgetActual: { current: metrics.budgetActual, previous: null },
    budgetBalance: {
      current:
        metrics.budgetPlanned && metrics.budgetActual
          ? metrics.budgetPlanned - metrics.budgetActual
          : null,
      previous: null,
    },
  };

  return buildDecisionCards({
    modelId,
    metrics: cardMetrics,
  });
}

/**
 * Calculate data completeness percentage
 */
export function calculateDataCompleteness(metrics: DashboardMetricsInput): number {
  const requiredKeys = [
    'totalSessions',
    'totalLeads',
    'gaClicks',
    'cpl',
    'cvr',
    'budgetActual',
  ];

  const filled = requiredKeys.filter((key) => {
    const value = metrics[key as keyof DashboardMetricsInput];
    return value !== null && value !== undefined && value > 0;
  }).length;

  return (filled / requiredKeys.length) * 100;
}

/**
 * Get model display name
 */
export function getModelDisplayName(modelId: string): string {
  const names: Record<string, string> = {
    b2b_sales_led: 'B2B Sales-Led',
    b2b_abm: 'B2B ABM / Enterprise',
    plg: 'PLG (Product-Led Growth)',
    smb_inbound: 'SMB / Inbound',
  };
  return names[modelId] || 'Unknown Model';
}
