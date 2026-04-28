import { Router } from 'express';
import { db } from '../db/index.js';
import { experiments } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { calculatePriorityScore } from '../lib/prioritization.js';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(experiments.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(experiments).where(where).orderBy(sql`${experiments.createdAt} desc`);
  res.json(rows);
});

router.get('/prioritized', async (req, res) => {
  const siteId = +(req.query.siteId as string);
  const limit = +(req.query.limit as string) || 5;
  if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

  const rows = await db.select()
    .from(experiments)
    .where(eq(experiments.siteId, siteId))
    .orderBy(desc(experiments.priorityScore))
    .limit(limit);

  res.json({ topExperiments: rows, message: `Next ${rows.length} experiments to run` });
});

router.post('/', async (req, res) => {
  const { hypothesis, expectedResult, duration, startDate, endDate, channel, metric, baselineValue, resultValue, learning, status, successful, category, expectedImpact, estimatedEffort, confidenceScore } = req.body;
  const siteId = req.query.siteId ? +req.query.siteId : undefined;

  // Calculate priority score
  const impactVal = expectedImpact || 'medium';
  const effortVal = estimatedEffort || 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  const result = await db.insert(experiments).values({
    siteId, hypothesis, expectedResult: expectedResult || null, duration: duration || null,
    startDate: startDate || null, endDate: endDate || null,
    channel: channel || null, metric: metric || null,
    baselineValue: baselineValue || null, resultValue: resultValue || null,
    learning: learning || null, status: status || 'planned',
    successful: successful || null, category: category || null,
    expectedImpact: impactVal, estimatedEffort: effortVal, confidenceScore: confidenceScore || null,
    priorityScore,
  }).returning();
  res.json(result[0]);
});

router.put('/:id', async (req, res) => {
  const { hypothesis, expectedResult, duration, startDate, endDate, channel, metric, baselineValue, resultValue, learning, status, successful, category, expectedImpact, estimatedEffort, confidenceScore } = req.body;

  // Get current experiment to use existing values if not provided
  const existing = await db.select().from(experiments).where(eq(experiments.id, +req.params.id)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: 'Experiment not found' });

  const impactVal = expectedImpact ?? existing[0].expectedImpact ?? 'medium';
  const effortVal = estimatedEffort ?? existing[0].estimatedEffort ?? 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  await db.update(experiments).set({
    hypothesis, expectedResult: expectedResult || null, duration: duration || null,
    startDate: startDate || null, endDate: endDate || null,
    channel: channel || null, metric: metric || null,
    baselineValue: baselineValue || null, resultValue: resultValue || null,
    learning: learning || null, status: status || 'planned',
    successful: successful || null, category: category || null,
    expectedImpact: impactVal, estimatedEffort: effortVal, confidenceScore: confidenceScore || null,
    priorityScore,
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
