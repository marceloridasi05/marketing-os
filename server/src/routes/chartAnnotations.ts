import { Router } from 'express';
import { db } from '../db/index.js';
import { chartAnnotations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /?page=ads_kpis&chartKey=clicks
router.get('/', async (req, res) => {
  const { page, chartKey, siteId } = req.query as { page?: string; chartKey?: string; siteId?: string };
  const base = siteId ? [eq(chartAnnotations.siteId, +siteId)] : [];
  let rows;
  if (page && chartKey) {
    rows = await db.select().from(chartAnnotations)
      .where(and(...base, eq(chartAnnotations.page, page), eq(chartAnnotations.chartKey, chartKey)));
  } else if (page) {
    rows = await db.select().from(chartAnnotations).where(and(...base, eq(chartAnnotations.page, page)));
  } else {
    rows = await db.select().from(chartAnnotations).where(base.length ? and(...base) : undefined);
  }
  res.json(rows);
});

// POST /
// If replicateToAll=true, creates annotation for all known chartKeys on the page
router.post('/', async (req, res) => {
  const { page, chartKey, xValue, comment, replicateToAll } = req.body;
  if (!page || !chartKey || !xValue || !comment) {
    return res.status(400).json({ error: 'page, chartKey, xValue, comment são obrigatórios' });
  }

  const siteId = req.body.siteId ? +req.body.siteId : (req.query.siteId ? +req.query.siteId : undefined);

  if (replicateToAll) {
    // Get all distinct chartKeys for this page
    const existing = await db.select({ chartKey: chartAnnotations.chartKey })
      .from(chartAnnotations).where(eq(chartAnnotations.page, page));
    const keys = new Set(existing.map(r => r.chartKey));
    keys.add(chartKey); // always include current

    // Also add known chart keys per page
    const PAGE_CHARTS: Record<string, string[]> = {
      ads_kpis: ['clicks', 'conversions'],
      site_data: ['sessions', 'leads', 'site_sessions_users', 'blog_sessions_users'],
      dashboard: ['spend', 'leads', 'sessions'],
    };
    (PAGE_CHARTS[page] || []).forEach(k => keys.add(k));

    const rows = [];
    for (const key of keys) {
      const [row] = await db.insert(chartAnnotations).values({ siteId, page, chartKey: key, xValue, comment }).returning();
      rows.push(row);
    }
    return res.status(201).json(rows);
  }

  const [row] = await db.insert(chartAnnotations).values({ siteId, page, chartKey, xValue, comment }).returning();
  res.status(201).json(row);
});

// PUT /:id
router.put('/:id', async (req, res) => {
  const { comment } = req.body;
  const [row] = await db.update(chartAnnotations).set({ comment }).where(eq(chartAnnotations.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  await db.delete(chartAnnotations).where(eq(chartAnnotations.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
