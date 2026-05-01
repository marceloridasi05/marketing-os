/**
 * GTM Data Quality Utilities
 *
 * Functions to calculate metric health, stage readiness, and data completeness
 * for GTM Operating Models
 */

export type DataStatus = 'automatic' | 'manual' | 'missing' | 'incomplete' | 'stale' | 'not_mapped';
export type Confidence = 'high' | 'medium' | 'low';
export type SourceOfTruth = 'GA4' | 'Google Ads' | 'Meta' | 'LinkedIn' | 'Search Console' | 'Google Sheets' | 'CRM';

export interface MetricStatusRecord {
  metricKey: string;
  dataStatus: DataStatus;
  sourceOfTruth?: SourceOfTruth;
  lastUpdated?: string; // ISO timestamp
  confidence: Confidence;
  isManual: boolean;
  value?: number;
}

export interface StageReadinessRecord {
  stageId: string;
  stageName: string;
  requiredMetricsCount: number;
  filledMetricsCount: number;
  readinessPct: number;
  isReady: boolean;
  status: 'ready' | 'partial' | 'empty';
  missingMetrics: string[];
}

/**
 * Calculate confidence level for a metric based on:
 * - Data status (automatic/manual/missing)
 * - Recency (how old is the last update)
 * - Completeness (is data fully populated or partial)
 */
export function calculateMetricConfidence(
  dataStatus: DataStatus,
  lastUpdated: string | undefined,
  isManual: boolean
): Confidence {
  // Missing, incomplete, or not mapped = low confidence
  if (dataStatus === 'missing' || dataStatus === 'incomplete' || dataStatus === 'not_mapped') {
    return 'low';
  }

  // Stale data (older than 2 weeks) = low confidence
  if (dataStatus === 'stale') {
    return 'low';
  }

  // If no update date, assume low confidence
  if (!lastUpdated) {
    return 'low';
  }

  const lastUpdateDate = new Date(lastUpdated);
  const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);

  // Auto-synced and recent (< 1 day) = high confidence
  if (!isManual && daysSinceUpdate < 1) {
    return 'high';
  }

  // Auto-synced but older (1-7 days) = medium confidence
  if (!isManual && daysSinceUpdate < 7) {
    return 'medium';
  }

  // Manual and recent = medium confidence
  if (isManual && daysSinceUpdate < 7) {
    return 'medium';
  }

  // Manual but old (> 7 days) = low confidence
  if (isManual && daysSinceUpdate >= 7) {
    return 'low';
  }

  // Auto-synced but very old (> 7 days) = medium confidence (sync might be working but infrequent)
  return 'medium';
}

/**
 * Determine overall data status for a metric based on:
 * - Whether it has a value
 * - When it was last updated
 * - Whether it's been manually entered vs auto-synced
 */
export function determineMetricDataStatus(
  hasValue: boolean,
  lastUpdated: string | undefined,
  isManual: boolean,
  isMapped: boolean
): DataStatus {
  // Not in metric mapping = not mapped
  if (!isMapped) {
    return 'not_mapped';
  }

  // No value and no update date = missing
  if (!hasValue && !lastUpdated) {
    return 'missing';
  }

  // Has value but no update date = incomplete
  if (hasValue && !lastUpdated) {
    return 'incomplete';
  }

  // Check if data is stale (> 30 days without update)
  if (lastUpdated) {
    const lastUpdateDate = new Date(lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 30) {
      return 'stale';
    }

    // Has value and recent update = automatic or manual based on source
    if (hasValue) {
      return isManual ? 'manual' : 'automatic';
    }
  }

  return 'missing';
}

/**
 * Calculate stage readiness based on required metric availability
 * Returns % of required metrics that have data
 */
export function calculateStageReadiness(
  stageId: string,
  stageName: string,
  requiredMetrics: string[],
  metricStatusMap: Map<string, MetricStatusRecord>
): StageReadinessRecord {
  const filledMetrics = requiredMetrics.filter(metricKey => {
    const status = metricStatusMap.get(metricKey);
    // Metric is "filled" if it's automatic or manual (has data)
    return status && (status.dataStatus === 'automatic' || status.dataStatus === 'manual');
  });

  const readinessPct = requiredMetrics.length > 0 ? Math.round((filledMetrics.length / requiredMetrics.length) * 100) : 100;

  const missingMetrics = requiredMetrics.filter(metricKey => {
    const status = metricStatusMap.get(metricKey);
    return !status || (status.dataStatus !== 'automatic' && status.dataStatus !== 'manual');
  });

  let status: 'ready' | 'partial' | 'empty';
  if (readinessPct === 100) {
    status = 'ready';
  } else if (readinessPct > 0) {
    status = 'partial';
  } else {
    status = 'empty';
  }

  return {
    stageId,
    stageName,
    requiredMetricsCount: requiredMetrics.length,
    filledMetricsCount: filledMetrics.length,
    readinessPct,
    isReady: readinessPct === 100,
    status,
    missingMetrics,
  };
}

/**
 * Suggest where a missing metric might be found
 * Returns likely sources in order of priority
 */
export function suggestMetricSources(metricKey: string): SourceOfTruth[] {
  const suggestions: Record<string, SourceOfTruth[]> = {
    // Awareness metrics
    impressions: ['GA4', 'Google Ads', 'LinkedIn', 'Meta'],
    reach: ['GA4', 'Google Ads', 'Meta'],
    brand_searches: ['GA4', 'Search Console'],
    page_views: ['GA4'],
    unique_visitors: ['GA4'],

    // Engagement metrics
    sessions: ['GA4'],
    users: ['GA4'],
    new_users: ['GA4'],
    clicks: ['GA4', 'Google Ads', 'LinkedIn', 'Meta'],
    engagement: ['GA4'],
    engagement_rate: ['GA4'],
    ctr: ['GA4', 'Search Console', 'Google Ads'],

    // Lead & Conversion metrics
    leads_generated: ['Google Sheets', 'CRM'],
    leads: ['Google Sheets', 'CRM'],
    signups: ['GA4', 'Google Sheets'],
    active_users: ['GA4', 'Google Sheets'],
    form_submissions: ['GA4', 'Google Sheets'],
    sqls: ['CRM'],
    opportunities: ['CRM'],
    revenue: ['CRM', 'Google Sheets'],
    arr: ['CRM'],
    mrr: ['CRM', 'Google Sheets'],

    // Cost metrics
    cost: ['Google Ads', 'Meta', 'LinkedIn'],
    cpc: ['Google Ads', 'Meta', 'LinkedIn'],
    cpl: ['Google Sheets', 'CRM'],
    cac: ['CRM', 'Google Sheets'],

    // Retention & LTV metrics
    retention_rate: ['GA4', 'CRM'],
    churn_rate: ['CRM'],
    ltv: ['CRM', 'Google Sheets'],
    nrr: ['CRM'],

    // Default fallback
    default: ['Google Sheets', 'GA4', 'CRM'],
  };

  return suggestions[metricKey] || suggestions.default;
}

/**
 * Provide human-friendly guidance for missing critical metrics
 */
export function getMissingMetricGuidance(
  metricKey: string,
  modelId: string
): { title: string; description: string; action: string } {
  const guidanceMap: Record<string, Record<string, { title: string; description: string; action: string }>> = {
    b2b_sales_led: {
      impressions: {
        title: 'Awareness tracking missing',
        description: 'Impressions metric is needed to track campaign reach and awareness generation.',
        action: 'Sync from Google Ads, LinkedIn, or Meta. Add manually if not available.',
      },
      sessions: {
        title: 'Website traffic missing',
        description: 'Sessions metric is required to understand engagement with your website.',
        action: 'Enable Google Analytics tracking. Ensure GA4 property is synced.',
      },
      leads_generated: {
        title: 'Lead tracking missing',
        description: 'Leads metric is critical for measuring lead generation performance.',
        action: 'Sync from CRM (HubSpot, Salesforce) or add manually from your lead intake system.',
      },
      sqls: {
        title: 'Sales qualification missing',
        description: 'SQLs (Sales Qualified Leads) metric shows sales team activity and pipeline.',
        action: 'Pull from your CRM. Define SQL criteria if not yet established.',
      },
      revenue: {
        title: 'Revenue tracking missing',
        description: 'Revenue is the primary success metric for your model.',
        action: 'Sync from CRM or accounting system. This is critical for ROI analysis.',
      },
    },
    b2b_abm: {
      account_sessions: {
        title: 'Account engagement missing',
        description: 'Account sessions metric shows engagement with target accounts.',
        action: 'Track from GA4 with account mapping, or extract from your analytics platform.',
      },
      decision_makers_engaged: {
        title: 'Buying committee engagement missing',
        description: 'This metric shows if key decision makers are engaged with your content.',
        action: 'Pull from CRM engagement tracking or marketing automation platform.',
      },
      revenue: {
        title: 'Closed revenue missing',
        description: 'Revenue is the primary success metric for ABM.',
        action: 'Sync from CRM. This shows ABM motion impact on deals.',
      },
    },
    plg: {
      signups: {
        title: 'Signup tracking missing',
        description: 'Signups metric shows product adoption velocity.',
        action: 'Track from product analytics (Amplitude, Mixpanel) or GA4 custom events.',
      },
      active_users: {
        title: 'Activation missing',
        description: 'Active users metric indicates whether signups are becoming engaged users.',
        action: 'Track from product analytics or GA4. Define "active" (e.g., logged in, took key action).',
      },
      retention_rate: {
        title: 'Retention tracking missing',
        description: 'Retention is critical for PLG models and directly impacts LTV.',
        action: 'Calculate from product database or pull from analytics platform.',
      },
      mrr: {
        title: 'Monthly Recurring Revenue missing',
        description: 'MRR is the primary success metric for PLG.',
        action: 'Sync from billing system or CRM. Calculate as total paying customers × ARPU.',
      },
    },
  };

  const modelGuidance = guidanceMap[modelId] || guidanceMap.b2b_sales_led;
  return (
    modelGuidance[metricKey] || {
      title: `${metricKey} data missing`,
      description: `This metric is needed for your GTM model to provide complete visibility.`,
      action: 'Add this metric from your data sources (Google Sheets, CRM, Analytics).',
    }
  );
}

/**
 * Format data status into human-readable text
 */
export function formatDataStatus(status: DataStatus): string {
  const labels: Record<DataStatus, string> = {
    automatic: 'Auto-synced',
    manual: 'Manually entered',
    missing: 'Missing',
    incomplete: 'Incomplete',
    stale: 'Stale (not updated)',
    not_mapped: 'Not mapped to stage',
  };
  return labels[status] || status;
}

/**
 * Format confidence level into human-readable text with color
 */
export function formatConfidence(confidence: Confidence): { label: string; color: string } {
  const formats: Record<Confidence, { label: string; color: string }> = {
    high: { label: 'High Confidence', color: 'bg-emerald-100 text-emerald-700' },
    medium: { label: 'Medium Confidence', color: 'bg-amber-100 text-amber-700' },
    low: { label: 'Low Confidence', color: 'bg-red-100 text-red-700' },
  };
  return formats[confidence];
}
