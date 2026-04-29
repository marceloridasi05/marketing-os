/**
 * Funnel Metric Deduplication
 *
 * Ensures each metric appears in only one stage across the funnel.
 * Tracks which metrics are used and prevents duplication.
 */

import type { FunnelModel } from './funnelModels';

export interface DedupResult {
  // Map from stage ID to array of metric keys assigned to that stage
  stageMetrics: Map<string, string[]>;
  // Track which metrics were not assigned (should be mapped elsewhere)
  unmappedMetrics: Set<string>;
  // Track metrics that appeared in multiple stages (deduplication candidates)
  duplicatedMetrics: Map<string, string[]>; // metric → [stageIds]
}

/**
 * Deduplicate metrics across stages in a funnel model
 *
 * Strategy:
 * 1. Go through each stage in order
 * 2. For each metric in that stage's stageToMetrics
 * 3. If metric hasn't been used yet, assign it to this stage
 * 4. If metric was already used, skip it (keep it in first stage) and track as "duplicate"
 * 5. Mark second occurrence as "No data mapped"
 */
export function deduplicateMetricsAcrossStages(
  model: FunnelModel,
  availableMetrics: string[]
): DedupResult {
  const result: DedupResult = {
    stageMetrics: new Map(),
    unmappedMetrics: new Set(availableMetrics),
    duplicatedMetrics: new Map()
  };

  const usedMetrics = new Set<string>();

  // Process stages in order
  for (const stage of model.stages) {
    const stageMetricsForThis: string[] = [];

    // Get metrics mapped to this stage in the model
    const metricsInStage = (model.stageToMetrics && model.stageToMetrics[stage.id]) || [];

    for (const metric of metricsInStage) {
      if (!availableMetrics.includes(metric)) {
        // Metric not in available data, skip
        continue;
      }

      if (usedMetrics.has(metric)) {
        // Already used in a previous stage
        if (!result.duplicatedMetrics.has(metric)) {
          result.duplicatedMetrics.set(metric, []);
        }
        result.duplicatedMetrics.get(metric)!.push(stage.id);
      } else {
        // First use of this metric
        stageMetricsForThis.push(metric);
        usedMetrics.add(metric);
        result.unmappedMetrics.delete(metric);
      }
    }

    result.stageMetrics.set(stage.id, stageMetricsForThis);
  }

  return result;
}

/**
 * Check if a metric should be displayed in a stage
 * Returns true if the metric is assigned to this stage (not duplicated)
 */
export function isMetricAssignedToStage(
  metric: string,
  stageId: string,
  dedupResult: DedupResult
): boolean {
  const metricsInStage = dedupResult.stageMetrics.get(stageId) || [];
  return metricsInStage.includes(metric);
}

/**
 * Get list of metrics that should be marked as "No data mapped" for a stage
 * (because they appear in earlier stages but are also mapped here)
 */
export function getSkippedMetricsForStage(
  stageId: string,
  dedupResult: DedupResult
): string[] {
  const skipped: string[] = [];

  for (const [metric, duplicateStages] of dedupResult.duplicatedMetrics.entries()) {
    if (duplicateStages.includes(stageId)) {
      skipped.push(metric);
    }
  }

  return skipped;
}

/**
 * Get summary of deduplication results
 */
export function getSummaryStats(dedupResult: DedupResult): {
  totalStages: number;
  totalMetricsAssigned: number;
  totalMetricsAvailable: number;
  duplicatesFound: number;
  unmappedMetrics: string[];
} {
  let totalAssigned = 0;
  for (const metrics of dedupResult.stageMetrics.values()) {
    totalAssigned += metrics.length;
  }

  return {
    totalStages: dedupResult.stageMetrics.size,
    totalMetricsAssigned: totalAssigned,
    totalMetricsAvailable: totalAssigned + dedupResult.unmappedMetrics.size,
    duplicatesFound: dedupResult.duplicatedMetrics.size,
    unmappedMetrics: Array.from(dedupResult.unmappedMetrics)
  };
}
