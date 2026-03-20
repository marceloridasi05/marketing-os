import { Router } from 'express';
import { db } from '../db/index.js';
import { goals } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await db.select().from(goals).orderBy(goals.year, goals.month);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(goals).where(eq(goals.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const [row] = await db.insert(goals).values(req.body).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(goals).set({ ...req.body, updatedAt: new Date() }).where(eq(goals.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(goals).where(eq(goals.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
