/**
 * Unit Economics Insights Detection
 *
 * Detects anomalies in unit economics:
 * - Rising CAC (market saturation, bidding pressure)
 * - Falling LTV (quality issues, retention problems)
 * - Unhealthy LTV/CAC ratio (unsustainable economics)
 * - Churn spikes (cohort quality or product issues)
 * - Long payback periods (extended cash flow strain)
 */

import * as ue from './unitEconomics.js';

export interface UnitEconomicsInsight {
  id?: string;
  siteId: number;
  insightType: 'rising_cac' | 'falling_ltv' | 'unhealthy_ratio' | 'churn_spike' | 'long_payback';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  segmentId?: string; // channel, campaign, or cohort ID
  segmentType?: string; // 'channel' | 'campaign' | 'cohort'
  metric: string; // 'cac' | 'ltv' | 'ratio' | 'churn' | 'payback'
  currentValue: number;
  previousValue: number;
  delta: number; // percentage change
  suggestedActions: SuggestedAction[];
  detectedAt?: string;
  dismissedAt?: string;
  resolvedAt?: string;
}

export interface SuggestedAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metricsToMonitor: string[];
}

// ── Insight Detector: Rising CAC ────────────────────────────────────────────

/**
 * Detect rising CAC: Warn if CAC increased >5% MoM or >10% YoY
 *
 * Root causes:
 * - Market saturation (depleting audience)
 * - Bidding pressure (increased competition)
 * - Lower quality leads (different audience mix)
 * - Tracking issues (misattribution)
 */
export function detectRisingCAC(
  currentCAC: number,
  previousCAC: number,
  segmentId?: string,
  segmentType?: string
): UnitEconomicsInsight | null {
  if (previousCAC === 0) return null;

  const snapshot = ue.calculateCACSnapshot(currentCAC, previousCAC);
  const { isRising, severity } = ue.isRisingCAC(snapshot, 'monthly');

  if (!isRising) return null;

  const actions: SuggestedAction[] = [];

  if (severity === 'critical') {
    actions.push({
      title: 'Pause and audit channel',
      description: 'Consider pausing or significantly reducing spend on this channel until issues are resolved.',
      priority: 'high',
      metricsToMonitor: ['cac', 'conversion_rate', 'lead_quality'],
    });
    actions.push({
      title: 'Investigate audience quality',
      description: 'Check if audience targeting has changed, look for bot traffic, or demographic shifts.',
      priority: 'high',
      metricsToMonitor: ['conversion_rate', 'engagement', 'session_quality'],
    });
  }

  actions.push({
    title: 'Optimize landing pages and creatives',
    description: 'A/B test new landing page designs, headlines, and ad creatives to improve conversion rates.',
    priority: 'high',
    metricsToMonitor: ['ctr', 'conversion_rate', 'cost_per_lead'],
  });

  actions.push({
    title: 'Test new audience segments or channels',
    description: 'Explore new audience targeting, lookalike audiences, or alternative channels to find cheaper traffic.',
    priority: 'medium',
    metricsToMonitor: ['cac', 'conversion_rate'],
  });

  actions.push({
    title: 'Audit UTM tracking accuracy',
    description: 'Verify that UTM tags are correct and tracking isn\'t double-counting conversions.',
    priority: 'medium',
    metricsToMonitor: ['total_conversions', 'utm_attribution'],
  });

  return {
    siteId: 0, // Will be set by caller
    insightType: 'rising_cac',
    severity,
    title: `Rising CAC on ${segmentType || 'this channel'}`,
    description: `CAC increased ${snapshot.delta.toFixed(1)}% from $${previousCAC.toFixed(2)} to $${currentCAC.toFixed(2)}.`,
    segmentId,
    segmentType,
    metric: 'cac',
    currentValue: currentCAC,
    previousValue: previousCAC,
    delta: snapshot.delta,
    suggestedActions: actions,
  };
}

// ── Insight Detector: Falling LTV ───────────────────────────────────────────

/**
 * Detect falling LTV: Warn if recent cohorts (last 3 months) have lower LTV
 *
 * Root causes:
 * - Lower initial order value (cheaper customers)
 * - Higher churn (worse retention)
 * - Lower repeat purchase rate
 * - Product quality issues
 */
export function detectFallingLTV(
  currentLTV: number,
  previousLTV: number,
  segmentId?: string,
  segmentType?: string
): UnitEconomicsInsight | null {
  if (previousLTV === 0) return null;

  const snapshot = ue.calculateLTVSnapshot(currentLTV, previousLTV);

  // Warning: > 15% decline, Critical: > 25% decline
  let severity: 'critical' | 'warning' | 'info' = 'info';
  if (snapshot.delta <= -25) severity = 'critical';
  else if (snapshot.delta <= -15) severity = 'warning';
  else return null;

  const actions: SuggestedAction[] = [];

  if (severity === 'critical') {
    actions.push({
      title: 'Investigate product retention issues',
      description: 'Review recent product changes, quality issues, or support tickets. Higher churn may indicate a problem.',
      priority: 'high',
      metricsToMonitor: ['churn_rate', 'engagement', 'support_tickets'],
    });
  }

  actions.push({
    title: 'Analyze recent cohort quality',
    description: `Identify which acquisition channels or campaigns this cohort came from. Quality may have degraded from a specific source.`,
    priority: 'high',
    metricsToMonitor: ['customer_source', 'churn_by_source', 'ltv_by_source'],
  });

  actions.push({
    title: 'Improve onboarding and engagement',
    description: 'Enhance customer onboarding, early engagement, and value realization to improve retention.',
    priority: 'high',
    metricsToMonitor: ['time_to_first_use', 'feature_adoption', 'engagement'],
  });

  actions.push({
    title: 'Consider pricing or product changes',
    description: 'Evaluate if pricing is too high for perceived value, or if product needs feature additions.',
    priority: 'medium',
    metricsToMonitor: ['mrr', 'arpu', 'feature_requests'],
  });

  return {
    siteId: 0,
    insightType: 'falling_ltv',
    severity,
    title: `Falling LTV on ${segmentType || 'recent cohorts'}`,
    description: `LTV decreased ${Math.abs(snapshot.delta).toFixed(1)}% from $${previousLTV.toFixed(2)} to $${currentLTV.toFixed(2)}.`,
    segmentId,
    segmentType,
    metric: 'ltv',
    currentValue: currentLTV,
    previousValue: previousLTV,
    delta: snapshot.delta,
    suggestedActions: actions,
  };
}

// ── Insight Detector: Unhealthy LTV/CAC Ratio ───────────────────────────────

/**
 * Detect unhealthy LTV/CAC ratio: Critical if <1.5x, Warning if <2.5x
 *
 * Interpretation:
 * - < 1.5x: CRITICAL (losing money on each customer)
 * - 1.5-2.5x: WARNING (marginal, at risk)
 * - > 3.0x: HEALTHY (sustainable)
 */
export function detectUnhealthyRatio(
  ltv: number,
  cac: number,
  segmentId?: string,
  segmentType?: string
): UnitEconomicsInsight | null {
  const ratio = cac === 0 ? 0 : ltv / cac;

  let severity: 'critical' | 'warning' | 'info' = 'info';
  if (ratio < 1.5) severity = 'critical';
  else if (ratio < 2.5) severity = 'warning';
  else return null;

  const actions: SuggestedAction[] = [];

  if (severity === 'critical') {
    actions.push({
      title: 'Immediately reduce CAC or pause channel',
      description: 'You are losing money on each customer acquisition. Pause this channel and focus on improving unit economics.',
      priority: 'high',
      metricsToMonitor: ['cac', 'ltv', 'ratio'],
    });
  } else {
    actions.push({
      title: 'Reduce CAC aggressively',
      description: 'Focus on cost reduction through optimization, lower-cost channels, or improved conversion rates.',
      priority: 'high',
      metricsToMonitor: ['cac', 'cost_per_click', 'conversion_rate'],
    });
  }

  actions.push({
    title: 'Improve LTV simultaneously',
    description: 'Increase revenue through upsells, cross-sells, higher pricing, or improved retention.',
    priority: 'high',
    metricsToMonitor: ['ltv', 'arpu', 'churn_rate'],
  });

  actions.push({
    title: 'Implement price optimization',
    description: 'Consider raising prices, introducing higher-tier offerings, or optimizing tier positioning.',
    priority: 'medium',
    metricsToMonitor: ['mrr', 'customer_mix', 'conversion_rate'],
  });

  return {
    siteId: 0,
    insightType: 'unhealthy_ratio',
    severity,
    title: `Unhealthy LTV/CAC ratio on ${segmentType || 'this segment'}`,
    description: `LTV/CAC ratio is ${ratio.toFixed(2)}x (LTV: $${ltv.toFixed(2)}, CAC: $${cac.toFixed(2)}).`,
    segmentId,
    segmentType,
    metric: 'ratio',
    currentValue: ratio,
    previousValue: 3.0, // benchmark
    delta: ((ratio - 3.0) / 3.0) * 100,
    suggestedActions: actions,
  };
}

// ── Insight Detector: Churn Spike ───────────────────────────────────────────

/**
 * Detect churn spikes: Warn if churn > baseline + 1.5x, Critical if > 2.0x
 *
 * Root causes:
 * - Cohort quality issue (wrong audience acquired)
 * - Product regression (feature breaks, performance issues)
 * - External factor (seasonality, market change)
 * - Support/onboarding problem (poor customer experience)
 */
export function detectChurnSpike(
  currentChurn: number,
  baselineChurn: number,
  segmentId?: string,
  segmentType?: string
): UnitEconomicsInsight | null {
  if (baselineChurn === 0) return null;

  const spikeFactor = currentChurn / baselineChurn;
  let severity: 'critical' | 'warning' | 'info' = 'info';

  if (spikeFactor > 2.0) severity = 'critical';
  else if (spikeFactor > 1.5) severity = 'warning';
  else return null;

  const actions: SuggestedAction[] = [];

  if (severity === 'critical') {
    actions.push({
      title: 'Investigate product or service issues immediately',
      description: 'Check recent product changes, bugs, performance issues, or downtime. This spike suggests a quality problem.',
      priority: 'high',
      metricsToMonitor: ['bug_reports', 'support_volume', 'performance_metrics'],
    });
  }

  actions.push({
    title: 'Analyze affected cohort or segment',
    description: `Check which acquisition source, time period, or customer segment is churning. Find the common factor.`,
    priority: 'high',
    metricsToMonitor: ['churn_by_source', 'churn_by_cohort', 'churn_by_segment'],
  });

  actions.push({
    title: 'Reach out to at-risk customers',
    description: 'Contact customers showing churn signals to understand their issues and intervene before they leave.',
    priority: 'high',
    metricsToMonitor: ['customer_feedback', 'nps', 'retention_after_intervention'],
  });

  actions.push({
    title: 'Improve onboarding for future cohorts',
    description: 'Strengthen onboarding, training, and early support to reduce churn in future acquisitions.',
    priority: 'medium',
    metricsToMonitor: ['time_to_value', 'feature_adoption', 'early_churn'],
  });

  return {
    siteId: 0,
    insightType: 'churn_spike',
    severity,
    title: `Churn spike on ${segmentType || 'this cohort'}`,
    description: `Churn rate jumped ${((spikeFactor - 1) * 100).toFixed(1)}% from baseline. Current: ${(currentChurn * 100).toFixed(1)}%, Baseline: ${(baselineChurn * 100).toFixed(1)}%.`,
    segmentId,
    segmentType,
    metric: 'churn',
    currentValue: currentChurn,
    previousValue: baselineChurn,
    delta: ((currentChurn - baselineChurn) / baselineChurn) * 100,
    suggestedActions: actions,
  };
}

// ── Insight Detector: Long Payback Period ───────────────────────────────────

/**
 * Detect long payback period: Warn if > 18 months, Critical if > 24 months
 *
 * Root causes:
 * - CAC too high (not competitive, inefficient marketing)
 * - Revenue too low (low ARPU, low price)
 * - Churn too high (short customer lifetime)
 */
export function detectLongPayback(
  paybackMonths: number,
  targetMonths: number = 12,
  cac: number,
  ltv: number,
  segmentId?: string,
  segmentType?: string
): UnitEconomicsInsight | null {
  let severity: 'critical' | 'warning' | 'info' = 'info';

  if (paybackMonths > targetMonths * 2) severity = 'critical'; // 24+ months
  else if (paybackMonths > targetMonths * 1.5) severity = 'warning'; // 18+ months
  else return null;

  const actions: SuggestedAction[] = [];

  if (severity === 'critical') {
    actions.push({
      title: 'Reassess channel viability',
      description: 'This payback period is unsustainable. Consider pausing or restructuring your acquisition strategy.',
      priority: 'high',
      metricsToMonitor: ['cac', 'ltv', 'payback_months'],
    });
  }

  actions.push({
    title: 'Reduce CAC through channel optimization',
    description: 'Optimize bidding strategies, targeting, creatives, and landing pages to improve conversion rates and reduce cost.',
    priority: 'high',
    metricsToMonitor: ['cac', 'conversion_rate', 'ctr'],
  });

  actions.push({
    title: 'Increase customer revenue (ARPU)',
    description: 'Implement upsells, cross-sells, or pricing increases to improve monthly revenue per customer.',
    priority: 'high',
    metricsToMonitor: ['arpu', 'mrr', 'ltv'],
  });

  actions.push({
    title: 'Improve retention to extend customer lifetime',
    description: 'Reduce churn through better onboarding, engagement, product improvements, and customer success initiatives.',
    priority: 'medium',
    metricsToMonitor: ['churn_rate', 'retention_rate', 'ltv'],
  });

  return {
    siteId: 0,
    insightType: 'long_payback',
    severity,
    title: `Long payback period on ${segmentType || 'this channel'}`,
    description: `Payback period is ${paybackMonths.toFixed(1)} months (target: ${targetMonths}). CAC: $${cac.toFixed(2)}, LTV: $${ltv.toFixed(2)}.`,
    segmentId,
    segmentType,
    metric: 'payback',
    currentValue: paybackMonths,
    previousValue: targetMonths,
    delta: ((paybackMonths - targetMonths) / targetMonths) * 100,
    suggestedActions: actions,
  };
}

// ── Batch Insight Detection ─────────────────────────────────────────────────

/**
 * Generate all unit economics insights for a site
 */
export function generateUnitEconomicsInsights(params: {
  siteId: number;
  currentCAC: number;
  previousCAC: number;
  currentLTV: number;
  previousLTV: number;
  currentChurnRate: number;
  baselineChurnRate: number;
  cacPerCustomer: number;
  monthlyRevenuePerCustomer: number;
  monthlyChurnRate: number;
  targetPaybackMonths?: number;
  segmentId?: string;
  segmentType?: string;
}): UnitEconomicsInsight[] {
  const insights: UnitEconomicsInsight[] = [];
  const {
    siteId,
    currentCAC,
    previousCAC,
    currentLTV,
    previousLTV,
    currentChurnRate,
    baselineChurnRate,
    cacPerCustomer,
    monthlyRevenuePerCustomer,
    monthlyChurnRate,
    targetPaybackMonths = 12,
    segmentId,
    segmentType,
  } = params;

  // Check for rising CAC
  const risingCAC = detectRisingCAC(currentCAC, previousCAC, segmentId, segmentType);
  if (risingCAC) {
    risingCAC.siteId = siteId;
    insights.push(risingCAC);
  }

  // Check for falling LTV
  const fallingLTV = detectFallingLTV(currentLTV, previousLTV, segmentId, segmentType);
  if (fallingLTV) {
    fallingLTV.siteId = siteId;
    insights.push(fallingLTV);
  }

  // Check for unhealthy ratio
  const unhealthyRatio = detectUnhealthyRatio(currentLTV, cacPerCustomer, segmentId, segmentType);
  if (unhealthyRatio) {
    unhealthyRatio.siteId = siteId;
    insights.push(unhealthyRatio);
  }

  // Check for churn spike
  const churnSpike = detectChurnSpike(currentChurnRate, baselineChurnRate, segmentId, segmentType);
  if (churnSpike) {
    churnSpike.siteId = siteId;
    insights.push(churnSpike);
  }

  // Check for long payback period
  const paybackMetrics = ue.calculatePaybackMetrics(cacPerCustomer, monthlyRevenuePerCustomer, monthlyChurnRate, targetPaybackMonths);
  const longPayback = detectLongPayback(
    paybackMetrics.paybackMonths,
    targetPaybackMonths,
    cacPerCustomer,
    currentLTV,
    segmentId,
    segmentType
  );
  if (longPayback) {
    longPayback.siteId = siteId;
    insights.push(longPayback);
  }

  return insights;
}
