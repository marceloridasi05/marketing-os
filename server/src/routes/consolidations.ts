/**
 * Consolidation API Routes
 *
 * Provides weekly, monthly, and pacing consolidation views that aggregate
 * operational data from multiple DADOS modules.
 */

import { Router } from 'express';
import {
  aggregateWeekly,
  aggregateMonthly,
  calculatePacing,
  WeeklyConsolidation,
  MonthlyConsolidation,
  PacingData,
} from '../lib/consolidationAggregation';

const router = Router();

/**
 * GET /consolidations/weekly
 *
 * Get weekly consolidation data for a date range.
 *
 * Query params:
 * - siteId: number (required)
 * - dateFrom: YYYY-MM-DD (required)
 * - dateTo: YYYY-MM-DD (required)
 *
 * Returns: Array of WeeklyConsolidation (one per week)
 */
router.get('/weekly', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!siteId || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required params: siteId, dateFrom, dateTo' });
    }

    // Generate list of weeks from dateFrom to dateTo
    const weeks: WeeklyConsolidation[] = [];
    const current = new Date(dateFrom);
    const end = new Date(dateTo);

    while (current <= end) {
      const weekStart = current.toISOString().split('T')[0];
      // Move to end of week (Sunday)
      const daysUntilSunday = (7 - current.getDay()) % 7;
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const weekData = await aggregateWeekly(siteId, weekStart, weekEndStr);
      weeks.push(weekData);

      // Move to next week
      current.setDate(current.getDate() + 7);
    }

    res.json(weeks);
  } catch (err) {
    console.error('Error fetching weekly consolidations:', err);
    res.status(500).json({ error: 'Failed to fetch weekly consolidations' });
  }
});

/**
 * GET /consolidations/weekly/:weekStart
 *
 * Get a single week's consolidation data.
 *
 * Params:
 * - weekStart: YYYY-MM-DD (Monday of the week)
 *
 * Query params:
 * - siteId: number (required)
 *
 * Returns: WeeklyConsolidation
 */
router.get('/weekly/:weekStart', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const weekStart = req.params.weekStart;

    if (!siteId || !weekStart) {
      return res.status(400).json({ error: 'Missing required params: siteId, weekStart' });
    }

    // Calculate week end (7 days after start)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const weekData = await aggregateWeekly(siteId, weekStart, weekEndStr);
    res.json(weekData);
  } catch (err) {
    console.error('Error fetching weekly consolidation:', err);
    res.status(500).json({ error: 'Failed to fetch weekly consolidation' });
  }
});

/**
 * GET /consolidations/monthly
 *
 * Get monthly consolidation data for a date range.
 *
 * Query params:
 * - siteId: number (required)
 * - monthFrom: YYYY-MM (required)
 * - monthTo: YYYY-MM (required)
 *
 * Returns: Array of MonthlyConsolidation (one per month with MoM comparison)
 */
router.get('/monthly', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const monthFrom = req.query.monthFrom as string;
    const monthTo = req.query.monthTo as string;

    if (!siteId || !monthFrom || !monthTo) {
      return res.status(400).json({ error: 'Missing required params: siteId, monthFrom, monthTo' });
    }

    // Generate list of months from monthFrom to monthTo
    const months: MonthlyConsolidation[] = [];
    const [fromYear, fromMonth] = monthFrom.split('-').map(Number);
    const [toYear, toMonth] = monthTo.split('-').map(Number);

    let year = fromYear;
    let month = fromMonth;

    while (year < toYear || (year === toYear && month <= toMonth)) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const monthData = await aggregateMonthly(siteId, monthStr);
      months.push(monthData);

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    res.json(months);
  } catch (err) {
    console.error('Error fetching monthly consolidations:', err);
    res.status(500).json({ error: 'Failed to fetch monthly consolidations' });
  }
});

/**
 * GET /consolidations/monthly/:month
 *
 * Get a single month's consolidation data with MoM comparison.
 *
 * Params:
 * - month: YYYY-MM
 *
 * Query params:
 * - siteId: number (required)
 *
 * Returns: MonthlyConsolidation
 */
router.get('/monthly/:month', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const month = req.params.month;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'Missing required params: siteId, month' });
    }

    const monthData = await aggregateMonthly(siteId, month);
    res.json(monthData);
  } catch (err) {
    console.error('Error fetching monthly consolidation:', err);
    res.status(500).json({ error: 'Failed to fetch monthly consolidation' });
  }
});

/**
 * GET /consolidations/pacing
 *
 * Get pacing forecast for current month or any specified month.
 *
 * Query params:
 * - siteId: number (required)
 * - month: YYYY-MM (optional, defaults to current month)
 *
 * Returns: PacingData with MTD actuals and full-month forecasts
 */
router.get('/pacing', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    let month = req.query.month as string;

    if (!siteId) {
      return res.status(400).json({ error: 'Missing required param: siteId' });
    }

    // Default to current month
    if (!month) {
      const today = new Date();
      month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    const pacingData = await calculatePacing(siteId, month);
    res.json(pacingData);
  } catch (err) {
    console.error('Error fetching pacing data:', err);
    res.status(500).json({ error: 'Failed to fetch pacing data' });
  }
});

/**
 * GET /consolidations/pacing/:month
 *
 * Get pacing forecast for a specific month.
 *
 * Params:
 * - month: YYYY-MM
 *
 * Query params:
 * - siteId: number (required)
 *
 * Returns: PacingData
 */
router.get('/pacing/:month', async (req, res) => {
  try {
    const siteId = parseInt(req.query.siteId as string);
    const month = req.params.month;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'Missing required params: siteId, month' });
    }

    const pacingData = await calculatePacing(siteId, month);
    res.json(pacingData);
  } catch (err) {
    console.error('Error fetching pacing data:', err);
    res.status(500).json({ error: 'Failed to fetch pacing data' });
  }
});

export default router;
