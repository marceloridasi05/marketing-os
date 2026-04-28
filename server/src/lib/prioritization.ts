/**
 * Execution Prioritization Library
 *
 * Calculates priority scores based on impact/effort matrix.
 * Enables data-driven execution order for ideas, experiments, and initiatives.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type ImpactLevel = 'low' | 'medium' | 'high';
export type EffortLevel = 'low' | 'medium' | 'high';
export type PriorityTier = 'A' | 'B' | 'C' | 'D';

export interface ImpactEffortInput {
  impact: ImpactLevel;
  effort: EffortLevel;
  confidence?: 'low' | 'medium' | 'high';
}

export interface PrioritizationResult {
  priorityScore: number;          // 0-3 scale
  tier: PriorityTier;             // A, B, C, or D
  recommendation: string;         // Human-readable recommendation
  quadrant: string;               // e.g., "Quick Wins", "Strategic", "Filler", "Consider"
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert impact/effort text values to numeric values for calculation
 */
function getImpactValue(impact: ImpactLevel): number {
  return { low: 1, medium: 2, high: 3 }[impact];
}

function getEffortValue(effort: EffortLevel): number {
  return { low: 1, medium: 2, high: 3 }[effort];
}

/**
 * Determine which quadrant an item falls into
 */
function getQuadrant(impact: ImpactLevel, effort: EffortLevel): string {
  if (impact === 'high' && effort === 'low') return 'Quick Wins';
  if (impact === 'high' && effort === 'medium') return 'Strategic';
  if (impact === 'high' && effort === 'high') return 'Major Projects';
  if (impact === 'medium' && effort === 'low') return 'Quick Wins';
  if (impact === 'medium' && effort === 'medium') return 'Medium Term';
  if (impact === 'medium' && effort === 'high') return 'Consider';
  if (impact === 'low' && effort === 'low') return 'Nice to Have';
  if (impact === 'low' && effort === 'medium') return 'Nice to Have';
  return 'Avoid';
}

// ── Main Prioritization Function ───────────────────────────────────────────────

/**
 * Calculate priority score and tier based on impact/effort matrix
 *
 * Formula: Priority Score = Impact Value ÷ Effort Value
 * - High/Low = 3÷1 = 3.0 (Tier A)
 * - High/Medium = 3÷2 = 1.5 (Tier B)
 * - High/High = 3÷3 = 1.0 (Tier C)
 * - Medium/Low = 2÷1 = 2.0 (Tier B)
 * - Low/Low = 1÷1 = 1.0 (Tier C)
 * - Low/High = 1÷3 = 0.33 (Tier D)
 */
export function calculatePriorityScore(input: ImpactEffortInput): PrioritizationResult {
  const impactValue = getImpactValue(input.impact);
  const effortValue = getEffortValue(input.effort);

  const priorityScore = impactValue / effortValue;
  const quadrant = getQuadrant(input.impact, input.effort);

  let tier: PriorityTier;
  let recommendation: string;

  if (priorityScore >= 2.5) {
    tier = 'A';
    recommendation = 'Execute immediately - high impact, low/medium effort';
  } else if (priorityScore >= 1.5) {
    tier = 'B';
    recommendation = 'Schedule for next sprint - good ROI';
  } else if (priorityScore >= 1.0) {
    tier = 'C';
    recommendation = 'Plan for medium-term - significant but complex';
  } else {
    tier = 'D';
    recommendation = 'Deprioritize - low impact relative to effort';
  }

  return {
    priorityScore: Math.round(priorityScore * 100) / 100,
    tier,
    recommendation,
    quadrant,
  };
}

// ── Sorting ────────────────────────────────────────────────────────────────────

/**
 * Sort items by priority score (highest first)
 */
export function sortByPriority<T extends { priorityScore?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}

/**
 * Sort items by priority tier (A → B → C → D)
 */
export function sortByTier<T extends { tier?: PriorityTier }>(items: T[]): T[] {
  const tierOrder: Record<PriorityTier, number> = { A: 0, B: 1, C: 2, D: 3 };
  return [...items].sort(
    (a, b) => (tierOrder[a.tier ?? 'D'] - tierOrder[b.tier ?? 'D'])
  );
}

// ── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Get the tier badge color for UI display
 */
export function getTierColor(tier: PriorityTier): string {
  return {
    A: 'bg-red-100 text-red-700',
    B: 'bg-amber-100 text-amber-700',
    C: 'bg-blue-100 text-blue-700',
    D: 'bg-gray-100 text-gray-600',
  }[tier];
}

/**
 * Get human-readable label for tier
 */
export function getTierLabel(tier: PriorityTier): string {
  return {
    A: 'Execute Now',
    B: 'Schedule Soon',
    C: 'Plan Later',
    D: 'Deprioritize',
  }[tier];
}

/**
 * Get icon name for tier (from lucide-react or similar)
 */
export function getTierIcon(tier: PriorityTier): string {
  return {
    A: 'zap',       // High priority, urgent
    B: 'chevrons-up', // Medium-high priority
    C: 'arrow-up',   // Medium priority
    D: 'arrow-down', // Low priority
  }[tier];
}

/**
 * Group items by priority tier
 */
export function groupByTier<T extends { tier?: PriorityTier }>(
  items: T[]
): Record<PriorityTier, T[]> {
  return {
    A: items.filter(i => i.tier === 'A'),
    B: items.filter(i => i.tier === 'B'),
    C: items.filter(i => i.tier === 'C'),
    D: items.filter(i => i.tier === 'D'),
  };
}

/**
 * Filter items by minimum tier (e.g., show A and B tier only)
 */
export function filterByMinimumTier<T extends { tier?: PriorityTier }>(
  items: T[],
  minimumTier: PriorityTier
): T[] {
  const tierOrder: Record<PriorityTier, number> = { A: 0, B: 1, C: 2, D: 3 };
  const minimumValue = tierOrder[minimumTier];
  return items.filter(i => {
    const itemValue = tierOrder[i.tier ?? 'D'];
    return itemValue <= minimumValue;
  });
}
