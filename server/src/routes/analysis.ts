/**
 * Analysis Routes
 *
 * Provides API endpoints for cross-checks (cruzamentos), charts data,
 * and insights/alerts analysis.
 */

import { Router } from 'express';
import { db } from '../db';
import { siteData, dailySpend, commercialFunnelDaily } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { aggregateWeekly, aggregateMonthly } from '../lib/consolidationAggregation';
import { calculateCruzamentos } from '../lib/cruzamentoCalculations';
import { generateInsights } from '../lib/insightsGenerator';

const router = Router();

/**
 * GET /analysis/cruzamentos
 *
 * Get cross-check analysis for a date range.
 *
 * Query params:
 * - siteId: number (required)
 * - dateFrom: YYYY-MM-DD (required)
 * - dateTo: YYYY-MM-DD (required)
 *
 * Returns: Array of cruzamentos (cross-checks) from weekly aggregation
 */
router.get('/cruzamentos', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!siteId || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required params: siteId, dateFrom, dateTo' });
    }

    // Get current week aggregation
    const weekStart = getWeekStart(dateTo);
    const weekEnd = dateTo;

    // Get previous week for comparison
    const prevDate = new Date(dateFrom);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekStart = getWeekStart(prevDate.toISOString().split('T')[0]);
    const prevWeekEnd = new Date(prevDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

    const [current, previous] = await Promise.all([
      aggregateWeekly(siteId, weekStart, weekEnd),
      aggregateWeekly(siteId, prevWeekStart, prevWeekEnd.toISOString().split('T')[0]),
    ]);

    const cruzamentos = calculateCruzamentos(current, previous);
    res.json(cruzamentos);
  } catch (err) {
    console.error('Error fetching cruzamentos:', err);
    res.status(500).json({ error: 'Failed to fetch cruzamentos' });
  }
});

/**
 * GET /analysis/chart-data
 *
 * Get time-series data for charting.
 *
 * Query params:
 * - siteId: number (required)
 * - metric: string (required) - 'sessions', 'leads', 'mqls', 'sqls', 'opportunities', 'revenue', 'spend', 'cpl'
 * - period: string (required) - 'daily', 'weekly', 'monthly'
 * - dateFrom: YYYY-MM-DD (required)
 * - dateTo: YYYY-MM-DD (required)
 * - channel?: string (optional) - filter by channel
 *
 * Returns: Array of { date, value, previousValue? }
 */
router.get('/chart-data', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const metric = req.query.metric as string;
    const period = req.query.period as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const channel = req.query.channel as string | undefined;

    if (!siteId || !metric || !period || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required params: siteId, metric, period, dateFrom, dateTo' });
    }

    const chartData = await getChartData(siteId, metric, period, dateFrom, dateTo, channel);
    res.json(chartData);
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

/**
 * GET /analysis/insights
 *
 * Get generated insights and alerts for a date range.
 *
 * Query params:
 * - siteId: number (required)
 * - dateFrom: YYYY-MM-DD (required)
 * - dateTo: YYYY-MM-DD (required)
 *
 * Returns: Array of insights/alerts sorted by severity
 */
router.get('/insights', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!siteId || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required params: siteId, dateFrom, dateTo' });
    }

    // Get current and previous week
    const weekStart = getWeekStart(dateTo);
    const weekEnd = dateTo;

    const prevDate = new Date(dateFrom);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekStart = getWeekStart(prevDate.toISOString().split('T')[0]);
    const prevWeekEnd = new Date(prevDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

    const [current, previous] = await Promise.all([
      aggregateWeekly(siteId, weekStart, weekEnd),
      aggregateWeekly(siteId, prevWeekStart, prevWeekEnd.toISOString().split('T')[0]),
    ]);

    const insights = generateInsights(current, previous);
    res.json(insights);
  } catch (err) {
    console.error('Error fetching insights:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// ─── Helper Functions ────────────────────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function getChartData(
  siteId: number,
  metric: string,
  period: string,
  dateFrom: string,
  dateTo: string,
  channel?: string
): Promise<Array<{ date: string; value: number | null; label?: string }>> {
  const chartData: Array<{ date: string; value: number | null; label?: string }> = [];

  if (period === 'daily') {
    return getChartDataDaily(siteId, metric, dateFrom, dateTo, channel);
  } else if (period === 'weekly') {
    return getChartDataWeekly(siteId, metric, dateFrom, dateTo, channel);
  } else if (period === 'monthly') {
    return getChartDataMonthly(siteId, metric, dateFrom, dateTo, channel);
  }

  return chartData;
}

async function getChartDataDaily(
  siteId: number,
  metric: string,
  dateFrom: string,
  dateTo: string,
  channel?: string
): Promise<Array<{ date: string; value: number | null }>> {
  const data: Array<{ date: string; value: number | null }> = [];

  // Fetch daily spend data for cost metrics
  if (['spend', 'cpl'].includes(metric)) {
    const spendRows = await db.select()
      .from(dailySpend)
      .where(
        and(
          eq(dailySpend.siteId, siteId),
          gte(dailySpend.date, dateFrom),
          lte(dailySpend.date, dateTo),
          channel ? eq(dailySpend.channel, channel) : undefined
        )
      );

    const spendByDate = new Map<string, number>();
    spendRows.forEach(row => {
      spendByDate.set(row.date, (spendByDate.get(row.date) || 0) + (row.spend || 0));
    });

    // For CPL, we'd also need leads data - simplified for now
    for (let d = new Date(dateFrom); d <= new Date(dateTo); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const value = spendByDate.get(dateStr) || null;
      data.push({ date: dateStr, value });
    }

    return data;
  }

  // For funnel metrics, fetch from commercialFunnelDaily
  const funnelRows = await db.select()
    .from(commercialFunnelDaily)
    .where(
      and(
        eq(commercialFunnelDaily.siteId, siteId),
        gte(commercialFunnelDaily.date, dateFrom),
        lte(commercialFunnelDaily.date, dateTo)
      )
    );

  const metricByDate = new Map<string, number>();
  funnelRows.forEach(row => {
    const val = row[metric as keyof typeof row] as number | null;
    if (val) {
      metricByDate.set(row.date, (metricByDate.get(row.date) || 0) + val);
    }
  });

  for (let d = new Date(dateFrom); d <= new Date(dateTo); d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const value = metricByDate.get(dateStr) || null;
    data.push({ date: dateStr, value });
  }

  return data;
}

async function getChartDataWeekly(
  siteId: number,
  metric: string,
  dateFrom: string,
  dateTo: string,
  channel?: string
): Promise<Array<{ date: string; value: number | null; label?: string }>> {
  const data: Array<{ date: string; value: number | null; label?: string }> = [];

  // Generate weeks and aggregate
  const current = new Date(dateFrom);
  const end = new Date(dateTo);

  while (current <= end) {
    const weekStart = getWeekStart(current.toISOString().split('T')[0]);
    const weekEndDate = new Date(current);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    const agg = await aggregateWeekly(siteId, weekStart, weekEnd);

    const metricValue = agg[metric as keyof typeof agg] as number | null;
    data.push({
      date: weekStart,
      value: metricValue,
      label: `${weekStart} - ${weekEnd}`,
    });

    current.setDate(current.getDate() + 7);
  }

  return data;
}

async function getChartDataMonthly(
  siteId: number,
  metric: string,
  dateFrom: string,
  dateTo: string,
  channel?: string
): Promise<Array<{ date: string; value: number | null }>> {
  const data: Array<{ date: string; value: number | null }> = [];

  // Parse month ranges
  const [fromYear, fromMonth] = dateFrom.split('-').slice(0, 2).map(Number);
  const [toYear, toMonth] = dateTo.split('-').slice(0, 2).map(Number);

  let year = fromYear;
  let month = fromMonth;

  while (year < toYear || (year === toYear && month <= toMonth)) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const agg = await aggregateMonthly(siteId, monthStr);

    const metricValue = agg[metric as keyof typeof agg] as number | null;
    data.push({
      date: monthStr,
      value: metricValue,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return data;
}

export default router;
