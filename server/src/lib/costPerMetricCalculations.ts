import { db } from '../db/index.js';
import { commercialFunnelDaily, dailySpend } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface CostPerMetricResult {
  period: string;
  dateFrom: string;
  dateTo: string;
  channel?: string;
  campaign?: string;

  // Funnel metrics (summed for period)
  leads: number | null;
  mqls: number | null;
  sqls: number | null;
  meetings: number | null;
  opportunities: number | null;
  pipeline: number | null;
  revenue: number | null;

  // Spend metrics (summed for period)
  totalSpend: number;
  totalClicks: number | null;
  totalImpressions: number | null;

  // Cost-per-metric (calculated)
  cpl: number | null;            // Cost per Lead
  cpm_mql: number | null;        // Cost per MQL
  cpm_sql: number | null;        // Cost per SQL
  cpm_meeting: number | null;    // Cost per Meeting
  cac: number | null;            // Cost per Opportunity (approximation of CAC)
  revenue_per_spend: number | null; // Revenue / Spend ratio

  // Health score
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Fetch and aggregate commercial funnel data for a date range
 */
async function getFunnelDataForRange(
  siteId: number,
  dateFrom: string,
  dateTo: string
): Promise<any[]> {
  const rows = await db
    .select()
    .from(commercialFunnelDaily)
    .where(eq(commercialFunnelDaily.siteId, siteId));

  return rows.filter(r => r.date >= dateFrom && r.date <= dateTo);
}

/**
 * Fetch and aggregate spend data for a date range
 */
async function getSpendDataForRange(
  siteId: number,
  dateFrom: string,
  dateTo: string,
  channelFilter?: string,
  campaignFilter?: string
): Promise<any[]> {
  const rows = await db
    .select()
    .from(dailySpend)
    .where(eq(dailySpend.siteId, siteId));

  return rows.filter(r => {
    if (r.date < dateFrom || r.date > dateTo) return false;
    if (channelFilter && r.channel !== channelFilter) return false;
    if (campaignFilter && r.campaign !== campaignFilter) return false;
    return true;
  });
}

/**
 * Sum values from records
 */
function sumOrNull(values: (number | null)[]): number | null {
  const sum = values.reduce((acc, val) => acc + (val || 0), 0);
  return sum > 0 ? sum : null;
}

/**
 * Determine efficiency grade based on cost metrics
 */
function getEfficiencyGrade(cpl: number | null, cac: number | null): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!cpl && !cac) return 'fair';

  // Simple heuristic: lower is better
  // CPL below R$ 50 = excellent, 50-100 = good, 100-200 = fair, > 200 = poor
  // CAC below R$ 500 = excellent, etc.

  const grades: number[] = [];

  if (cpl) {
    if (cpl < 50) grades.push(1); // excellent
    else if (cpl < 100) grades.push(2); // good
    else if (cpl < 200) grades.push(3); // fair
    else grades.push(4); // poor
  }

  if (cac) {
    if (cac < 500) grades.push(1); // excellent
    else if (cac < 1000) grades.push(2); // good
    else if (cac < 2000) grades.push(3); // fair
    else grades.push(4); // poor
  }

  if (grades.length === 0) return 'fair';

  const avg = grades.reduce((a, b) => a + b) / grades.length;
  if (avg < 1.5) return 'excellent';
  if (avg < 2.5) return 'good';
  if (avg < 3.5) return 'fair';
  return 'poor';
}

/**
 * Calculate cost-per-metric for a given date range
 */
export async function calculateCostPerMetrics(
  siteId: number,
  dateFrom: string,
  dateTo: string,
  channelFilter?: string,
  campaignFilter?: string
): Promise<CostPerMetricResult | null> {
  try {
    const funnelData = await getFunnelDataForRange(siteId, dateFrom, dateTo);
    const spendData = await getSpendDataForRange(siteId, dateFrom, dateTo, channelFilter, campaignFilter);

    if (funnelData.length === 0) {
      return null;
    }

    // Aggregate funnel metrics
    const leads = sumOrNull(funnelData.map(r => r.leads));
    const mqls = sumOrNull(funnelData.map(r => r.mql));
    const sqls = sumOrNull(funnelData.map(r => r.sql));
    const meetings = sumOrNull(funnelData.map(r => r.meetings));
    const opportunities = sumOrNull(funnelData.map(r => r.opportunities));
    const pipeline = sumOrNull(funnelData.map(r => r.pipelineCreated));
    const revenue = sumOrNull(funnelData.map(r => r.revenueClosed));

    // Aggregate spend metrics
    const totalSpend = spendData.reduce((sum, r) => sum + (r.spend || 0), 0);
    const totalClicks = sumOrNull(spendData.map(r => r.clicks));
    const totalImpressions = sumOrNull(spendData.map(r => r.impressions));

    // Calculate cost-per-metric
    const cpl = leads && totalSpend > 0 ? totalSpend / leads : null;
    const cpm_mql = mqls && totalSpend > 0 ? totalSpend / mqls : null;
    const cpm_sql = sqls && totalSpend > 0 ? totalSpend / sqls : null;
    const cpm_meeting = meetings && totalSpend > 0 ? totalSpend / meetings : null;
    const cac = opportunities && totalSpend > 0 ? totalSpend / opportunities : null;
    const revenue_per_spend = revenue && totalSpend > 0 ? revenue / totalSpend : null;

    // Determine period label
    const periodLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`;

    return {
      period: periodLabel,
      dateFrom,
      dateTo,
      channel: channelFilter,
      campaign: campaignFilter,
      leads,
      mqls,
      sqls,
      meetings,
      opportunities,
      pipeline,
      revenue,
      totalSpend,
      totalClicks,
      totalImpressions,
      cpl: cpl ? Math.round(cpl * 100) / 100 : null,
      cpm_mql: cpm_mql ? Math.round(cpm_mql * 100) / 100 : null,
      cpm_sql: cpm_sql ? Math.round(cpm_sql * 100) / 100 : null,
      cpm_meeting: cpm_meeting ? Math.round(cpm_meeting * 100) / 100 : null,
      cac: cac ? Math.round(cac * 100) / 100 : null,
      revenue_per_spend: revenue_per_spend ? Math.round(revenue_per_spend * 100) / 100 : null,
      efficiency: getEfficiencyGrade(cpl, cac),
    };
  } catch (err) {
    console.error('Error calculating cost-per-metric:', err);
    return null;
  }
}

/**
 * Calculate cost-per-metric for multiple channels
 */
export async function calculateCostPerMetricsByChannel(
  siteId: number,
  dateFrom: string,
  dateTo: string
): Promise<CostPerMetricResult[]> {
  try {
    // Get all unique channels in spend data
    const spendRows = await db
      .select()
      .from(dailySpend)
      .where(eq(dailySpend.siteId, siteId));

    const channels = [...new Set(spendRows.map(r => r.channel).filter(Boolean))];
    const results: CostPerMetricResult[] = [];

    for (const channel of channels) {
      const result = await calculateCostPerMetrics(siteId, dateFrom, dateTo, channel as string);
      if (result) results.push(result);
    }

    // Also include overall (no channel filter)
    const overall = await calculateCostPerMetrics(siteId, dateFrom, dateTo);
    if (overall) results.push(overall);

    return results;
  } catch (err) {
    console.error('Error calculating cost metrics by channel:', err);
    return [];
  }
}

/**
 * Calculate cost-per-metric trends (month-over-month)
 */
export async function calculateCostMetricsTrends(
  siteId: number,
  yearMonth: string // YYYY-MM
): Promise<{ current: CostPerMetricResult | null; previous: CostPerMetricResult | null }> {
  try {
    const [year, month] = yearMonth.split('-');
    const currentYear = parseInt(year);
    const currentMonth = parseInt(month);

    // Current month dates
    const currentStart = `${year}-${month}-01`;
    const currentEnd = getMonthEnd(currentStart);

    // Previous month dates
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }

    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevEnd = getMonthEnd(prevStart);

    const current = await calculateCostPerMetrics(siteId, currentStart, currentEnd);
    const previous = await calculateCostPerMetrics(siteId, prevStart, prevEnd);

    return { current, previous };
  } catch (err) {
    console.error('Error calculating cost metrics trends:', err);
    return { current: null, previous: null };
  }
}

/**
 * Helper to get the last day of a month
 */
function getMonthEnd(monthStart: string): string {
  const [year, month] = monthStart.split('-');
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const nextMonthStart = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
  const monthEnd = new Date(nextMonthStart.getTime() - 86400000);
  return monthEnd.toISOString().split('T')[0];
}

/**
 * Calculate efficiency metrics and comparisons for dashboard
 */
export async function getEfficiencySummary(
  siteId: number,
  yearMonth: string
): Promise<{
  current: CostPerMetricResult | null;
  previous: CostPerMetricResult | null;
  cplTrend: 'up' | 'down' | 'flat' | null;
  cacTrend: 'up' | 'down' | 'flat' | null;
  rpsHealthStatus: 'healthy' | 'at-risk' | 'critical' | null;
}> {
  try {
    const { current, previous } = await calculateCostMetricsTrends(siteId, yearMonth);

    let cplTrend: 'up' | 'down' | 'flat' | null = null;
    let cacTrend: 'up' | 'down' | 'flat' | null = null;
    let rpsHealthStatus: 'healthy' | 'at-risk' | 'critical' | null = null;

    if (current && previous) {
      // CPL trend
      if (current.cpl && previous.cpl) {
        const cplDelta = (current.cpl - previous.cpl) / previous.cpl;
        if (cplDelta > 0.05) cplTrend = 'up';
        else if (cplDelta < -0.05) cplTrend = 'down';
        else cplTrend = 'flat';
      }

      // CAC trend
      if (current.cac && previous.cac) {
        const cacDelta = (current.cac - previous.cac) / previous.cac;
        if (cacDelta > 0.05) cacTrend = 'up';
        else if (cacDelta < -0.05) cacTrend = 'down';
        else cacTrend = 'flat';
      }

      // Revenue per spend health
      if (current.revenue_per_spend) {
        if (current.revenue_per_spend >= 3) rpsHealthStatus = 'healthy';
        else if (current.revenue_per_spend >= 2) rpsHealthStatus = 'at-risk';
        else rpsHealthStatus = 'critical';
      }
    }

    return { current, previous, cplTrend, cacTrend, rpsHealthStatus };
  } catch (err) {
    console.error('Error getting efficiency summary:', err);
    return { current: null, previous: null, cplTrend: null, cacTrend: null, rpsHealthStatus: null };
  }
}
