import { Router } from 'express';
import { db } from '../db/index.js';
import { chartAnnotations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /?page=ads_kpis&chartKey=clicks
router.get('/', async (req, res) => {
  const { page, chartKey } = req.query as { page?: string; chartKey?: string };
  let rows;
  if (page && chartKey) {
    rows = await db.select().from(chartAnnotations)
      .where(and(eq(chartAnnotations.page, page), eq(chartAnnotations.chartKey, chartKey)));
  } else if (page) {
    rows = await db.select().from(chartAnnotations).where(eq(chartAnnotations.page, page));
  } else {
    rows = await db.select().from(chartAnnotations);
  }
  res.json(rows);
});

// POST /
router.post('/', async (req, res) => {
  const { page, chartKey, xValue, comment } = req.body;
  if (!page || !chartKey || !xValue || !comment) {
    return res.status(400).json({ error: 'page, chartKey, xValue, comment são obrigatórios' });
  }
  const [row] = await db.insert(chartAnnotations).values({ page, chartKey, xValue, comment }).returning();
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
