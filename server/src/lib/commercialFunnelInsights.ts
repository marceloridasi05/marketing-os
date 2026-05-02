import { db } from '../db/index.js';
import { commercialFunnelDaily, dailySpend, commercialFunnelInsights } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface CommercialFunnelInsight {
  siteId: number;
  month: string;
  insightType: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metrics: Record<string, any>;
  recommendedActions: string[];
}

interface FunnelStageMetrics {
  leads: number | null;
  mql: number | null;
  sql: number | null;
  meetings: number | null;
  opportunities: number | null;
  pipeline: number | null;
  revenue: number | null;
}

interface StageTransition {
  fromStage: string;
  toStage: string;
  fromValue: number | null;
  toValue: number | null;
  conversionRate: number | null;
  previousConversionRate: number | null;
}

/**
 * Aggregate daily records to monthly totals for funnel stages
 */
async function aggregateFunnelMetrics(
  siteId: number,
  yearMonth: string // YYYY-MM
): Promise<{ current: FunnelStageMetrics; previous: FunnelStageMetrics }> {
  const [year, month] = yearMonth.split('-');
  const currentMonthStart = `${year}-${month}-01`;

  // Calculate previous month
  let prevYear = parseInt(year);
  let prevMonth = parseInt(month) - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  const previousMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  // Get current month data
  const currentRows = await db
    .select()
    .from(commercialFunnelDaily)
    .where(eq(commercialFunnelDaily.siteId, siteId));

  const currentMetrics = aggregateByMonth(currentRows, currentMonthStart);
  const previousMetrics = aggregateByMonth(currentRows, previousMonthStart);

  return { current: currentMetrics, previous: previousMetrics };
}

/**
 * Filter and sum records for a specific month
 */
function aggregateByMonth(rows: any[], monthStart: string): FunnelStageMetrics {
  const monthEnd = getMonthEnd(monthStart);
  const filtered = rows.filter(r => r.date >= monthStart && r.date <= monthEnd);

  return {
    leads: sumOrNull(filtered, 'leads'),
    mql: sumOrNull(filtered, 'mql'),
    sql: sumOrNull(filtered, 'sql'),
    meetings: sumOrNull(filtered, 'meetings'),
    opportunities: sumOrNull(filtered, 'opportunities'),
    pipeline: sumOrNull(filtered, 'pipelineCreated'),
    revenue: sumOrNull(filtered, 'revenueClosed'),
  };
}

function sumOrNull(rows: any[], key: string): number | null {
  const sum = rows.reduce((acc, r) => acc + (r[key] || 0), 0);
  return sum > 0 ? sum : null;
}

function getMonthEnd(monthStart: string): string {
  const [year, month] = monthStart.split('-');
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const nextMonthStart = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
  const monthEnd = new Date(nextMonthStart.getTime() - 86400000);
  return monthEnd.toISOString().split('T')[0];
}

/**
 * Detector 1: Bottleneck Detection
 * Identifies the stage with the lowest conversion rate to the next stage
 */
export function analyzeBottleneck(
  current: FunnelStageMetrics,
  previous: FunnelStageMetrics
): CommercialFunnelInsight | null {
  const transitions: StageTransition[] = [
    { fromStage: 'Leads', toStage: 'MQL', fromValue: current.leads, toValue: current.mql, conversionRate: current.leads && current.mql ? current.mql / current.leads : null, previousConversionRate: previous.leads && previous.mql ? previous.mql / previous.leads : null },
    { fromStage: 'MQL', toStage: 'SQL', fromValue: current.mql, toValue: current.sql, conversionRate: current.mql && current.sql ? current.sql / current.mql : null, previousConversionRate: previous.mql && previous.sql ? previous.sql / previous.mql : null },
    { fromStage: 'SQL', toStage: 'Meetings', fromValue: current.sql, toValue: current.meetings, conversionRate: current.sql && current.meetings ? current.meetings / current.sql : null, previousConversionRate: previous.sql && previous.meetings ? previous.meetings / previous.sql : null },
    { fromStage: 'Meetings', toStage: 'Opportunities', fromValue: current.meetings, toValue: current.opportunities, conversionRate: current.meetings && current.opportunities ? current.opportunities / current.meetings : null, previousConversionRate: previous.meetings && previous.opportunities ? previous.opportunities / previous.meetings : null },
    { fromStage: 'Opportunities', toStage: 'Revenue', fromValue: current.opportunities, toValue: current.revenue, conversionRate: current.opportunities && current.revenue ? (current.revenue || 1) / current.opportunities : null, previousConversionRate: previous.opportunities && previous.revenue ? (previous.revenue || 1) / previous.opportunities : null },
  ];

  // Find transition with lowest conversion rate
  let weakestTransition: StageTransition | null = null;
  let lowestRate = 1;

  for (const t of transitions) {
    if (t.conversionRate && t.conversionRate < lowestRate) {
      weakestTransition = t;
      lowestRate = t.conversionRate;
    }
  }

  if (!weakestTransition || !weakestTransition.conversionRate) {
    return null;
  }

  const ratePercent = Math.round(weakestTransition.conversionRate * 10000) / 100;
  const previousRatePercent = weakestTransition.previousConversionRate ? Math.round(weakestTransition.previousConversionRate * 10000) / 100 : null;
  const delta = previousRatePercent ? ((ratePercent - previousRatePercent) / previousRatePercent) * 100 : 0;

  let severity: 'critical' | 'warning' | 'info' = 'info';
  if (ratePercent < 20) severity = 'critical';
  else if (ratePercent < 40) severity = 'warning';

  return {
    siteId: 0, // Will be set by caller
    month: '', // Will be set by caller
    insightType: 'bottleneck',
    severity,
    title: `Bottleneck: ${weakestTransition.fromStage} → ${weakestTransition.toStage}`,
    description: `${weakestTransition.fromStage} to ${weakestTransition.toStage} conversion is only ${ratePercent}%. This is the weakest transition in your funnel.${previousRatePercent ? ` Down ${Math.round(delta)}% from last month.` : ''}`,
    metrics: {
      transition: `${weakestTransition.fromStage} → ${weakestTransition.toStage}`,
      fromValue: weakestTransition.fromValue,
      toValue: weakestTransition.toValue,
      conversionRate: ratePercent,
      previousConversionRate: previousRatePercent,
      delta: Math.round(delta),
    },
    recommendedActions: getBottleneckActions(weakestTransition.fromStage, weakestTransition.toStage),
  };
}

function getBottleneckActions(fromStage: string, toStage: string): string[] {
  const actionMap: Record<string, string[]> = {
    'Leads→MQL': [
      'Review lead scoring and qualification criteria',
      'Check email nurture campaign effectiveness',
      'Audit lead source quality (channels)',
      'Analyze form completion and lead capture process',
    ],
    'MQL→SQL': [
      'Align sales and marketing on MQL criteria',
      'Review sales outreach and follow-up process',
      'Check deal scoring in CRM',
      'Analyze sales call-to-action messaging',
    ],
    'SQL→Meetings': [
      'Audit sales team demo/meeting booking process',
      'Check calendar availability and response time',
      'Review meeting request templates and sequences',
      'Analyze prospect engagement signals',
    ],
    'Meetings→Opportunities': [
      'Review demo-to-opportunity conversion framework',
      'Check sales qualification and deal creation process',
      'Analyze deal sizing and discovery questions',
      'Review follow-up cadence after meetings',
    ],
    'Opportunities→Revenue': [
      'Audit sales negotiation and closing process',
      'Check deal velocity and sales cycle length',
      'Review win/loss analysis',
      'Analyze competitive positioning in deals',
    ],
  };

  const key = `${fromStage}→${toStage}`;
  return actionMap[key] || [
    `Investigate why ${fromStage} aren't progressing to ${toStage}`,
    'Review qualification criteria and process',
    'Check team alignment and handoff process',
  ];
}

/**
 * Detector 2: Velocity Drop
 * Detects when the progression from one stage to another is slowing
 */
export function analyzeVelocityDrop(
  current: FunnelStageMetrics,
  previous: FunnelStageMetrics
): CommercialFunnelInsight | null {
  // Focus on leads→MQL as primary velocity indicator
  if (!current.leads || !current.mql || !previous.leads || !previous.mql) {
    return null;
  }

  const currentVelocity = current.mql / current.leads;
  const previousVelocity = previous.mql / previous.leads;
  const velocityDelta = (currentVelocity - previousVelocity) / previousVelocity;

  if (velocityDelta > -0.15) {
    return null; // Not a significant drop
  }

  let severity: 'critical' | 'warning' = velocityDelta < -0.25 ? 'critical' : 'warning';

  return {
    siteId: 0,
    month: '',
    insightType: 'velocity_drop',
    severity,
    title: 'Funnel Velocity Declining',
    description: `Lead-to-MQL progression velocity dropped ${Math.round(Math.abs(velocityDelta) * 100)}%. Fewer leads are becoming MQLs, indicating potential quality or nurture issues.`,
    metrics: {
      currentVelocity: Math.round(currentVelocity * 10000) / 100,
      previousVelocity: Math.round(previousVelocity * 10000) / 100,
      velocityDelta: Math.round(velocityDelta * 10000) / 100,
      currentLeads: current.leads,
      previousLeads: previous.leads,
    },
    recommendedActions: [
      'Review lead nurture email sequences and content',
      'Audit lead source quality and conversion rates by channel',
      'Check MQL scoring criteria - may need adjustment',
      'Analyze engagement metrics on nurture campaigns',
    ],
  };
}

/**
 * Detector 3: Win Rate Decline
 * Detects when opportunities-to-revenue conversion is dropping
 */
export function analyzeWinRateDecline(
  current: FunnelStageMetrics,
  previous: FunnelStageMetrics
): CommercialFunnelInsight | null {
  if (!current.opportunities || !previous.opportunities) {
    return null;
  }

  // Only analyze if we have revenue data
  const currentWinRate = current.revenue && current.opportunities ? current.revenue / current.opportunities : null;
  const previousWinRate = previous.revenue && previous.opportunities ? previous.revenue / previous.opportunities : null;

  if (!currentWinRate || !previousWinRate) {
    return null;
  }

  const winRateDelta = (currentWinRate - previousWinRate) / previousWinRate;

  if (winRateDelta > -0.10) {
    return null; // Not a significant drop
  }

  let severity: 'critical' | 'warning' = winRateDelta < -0.20 ? 'critical' : 'warning';

  return {
    siteId: 0,
    month: '',
    insightType: 'win_rate_decline',
    severity,
    title: 'Sales Win Rate Declining',
    description: `Your opportunity-to-revenue conversion rate dropped ${Math.round(Math.abs(winRateDelta) * 100)}%. Sales team may be facing longer sales cycles or increased competition.`,
    metrics: {
      currentWinRate: Math.round(currentWinRate * 10000) / 100,
      previousWinRate: Math.round(previousWinRate * 10000) / 100,
      winRateDelta: Math.round(winRateDelta * 10000) / 100,
      currentOpportunities: current.opportunities,
      currentRevenue: current.revenue,
    },
    recommendedActions: [
      'Review recent deal wins and losses with sales team',
      'Audit customer buying process and decision criteria',
      'Check for competitive pressure or market changes',
      'Review pricing, discounts, and deal terms',
      'Schedule sales coaching or training sessions',
    ],
  };
}

/**
 * Detector 4: Pipeline Health
 * Ensures pipeline is sufficient for revenue goals
 */
export function analyzePipelineHealth(
  current: FunnelStageMetrics,
  runRate: number = 100000 // Default monthly revenue goal
): CommercialFunnelInsight | null {
  if (!current.pipeline) {
    return null;
  }

  // Rule of thumb: pipeline should be 2-3x monthly run rate
  const pipelineMonths = current.pipeline / runRate;
  const benchmarkMonths = 2.5;

  if (pipelineMonths >= benchmarkMonths * 0.8) {
    return null; // Pipeline is healthy
  }

  let severity: 'critical' | 'warning' = pipelineMonths < benchmarkMonths * 0.5 ? 'critical' : 'warning';

  return {
    siteId: 0,
    month: '',
    insightType: 'pipeline_health',
    severity,
    title: 'Insufficient Pipeline',
    description: `Your pipeline (R$ ${Math.round(current.pipeline)}) covers only ${Math.round(pipelineMonths * 10) / 10} months of revenue at your run rate. Benchmark is ${benchmarkMonths}x run rate.`,
    metrics: {
      pipelineValue: current.pipeline,
      monthlyRunRate: runRate,
      pipelineMonths: Math.round(pipelineMonths * 10) / 10,
      benchmarkMonths: benchmarkMonths,
    },
    recommendedActions: [
      'Increase lead generation to fill pipeline',
      'Accelerate lead nurture and sales cycles',
      'Review win rate and cycle time per deal',
      'Focus on larger deal sizes or upsells',
    ],
  };
}

/**
 * Detector 5: Cost Efficiency
 * Monitors cost-per-metric trends
 */
export async function analyzeCostEfficiency(
  siteId: number,
  current: FunnelStageMetrics,
  previous: FunnelStageMetrics,
  yearMonth: string
): Promise<CommercialFunnelInsight | null> {
  // Get spend data for the month
  const [year, month] = yearMonth.split('-');
  const monthStart = `${year}-${month}-01`;
  const monthEnd = getMonthEnd(monthStart);

  const spendRows = await db
    .select()
    .from(dailySpend)
    .where(eq(dailySpend.siteId, siteId));

  const currentSpendRows = spendRows.filter(r => r.date >= monthStart && r.date <= monthEnd);
  const totalSpend = currentSpendRows.reduce((sum, r) => sum + (r.spend || 0), 0);

  if (totalSpend === 0 || !current.leads) {
    return null;
  }

  const currentCPL = totalSpend / current.leads;
  const previousCPL = previous.leads && current.leads ? (totalSpend * 0.8) / previous.leads : null;
  const cplDelta = previousCPL ? ((currentCPL - previousCPL) / previousCPL) * 100 : 0;

  if (cplDelta < 15) {
    return null; // CPL is stable or improving
  }

  let severity: 'critical' | 'warning' = cplDelta > 25 ? 'critical' : 'warning';

  return {
    siteId,
    month: yearMonth,
    insightType: 'cost_efficiency',
    severity,
    title: 'Cost Per Lead Increasing',
    description: `Your CPL increased ${Math.round(cplDelta)}% to R$ ${Math.round(currentCPL * 100) / 100}. This indicates rising acquisition costs or lower lead volume.`,
    metrics: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      leads: current.leads,
      currentCPL: Math.round(currentCPL * 100) / 100,
      previousCPL: previousCPL ? Math.round(previousCPL * 100) / 100 : null,
      cplDelta: Math.round(cplDelta),
    },
    recommendedActions: [
      'Review ad spend allocation by channel',
      'Optimize targeting and audience filters',
      'Test creative variations and messaging',
      'Negotiate better rates with ad platforms',
      'Increase organic/referral lead sources',
    ],
  };
}

/**
 * Main function: Generate all insights for a month
 */
export async function generateCommercialFunnelInsights(
  siteId: number,
  yearMonth: string // YYYY-MM
): Promise<CommercialFunnelInsight[]> {
  try {
    const { current, previous } = await aggregateFunnelMetrics(siteId, yearMonth);

    const insights: CommercialFunnelInsight[] = [];

    // Run all detectors
    const bottleneck = analyzeBottleneck(current, previous);
    if (bottleneck) insights.push({ ...bottleneck, siteId, month: yearMonth });

    const velocity = analyzeVelocityDrop(current, previous);
    if (velocity) insights.push({ ...velocity, siteId, month: yearMonth });

    const winRate = analyzeWinRateDecline(current, previous);
    if (winRate) insights.push({ ...winRate, siteId, month: yearMonth });

    const pipeline = analyzePipelineHealth(current);
    if (pipeline) insights.push({ ...pipeline, siteId, month: yearMonth });

    const costEff = await analyzeCostEfficiency(siteId, current, previous, yearMonth);
    if (costEff) insights.push(costEff);

    // Store insights in database
    for (const insight of insights) {
      try {
        await db.insert(commercialFunnelInsights).values({
          siteId: insight.siteId,
          month: insight.month,
          insightType: insight.insightType,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          metrics: JSON.stringify(insight.metrics),
          recommendedActions: JSON.stringify(insight.recommendedActions),
        });
      } catch (err: any) {
        if (err.message?.includes('UNIQUE constraint failed')) {
          // Already exists, update instead
          await db
            .update(commercialFunnelInsights)
            .set({
              severity: insight.severity,
              title: insight.title,
              description: insight.description,
              metrics: JSON.stringify(insight.metrics),
              recommendedActions: JSON.stringify(insight.recommendedActions),
              updatedAt: new Date().toISOString(),
            })
            .where(
              eq(commercialFunnelInsights.insightType, insight.insightType)
            );
        }
      }
    }

    return insights;
  } catch (err) {
    console.error('Error generating commercial funnel insights:', err);
    return [];
  }
}
