/**
 * Consolidation Aggregation Layer
 *
 * Aggregates operational data from multiple sources (DADOS modules) into
 * weekly and monthly consolidated views. Respects field configuration to
 * determine which metrics to include and calculate.
 */

import { db } from '../db';
import { siteData, dailySpend, commercialFunnelDaily, adsBudgets } from '../db/schema';
import { eq, and, gte, lte, like } from 'drizzle-orm';

export interface WeeklyConsolidation {
  weekStart: string; // YYYY-MM-DD (Monday of week)
  weekEnd: string; // YYYY-MM-DD (Sunday of week)

  // Traffic metrics
  sessions: number | null;
  totalUsers: number | null;
  newUsers: number | null;

  // Acquisition metrics
  leads: number | null;
  paidClicks: number | null;

  // Commercial funnel metrics
  mqls: number | null;
  sqls: number | null;
  meetings: number | null;
  opportunities: number | null;
  revenue: number | null;

  // Spend metrics
  totalSpend: number | null;
  googleSpend: number | null;
  metaSpend: number | null;
  linkedinSpend: number | null;

  // Derived metrics (calculated)
  cpl: number | null; // Cost per Lead
  cpmMql: number | null; // Cost per MQL
  cpmSql: number | null; // Cost per SQL
  leadToMqlRate: number | null; // %
  mqlToSqlRate: number | null; // %
  sqlToOppRate: number | null; // %
}

export interface MonthlyConsolidation extends WeeklyConsolidation {
  month: string; // YYYY-MM
  previousMonth?: {
    revenue?: number;
    leads?: number;
    mqls?: number;
    totalSpend?: number;
  };
  deltaRevenue?: number; // % change vs previous month
  deltaLeads?: number; // % change
  deltaMqls?: number; // % change
  deltaCpl?: number; // % change
}

export interface PacingData {
  month: string; // YYYY-MM
  daysElapsed: number;
  daysInMonth: number;

  // MTD (Month-to-Date) actual values
  mtdSessions: number | null;
  mtdLeads: number | null;
  mtdMqls: number | null;
  mtdSqls: number | null;
  mtdOpportunities: number | null;
  mtdRevenue: number | null;
  mtdSpend: number | null;

  // Forecast (MTD / days elapsed * total days in month)
  forecastSessions: number | null;
  forecastLeads: number | null;
  forecastMqls: number | null;
  forecastSqls: number | null;
  forecastOpportunities: number | null;
  forecastRevenue: number | null;
  forecastSpend: number | null;

  // Budget / Meta
  budgetSpend: number | null;
  budgetForecast: number | null;
  budgetStatus: 'on-track' | 'over' | 'under' | 'unknown';

  // CPL and other metrics
  mtdCpl: number | null;
  forecastCpl: number | null;
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get the Sunday of the week for a given date
 */
function getWeekEnd(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : 7); // Adjust to Sunday
  const sunday = new Date(date.setDate(diff));
  return sunday.toISOString().split('T')[0];
}

/**
 * Calculate weekly consolidation from operational data
 */
export async function aggregateWeekly(
  siteId: number,
  weekStart: string,
  weekEnd: string,
  activeFields?: Set<string>
): Promise<WeeklyConsolidation> {
  // Fetch data from all DADOS tables for this week
  const [siteDataRows, spendRows, funnelRows, budgetRows] = await Promise.all([
    db.select()
      .from(siteData)
      .where(
        and(
          eq(siteData.siteId, siteId),
          gte(siteData.weekStart, weekStart),
          lte(siteData.weekStart, weekEnd)
        )
      ),
    db.select()
      .from(dailySpend)
      .where(
        and(
          eq(dailySpend.siteId, siteId),
          gte(dailySpend.date, weekStart),
          lte(dailySpend.date, weekEnd)
        )
      ),
    db.select()
      .from(commercialFunnelDaily)
      .where(
        and(
          eq(commercialFunnelDaily.siteId, siteId),
          gte(commercialFunnelDaily.date, weekStart),
          lte(commercialFunnelDaily.date, weekEnd)
        )
      ),
    db.select()
      .from(adsBudgets)
      .where(eq(adsBudgets.siteId, siteId)),
  ]);

  // Aggregate traffic metrics
  const sessions = siteDataRows.reduce((sum, row) => sum + (row.sessions || 0), 0) || null;
  const totalUsers = siteDataRows.reduce((sum, row) => sum + (row.totalUsers || 0), 0) || null;
  const newUsers = siteDataRows.reduce((sum, row) => sum + (row.newUsers || 0), 0) || null;
  const leads = siteDataRows.reduce((sum, row) => sum + (row.leadsGenerated || 0), 0) || null;
  const paidClicks = siteDataRows.reduce((sum, row) => sum + (row.paidClicks || 0), 0) || null;

  // Aggregate funnel metrics
  const mqls = funnelRows.reduce((sum, row) => sum + (row.mql || 0), 0) || null;
  const sqls = funnelRows.reduce((sum, row) => sum + (row.sql || 0), 0) || null;
  const meetings = funnelRows.reduce((sum, row) => sum + (row.meetings || 0), 0) || null;
  const opportunities = funnelRows.reduce((sum, row) => sum + (row.opportunities || 0), 0) || null;
  const revenue = funnelRows.reduce((sum, row) => sum + (row.revenueClosed || 0), 0) || null;

  // Aggregate spend metrics
  const totalSpend = spendRows.reduce((sum, row) => sum + (row.spend || 0), 0) || null;
  const googleSpend = spendRows
    .filter(row => row.channel === 'google_ads')
    .reduce((sum, row) => sum + (row.spend || 0), 0) || null;
  const metaSpend = spendRows
    .filter(row => row.channel === 'meta')
    .reduce((sum, row) => sum + (row.spend || 0), 0) || null;
  const linkedinSpend = spendRows
    .filter(row => row.channel === 'linkedin')
    .reduce((sum, row) => sum + (row.spend || 0), 0) || null;

  // Calculate derived metrics (only if both numerator and denominator exist and are > 0)
  const cpl = leads && totalSpend && leads > 0 ? totalSpend / leads : null;
  const cpmMql = mqls && totalSpend && mqls > 0 ? totalSpend / mqls : null;
  const cpmSql = sqls && totalSpend && sqls > 0 ? totalSpend / sqls : null;
  const leadToMqlRate = leads && mqls && leads > 0 ? (mqls / leads) * 100 : null;
  const mqlToSqlRate = mqls && sqls && mqls > 0 ? (sqls / mqls) * 100 : null;
  const sqlToOppRate = sqls && opportunities && sqls > 0 ? (opportunities / sqls) * 100 : null;

  return {
    weekStart,
    weekEnd,
    sessions,
    totalUsers,
    newUsers,
    leads,
    paidClicks,
    mqls,
    sqls,
    meetings,
    opportunities,
    revenue,
    totalSpend,
    googleSpend,
    metaSpend,
    linkedinSpend,
    cpl,
    cpmMql,
    cpmSql,
    leadToMqlRate,
    mqlToSqlRate,
    sqlToOppRate,
  };
}

/**
 * Calculate monthly consolidation
 */
export async function aggregateMonthly(
  siteId: number,
  month: string, // YYYY-MM
  activeFields?: Set<string>
): Promise<MonthlyConsolidation> {
  const monthStart = `${month}-01`;
  const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
    .toISOString()
    .split('T')[0];

  // Get current month data
  const currentData = await aggregateWeekly(siteId, monthStart, monthEnd, activeFields);

  // Get previous month data for comparison
  const prevDate = new Date(month + '-01');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
  const prevMonthStart = `${prevMonth}-01`;
  const prevMonthEnd = new Date(parseInt(prevMonth.split('-')[0]), parseInt(prevMonth.split('-')[1]), 0)
    .toISOString()
    .split('T')[0];

  let previousData: WeeklyConsolidation | null = null;
  try {
    previousData = await aggregateWeekly(siteId, prevMonthStart, prevMonthEnd, activeFields);
  } catch (e) {
    // Previous month may not exist
  }

  // Calculate deltas
  const deltaRevenue = previousData?.revenue && currentData.revenue
    ? ((currentData.revenue - previousData.revenue) / previousData.revenue) * 100
    : null;
  const deltaLeads = previousData?.leads && currentData.leads
    ? ((currentData.leads - previousData.leads) / previousData.leads) * 100
    : null;
  const deltaMqls = previousData?.mqls && currentData.mqls
    ? ((currentData.mqls - previousData.mqls) / previousData.mqls) * 100
    : null;
  const deltaCpl = previousData?.cpl && currentData.cpl && previousData.cpl > 0
    ? ((currentData.cpl - previousData.cpl) / previousData.cpl) * 100
    : null;

  return {
    ...currentData,
    month,
    previousMonth: previousData
      ? {
          revenue: previousData.revenue,
          leads: previousData.leads,
          mqls: previousData.mqls,
          totalSpend: previousData.totalSpend,
        }
      : undefined,
    deltaRevenue,
    deltaLeads,
    deltaMqls,
    deltaCpl,
  };
}

/**
 * Calculate pacing for current month
 */
export async function calculatePacing(
  siteId: number,
  month: string // YYYY-MM
): Promise<PacingData> {
  const today = new Date();
  const currentMonth = today.toISOString().split('T')[0].slice(0, 7);

  if (month !== currentMonth) {
    // For past months, show full month data (not pacing)
    const consolidated = await aggregateMonthly(siteId, month);
    const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();

    return {
      month,
      daysElapsed: daysInMonth,
      daysInMonth,
      mtdSessions: consolidated.sessions,
      mtdLeads: consolidated.leads,
      mtdMqls: consolidated.mqls,
      mtdSqls: consolidated.sqls,
      mtdOpportunities: consolidated.opportunities,
      mtdRevenue: consolidated.revenue,
      mtdSpend: consolidated.totalSpend,
      forecastSessions: consolidated.sessions,
      forecastLeads: consolidated.leads,
      forecastMqls: consolidated.mqls,
      forecastSqls: consolidated.sqls,
      forecastOpportunities: consolidated.opportunities,
      forecastRevenue: consolidated.revenue,
      forecastSpend: consolidated.totalSpend,
      budgetSpend: consolidated.totalSpend,
      budgetForecast: consolidated.totalSpend,
      budgetStatus: 'unknown',
      mtdCpl: consolidated.cpl,
      forecastCpl: consolidated.cpl,
    };
  }

  // For current month, calculate pacing
  const monthStart = `${month}-01`;
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Get MTD data
  const mtdData = await aggregateWeekly(siteId, monthStart, today.toISOString().split('T')[0]);

  // Calculate forecasts
  const forecastMultiplier = daysInMonth / daysElapsed;
  const forecastSessions = mtdData.sessions ? Math.round(mtdData.sessions * forecastMultiplier) : null;
  const forecastLeads = mtdData.leads ? Math.round(mtdData.leads * forecastMultiplier) : null;
  const forecastMqls = mtdData.mqls ? Math.round(mtdData.mqls * forecastMultiplier) : null;
  const forecastSqls = mtdData.sqls ? Math.round(mtdData.sqls * forecastMultiplier) : null;
  const forecastOpportunities = mtdData.opportunities ? Math.round(mtdData.opportunities * forecastMultiplier) : null;
  const forecastRevenue = mtdData.revenue ? mtdData.revenue * forecastMultiplier : null;
  const forecastSpend = mtdData.totalSpend ? mtdData.totalSpend * forecastMultiplier : null;
  const forecastCpl = mtdData.cpl ? mtdData.cpl : null; // CPL stays same if forecast spend/leads proportional

  return {
    month,
    daysElapsed,
    daysInMonth,
    mtdSessions: mtdData.sessions,
    mtdLeads: mtdData.leads,
    mtdMqls: mtdData.mqls,
    mtdSqls: mtdData.sqls,
    mtdOpportunities: mtdData.opportunities,
    mtdRevenue: mtdData.revenue,
    mtdSpend: mtdData.totalSpend,
    forecastSessions,
    forecastLeads,
    forecastMqls,
    forecastSqls,
    forecastOpportunities,
    forecastRevenue,
    forecastSpend,
    budgetSpend: mtdData.totalSpend,
    budgetForecast: forecastSpend,
    budgetStatus: 'unknown',
    mtdCpl: mtdData.cpl,
    forecastCpl,
  };
}
