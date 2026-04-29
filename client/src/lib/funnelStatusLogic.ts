/**
 * Funnel Status & Bottleneck Analysis
 *
 * Determines health status of each stage and identifies bottleneck transitions
 */

import type { ObjStatus, BottleneckAnalysis, FunnelAdaptiveSummary } from '../types/funnelTypes';
import type { FunnelModel } from './funnelModels';

/**
 * Determine status for a stage based on its metrics
 */
export function determineStageStatus(
  heroValue: number | null,
  heroPrev: number | null,
  conversionRate: number | null,
  conversionDelta: number | null
): ObjStatus {
  // No data: return neutral
  if (heroValue == null && conversionRate == null) {
    return 'neutral';
  }

  // Calculate percentage change for hero metric
  let heroPercent = 0;
  if (heroValue != null && heroPrev != null && heroPrev !== 0) {
    heroPercent = ((heroValue - heroPrev) / heroPrev) * 100;
  }

  // Thresholds
  const CRITICAL_DOWN = -25;
  const CRITICAL_CONV_DOWN = -20;
  const WARNING_DOWN = -8;
  const WARNING_CONV_DOWN = -10;
  const GOOD_UP = 8;
  const GOOD_CONV_UP = 5;

  // Critical: metric or conversion rate down significantly
  if (heroPercent < CRITICAL_DOWN || (conversionDelta != null && conversionDelta < CRITICAL_CONV_DOWN)) {
    return 'critical';
  }

  // Warning: metric or conversion rate declining
  if (heroPercent < WARNING_DOWN || (conversionDelta != null && conversionDelta < WARNING_CONV_DOWN)) {
    return 'warning';
  }

  // Good: metric growing and conversion improving
  if (heroPercent > GOOD_UP && (conversionDelta == null || conversionDelta >= 0)) {
    return 'good';
  }

  // Stable: otherwise
  return 'stable';
}

/**
 * Analyze transitions between consecutive stages to identify bottlenecks
 */
export function analyzeTransitionBottlenecks(
  model: FunnelModel | null,
  stageMetrics: Map<string, {
    value: number | null;
    prev: number | null;
    conversionRate: number | null;
    conversionDelta: number | null;
    label: string;
  }>,
  stageOrder: string[]
): BottleneckAnalysis | null {
  if (!model || stageMetrics.size < 2) return null;

  // Calculate metrics for each transition
  const transitions: Array<{
    index: number;
    fromStageId: string;
    toStageId: string;
    fromLabel: string;
    toLabel: string;
    conversionRate: number | null;
    conversionDelta: number | null;
    score: number; // Negative = bad, positive = good
  }> = [];

  for (let i = 0; i < stageOrder.length - 1; i++) {
    const fromId = stageOrder[i];
    const toId = stageOrder[i + 1];
    const from = stageMetrics.get(fromId);
    const to = stageMetrics.get(toId);

    if (!from || !to) continue;

    const metrics = {
      index: i,
      fromStageId: fromId,
      toStageId: toId,
      fromLabel: from.label,
      toLabel: to.label,
      conversionRate: from.conversionRate,
      conversionDelta: from.conversionDelta,
      score: 0 as number
    };

    // Score: negative delta = bad (lower score = worse transition)
    if (metrics.conversionDelta != null) {
      metrics.score = -metrics.conversionDelta; // Negative delta becomes positive score (worse)
    }

    transitions.push(metrics);
  }

  if (transitions.length === 0) return null;

  // Find worst transition (highest negative score)
  const worst = transitions.reduce((prev, curr) =>
    curr.score > prev.score ? curr : prev
  );

  // Determine severity
  let severity: 'critical' | 'warning' | 'info' | 'none' = 'info';
  if (worst.conversionDelta != null) {
    if (worst.conversionDelta < -20) severity = 'critical';
    else if (worst.conversionDelta < -10) severity = 'warning';
  } else if (worst.conversionRate != null && worst.conversionRate < 0.15) {
    severity = 'warning'; // Naturally low conversion rate
  }

  // Analyze evidence and cause
  const evidence: string[] = [];
  let likelyCause = 'No data available';
  const actions: string[] = [];

  const from = stageMetrics.get(worst.fromStageId);
  const to = stageMetrics.get(worst.toStageId);

  if (from && to) {
    // Calculate percentage changes
    const fromPct = from.prev ? ((from.value || 0 - (from.prev || 0)) / (from.prev || 1)) * 100 : 0;
    const toPct = to.prev ? ((to.value || 0 - (to.prev || 0)) / (to.prev || 1)) * 100 : 0;

    evidence.push(`${from.label} ${fromPct > 0 ? '↑' : '↓'} ${Math.abs(fromPct).toFixed(0)}%`);
    evidence.push(`${to.label} ${toPct > 0 ? '↑' : '↓'} ${Math.abs(toPct).toFixed(0)}%`);

    // Cause analysis
    if (worst.conversionDelta != null && worst.conversionDelta < -10) {
      if (fromPct > 5 && toPct <= 0) {
        // Upstream growing but downstream flat/declining = transition problem
        likelyCause = `Conversion efficiency from ${worst.fromLabel} to ${worst.toLabel} has declined. Likely landing page, offer, or form issue.`;
        actions.push(`Review the ${worst.toLabel} funnel entry page experience`);
        actions.push('Check form abandonment rates and conversion funnel');
        actions.push('A/B test landing page or call-to-action messaging');
      } else if (fromPct <= 0 && toPct <= 0) {
        // Both declining = upstream problem
        likelyCause = `Both stages declining. Check upstream traffic and acquisition quality.`;
        actions.push('Analyze traffic source quality');
        actions.push('Review acquisition channel performance');
      } else {
        // Generic decline
        likelyCause = `Conversion rate deteriorating from ${worst.fromLabel} to ${worst.toLabel}.`;
        actions.push(`Investigate ${worst.toLabel} funnel entry point`);
        actions.push('Check for tracking issues or data quality problems');
      }
    } else if (worst.conversionRate !== null && worst.conversionRate < 0.1) {
      likelyCause = `Naturally low conversion rate (${(worst.conversionRate * 100).toFixed(1)}%). This transition may require optimization focus.`;
      actions.push(`Analyze baseline conversion rate for ${worst.fromLabel} → ${worst.toLabel}`);
      actions.push('Review competitive benchmarks for this transition');
    }
  }

  return {
    fromStageId: worst.fromStageId,
    toStageId: worst.toStageId,
    fromStageLabel: worst.fromLabel,
    toStageLabel: worst.toLabel,
    conversionRate: worst.conversionRate,
    conversionDelta: worst.conversionDelta,
    severity,
    evidence,
    likelyCause,
    recommendedActions: actions
  };
}

/**
 * Generate an adaptive executive summary based on the funnel model
 */
export function generateFunnelAdaptiveExecSummary(
  modelId: string,
  topMetricDelta: number | null,
  topMetricLabel: string,
  bottleneck: BottleneckAnalysis | null
): FunnelAdaptiveSummary {
  const trendPhrase = topMetricDelta == null
    ? ''
    : topMetricDelta > 8
      ? `${topMetricLabel} is growing`
      : topMetricDelta < -8
        ? `${topMetricLabel} is declining`
        : `${topMetricLabel} is stable`;

  let text = '';
  let keyInsight = '';
  let bottomline = '';

  if (bottleneck && bottleneck.severity !== 'none') {
    const transitionText = `the ${bottleneck.fromStageLabel} → ${bottleneck.toStageLabel} transition ${bottleneck.conversionDelta != null && bottleneck.conversionDelta < 0 ? 'is weakening' : 'needs attention'}`;

    switch (modelId) {
      case 'aida':
        text = trendPhrase ? `${trendPhrase}, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'Interest-to-Action efficiency is the main constraint';
        break;

      case 'aarrr':
        text = trendPhrase ? `${trendPhrase}, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'SaaS cohort quality or onboarding experience may need attention';
        break;

      case 'tofu_mofu_bofu':
        text = trendPhrase ? `${trendPhrase} at the top, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'Lead-to-conversion funnel is the main bottleneck';
        break;

      case 'sales_led':
        text = trendPhrase ? `${trendPhrase}, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'Sales pipeline progression is slowing';
        break;

      case 'hourglass':
        text = trendPhrase ? `${trendPhrase}, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'Customer lifecycle progression needs optimization';
        break;

      default:
        text = trendPhrase ? `${trendPhrase}, but ${transitionText}.` : `${transitionText}.`;
        keyInsight = 'Check funnel transition efficiency';
    }

    bottomline = `Focus on improving ${bottleneck.fromStageLabel} → ${bottleneck.toStageLabel} conversion.`;
  } else {
    // No significant bottleneck
    switch (modelId) {
      case 'aida':
        text = trendPhrase ? `${trendPhrase}. Funnel flow is healthy.` : 'Funnel flow is healthy.';
        keyInsight = 'All awareness-to-action transitions are stable';
        break;

      case 'aarrr':
        text = trendPhrase ? `${trendPhrase}. Growth metrics are progressing well.` : 'Growth metrics are progressing well.';
        keyInsight = 'SaaS growth loops are balanced';
        break;

      case 'sales_led':
        text = trendPhrase ? `${trendPhrase}. Sales pipeline is progressing smoothly.` : 'Sales pipeline is progressing smoothly.';
        keyInsight = 'Lead-to-customer conversion is efficient';
        break;

      case 'hourglass':
        text = trendPhrase ? `${trendPhrase}. Customer lifecycle is healthy.` : 'Customer lifecycle is healthy.';
        keyInsight = 'Post-acquisition engagement and expansion are strong';
        break;

      default:
        text = trendPhrase ? `${trendPhrase}. Funnel is balanced.` : 'Funnel is balanced';
        keyInsight = 'No major bottlenecks detected';
    }

    bottomline = 'Continue current initiatives and optimize at the margins.';
  }

  return { text, keyInsight, bottomline };
}
