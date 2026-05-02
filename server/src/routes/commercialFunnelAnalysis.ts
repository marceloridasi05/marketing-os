import { Router, Request, Response } from 'express';
import {
  calculateCostPerMetrics,
  calculateCostPerMetricsByChannel,
  calculateCostMetricsTrends,
  getEfficiencySummary,
} from '../lib/costPerMetricCalculations.js';
import { generateCommercialFunnelInsights } from '../lib/commercialFunnelInsights.js';

const router = Router();

/**
 * GET /cost-metrics
 * Calculate cost-per-metric for a date range
 * Query params: siteId, dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD), channel (optional), campaign (optional)
 */
router.get('/cost-metrics', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const campaign = req.query.campaign ? String(req.query.campaign) : undefined;

    if (!siteId || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'siteId, dateFrom, and dateTo are required' });
    }

    const result = await calculateCostPerMetrics(siteId, dateFrom, dateTo, channel, campaign);

    if (!result) {
      return res.status(404).json({ error: 'No data found for the given date range' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error calculating cost metrics:', err);
    res.status(500).json({ error: 'Failed to calculate cost metrics' });
  }
});

/**
 * GET /cost-metrics-by-channel
 * Calculate cost-per-metric for all channels
 * Query params: siteId, dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
 */
router.get('/cost-metrics-by-channel', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;

    if (!siteId || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'siteId, dateFrom, and dateTo are required' });
    }

    const results = await calculateCostPerMetricsByChannel(siteId, dateFrom, dateTo);
    res.json(results);
  } catch (err) {
    console.error('Error calculating cost metrics by channel:', err);
    res.status(500).json({ error: 'Failed to calculate cost metrics' });
  }
});

/**
 * GET /cost-metrics-trends
 * Get cost-per-metric trends (current vs previous month)
 * Query params: siteId, month (YYYY-MM)
 */
router.get('/cost-metrics-trends', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'siteId and month (YYYY-MM) are required' });
    }

    const trends = await calculateCostMetricsTrends(siteId, month);
    res.json(trends);
  } catch (err) {
    console.error('Error calculating cost metrics trends:', err);
    res.status(500).json({ error: 'Failed to calculate trends' });
  }
});

/**
 * GET /efficiency-summary
 * Get efficiency summary with health status and trends
 * Query params: siteId, month (YYYY-MM)
 */
router.get('/efficiency-summary', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'siteId and month (YYYY-MM) are required' });
    }

    const summary = await getEfficiencySummary(siteId, month);
    res.json(summary);
  } catch (err) {
    console.error('Error getting efficiency summary:', err);
    res.status(500).json({ error: 'Failed to get efficiency summary' });
  }
});

/**
 * POST /generate-insights
 * Manually trigger insight generation for a month
 * Query params: siteId, month (YYYY-MM)
 */
router.post('/generate-insights', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'siteId and month (YYYY-MM) are required' });
    }

    const insights = await generateCommercialFunnelInsights(siteId, month);
    res.json({ success: true, month, generated: insights.length, insights });
  } catch (err) {
    console.error('Error generating insights:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
