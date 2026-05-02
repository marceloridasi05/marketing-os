import { Router, Request, Response } from 'express';
import { db } from '../db';
import { monthlySpend } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

interface MonthlySpendData {
  month: string; // YYYY-MM format
  googleAdsSpend: number | null;
  metaAdsSpend: number | null;
  linkedinAdsSpend: number | null;
  otherPaidSpend: number | null;
  totalSpend?: number | null; // Can be auto-calculated or manually entered
  sourceNote?: string;
}

/**
 * GET /api/monthly-spend/:siteId
 * Fetch all monthly spend records for a site
 * Query params: monthFrom, monthTo (optional, YYYY-MM format)
 */
router.get('/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { monthFrom, monthTo } = req.query;

    const rows = await db
      .select()
      .from(monthlySpend)
      .where(eq(monthlySpend.siteId, parseInt(siteId)))
      .all();

    // Filter by month range if provided
    let filtered = rows;
    if (monthFrom || monthTo) {
      filtered = rows.filter(row => {
        if (monthFrom && row.month < String(monthFrom)) return false;
        if (monthTo && row.month > String(monthTo)) return false;
        return true;
      });
    }

    // Sort by month descending (most recent first)
    filtered.sort((a, b) => b.month.localeCompare(a.month));

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching monthly spend:', error);
    res.status(500).json({ error: 'Failed to fetch monthly spend' });
  }
});

/**
 * POST /api/monthly-spend/:siteId
 * Save a monthly spend entry
 * Body: MonthlySpendData
 */
router.post('/:siteId', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const data: MonthlySpendData = req.body;

    // Validation
    if (!data.month) {
      return res.status(400).json({ error: 'Month is required (YYYY-MM format)' });
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(data.month)) {
      return res.status(400).json({ error: 'Invalid month format (use YYYY-MM)' });
    }

    // At least one spend field must be provided
    if (
      !data.googleAdsSpend &&
      !data.metaAdsSpend &&
      !data.linkedinAdsSpend &&
      !data.otherPaidSpend &&
      !data.totalSpend
    ) {
      return res.status(400).json({ error: 'At least one spend value must be provided' });
    }

    // Validate no negative values
    const spendFields = {
      googleAdsSpend: data.googleAdsSpend,
      metaAdsSpend: data.metaAdsSpend,
      linkedinAdsSpend: data.linkedinAdsSpend,
      otherPaidSpend: data.otherPaidSpend,
      totalSpend: data.totalSpend,
    };

    for (const [key, value] of Object.entries(spendFields)) {
      if (value !== null && value !== undefined && value < 0) {
        return res.status(400).json({ error: `${key} cannot be negative` });
      }
    }

    // Auto-calculate totalSpend if not provided
    let calculatedTotal = data.totalSpend;
    if (!calculatedTotal || calculatedTotal === null) {
      const channelSum =
        (data.googleAdsSpend || 0) +
        (data.metaAdsSpend || 0) +
        (data.linkedinAdsSpend || 0) +
        (data.otherPaidSpend || 0);
      if (channelSum > 0) {
        calculatedTotal = channelSum;
      }
    }

    // Check if entry for this month already exists
    const existing = await db
      .select()
      .from(monthlySpend)
      .where(and(eq(monthlySpend.siteId, parseInt(siteId)), eq(monthlySpend.month, data.month)))
      .get();

    if (existing) {
      // Update existing
      const updated = await db
        .update(monthlySpend)
        .set({
          googleAdsSpend: data.googleAdsSpend,
          metaAdsSpend: data.metaAdsSpend,
          linkedinAdsSpend: data.linkedinAdsSpend,
          otherPaidSpend: data.otherPaidSpend,
          totalSpend: calculatedTotal,
          sourceNote: data.sourceNote,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(monthlySpend.id, existing.id))
        .returning()
        .get();

      return res.json(updated);
    } else {
      // Insert new
      const inserted = await db
        .insert(monthlySpend)
        .values({
          siteId: parseInt(siteId),
          month: data.month,
          googleAdsSpend: data.googleAdsSpend,
          metaAdsSpend: data.metaAdsSpend,
          linkedinAdsSpend: data.linkedinAdsSpend,
          otherPaidSpend: data.otherPaidSpend,
          totalSpend: calculatedTotal,
          sourceNote: data.sourceNote,
        })
        .returning()
        .get();

      return res.json(inserted);
    }
  } catch (error) {
    console.error('Error saving monthly spend:', error);
    res.status(500).json({ error: 'Failed to save monthly spend' });
  }
});

/**
 * GET /api/monthly-spend/:siteId/:month
 * Fetch specific month's spend data
 */
router.get('/:siteId/:month', async (req: Request, res: Response) => {
  try {
    const { siteId, month } = req.params;

    const row = await db
      .select()
      .from(monthlySpend)
      .where(and(eq(monthlySpend.siteId, parseInt(siteId)), eq(monthlySpend.month, month)))
      .get();

    if (!row) {
      return res.status(404).json({ error: 'No spend data found for this month' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error fetching monthly spend:', error);
    res.status(500).json({ error: 'Failed to fetch monthly spend' });
  }
});

/**
 * DELETE /api/monthly-spend/:siteId/:month
 * Delete a monthly spend entry
 */
router.delete('/:siteId/:month', async (req: Request, res: Response) => {
  try {
    const { siteId, month } = req.params;

    const result = await db
      .delete(monthlySpend)
      .where(and(eq(monthlySpend.siteId, parseInt(siteId)), eq(monthlySpend.month, month)))
      .returning()
      .get();

    if (!result) {
      return res.status(404).json({ error: 'No spend data found for this month' });
    }

    res.json({ success: true, deleted: result });
  } catch (error) {
    console.error('Error deleting monthly spend:', error);
    res.status(500).json({ error: 'Failed to delete monthly spend' });
  }
});

export default router;
