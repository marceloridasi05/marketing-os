/**
 * Unit Economics Library
 *
 * Core calculations for CAC (Customer Acquisition Cost), LTV (Lifetime Value),
 * churn rates, payback periods, and health ratios.
 *
 * Design: Reuses existing cost aggregation (budgets, fixedCosts, adsBudgets tables)
 * and conversion tracking (performanceEntries, utmGaConversions).
 */

// ── Type Definitions ────────────────────────────────────────────────────────

export interface CACSnapshot {
  current: number;
  previous: number;
  ratio: number; // current / previous
  delta: number; // (current - previous) / previous * 100
}

export interface CACByChannel {
  channel: string;
  spend: number;
  customersAcquired: number;
  cac: number;
  cacSnapshot: CACSnapshot;
}

export interface LTVCalculation {
  simple: number; // initialOrderValue × multiplier
  churnBased: number; // (monthlyArpu × margin) / churnRate
  crmDriven: number; // observed lifetime revenue
  recommended: number; // user's chosen method
  healthScore: number; // 0-100 scale
}

export interface LTVSnapshot {
  current: number;
  previous: number;
  ratio: number;
  delta: number;
}

export interface LTVCACRatio {
  ltv: number;
  cac: number;
  ratio: number; // ltv / cac
  healthStatus: 'healthy' | 'warning' | 'critical';
  healthScore: number; // 0-100 scale
  interpretation: string;
}

export interface PaybackMetrics {
  cacPerCustomer: number;
  monthlyRevenuePerCustomer: number;
  monthlyChurnRate: number;
  paybackMonths: number;
  paybackHealthStatus: 'healthy' | 'warning' | 'critical';
  projectedMonths: {
    month: number;
    cumulativeRevenue: number;
    breakEven: boolean;
  }[];
}

export interface ChurnMetrics {
  churnRate: number; // (start - end + new) / start
  retentionRate: number; // 1 - churnRate
  absoluteChurned: number;
  churnTrend: 'improving' | 'stable' | 'declining';
}

export interface UnitEconomicsConfig {
  ltvCalculationMethod: 'simple' | 'churn_based' | 'crmdriven';
  ltvSimpleMultiplier: number;
  ltvAssumedMonthlyChurnRate: number;
  ltvGrossMarginPercent: number;
  cacAttributionModel: 'first_touch' | 'last_touch' | 'linear';
  cacCostComponents: string[]; // ['media_spend', 'team_salary', 'tools', 'fixed_costs']
  targetPaybackMonths: number;
  segmentBy: 'channel' | 'campaign' | 'source';
}

// ── CAC Calculations ────────────────────────────────────────────────────────

/**
 * Calculate CAC = (Media Spend + Allocated Fixed Costs) / Customers Acquired
 *
 * Sources:
 * - Spend: budgets table (media_spend) + fixedCosts (proportional allocation)
 * - Customers: performanceEntries.conversions OR utmCacAnalysis attribution
 */
export function calculateCAC(
  totalSpend: number,
  customersAcquired: number
): number {
  if (customersAcquired === 0) return 0;
  return totalSpend / customersAcquired;
}

/**
 * Calculate CAC trend: current vs previous period
 */
export function calculateCACSnapshot(
  currentCAC: number,
  previousCAC: number
): CACSnapshot {
  const ratio = previousCAC === 0 ? 1 : currentCAC / previousCAC;
  const delta = previousCAC === 0 ? 0 : ((currentCAC - previousCAC) / previousCAC) * 100;

  return { current: currentCAC, previous: previousCAC, ratio, delta };
}

/**
 * Detect rising CAC: threshold triggers
 * - WARNING: > 5% MoM or > 10% YoY
 * - CRITICAL: > 10% MoM or > 20% YoY
 */
export function isRisingCAC(
  snapshot: CACSnapshot,
  period: 'monthly' | 'yearly' = 'monthly'
): { isRising: boolean; severity: 'none' | 'warning' | 'critical' } {
  const threshold = period === 'monthly' ? 0.05 : 0.10;
  const criticalThreshold = period === 'monthly' ? 0.10 : 0.20;

  if (snapshot.delta >= criticalThreshold * 100) {
    return { isRising: true, severity: 'critical' };
  } else if (snapshot.delta >= threshold * 100) {
    return { isRising: true, severity: 'warning' };
  }
  return { isRising: false, severity: 'none' };
}

// ── LTV Calculations ────────────────────────────────────────────────────────

/**
 * Method 1: Simple LTV = Initial Order Value × Multiplier
 * Use case: Product/e-commerce where customers make one-time purchases
 */
export function calculateSimpleLTV(
  initialOrderValue: number,
  multiplier: number = 3.0
): number {
  return initialOrderValue * multiplier;
}

/**
 * Method 2: Churn-based LTV = (Monthly ARPU × Gross Margin) / Monthly Churn Rate
 * Use case: SaaS with recurring revenue
 */
export function calculateChurnBasedLTV(
  monthlyARPU: number,
  grossMarginPercent: number,
  monthlyChurnRate: number
): number {
  if (monthlyChurnRate === 0 || monthlyChurnRate >= 1) return 0;
  return (monthlyARPU * grossMarginPercent) / monthlyChurnRate;
}

/**
 * Method 3: CRM-driven LTV = Observed average lifetime revenue per customer
 * Use case: Mature products with historical customer data
 */
export function calculateCRMDrivenLTV(
  totalRevenue: number,
  customersAcquired: number
): number {
  if (customersAcquired === 0) return 0;
  return totalRevenue / customersAcquired;
}

/**
 * Calculate all three LTV methods and return recommended based on config
 */
export function calculateLTV(
  config: UnitEconomicsConfig,
  initialOrderValue: number,
  monthlyARPU: number,
  totalRevenue: number,
  customersAcquired: number
): LTVCalculation {
  const simple = calculateSimpleLTV(initialOrderValue, config.ltvSimpleMultiplier);
  const churnBased = calculateChurnBasedLTV(
    monthlyARPU,
    config.ltvGrossMarginPercent,
    config.ltvAssumedMonthlyChurnRate
  );
  const crmDriven = calculateCRMDrivenLTV(totalRevenue, customersAcquired);

  let recommended = simple;
  if (config.ltvCalculationMethod === 'churn_based') {
    recommended = churnBased;
  } else if (config.ltvCalculationMethod === 'crmdriven') {
    recommended = crmDriven;
  }

  // Health score: higher LTV = higher health (normalized 0-100)
  // This is relative; we compare against CAC for actual health
  const maxLTV = Math.max(simple, churnBased, crmDriven) || 1;
  const healthScore = (recommended / maxLTV) * 100;

  return {
    simple,
    churnBased,
    crmDriven,
    recommended,
    healthScore: Math.min(100, healthScore),
  };
}

/**
 * Calculate LTV trend: current vs previous cohort
 */
export function calculateLTVSnapshot(
  currentLTV: number,
  previousLTV: number
): LTVSnapshot {
  const ratio = previousLTV === 0 ? 1 : currentLTV / previousLTV;
  const delta = previousLTV === 0 ? 0 : ((currentLTV - previousLTV) / previousLTV) * 100;

  return { current: currentLTV, previous: previousLTV, ratio, delta };
}

/**
 * Detect falling LTV: threshold triggers
 * - WARNING: > 15% decline vs 12-month baseline
 * - CRITICAL: > 25% decline vs 12-month baseline
 */
export function isFallingLTV(
  snapshot: LTVSnapshot,
  severity: 'warning' | 'critical' = 'warning'
): boolean {
  const thresholds = {
    warning: -0.15,
    critical: -0.25,
  };
  const delta = (snapshot.delta / 100);
  return delta <= thresholds[severity];
}

// ── LTV/CAC Ratio Analysis ────────────────────────────────────────────────

/**
 * LTV/CAC Ratio = LTV / CAC
 *
 * Interpretation:
 * - > 3.0x: HEALTHY (sustainable growth)
 * - 2.0-3.0x: WARNING (marginal, at risk)
 * - < 2.0x: CRITICAL (losing money)
 */
export function calculateLTVCACRatio(ltv: number, cac: number): LTVCACRatio {
  const ratio = cac === 0 ? 0 : ltv / cac;

  let healthStatus: 'healthy' | 'warning' | 'critical' = 'critical';
  if (ratio > 3.0) {
    healthStatus = 'healthy';
  } else if (ratio >= 2.0) {
    healthStatus = 'warning';
  }

  // Health score: scale ratio to 0-100
  // 0 ratio = 0 points, 3.0 ratio = 100 points, capped at 100
  const healthScore = Math.min(100, (ratio / 3.0) * 100);

  const interpretations = {
    healthy: `LTV/CAC ${ratio.toFixed(1)}x - Sustainable growth, strong unit economics`,
    warning: `LTV/CAC ${ratio.toFixed(1)}x - Marginal unit economics, optimize or reduce CAC`,
    critical: `LTV/CAC ${ratio.toFixed(1)}x - Losing money, immediate action required`,
  };

  return {
    ltv,
    cac,
    ratio,
    healthStatus,
    healthScore,
    interpretation: interpretations[healthStatus],
  };
}

/**
 * Detect unhealthy LTV/CAC ratio
 */
export function isUnhealthyRatio(
  ratio: number,
  severity: 'warning' | 'critical' = 'warning'
): boolean {
  const thresholds = {
    warning: 2.5,
    critical: 1.5,
  };
  return ratio < thresholds[severity];
}

// ── Payback Period Calculation ──────────────────────────────────────────────

/**
 * Payback Period = CAC / (Monthly Revenue per Customer × (1 - Churn Rate))
 *
 * Interpretation:
 * - < 12 months: HEALTHY (quick ROI)
 * - 12-18 months: WARNING (extended cash flow)
 * - > 18 months: CRITICAL (may never break even)
 */
export function calculatePaybackPeriod(
  cac: number,
  monthlyRevenuePerCustomer: number,
  monthlyChurnRate: number
): number {
  if (monthlyRevenuePerCustomer === 0 || monthlyChurnRate >= 1) return 0;

  const monthlyRetention = 1 - monthlyChurnRate;
  const monthlyProfit = monthlyRevenuePerCustomer * monthlyRetention;

  if (monthlyProfit <= 0) return 0;
  return cac / monthlyProfit;
}

/**
 * Determine payback health status
 */
export function getPaybackHealthStatus(
  paybackMonths: number,
  target: number = 12
): 'healthy' | 'warning' | 'critical' {
  if (paybackMonths <= target) return 'healthy';
  if (paybackMonths <= target * 1.5) return 'warning';
  return 'critical';
}

/**
 * Project month-by-month revenue recovery
 */
export function projectPaybackProgression(
  cac: number,
  monthlyRevenuePerCustomer: number,
  monthlyChurnRate: number,
  projectionMonths: number = 12
): PaybackMetrics['projectedMonths'] {
  const progression: PaybackMetrics['projectedMonths'] = [];
  let cumulativeRevenue = 0;
  const monthlyRetention = 1 - monthlyChurnRate;

  for (let month = 1; month <= projectionMonths; month++) {
    // Revenue per month = revenue × retention^(months_elapsed)
    const monthlyRevenue = monthlyRevenuePerCustomer * Math.pow(monthlyRetention, month - 1);
    cumulativeRevenue += monthlyRevenue;

    progression.push({
      month,
      cumulativeRevenue,
      breakEven: cumulativeRevenue >= cac,
    });
  }

  return progression;
}

/**
 * Complete payback metrics including projection
 */
export function calculatePaybackMetrics(
  cac: number,
  monthlyRevenuePerCustomer: number,
  monthlyChurnRate: number,
  targetPaybackMonths: number = 12
): PaybackMetrics {
  const paybackMonths = calculatePaybackPeriod(cac, monthlyRevenuePerCustomer, monthlyChurnRate);
  const paybackHealthStatus = getPaybackHealthStatus(paybackMonths, targetPaybackMonths);
  const projectedMonths = projectPaybackProgression(
    cac,
    monthlyRevenuePerCustomer,
    monthlyChurnRate,
    24 // Project 24 months
  );

  return {
    cacPerCustomer: cac,
    monthlyRevenuePerCustomer,
    monthlyChurnRate,
    paybackMonths,
    paybackHealthStatus,
    projectedMonths,
  };
}

// ── Churn Rate Calculation ──────────────────────────────────────────────────

/**
 * Churn Rate = (Starting Customers - Ending Customers + New) / Starting Customers
 *
 * Formula explanation:
 * - Start with cohort from last period
 * - Add new customers acquired (retention = customers - new)
 * - Subtract customers at period end
 * - Divide by starting count to get churn percentage
 */
export function calculateChurnRate(
  startingCustomers: number,
  endingCustomers: number,
  newCustomers: number
): number {
  if (startingCustomers === 0) return 0;

  const customersThatCouldChurn = startingCustomers + newCustomers;
  const customersLost = startingCustomers - endingCustomers + newCustomers;

  return Math.min(1, customersLost / customersThatCouldChurn);
}

/**
 * Detect churn spikes: current vs baseline + 2 std devs
 * Uses historical churn rate as baseline
 */
export function isChurnSpike(
  currentChurn: number,
  baselineChurn: number,
  stdDev: number,
  severity: 'warning' | 'critical' = 'warning'
): boolean {
  const thresholds = {
    warning: 1.5, // 1.5x baseline
    critical: 2.0, // 2.0x baseline
  };
  const spikeFactor = baselineChurn === 0 ? 1 : currentChurn / baselineChurn;
  return spikeFactor >= thresholds[severity];
}

/**
 * Determine churn trend
 */
export function getChurnTrend(
  current: number,
  previous: number
): 'improving' | 'stable' | 'declining' {
  const delta = (current - previous) / (previous || 1);
  const threshold = 0.05; // 5% change

  if (delta <= -threshold) return 'improving';
  if (delta >= threshold) return 'declining';
  return 'stable';
}

/**
 * Complete churn metrics
 */
export function calculateChurnMetrics(
  startingCustomers: number,
  endingCustomers: number,
  newCustomers: number,
  previousChurn: number = 0
): ChurnMetrics {
  const churnRate = calculateChurnRate(startingCustomers, endingCustomers, newCustomers);
  const absoluteChurned = Math.max(0, startingCustomers - endingCustomers + newCustomers);
  const churnTrend = getChurnTrend(churnRate, previousChurn);
  const retentionRate = 1 - churnRate;

  return {
    churnRate,
    retentionRate,
    absoluteChurned,
    churnTrend,
  };
}

// ── Health Score Calculation ────────────────────────────────────────────────

/**
 * Overall Unit Economics Health Score (0-100)
 * Combines LTV/CAC ratio, payback period, and churn
 */
export function calculateUnitEconomicsHealthScore(
  ltv: number,
  cac: number,
  paybackMonths: number,
  churnRate: number,
  targetPaybackMonths: number = 12
): number {
  // Component 1: LTV/CAC Ratio (40% weight)
  const ratio = cac === 0 ? 0 : ltv / cac;
  const ratioScore = Math.min(100, (ratio / 3.0) * 100); // 3.0x = 100 points
  const ratioComponent = ratioScore * 0.4;

  // Component 2: Payback Period (40% weight)
  const paybackScore = Math.max(0, 100 * (1 - (paybackMonths / (targetPaybackMonths * 2))));
  const paybackComponent = Math.min(100, paybackScore) * 0.4;

  // Component 3: Churn Rate (20% weight)
  // Good: < 5% monthly churn (95% retention), Bad: > 10% monthly churn
  const churnScore = Math.max(0, 100 * (1 - (churnRate / 0.10)));
  const churnComponent = Math.min(100, churnScore) * 0.2;

  return Math.min(100, ratioComponent + paybackComponent + churnComponent);
}
