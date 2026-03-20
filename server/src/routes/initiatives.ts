import { Router } from 'express';
import { db } from '../db/index.js';
import { initiatives } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.year) conditions.push(eq(initiatives.year, +req.query.year));
  if (req.query.month) conditions.push(eq(initiatives.month, +req.query.month));
  if (req.query.status) conditions.push(eq(initiatives.status, req.query.status as string));
  if (req.query.objective) conditions.push(eq(initiatives.objective, req.query.objective as string));
  if (req.query.actionType) conditions.push(eq(initiatives.actionType, req.query.actionType as string));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(initiatives).where(where).orderBy(initiatives.year, initiatives.month, initiatives.name);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const [row] = await db.insert(initiatives).values(req.body).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(initiatives)
    .set({ ...req.body, updatedAt: sql`datetime('now')` })
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
