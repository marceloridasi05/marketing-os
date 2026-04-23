import { Router } from 'express';
import { db } from '../db/index.js';
import { sites } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await db.select().from(sites).orderBy(sites.name);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, url } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const [row] = await db.insert(sites).values({ name, url }).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { name, url } = req.body;
  const [row] = await db.update(sites).set({ name, url }).where(eq(sites.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(sites).where(eq(sites.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
