import { Router } from 'express';
import { db } from '../db/index.js';
import { suppliers } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// GET /
router.get('/', async (_req, res) => {
  const rows = await db.select().from(suppliers).orderBy(suppliers.name);
  res.json(rows);
});

// POST /
router.post('/', async (req, res) => {
  const { name, category, website, whatsapp, notes, active } = req.body;
  const result = await db.insert(suppliers).values({
    name, category, website: website || null, whatsapp: whatsapp || null,
    notes: notes || null, active: active !== false,
  }).returning();
  res.json(result[0]);
});

// PUT /:id
router.put('/:id', async (req, res) => {
  const { name, category, website, whatsapp, notes, active } = req.body;
  await db.update(suppliers).set({
    name, category, website: website || null, whatsapp: whatsapp || null,
    notes: notes || null, active: active !== false,
    updatedAt: sql`datetime('now')`,
  }).where(eq(suppliers.id, +req.params.id));
  const updated = await db.select().from(suppliers).where(eq(suppliers.id, +req.params.id));
  res.json(updated[0] ?? { error: 'Not found' });
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  await db.delete(suppliers).where(eq(suppliers.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
