/**
 * Growth Loops Insights Detection Engine
 * Analyzes loop metrics to detect anomalies and opportunities
 *
 * 5 Detector Functions:
 * 1. Bottleneck Detection - Where do customers drop off?
 * 2. Efficiency Degradation - Is the loop getting worse?
 * 3. Scalability Potential - Can this loop grow 10x?
 * 4. Sustainability Detection - Will this loop fail?
 * 5. Acceleration Detection - Is this loop inflecting?
 */

import {
  detectBottleneck,
  calculateStageConversion,
  detectEfficiencyDegradation,
  assessScalabilityPotential,
  calculateLoopHealthScore,
  classifyLoopStrength,
} from './growthLoops.js';

// ──────────────────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────────────────

export interface GrowthLoopInsight {
  id?: string;
  siteId: number;
  loopId: number;
  insightType: 'bottleneck' | 'degradation' | 'scalability' | 'sustainability' | 'acceleration';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedStage?: string;
  metric?: string;
  currentValue?: number;
  previousValue?: number;
  delta?: number;
  suggestedActions: SuggestedAction[];
  scalabilityPotential?: number;
  detectedAt: string;
  dismissedAt?: string;
  resolvedAt?: string;
}

export interface SuggestedAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metricsToMonitor?: string[];
  estimatedImpact?: string;
}

export interface LoopMetricsSnapshot {
  inputVolume: number;
  actionCount: number;
  outputCount: number;
  outputRevenue?: number;
  inputCost?: number;
  cycleTimeHours?: number;
  loopType: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Bottleneck Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect where the loop is losing customers
 * Triggers when any stage conversion rate is <50% of benchmark
 */
export function detectBottlenecks(
  currentMetrics: LoopMetricsSnapshot,
  loopId: number,
  siteId: number,
  loopType: string
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  // Calculate stage conversions
  const inputToAction = calculateStageConversion(
    currentMetrics.inputVolume,
    currentMetrics.actionCount
  );

  const actionToOutput = calculateStageConversion(
    currentMetrics.actionCount,
    currentMetrics.outputCount
  );

  // Detect bottleneck
  const bottleneck = detectBottleneck(
    inputToAction.rate,
    actionToOutput.rate,
    loopType
  );

  if (bottleneck.isBottleneck) {
    const severityMap = {
      low: 'warning' as const,
      medium: 'warning' as const,
      high: 'critical' as const,
    };

    insights.push({
      siteId,
      loopId,
      insightType: 'bottleneck',
      severity: severityMap[bottleneck.severity],
      title: `${bottleneck.stage?.charAt(0).toUpperCase()}${bottleneck.stage?.slice(1)} stage bottleneck detected`,
      description: bottleneck.rootCause,
      affectedStage: bottleneck.stage,
      metric: `${bottleneck.stage}_conversion_rate`,
      currentValue: bottleneck.conversionRate ? bottleneck.conversionRate * 100 : 0,
      previousValue: bottleneck.expectedRate ? bottleneck.expectedRate * 100 : 0,
      delta: bottleneck.conversionRate && bottleneck.expectedRate
        ? ((bottleneck.conversionRate - bottleneck.expectedRate) / bottleneck.expectedRate) * 100
        : 0,
      suggestedActions: [
        {
          title: 'Immediate Action',
          description: bottleneck.suggestedFix,
          priority: bottleneck.severity === 'high' ? 'high' : 'medium',
          metricsToMonitor: [`${bottleneck.stage}_conversion_rate`, 'volume', 'cac'],
          estimatedImpact: `${bottleneck.severity === 'high' ? '20-40%' : '10-20%'} improvement in overall loop efficiency`,
        },
        {
          title: 'Root Cause Analysis',
          description: `Investigate why ${bottleneck.stage} stage is underperforming. Interview users, analyze drop-off points, test variations.`,
          priority: 'high',
          metricsToMonitor: ['session_duration', 'page_views', 'scroll_depth', 'form_abandonment'],
        },
      ],
      detectedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Efficiency Degradation Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect if loop efficiency is declining
 * Triggers if CAC ↑ >5% MoM OR Conversion ↓ >10% OR Cycle time ↑ >20%
 */
export function detectEfficiencyDegradation(
  currentMetrics: LoopMetricsSnapshot,
  previousMetrics: LoopMetricsSnapshot | undefined,
  loopId: number,
  siteId: number
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  if (!previousMetrics) {
    return insights; // Need previous period for comparison
  }

  // Calculate CAC for both periods
  const currentCac =
    currentMetrics.inputCost && currentMetrics.outputCount > 0
      ? currentMetrics.inputCost / currentMetrics.outputCount
      : 0;

  const previousCac =
    previousMetrics.inputCost && previousMetrics.outputCount > 0
      ? previousMetrics.inputCost / previousMetrics.outputCount
      : 0;

  // Calculate conversions
  const currentConversion =
    currentMetrics.inputVolume > 0
      ? currentMetrics.outputCount / currentMetrics.inputVolume
      : 0;

  const previousConversion =
    previousMetrics.inputVolume > 0
      ? previousMetrics.outputCount / previousMetrics.inputVolume
      : 0;

  // Calculate cycle time change (if available)
  const cycleTimeChange = previousMetrics.cycleTimeHours
    ? (currentMetrics.cycleTimeHours || 0) / previousMetrics.cycleTimeHours - 1
    : 0;

  // Calculate changes
  const cacChange = previousCac > 0 ? (currentCac - previousCac) / previousCac : 0;
  const conversionChange = previousConversion > 0
    ? (currentConversion - previousConversion) / previousConversion
    : 0;

  // Check for degradation triggers
  const triggers: string[] = [];

  if (cacChange > 0.05) {
    triggers.push(`CAC rising (↑${(cacChange * 100).toFixed(1)}%)`);
  }

  if (conversionChange < -0.1) {
    triggers.push(`Conversion declining (↓${Math.abs(conversionChange * 100).toFixed(1)}%)`);
  }

  if (cycleTimeChange > 0.2) {
    triggers.push(`Cycle time increasing (↑${(cycleTimeChange * 100).toFixed(1)}%)`);
  }

  if (triggers.length > 0) {
    insights.push({
      siteId,
      loopId,
      insightType: 'degradation',
      severity: triggers.length >= 2 ? 'critical' : 'warning',
      title: `Loop efficiency degrading (${triggers.length} metric${triggers.length > 1 ? 's' : ''})`,
      description: `Multiple efficiency metrics declining: ${triggers.join(', ')}. This loop is becoming less profitable.`,
      metric: triggers.length >= 2 ? 'multiple' : triggers[0].split(' ')[0].toLowerCase(),
      currentValue: cacChange > 0 ? currentCac : currentConversion,
      previousValue: cacChange > 0 ? previousCac : previousConversion,
      delta: cacChange > 0 ? cacChange * 100 : conversionChange * 100,
      suggestedActions: [
        {
          title: 'Reduce spend on degrading channels',
          description: 'Pause or reduce budget on lowest-performing campaigns within this loop',
          priority: 'high',
          metricsToMonitor: ['cac_by_channel', 'roas', 'conversion_by_source'],
          estimatedImpact: 'Stabilize CAC, improve overall loop profitability',
        },
        {
          title: 'Optimize funnel conversion',
          description: 'Review landing pages, forms, and checkout flow for friction points',
          priority: 'high',
          metricsToMonitor: ['page_conversion_rate', 'form_completion_rate', 'bounce_rate'],
          estimatedImpact: '5-15% improvement in conversion rate',
        },
        {
          title: 'Streamline process',
          description: `If cycle time is increasing, look for process bottlenecks. Automate manual steps.`,
          priority: 'medium',
          metricsToMonitor: ['cycle_time', 'time_per_stage', 'manual_intervention_count'],
          estimatedImpact: '10-25% reduction in cycle time',
        },
      ],
      detectedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Scalability Potential Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect loops with high scalability potential
 * Triggers if health is high + growth >20% + CAC decreasing
 */
export function detectScalabilityPotential(
  currentMetrics: LoopMetricsSnapshot,
  previousMetrics: LoopMetricsSnapshot | undefined,
  loopId: number,
  siteId: number,
  currentHealth: number
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  if (!previousMetrics) {
    return insights;
  }

  // Calculate metrics
  const currentCac =
    currentMetrics.inputCost && currentMetrics.outputCount > 0
      ? currentMetrics.inputCost / currentMetrics.outputCount
      : 0;

  const previousCac =
    previousMetrics.inputCost && previousMetrics.outputCount > 0
      ? previousMetrics.inputCost / previousMetrics.outputCount
      : 0;

  const volumeGrowth =
    (currentMetrics.outputCount - previousMetrics.outputCount) / Math.max(previousMetrics.outputCount, 1);

  const cacImprovement = previousCac > 0 ? (previousCac - currentCac) / previousCac : 0;

  // Triggers for scalability opportunity
  const canScale =
    currentHealth >= 70 && // Healthy loop
    volumeGrowth >= 0.2 && // Strong growth (20%+ MoM)
    cacImprovement >= -0.05; // CAC not degrading (actually improving is best)

  if (canScale) {
    let potentialMultiplier = 1.0;

    if (volumeGrowth >= 0.4 && cacImprovement >= 0.05) {
      potentialMultiplier = 10.0; // Excellent conditions
    } else if (volumeGrowth >= 0.3 && cacImprovement >= 0) {
      potentialMultiplier = 5.0; // Very good
    } else if (volumeGrowth >= 0.2) {
      potentialMultiplier = 3.0; // Good
    }

    insights.push({
      siteId,
      loopId,
      insightType: 'scalability',
      severity: 'info',
      title: `High scalability potential (${potentialMultiplier}x growth possible)`,
      description: `This loop shows strong fundamentals with ${currentHealth} health score, ${(volumeGrowth * 100).toFixed(0)}% growth, and ${cacImprovement >= 0 ? 'improving' : 'stable'} unit economics. Ready to scale investment.`,
      metric: 'growth_potential',
      currentValue: volumeGrowth * 100,
      previousValue: 20, // Benchmark 20% for "good"
      delta: volumeGrowth >= 0.2 ? ((volumeGrowth - 0.2) / 0.2) * 100 : 0,
      scalabilityPotential: potentialMultiplier,
      suggestedActions: [
        {
          title: `Increase budget by ${Math.min(potentialMultiplier * 50, 300)}%`,
          description: `Current CAC is ${cacImprovement >= 0 ? 'improving' : 'stable'}, so scale confidently. If CAC is decreasing with volume, allocate more budget to capture the opportunity.`,
          priority: 'high',
          metricsToMonitor: ['cac_by_budget_level', 'volume', 'roi'],
          estimatedImpact: `${(potentialMultiplier * 2).toFixed(0)}x revenue increase if budget matches growth rate`,
        },
        {
          title: 'Expand audience or market',
          description:
            'Broaden targeting criteria, test new geographies, or expand to adjacent customer segments',
          priority: 'high',
          metricsToMonitor: ['new_segment_conversion_rate', 'segment_cac', 'segment_ltv'],
          estimatedImpact: `Additional ${(potentialMultiplier * 1.5).toFixed(1)}x volume`,
        },
        {
          title: 'Automate and streamline',
          description:
            'With higher volume, invest in automation to maintain or improve cycle time and unit economics',
          priority: 'medium',
          metricsToMonitor: ['cycle_time', 'automation_coverage', 'cost_per_unit'],
          estimatedImpact: '20-30% reduction in operational friction',
        },
      ],
      detectedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Sustainability Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect unsustainable loops that will fail without intervention
 * Triggers if LTV/CAC <2.0x AND payback >18m AND reinvestment <20%
 */
export function detectUnsustainability(
  ltvCacRatio: number,
  paybackMonths: number,
  reinvestmentPercent: number,
  loopId: number,
  siteId: number
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  // Sustainability check
  const profitableUE = ltvCacRatio > 2.0;
  const fastPayback = paybackMonths < 18;
  const reinvesting = reinvestmentPercent > 15;

  // Any two of three failing = unsustainable
  const failingConditions = [!profitableUE, !fastPayback, !reinvesting].filter(Boolean).length;

  if (failingConditions >= 2) {
    let rootCauses: string[] = [];
    let fixes: SuggestedAction[] = [];

    if (!profitableUE) {
      rootCauses.push(`LTV/CAC ratio too low (${ltvCacRatio.toFixed(2)}x, need >2.0x)`);
      fixes.push({
        title: 'Reduce CAC (primary action)',
        description:
          'Test cheaper channels, improve landing page conversion, or reduce ad spend on expensive sources',
        priority: 'high',
        metricsToMonitor: ['cac', 'channel_cac', 'conversion_rate'],
        estimatedImpact: '20-40% CAC reduction',
      });
      fixes.push({
        title: 'Improve LTV (secondary)',
        description:
          'Increase order value, add upsells, or improve retention through better onboarding',
        priority: 'medium',
        metricsToMonitor: ['avg_order_value', 'repeat_purchase_rate', 'ltv'],
        estimatedImpact: '30-50% LTV increase',
      });
    }

    if (!fastPayback) {
      rootCauses.push(`Payback period too long (${paybackMonths.toFixed(1)} months, need <18m)`);
      fixes.push({
        title: 'Accelerate cash recovery',
        description:
          'Increase the revenue customers generate in month 1, or reduce upfront customer acquisition cost',
        priority: 'high',
        metricsToMonitor: ['first_month_revenue', 'cac', 'payback_months'],
        estimatedImpact: '25-40% faster payback',
      });
    }

    if (!reinvesting) {
      rootCauses.push(
        `Not reinvesting enough profit (${reinvestmentPercent.toFixed(0)}%, need >15%)`
      );
      fixes.push({
        title: 'Commit to reinvestment',
        description:
          'Allocate at least 15% of profits back into loop growth. This creates compounding returns.',
        priority: 'medium',
        metricsToMonitor: ['reinvestment_percent', 'profit_margin', 'growth_rate'],
        estimatedImpact: '10-20% additional growth from compounding',
      });
    }

    insights.push({
      siteId,
      loopId,
      insightType: 'sustainability',
      severity: failingConditions >= 3 ? 'critical' : 'warning',
      title: `Loop may not be sustainable (${failingConditions} conditions failing)`,
      description: `This loop is at risk without intervention: ${rootCauses.join('; ')}. Without fixing these, the loop will consume cash without generating returns.`,
      metric: 'sustainability',
      currentValue: ltvCacRatio,
      previousValue: 2.0, // Benchmark
      delta: ((ltvCacRatio - 2.0) / 2.0) * 100,
      suggestedActions: fixes,
      detectedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Acceleration Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect when a loop is accelerating/inflecting upward
 * Triggers if CAC ↓ >10% + Conversion ↑ >15% + Payback ↓ >25% + Volume ↑ >30%
 */
export function detectAcceleration(
  currentMetrics: LoopMetricsSnapshot,
  previousMetrics: LoopMetricsSnapshot | undefined,
  loopId: number,
  siteId: number
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  if (!previousMetrics) {
    return insights;
  }

  // Calculate metrics
  const currentCac =
    currentMetrics.inputCost && currentMetrics.outputCount > 0
      ? currentMetrics.inputCost / currentMetrics.outputCount
      : 0;

  const previousCac =
    previousMetrics.inputCost && previousMetrics.outputCount > 0
      ? previousMetrics.inputCost / previousMetrics.outputCount
      : 0;

  const currentConversion =
    currentMetrics.inputVolume > 0
      ? currentMetrics.outputCount / currentMetrics.inputVolume
      : 0;

  const previousConversion =
    previousMetrics.inputVolume > 0
      ? previousMetrics.outputCount / previousMetrics.inputVolume
      : 0;

  const volumeGrowth =
    (currentMetrics.outputCount - previousMetrics.outputCount) / Math.max(previousMetrics.outputCount, 1);

  const cacImprovement = previousCac > 0 ? (previousCac - currentCac) / previousCac : 0;
  const conversionImprovement = previousConversion > 0
    ? (currentConversion - previousConversion) / previousConversion
    : 0;

  // Check for acceleration (all conditions met)
  const accelerating =
    cacImprovement >= 0.1 && // CAC down 10%+
    conversionImprovement >= 0.15 && // Conversion up 15%+
    volumeGrowth >= 0.3; // Volume up 30%+

  if (accelerating) {
    insights.push({
      siteId,
      loopId,
      insightType: 'acceleration',
      severity: 'info',
      title: 'Loop is accelerating - inflection point detected',
      description: `Outstanding simultaneous improvements: CAC down ${(cacImprovement * 100).toFixed(0)}%, conversion up ${(conversionImprovement * 100).toFixed(0)}%, volume up ${(volumeGrowth * 100).toFixed(0)}%. This loop is hitting an inflection point.`,
      metric: 'acceleration',
      currentValue: volumeGrowth * 100,
      previousValue: 0,
      delta: volumeGrowth * 100,
      suggestedActions: [
        {
          title: 'Capitalize on momentum',
          description:
            'Increase investment immediately. Loop is improving on all metrics - higher budget will yield even better returns',
          priority: 'high',
          metricsToMonitor: ['volume', 'cac', 'roi'],
          estimatedImpact: '3-5x revenue increase if budget doubled',
        },
        {
          title: 'Document what changed',
          description:
            'Identify what caused the acceleration (product change, market shift, channel optimization, etc) so you can replicate it',
          priority: 'high',
          metricsToMonitor: ['change_log', 'a_b_tests', 'channel_mix'],
          estimatedImpact: 'Systematic understanding for future growth',
        },
        {
          title: 'Watch for saturation',
          description:
            'Monitor for signs of deceleration as volume increases. Plan content/offers for next phase',
          priority: 'medium',
          metricsToMonitor: ['growth_rate_trend', 'cac_by_budget_level', 'market_saturation_signals'],
          estimatedImpact: 'Sustained growth beyond inflection',
        },
      ],
      detectedAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ──────────────────────────────────────────────────────────────────────────
// Main Insight Generator
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generate all insights for a loop given current and previous metrics
 */
export function generateGrowthLoopInsights(
  loopId: number,
  siteId: number,
  loopType: string,
  currentMetrics: LoopMetricsSnapshot,
  previousMetrics: LoopMetricsSnapshot | undefined,
  currentHealth: number,
  ltvCacRatio: number,
  paybackMonths: number,
  reinvestmentPercent: number
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];

  // Run all 5 detectors
  insights.push(...detectBottlenecks(currentMetrics, loopId, siteId, loopType));

  insights.push(
    ...detectEfficiencyDegradation(currentMetrics, previousMetrics, loopId, siteId)
  );

  insights.push(
    ...detectScalabilityPotential(currentMetrics, previousMetrics, loopId, siteId, currentHealth)
  );

  insights.push(
    ...detectUnsustainability(ltvCacRatio, paybackMonths, reinvestmentPercent, loopId, siteId)
  );

  insights.push(...detectAcceleration(currentMetrics, previousMetrics, loopId, siteId));

  // Sort by severity (critical > warning > info)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
