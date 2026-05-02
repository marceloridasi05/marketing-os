import { Router, Request, Response } from 'express';
import { db } from '../db';
import { commercialMetrics } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

interface CommercialMetricsData {
  month: string; // YYYY-MM format
  mql: number | null;
  sql: number | null;
  opportunities: number | null;
  pipelineValue: number | null;
  revenue: number | null;
  sourceNote?: string;
}

/**
 * GET /api/commercial-metrics/:siteId
 * Fetch all commercial metrics for a site
 * Query params: monthFrom, monthTo (optional, YYYY-MM format)
 */
router.get('/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { monthFrom, monthTo } = req.query;

    let query = db.select().from(commercialMetrics).where(eq(commercialMetrics.siteId, parseInt(siteId)));

    // Filter by month range if provided
    if (monthFrom) {
      const monthFromStr = String(monthFrom);
      query = query.where(and(eq(commercialMetrics.siteId, parseInt(siteId))));
      // Note: Drizzle doesn't support between easily, so we filter in code
    }

    const rows = await query.all();

    // Filter in code if date range provided
    let filtered = rows;
    if (monthFrom || monthTo) {
      filtered = rows.filter(row => {
        if (monthFrom && row.month < String(monthFrom)) return false;
        if (monthTo && row.month > String(monthTo)) return false;
        return true;
      });
    }

    // Sort by month descending
    filtered.sort((a, b) => b.month.localeCompare(a.month));

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching commercial metrics:', error);
    res.status(500).json({ error: 'Failed to fetch commercial metrics' });
  }
});

/**
 * POST /api/commercial-metrics/:siteId
 * Save a commercial metrics entry
 * Body: CommercialMetricsData
 */
router.post('/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const data: CommercialMetricsData = req.body;

    // Validation
    if (!data.month) {
      return res.status(400).json({ error: 'Month is required (YYYY-MM format)' });
    }

    if (!data.mql && !data.sql && !data.opportunities && !data.pipelineValue && !data.revenue) {
      return res.status(400).json({ error: 'At least one metric must be provided' });
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(data.month)) {
      return res.status(400).json({ error: 'Invalid month format (use YYYY-MM)' });
    }

    // Validate no negative values
    const numericFields = { mql: data.mql, sql: data.sql, opportunities: data.opportunities, pipelineValue: data.pipelineValue, revenue: data.revenue };
    for (const [key, value] of Object.entries(numericFields)) {
      if (value !== null && value !== undefined && value < 0) {
        return res.status(400).json({ error: `${key} cannot be negative` });
      }
    }

    // Check if entry for this month already exists
    const existing = await db
      .select()
      .from(commercialMetrics)
      .where(and(eq(commercialMetrics.siteId, parseInt(siteId)), eq(commercialMetrics.month, data.month)))
      .get();

    if (existing) {
      // Update existing
      const updated = await db
        .update(commercialMetrics)
        .set({
          mql: data.mql,
          sql: data.sql,
          opportunities: data.opportunities,
          pipelineValue: data.pipelineValue,
          revenue: data.revenue,
          sourceNote: data.sourceNote,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(commercialMetrics.id, existing.id))
        .returning()
        .get();

      return res.json(updated);
    } else {
      // Insert new
      const inserted = await db
        .insert(commercialMetrics)
        .values({
          siteId: parseInt(siteId),
          month: data.month,
          mql: data.mql,
          sql: data.sql,
          opportunities: data.opportunities,
          pipelineValue: data.pipelineValue,
          revenue: data.revenue,
          sourceNote: data.sourceNote,
        })
        .returning()
        .get();

      return res.json(inserted);
    }
  } catch (error) {
    console.error('Error saving commercial metrics:', error);
    res.status(500).json({ error: 'Failed to save commercial metrics' });
  }
});

/**
 * GET /api/commercial-metrics/:siteId/:month
 * Fetch specific month's data
 */
router.get('/:siteId/:month', async (req: Request, res: Response) => {
  try {
    const { siteId, month } = req.params;

    const row = await db
      .select()
      .from(commercialMetrics)
      .where(and(eq(commercialMetrics.siteId, parseInt(siteId)), eq(commercialMetrics.month, month)))
      .get();

    if (!row) {
      return res.status(404).json({ error: 'No data found for this month' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error fetching commercial metrics:', error);
    res.status(500).json({ error: 'Failed to fetch commercial metrics' });
  }
});

/**
 * DELETE /api/commercial-metrics/:siteId/:month
 * Delete a commercial metrics entry
 */
router.delete('/:siteId/:month', async (req: Request, res: Response) => {
  try {
    const { siteId, month } = req.params;

    const result = await db
      .delete(commercialMetrics)
      .where(and(eq(commercialMetrics.siteId, parseInt(siteId)), eq(commercialMetrics.month, month)))
      .returning()
      .get();

    if (!result) {
      return res.status(404).json({ error: 'No data found for this month' });
    }

    res.json({ success: true, deleted: result });
  } catch (error) {
    console.error('Error deleting commercial metrics:', error);
    res.status(500).json({ error: 'Failed to delete commercial metrics' });
  }
});

export default router;
