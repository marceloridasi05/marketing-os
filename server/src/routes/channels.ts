import { Router } from 'express';
import { db } from '../db/index.js';
import { channels } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(channels.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(channels).where(where).orderBy(channels.name);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(channels).where(eq(channels.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const siteId = req.query.siteId ? +req.query.siteId : undefined;
  const [row] = await db.insert(channels).values({ ...req.body, siteId }).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(channels).set({ ...req.body, updatedAt: sql`datetime('now')` }).where(eq(channels.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(channels).where(eq(channels.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
