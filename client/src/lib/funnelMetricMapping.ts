/**
 * Funnel Model - Primary Metric Mapping
 *
 * Defines the primary metric for each stage in each funnel model.
 * Used to determine the "hero" metric displayed prominently on each stage card.
 */

export const STAGE_PRIMARY_METRICS: Record<string, Record<string, string>> = {
  'aida': {
    'attention': 'impressions',
    'interest': 'sessions',
    'desire': 'leads',
    'action': 'conversions'
  },
  'aarrr': {
    'acquisition': 'sessions',
    'activation': 'engaged_sessions',
    'revenue': 'revenue',
    'retention': 'active_users',
    'referral': 'referred_leads'
  },
  'tofu_mofu_bofu': {
    'tofu': 'impressions',
    'mofu': 'leads',
    'bofu': 'conversions'
  },
  'sales_led': {
    'visitors': 'sessions',
    'leads': 'leads',
    'mql': 'leads',
    'sql': 'conversions',
    'opportunities': 'opportunities',
    'customers': 'conversions',
    'revenue': 'revenue'
  },
  'hourglass': {
    'awareness': 'impressions',
    'interest': 'sessions',
    'consideration': 'leads',
    'conversion': 'conversions',
    'retention': 'active_users',
    'expansion': 'revenue',
    'advocacy': 'referred_leads'
  }
};

/**
 * Returns the primary metric key for a given stage in a funnel model
 */
export function getPrimaryMetricForStage(stageId: string, modelId: string): string | null {
  return STAGE_PRIMARY_METRICS[modelId]?.[stageId] ?? null;
}

/**
 * Define conversion metrics between transitions
 * Format: from_stage -> to_stage = { numerator: metric_key, denominator: metric_key }
 */
export const CONVERSION_METRICS: Record<string, Record<string, Record<string, { numerator: string; denominator: string }>>> = {
  'aida': {
    'attention_to_interest': { numerator: 'sessions', denominator: 'impressions' },
    'interest_to_desire': { numerator: 'leads', denominator: 'sessions' },
    'desire_to_action': { numerator: 'conversions', denominator: 'leads' }
  },
  'aarrr': {
    'acquisition_to_activation': { numerator: 'engaged_sessions', denominator: 'sessions' },
    'activation_to_revenue': { numerator: 'revenue', denominator: 'engaged_sessions' },
    'revenue_to_retention': { numerator: 'active_users', denominator: 'revenue' },
    'retention_to_referral': { numerator: 'referred_leads', denominator: 'active_users' }
  },
  'tofu_mofu_bofu': {
    'tofu_to_mofu': { numerator: 'leads', denominator: 'impressions' },
    'mofu_to_bofu': { numerator: 'conversions', denominator: 'leads' }
  },
  'sales_led': {
    'visitors_to_leads': { numerator: 'leads', denominator: 'sessions' },
    'leads_to_mql': { numerator: 'leads', denominator: 'leads' }, // 1:1 proxy
    'mql_to_sql': { numerator: 'conversions', denominator: 'leads' },
    'sql_to_opportunities': { numerator: 'opportunities', denominator: 'conversions' },
    'opportunities_to_customers': { numerator: 'conversions', denominator: 'opportunities' },
    'customers_to_revenue': { numerator: 'revenue', denominator: 'conversions' }
  },
  'hourglass': {
    'awareness_to_interest': { numerator: 'sessions', denominator: 'impressions' },
    'interest_to_consideration': { numerator: 'leads', denominator: 'sessions' },
    'consideration_to_conversion': { numerator: 'conversions', denominator: 'leads' },
    'conversion_to_retention': { numerator: 'active_users', denominator: 'conversions' },
    'retention_to_expansion': { numerator: 'revenue', denominator: 'active_users' },
    'expansion_to_advocacy': { numerator: 'referred_leads', denominator: 'revenue' }
  }
};

/**
 * Get conversion metric pair for a transition between two stages
 * Returns { numerator, denominator } metric keys needed to calculate conversion rate
 */
export function getConversionMetricForTransition(
  fromStageOrder: number,
  toStageOrder: number,
  modelId: string,
  stageIds: string[]
): { numerator: string; denominator: string } | null {
  if (fromStageOrder >= stageIds.length - 1) return null; // Last stage has no "next"
  if (toStageOrder !== fromStageOrder + 1) return null; // Only consecutive transitions

  const fromStageId = stageIds[fromStageOrder];
  const toStageId = stageIds[toStageOrder];
  const key = `${fromStageId}_to_${toStageId}`;

  return CONVERSION_METRICS[modelId]?.[key] ?? null;
}

/**
 * Label for a transition (e.g., "Interest → Desire")
 */
export function getTransitionLabel(fromLabel: string, toLabel: string): string {
  return `${fromLabel} → ${toLabel}`;
}
