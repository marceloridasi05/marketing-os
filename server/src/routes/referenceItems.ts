import { Router } from 'express';
import { db } from '../db/index.js';
import { referenceItems } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// List all or filter by type
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.type) conditions.push(eq(referenceItems.type, req.query.type as string));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(referenceItems).where(where).orderBy(referenceItems.type, referenceItems.value);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const [row] = await db.insert(referenceItems).values(req.body).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(referenceItems).set(req.body).where(eq(referenceItems.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(referenceItems).where(eq(referenceItems.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
