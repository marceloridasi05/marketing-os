/**
 * Funnel Logic Orchestrator
 *
 * Main function that aggregates all metrics by funnel stage and generates
 * the data structure needed to render the FunnelFlow component.
 */

import type { FunnelModel } from './funnelModels';
import type { StageMetrics, MetricValue, TransitionMetrics, ObjStatus } from '../types/funnelTypes';
import { groupByStageInModel, getStageMetaInModel } from './metricClassification';
import { getPrimaryMetricForStage, getConversionMetricForTransition } from './funnelMetricMapping';
import { determineStageStatus } from './funnelStatusLogic';
import { deduplicateMetricsAcrossStages, isMetricAssignedToStage, getSkippedMetricsForStage } from './funnelDeduplication';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function fmtVal(v: number | null, fmt: 'num' | 'money' | 'pct'): string {
  if (v == null) return '—';
  if (fmt === 'money') return fmtMoney(v);
  if (fmt === 'pct') return `${v.toFixed(1)}%`;
  return fmtNum(v);
}

interface MetricData {
  [key: string]: number | null;
}

/**
 * Main aggregation function - transforms raw data into funnel stage metrics
 */
export function aggregateMetricsByStage(
  model: FunnelModel | null,
  currentData: MetricData[],
  previousData: MetricData[]
): Map<string, StageMetrics> {
  if (!model || !model.stages || model.stages.length === 0) {
    return new Map();
  }

  // Get all metric keys from current and previous data
  const allMetricKeys = new Set<string>();
  [...currentData, ...previousData].forEach(row => {
    Object.keys(row).forEach(k => {
      if (!k.startsWith('_') && k !== 'id' && k !== 'week' && k !== 'weekStart') {
        allMetricKeys.add(k);
      }
    });
  });

  // Deduplicate metrics across stages
  const dedupResult = deduplicateMetricsAcrossStages(model, Array.from(allMetricKeys));

  const result = new Map<string, StageMetrics>();
  const stageIds = model.stages.map(s => s.id);

  // Process each stage
  for (let i = 0; i < model.stages.length; i++) {
    const stage = model.stages[i];
    const stageMeta = getStageMetaInModel(stage.id, model);

    if (!stageMeta) continue;

    // Get primary metric for this stage
    const primaryMetricKey = getPrimaryMetricForStage(stage.id, model.id);
    const metricsAssignedToStage = dedupResult.stageMetrics.get(stage.id) || [];

    // Aggregate primary metric value
    let heroMetricValue: number | null = null;
    let heroMetricPrev: number | null = null;

    if (primaryMetricKey && metricsAssignedToStage.includes(primaryMetricKey)) {
      // Sum the metric across all rows
      heroMetricValue = currentData.reduce((sum, row) => {
        const val = row[primaryMetricKey];
        return sum + (val || 0);
      }, 0) || null;

      heroMetricPrev = previousData.reduce((sum, row) => {
        const val = row[primaryMetricKey];
        return sum + (val || 0);
      }, 0) || null;
    }

    const heroMetric: MetricValue | null = primaryMetricKey && heroMetricValue !== null ? {
      value: heroMetricValue,
      prev: heroMetricPrev,
      label: primaryMetricKey.replace(/_/g, ' '),
      key: primaryMetricKey,
      fmt: primaryMetricKey.includes('cost') || primaryMetricKey.includes('spend') || primaryMetricKey.includes('revenue') ? 'money' : 'num'
    } : null;

    // Get supporting metrics (other metrics assigned to this stage)
    const supportingMetrics: MetricValue[] = [];
    for (const metricKey of metricsAssignedToStage) {
      if (metricKey === primaryMetricKey) continue; // Skip hero metric

      const value = currentData.reduce((sum, row) => sum + (row[metricKey] || 0), 0) || null;
      const prev = previousData.reduce((sum, row) => sum + (row[metricKey] || 0), 0) || null;

      if (value !== null) {
        supportingMetrics.push({
          value,
          prev,
          label: metricKey.replace(/_/g, ' '),
          key: metricKey,
          fmt: metricKey.includes('cost') || metricKey.includes('spend') || metricKey.includes('revenue') ? 'money' : 'num'
        });
      }
    }

    // Calculate conversion rate to next stage
    let conversionToNextStage: TransitionMetrics | null = null;
    if (i < stageIds.length - 1) {
      const conversionMetric = getConversionMetricForTransition(i, i + 1, model.id, stageIds);
      if (conversionMetric) {
        const numerator = currentData.reduce((sum, row) => sum + (row[conversionMetric.numerator] || 0), 0);
        const denominator = currentData.reduce((sum, row) => sum + (row[conversionMetric.denominator] || 0), 0);

        const numPrev = previousData.reduce((sum, row) => sum + (row[conversionMetric.numerator] || 0), 0);
        const denomPrev = previousData.reduce((sum, row) => sum + (row[conversionMetric.denominator] || 0), 0);

        if (denominator > 0) {
          const rate = numerator / denominator;
          let delta: number | null = null;

          if (denomPrev > 0) {
            const ratePrev = numPrev / denomPrev;
            delta = ((rate - ratePrev) / ratePrev) * 100;
          }

          conversionToNextStage = {
            rate,
            delta,
            numeratorKey: conversionMetric.numerator,
            denominatorKey: conversionMetric.denominator
          };
        }
      }
    }

    // Determine stage status
    const status: ObjStatus = determineStageStatus(
      heroMetric?.value || null,
      heroMetric?.prev || null,
      conversionToNextStage?.rate || null,
      conversionToNextStage?.delta || null
    );

    result.set(stage.id, {
      stageId: stage.id,
      stageMeta: {
        label: stage.label,
        description: stage.description,
        color: stage.color,
        borderColor: stage.borderColor,
        iconColor: stage.iconColor,
        order: stage.order
      },
      heroMetric,
      heroMetricKey: primaryMetricKey || null,
      supportingMetrics: supportingMetrics.slice(0, 3), // Limit to 3 supporting metrics
      conversionToNextStage,
      status,
      metricsMapped: metricsAssignedToStage
    });
  }

  return result;
}

/**
 * Get top metric by absolute value change
 * Used for executive summary
 */
export function getTopMetricDelta(
  stageMetrics: Map<string, StageMetrics>
): {
  label: string;
  delta: number;
} | null {
  let topDelta = 0;
  let topLabel = '';

  for (const stage of stageMetrics.values()) {
    if (stage.heroMetric && stage.heroMetric.prev && stage.heroMetric.prev !== 0) {
      const delta = ((stage.heroMetric.value || 0) - (stage.heroMetric.prev || 0)) / (stage.heroMetric.prev || 1);
      const absDelta = Math.abs(delta);

      if (absDelta > Math.abs(topDelta)) {
        topDelta = delta;
        topLabel = stage.stageMeta.label;
      }
    }
  }

  return topLabel ? { label: topLabel, delta: topDelta * 100 } : null;
}
