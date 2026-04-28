/**
 * Growth Loops Calculation Library
 * Core functions for analyzing, scoring, and classifying growth loops
 *
 * Follows patterns from unitEconomics.ts with loop-specific logic
 */

// ──────────────────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────────────────

export interface LoopMetrics {
  inputVolume: number;
  inputCost?: number;
  actionCount: number;
  outputCount: number;
  outputRevenue?: number;
  cycleTimeHours?: number;
}

export interface LoopCAC {
  value: number;
  source: 'calculated' | 'attributed' | 'custom';
  confidence: 'high' | 'medium' | 'low';
}

export interface LoopLTV {
  value: number;
  method: 'simple' | 'churn_based' | 'crmdriven';
  confidence: 'high' | 'medium' | 'low';
}

export interface LoopConversion {
  stage: 'input' | 'action' | 'output';
  rate: number; // 0-1
  volumeFrom: number;
  volumeTo: number;
  conversionCount: number;
}

export interface LoopSpeed {
  cycleHours: number;
  targetHours?: number;
  variance: number; // % difference from target
}

export interface LoopStrength {
  level: 'weak' | 'medium' | 'strong';
  reasoning: string;
  score: number; // 0-3
}

export interface LoopHealth {
  score: number; // 0-100
  status: 'critical' | 'warning' | 'healthy';
  ltvCacRatio: number;
  paybackMonths: number;
  conversionRate: number;
  volumeGrowth: number;
}

export interface BottleneckDetection {
  isBottleneck: boolean;
  stage?: 'input' | 'action' | 'output';
  conversionRate?: number;
  expectedRate?: number;
  severity: 'low' | 'medium' | 'high';
  rootCause: string;
  suggestedFix: string;
}

export interface ScalabilityAssessment {
  canScale: boolean;
  potentialMultiplier: number; // 1.5x, 3x, 10x, etc
  constraints: string[];
  roadmap: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ──────────────────────────────────────────────────────────────────────────
// CAC Calculations
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate CAC for a specific growth loop
 * CAC = Total Input Cost / Output Count (customers generated)
 */
export function calculateLoopCAC(
  inputCost: number,
  outputCount: number
): LoopCAC {
  if (outputCount === 0) {
    return {
      value: 0,
      source: 'calculated',
      confidence: 'low',
    };
  }

  const cac = inputCost / outputCount;

  return {
    value: cac,
    source: 'calculated',
    confidence: outputCount >= 10 ? 'high' : outputCount >= 5 ? 'medium' : 'low',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// LTV Calculations
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate LTV for a loop
 * LTV = Total Output Revenue / Output Count (customers)
 */
export function calculateLoopLTV(
  outputRevenue: number,
  outputCount: number
): LoopLTV {
  if (outputCount === 0) {
    return {
      value: 0,
      method: 'simple',
      confidence: 'low',
    };
  }

  const ltv = outputRevenue / outputCount;

  return {
    value: ltv,
    method: 'simple',
    confidence: outputCount >= 10 ? 'high' : outputCount >= 5 ? 'medium' : 'low',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Conversion Rate Calculations
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate conversion rate for a specific loop stage
 * Rate = Count At Stage N+1 / Count At Stage N
 */
export function calculateStageConversion(
  currentVolume: number,
  nextVolume: number
): LoopConversion {
  if (currentVolume === 0) {
    return {
      stage: 'input',
      rate: 0,
      volumeFrom: 0,
      volumeTo: nextVolume,
      conversionCount: nextVolume,
    };
  }

  const rate = nextVolume / currentVolume;

  return {
    stage: 'input',
    rate: Math.min(rate, 1.0), // Cap at 100%
    volumeFrom: currentVolume,
    volumeTo: nextVolume,
    conversionCount: nextVolume,
  };
}

/**
 * Determine which stage is the primary conversion bottleneck
 * Compares each stage's conversion rate to benchmark
 */
export function calculateStageConversions(
  inputVolume: number,
  actionCount: number,
  outputCount: number
): {
  inputToAction: LoopConversion;
  actionToOutput: LoopConversion;
} {
  return {
    inputToAction: calculateStageConversion(inputVolume, actionCount),
    actionToOutput: calculateStageConversion(actionCount, outputCount),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cycle Time / Speed Calculations
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate how long a user spends in a loop (input → output)
 * Measured in hours for precision
 */
export function calculateLoopSpeed(
  inputDate: Date,
  outputDate: Date
): LoopSpeed {
  const diffMs = outputDate.getTime() - inputDate.getTime();
  const cycleHours = Math.round(diffMs / (1000 * 60 * 60)); // Convert to hours

  return {
    cycleHours: Math.max(cycleHours, 1), // Minimum 1 hour
    variance: 0, // Calculated when comparing to target
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Loop Strength Classification
// ──────────────────────────────────────────────────────────────────────────

/**
 * Classify loop strength into 3 tiers: weak, medium, strong
 * Based on LTV/CAC ratio, payback period, and growth momentum
 *
 * Weak: LTV/CAC < 2.0x AND payback > 24 months AND <10% MoM growth
 * Strong: LTV/CAC > 3.0x AND payback < 12 months AND >30% MoM growth
 * Medium: Everything in between
 */
export function classifyLoopStrength(
  ltvCacRatio: number,
  paybackMonths: number,
  volumeGrowthPct: number
): LoopStrength {
  const ratioScore = ltvCacRatio > 3.0 ? 3 : ltvCacRatio > 2.0 ? 2 : 1;
  const paybackScore = paybackMonths < 12 ? 3 : paybackMonths < 18 ? 2 : 1;
  const growthScore = volumeGrowthPct > 30 ? 3 : volumeGrowthPct > 10 ? 2 : 1;

  // Average the three scores
  const compositeScore = (ratioScore + paybackScore + growthScore) / 3;

  if (compositeScore >= 2.5) {
    return {
      level: 'strong',
      reasoning: `Strong unit economics (${ltvCacRatio.toFixed(1)}x LTV/CAC), fast payback (${paybackMonths.toFixed(1)}m), high growth (${volumeGrowthPct.toFixed(0)}%)`,
      score: compositeScore,
    };
  } else if (compositeScore >= 1.5) {
    return {
      level: 'medium',
      reasoning: `Moderate metrics - LTV/CAC ${ltvCacRatio.toFixed(1)}x, payback ${paybackMonths.toFixed(1)}m, growth ${volumeGrowthPct.toFixed(0)}%`,
      score: compositeScore,
    };
  } else {
    return {
      level: 'weak',
      reasoning: `Weak unit economics (${ltvCacRatio.toFixed(1)}x LTV/CAC), slow payback (${paybackMonths.toFixed(1)}m), low growth (${volumeGrowthPct.toFixed(0)}%)`,
      score: compositeScore,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Loop Health Score (0-100)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate overall health score for a loop (0-100 scale)
 * Weighted composite of: LTV/CAC ratio (40%), payback period (30%),
 * conversion rate (20%), growth momentum (10%)
 */
export function calculateLoopHealthScore(
  ltvCacRatio: number,
  paybackMonths: number,
  conversionRate: number,
  volumeGrowth: number
): LoopHealth {
  // LTV/CAC score: 0-100 (target is 3.0x)
  const ratioScore = Math.min(100, (ltvCacRatio / 3.0) * 100);

  // Payback score: 0-100 (target is 12 months)
  const paybackScore = Math.max(0, 100 - (paybackMonths / 12) * 100);

  // Conversion score: 0-100 (target is 10% conversion)
  const conversionScore = Math.min(100, (conversionRate / 0.1) * 100);

  // Growth score: 0-100 (target is 20% MoM growth)
  const growthScore = Math.min(100, (volumeGrowth / 0.2) * 100);

  // Weighted composite
  const healthScore =
    ratioScore * 0.4 + paybackScore * 0.3 + conversionScore * 0.2 + growthScore * 0.1;

  // Determine status
  let status: 'critical' | 'warning' | 'healthy';
  if (healthScore >= 70) {
    status = 'healthy';
  } else if (healthScore >= 40) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return {
    score: Math.round(healthScore),
    status,
    ltvCacRatio,
    paybackMonths,
    conversionRate,
    volumeGrowth,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Self-Sustaining Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect if a loop is self-sustaining (can fund its own growth)
 * Returns true if:
 *  - LTV/CAC > 2.0x (profitable unit economics)
 *  - Payback < 18 months (fast enough to reinvest)
 *  - Reinvestment > 15% (actually reinvesting)
 */
export function isSelfSustaining(
  ltv: number,
  cac: number,
  reinvestmentPercent: number,
  paybackMonths: number
): boolean {
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  return (
    ltvCacRatio > 2.0 && // Profitable
    paybackMonths < 18 && // Fast payback
    reinvestmentPercent > 15 // Actually reinvesting
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Bottleneck Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect where a loop is losing customers (bottleneck stage)
 * Identifies which stage has conversion rate drop relative to benchmark
 */
export function detectBottleneck(
  inputToActionRate: number,
  actionToOutputRate: number,
  loopType: string
): BottleneckDetection {
  // Benchmarks by loop type
  const benchmarks: Record<string, { inputToAction: number; actionToOutput: number }> = {
    paid: { inputToAction: 0.05, actionToOutput: 0.1 }, // 5% input→action, 10% action→output
    viral: { inputToAction: 0.1, actionToOutput: 0.15 },
    content: { inputToAction: 0.02, actionToOutput: 0.05 },
    sales: { inputToAction: 0.2, actionToOutput: 0.25 },
    abm: { inputToAction: 0.15, actionToOutput: 0.35 },
    event: { inputToAction: 0.08, actionToOutput: 0.2 },
    product: { inputToAction: 0.3, actionToOutput: 0.4 },
  };

  const benchmark = benchmarks[loopType] || benchmarks.paid;

  // Detect which stage is weaker
  const inputToActionGap = benchmark.inputToAction - inputToActionRate;
  const actionToOutputGap = benchmark.actionToOutput - actionToOutputRate;

  if (inputToActionGap > actionToOutputGap && inputToActionGap > 0) {
    // Input → Action is bottleneck
    return {
      isBottleneck: true,
      stage: 'input',
      conversionRate: inputToActionRate,
      expectedRate: benchmark.inputToAction,
      severity:
        inputToActionRate < benchmark.inputToAction * 0.5
          ? 'high'
          : inputToActionRate < benchmark.inputToAction * 0.75
            ? 'medium'
            : 'low',
      rootCause:
        'Traffic/lead quality issue - not enough users entering the loop or high friction',
      suggestedFix:
        'Increase traffic, reduce friction in landing page, improve offer, test different channels',
    };
  } else if (actionToOutputGap > 0) {
    // Action → Output is bottleneck
    return {
      isBottleneck: true,
      stage: 'action',
      conversionRate: actionToOutputRate,
      expectedRate: benchmark.actionToOutput,
      severity:
        actionToOutputRate < benchmark.actionToOutput * 0.5
          ? 'high'
          : actionToOutputRate < benchmark.actionToOutput * 0.75
            ? 'medium'
            : 'low',
      rootCause:
        'Conversion/sales issue - users not completing purchase or signup after action',
      suggestedFix:
        'Optimize checkout/signup flow, reduce form friction, improve offer/value prop, test pricing',
    };
  } else {
    // No bottleneck detected
    return {
      isBottleneck: false,
      severity: 'low',
      rootCause: 'Loop conversions meeting or exceeding benchmarks',
      suggestedFix: 'Monitor for degradation; consider scaling investment',
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Efficiency Degradation Detection
// ──────────────────────────────────────────────────────────────────────────

/**
 * Detect if loop efficiency is declining
 * Triggers if CAC ↑ >5% MoM OR Conversion ↓ >10% OR Cycle time ↑ >20%
 */
export function detectEfficiencyDegradation(
  cacChange: number, // % change, negative = improvement
  conversionChange: number, // % change
  cycleTimeChange: number // % change
): { isDegrading: boolean; triggers: string[]; severity: 'low' | 'medium' | 'high' } {
  const triggers: string[] = [];

  if (cacChange > 0.05) {
    triggers.push(`CAC increasing (↑${(cacChange * 100).toFixed(1)}%)`);
  }

  if (conversionChange < -0.1) {
    triggers.push(`Conversion declining (↓${Math.abs(conversionChange * 100).toFixed(1)}%)`);
  }

  if (cycleTimeChange > 0.2) {
    triggers.push(`Cycle time increasing (↑${(cycleTimeChange * 100).toFixed(1)}%)`);
  }

  const severity = triggers.length >= 2 ? 'high' : triggers.length === 1 ? 'medium' : 'low';

  return {
    isDegrading: triggers.length > 0,
    triggers,
    severity,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Scalability Assessment
// ──────────────────────────────────────────────────────────────────────────

/**
 * Assess whether a loop can be scaled up profitably
 * Looks at: health, unit economics sustainability, market size indicators
 */
export function assessScalabilityPotential(
  loopHealth: LoopHealth,
  currentVolume: number,
  cacTrend: number, // % change, negative = improving
  volumeGrowth: number,
  isMovingMarket: boolean = false
): ScalabilityAssessment {
  const constraints: string[] = [];
  const roadmap: string[] = [];

  // Health check
  if (loopHealth.score < 40) {
    constraints.push('Loop health too low - fix fundamentals first');
  } else if (loopHealth.score < 70) {
    roadmap.push('Improve loop health from warning to healthy before major scaling');
  }

  // CAC trend check
  if (cacTrend > 0.15) {
    // CAC rising >15%
    constraints.push('CAC rising too fast - will become uneconomical at scale');
  } else if (cacTrend > 0.05) {
    roadmap.push('Monitor CAC trend - slight degradation visible at scale');
  } else if (cacTrend < -0.1) {
    roadmap.push('CAC improving with scale - favorable unit economics');
  }

  // Volume growth check
  if (volumeGrowth < 0.1) {
    constraints.push('Growth too slow - loop not scaling naturally yet');
  } else if (volumeGrowth > 0.3) {
    roadmap.push('Strong growth momentum - ready to accelerate investment');
  }

  // Market saturation check
  if (currentVolume > 10000 && volumeGrowth < 0.05) {
    constraints.push('Market saturation risk - growth decelerating despite volume');
  }

  // Determine potential multiplier
  let potentialMultiplier = 1.0;
  if (loopHealth.status === 'healthy' && cacTrend < 0 && volumeGrowth > 0.2) {
    potentialMultiplier = 10.0; // Excellent: 10x potential
  } else if (loopHealth.status === 'healthy' && volumeGrowth > 0.15) {
    potentialMultiplier = 5.0; // Good: 5x potential
  } else if (loopHealth.status === 'healthy' || loopHealth.status === 'warning') {
    potentialMultiplier = 3.0; // Moderate: 3x potential
  } else {
    potentialMultiplier = 1.5; // Limited: 1.5x potential
  }

  // If there are hard constraints, limit multiplier
  if (constraints.length > 0) {
    potentialMultiplier = Math.min(potentialMultiplier, 2.0);
  }

  // Add roadmap items based on constraints
  if (constraints.length > 0) {
    roadmap.push(
      'Address constraints before major scaling: ' + constraints.join('; ').substring(0, 80)
    );
  }

  const canScale = constraints.length === 0 && loopHealth.score >= 50;
  const confidence = constraints.length === 0 ? 'high' : 'medium';

  return {
    canScale,
    potentialMultiplier,
    constraints,
    roadmap,
    confidence,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Payback Period Calculation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate payback period for a loop
 * Payback (months) = CAC / (Monthly Revenue per Customer × (1 - Churn Rate))
 * Simplified: CAC / (Monthly Revenue per Customer)
 */
export function calculatePaybackMonths(
  cac: number,
  monthlyRevenuePerCustomer: number,
  monthlyChurnRate: number = 0
): number {
  if (monthlyRevenuePerCustomer === 0) return 999; // Never breaks even

  const retentionMultiplier = 1 - monthlyChurnRate; // Factor in churn
  const adjustedMonthlyRevenue = monthlyRevenuePerCustomer * retentionMultiplier;

  if (adjustedMonthlyRevenue <= 0) return 999;

  return cac / adjustedMonthlyRevenue;
}

// ──────────────────────────────────────────────────────────────────────────
// Summary/Export
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculate comprehensive metrics for a loop
 * Returns all key metrics in one call for dashboard display
 */
export function calculateLoopMetricsSummary(
  loopMetrics: LoopMetrics,
  previousMetrics?: LoopMetrics,
  loopType: string = 'paid',
  targetPaybackMonths: number = 12,
  reinvestmentPercent: number = 0
) {
  // Calculate base metrics
  const cac = calculateLoopCAC(loopMetrics.inputCost || 0, loopMetrics.outputCount);
  const ltv = calculateLoopLTV(loopMetrics.outputRevenue || 0, loopMetrics.outputCount);

  const conversionInput = calculateStageConversion(
    loopMetrics.inputVolume,
    loopMetrics.actionCount
  );
  const conversionAction = calculateStageConversion(
    loopMetrics.actionCount,
    loopMetrics.outputCount
  );

  const ltvCacRatio = cac.value > 0 ? ltv.value / cac.value : 0;
  const paybackMonths = calculatePaybackMonths(
    cac.value,
    (loopMetrics.outputRevenue || 0) / Math.max(loopMetrics.outputCount, 1),
    0
  );

  // Calculate growth metrics if previous data available
  let volumeGrowth = 0;
  let conversionGrowth = 0;
  if (previousMetrics) {
    volumeGrowth = (loopMetrics.outputCount - previousMetrics.outputCount) / Math.max(previousMetrics.outputCount, 1);
    conversionGrowth = (conversionAction.rate - (previousMetrics.actionCount ? previousMetrics.actionCount / previousMetrics.inputVolume : 0)) / Math.max(previousMetrics.actionCount ? previousMetrics.actionCount / previousMetrics.inputVolume : 0.01, 0.01);
  }

  // Classify strength
  const strength = classifyLoopStrength(ltvCacRatio, paybackMonths, volumeGrowth);

  // Calculate health
  const health = calculateLoopHealthScore(
    ltvCacRatio,
    paybackMonths,
    conversionAction.rate,
    volumeGrowth
  );

  // Detect bottleneck
  const bottleneck = detectBottleneck(
    conversionInput.rate,
    conversionAction.rate,
    loopType
  );

  // Check sustainability
  const sustainable = isSelfSustaining(ltv.value, cac.value, reinvestmentPercent, paybackMonths);

  return {
    cac,
    ltv,
    ltvCacRatio,
    paybackMonths,
    conversionInput,
    conversionAction,
    strength,
    health,
    bottleneck,
    sustainable,
  };
}
