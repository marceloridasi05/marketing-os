import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { commercialFunnelInsights } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * GET / — list commercial funnel insights
 * Query params: siteId, month (YYYY-MM), type (optional filter)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, month, type } = req.query;
    const conditions = [];

    if (siteId) {
      conditions.push(eq(commercialFunnelInsights.siteId, parseInt(String(siteId))));
    }

    if (month) {
      conditions.push(eq(commercialFunnelInsights.month, String(month)));
    }

    if (type) {
      conditions.push(eq(commercialFunnelInsights.insightType, String(type)));
    }

    let query = db.select().from(commercialFunnelInsights);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.all();

    // Filter out dismissed insights by default, unless requested
    const showDismissed = req.query.showDismissed === 'true';
    const filtered = showDismissed ? rows : rows.filter(r => !r.dismissedAt);

    // Parse JSON fields and sort by severity
    const insights = filtered.map(r => ({
      ...r,
      metrics: r.metrics ? JSON.parse(r.metrics) : null,
      recommendedActions: r.recommendedActions ? JSON.parse(r.recommendedActions) : [],
    }));

    // Sort by severity (critical > warning > info) then by date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => {
      const severityDiff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
                           (severityOrder[b.severity as keyof typeof severityOrder] ?? 3);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(insights);
  } catch (err) {
    console.error('Error fetching insights:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/**
 * POST /generate — manually trigger insight generation for a month
 * Query params: siteId, month (YYYY-MM)
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;

    if (!siteId || !month) {
      return res.status(400).json({ error: 'siteId and month (YYYY-MM) are required' });
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format (use YYYY-MM)' });
    }

    // Delete old insights for this month (we'll regenerate them)
    await db
      .delete(commercialFunnelInsights)
      .where(and(
        eq(commercialFunnelInsights.siteId, siteId),
        eq(commercialFunnelInsights.month, month)
      ));

    // TODO: Call insight generation functions here
    // For now, return empty array as placeholder
    const generated = [];

    res.json({ success: true, month, generated: generated.length, insights: generated });
  } catch (err) {
    console.error('Error generating insights:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * POST /:id/dismiss — mark an insight as dismissed
 */
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const insight = await db
      .select()
      .from(commercialFunnelInsights)
      .where(and(
        eq(commercialFunnelInsights.id, parseInt(id)),
        eq(commercialFunnelInsights.siteId, siteId)
      ))
      .limit(1)
      .then(rows => rows[0]);

    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    const updated = await db
      .update(commercialFunnelInsights)
      .set({ dismissedAt: new Date().toISOString() })
      .where(eq(commercialFunnelInsights.id, parseInt(id)))
      .returning();

    res.json({ success: true, insight: updated[0] });
  } catch (err) {
    console.error('Error dismissing insight:', err);
    res.status(500).json({ error: 'Failed to dismiss insight' });
  }
});

/**
 * POST /:id/restore — restore a dismissed insight
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const updated = await db
      .update(commercialFunnelInsights)
      .set({ dismissedAt: null })
      .where(and(
        eq(commercialFunnelInsights.id, parseInt(id)),
        eq(commercialFunnelInsights.siteId, siteId)
      ))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({ success: true, insight: updated[0] });
  } catch (err) {
    console.error('Error restoring insight:', err);
    res.status(500).json({ error: 'Failed to restore insight' });
  }
});

export default router;
