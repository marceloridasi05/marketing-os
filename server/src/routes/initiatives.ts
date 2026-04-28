import { Router } from 'express';
import { db } from '../db/index.js';
import { initiatives } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { calculatePriorityScore } from '../lib/prioritization.js';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(initiatives.siteId, +req.query.siteId));
  if (req.query.year) conditions.push(eq(initiatives.year, +req.query.year));
  if (req.query.month) conditions.push(eq(initiatives.month, +req.query.month));
  if (req.query.status) conditions.push(eq(initiatives.status, req.query.status as string));
  if (req.query.objective) conditions.push(eq(initiatives.objective, req.query.objective as string));
  if (req.query.actionType) conditions.push(eq(initiatives.actionType, req.query.actionType as string));
  if (req.query.engineType) conditions.push(eq(initiatives.engineType, req.query.engineType as string));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(initiatives).where(where).orderBy(initiatives.year, initiatives.month, initiatives.name);
  res.json(rows);
});

router.get('/prioritized', async (req, res) => {
  const siteId = +(req.query.siteId as string);
  const limit = +(req.query.limit as string) || 5;
  if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

  const rows = await db.select()
    .from(initiatives)
    .where(eq(initiatives.siteId, siteId))
    .orderBy(desc(initiatives.priorityScore))
    .limit(limit);

  res.json({ topInitiatives: rows, message: `Next ${rows.length} initiatives to execute` });
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const siteId = req.query.siteId ? +req.query.siteId : undefined;
  const { impactLevel, effortEstimate, ...rest } = req.body;

  // Calculate priority score
  const impactVal = impactLevel || 'medium';
  const effortVal = effortEstimate || 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  const [row] = await db.insert(initiatives).values({
    ...rest,
    siteId,
    impactLevel: impactVal,
    effortEstimate: effortVal,
    priorityScore,
  }).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { impactLevel, effortEstimate, ...rest } = req.body;

  // Get current initiative to calculate priority score
  const existing = await db.select().from(initiatives).where(eq(initiatives.id, +req.params.id)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: 'Not found' });

  const impactVal = impactLevel ?? existing[0].impactLevel ?? 'medium';
  const effortVal = effortEstimate ?? existing[0].effortEstimate ?? 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  const [row] = await db.update(initiatives)
    .set({
      ...rest,
      impactLevel: impactVal,
      effortEstimate: effortVal,
      priorityScore,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(initiatives.id, +req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(initiatives).where(eq(initiatives.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
