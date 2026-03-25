import { Router } from 'express';
import { db } from '../db/index.js';
import { experiments } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await db.select().from(experiments).orderBy(sql`${experiments.createdAt} desc`);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { hypothesis, expectedResult, duration, startDate, endDate, channel, metric, baselineValue, resultValue, learning, status, successful, category } = req.body;
  const result = await db.insert(experiments).values({
    hypothesis, expectedResult: expectedResult || null, duration: duration || null,
    startDate: startDate || null, endDate: endDate || null,
    channel: channel || null, metric: metric || null,
    baselineValue: baselineValue || null, resultValue: resultValue || null,
    learning: learning || null, status: status || 'planned',
    successful: successful || null, category: category || null,
  }).returning();
  res.json(result[0]);
});

router.put('/:id', async (req, res) => {
  const { hypothesis, expectedResult, duration, startDate, endDate, channel, metric, baselineValue, resultValue, learning, status, successful, category } = req.body;
  await db.update(experiments).set({
    hypothesis, expectedResult: expectedResult || null, duration: duration || null,
    startDate: startDate || null, endDate: endDate || null,
    channel: channel || null, metric: metric || null,
    baselineValue: baselineValue || null, resultValue: resultValue || null,
    learning: learning || null, status: status || 'planned',
    successful: successful || null, category: category || null,
    updatedAt: sql`datetime('now')`,
  }).where(eq(experiments.id, +req.params.id));
  const updated = await db.select().from(experiments).where(eq(experiments.id, +req.params.id));
  res.json(updated[0]);
});

router.delete('/:id', async (req, res) => {
  await db.delete(experiments).where(eq(experiments.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
