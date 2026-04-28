import { Router } from 'express';
import { db } from '../db/index.js';
import { ideas } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { calculatePriorityScore } from '../lib/prioritization.js';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(ideas.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(ideas).where(where).orderBy(sql`${ideas.createdAt} desc`);
  res.json(rows);
});

router.get('/prioritized', async (req, res) => {
  const siteId = +(req.query.siteId as string);
  const limit = +(req.query.limit as string) || 5;
  if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

  const rows = await db.select()
    .from(ideas)
    .where(eq(ideas.siteId, siteId))
    .orderBy(desc(ideas.priorityScore))
    .limit(limit);

  res.json({ topIdeas: rows, message: `Next ${rows.length} ideas to execute` });
});

router.post('/', async (req, res) => {
  const { title, description, targetDate, relatedEvent, expectedOutcome, complexity, category, status, executed, executedDate, priority, impact, effort, confidenceScore } = req.body;
  const siteId = req.query.siteId ? +req.query.siteId : undefined;

  // Calculate priority score
  const impactVal = impact || 'medium';
  const effortVal = effort || 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  const result = await db.insert(ideas).values({
    siteId, title, description: description || null, targetDate: targetDate || null,
    relatedEvent: relatedEvent || null, expectedOutcome: expectedOutcome || null,
    complexity: complexity || 'medium', category: category || null,
    status: status || 'idea', executed: executed || false,
    executedDate: executedDate || null, priority: priority || 'medium',
    impact: impactVal, effort: effortVal, confidenceScore: confidenceScore || null,
    priorityScore,
  }).returning();
  res.json(result[0]);
});

router.put('/:id', async (req, res) => {
  const { title, description, targetDate, relatedEvent, expectedOutcome, complexity, category, status, executed, executedDate, priority, impact, effort, confidenceScore } = req.body;

  // Get current idea to use existing values if not provided
  const existing = await db.select().from(ideas).where(eq(ideas.id, +req.params.id)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: 'Idea not found' });

  const impactVal = impact ?? existing[0].impact ?? 'medium';
  const effortVal = effort ?? existing[0].effort ?? 'medium';
  const { priorityScore } = calculatePriorityScore({ impact: impactVal, effort: effortVal });

  await db.update(ideas).set({
    title, description: description || null, targetDate: targetDate || null,
    relatedEvent: relatedEvent || null, expectedOutcome: expectedOutcome || null,
    complexity: complexity || 'medium', category: category || null,
    status: status || 'idea', executed: executed || false,
    executedDate: executedDate || null, priority: priority || 'medium',
    impact: impactVal, effort: effortVal, confidenceScore: confidenceScore || null,
    priorityScore,
    updatedAt: sql`datetime('now')`,
  }).where(eq(ideas.id, +req.params.id));
  const updated = await db.select().from(ideas).where(eq(ideas.id, +req.params.id));
  res.json(updated[0]);
});

router.delete('/:id', async (req, res) => {
  await db.delete(ideas).where(eq(ideas.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
