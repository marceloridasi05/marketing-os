import { Router } from 'express';
import { db } from '../db/index.js';
import { ideas } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(ideas.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(ideas).where(where).orderBy(sql`${ideas.createdAt} desc`);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, description, targetDate, relatedEvent, expectedOutcome, complexity, category, status, executed, executedDate, priority } = req.body;
  const siteId = req.query.siteId ? +req.query.siteId : undefined;
  const result = await db.insert(ideas).values({
    siteId, title, description: description || null, targetDate: targetDate || null,
    relatedEvent: relatedEvent || null, expectedOutcome: expectedOutcome || null,
    complexity: complexity || 'medium', category: category || null,
    status: status || 'idea', executed: executed || false,
    executedDate: executedDate || null, priority: priority || 'medium',
  }).returning();
  res.json(result[0]);
});

router.put('/:id', async (req, res) => {
  const { title, description, targetDate, relatedEvent, expectedOutcome, complexity, category, status, executed, executedDate, priority } = req.body;
  await db.update(ideas).set({
    title, description: description || null, targetDate: targetDate || null,
    relatedEvent: relatedEvent || null, expectedOutcome: expectedOutcome || null,
    complexity: complexity || 'medium', category: category || null,
    status: status || 'idea', executed: executed || false,
    executedDate: executedDate || null, priority: priority || 'medium',
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
