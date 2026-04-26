import { Router } from 'express';
import { db } from '../db/index.js';
import { initiativeMeta } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /?siteId=X  — all metadata for a site
router.get('/', async (req, res) => {
  const { siteId } = req.query;
  const where = siteId ? eq(initiativeMeta.siteId, +siteId) : undefined;
  const rows = await db.select().from(initiativeMeta).where(where)
    .orderBy(initiativeMeta.objective, initiativeMeta.action);
  res.json(rows);
});

// POST /  — upsert by (siteId, objective, action)
router.post('/', async (req, res) => {
  const { siteId, objective, action, businessObjective, metricKey, expectedOutcome, notes } = req.body;
  if (!objective || !action) return res.status(400).json({ error: 'objective and action required' });

  const conditions = [
    eq(initiativeMeta.objective, objective),
    eq(initiativeMeta.action, action),
  ];
  if (siteId) conditions.push(eq(initiativeMeta.siteId, +siteId));

  const [existing] = await db.select().from(initiativeMeta).where(and(...conditions)).limit(1);

  if (existing) {
    const [updated] = await db.update(initiativeMeta)
      .set({
        businessObjective: businessObjective ?? null,
        metricKey: metricKey ?? null,
        expectedOutcome: expectedOutcome ?? null,
        notes: notes ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(initiativeMeta.id, existing.id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db.insert(initiativeMeta).values({
    siteId: siteId ? +siteId : null,
    objective,
    action,
    businessObjective: businessObjective ?? null,
    metricKey: metricKey ?? null,
    expectedOutcome: expectedOutcome ?? null,
    notes: notes ?? null,
  }).returning();
  res.status(201).json(created);
});

// PUT /:id
router.put('/:id', async (req, res) => {
  const { businessObjective, metricKey, expectedOutcome, notes } = req.body;
  const [updated] = await db.update(initiativeMeta)
    .set({
      businessObjective: businessObjective ?? null,
      metricKey: metricKey ?? null,
      expectedOutcome: expectedOutcome ?? null,
      notes: notes ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(initiativeMeta.id, +req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  await db.delete(initiativeMeta).where(eq(initiativeMeta.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
