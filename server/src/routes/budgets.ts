import { Router } from 'express';
import { db } from '../db/index.js';
import { budgets, channels, fixedCosts } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// List with optional year/month filter, joined with channel name
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.year) conditions.push(eq(budgets.year, +req.query.year));
  if (req.query.month) conditions.push(eq(budgets.month, +req.query.month));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: budgets.id,
      year: budgets.year,
      month: budgets.month,
      channelId: budgets.channelId,
      channelName: channels.name,
      plannedBudget: budgets.plannedBudget,
      actualSpent: budgets.actualSpent,
      notes: budgets.notes,
    })
    .from(budgets)
    .innerJoin(channels, eq(budgets.channelId, channels.id))
    .where(where)
    .orderBy(budgets.year, budgets.month, channels.name);
  res.json(rows);
});

// Monthly summary for a year (media budgets + fixed costs rollup)
router.get('/annual-summary', async (req, res) => {
  const year = +(req.query.year || new Date().getFullYear());

  // Media budgets by month
  const mediaSummary = await db
    .select({
      month: budgets.month,
      planned: sql<number>`coalesce(sum(${budgets.plannedBudget}), 0)`,
      spent: sql<number>`coalesce(sum(${budgets.actualSpent}), 0)`,
    })
    .from(budgets)
    .where(eq(budgets.year, year))
    .groupBy(budgets.month)
    .orderBy(budgets.month);

  // All active fixed costs (we compute monthly inclusion in response)
  const allFixedCosts = await db
    .select()
    .from(fixedCosts);

  // Build 12-month summary
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(m).padStart(2, '0')}-31`;

    const activeFixed = allFixedCosts.filter(fc => {
      if (!fc.active) return false;
      if (fc.startDate > monthEnd) return false;
      if (fc.endDate && fc.endDate < monthStart) return false;
      return true;
    });

    const fixedTotal = activeFixed.reduce((sum, fc) => sum + (fc.monthlyCost ?? 0), 0);
    const media = mediaSummary.find(ms => ms.month === m);
    const planned = media?.planned ?? 0;
    const spent = media?.spent ?? 0;

    months.push({
      month: m,
      year,
      plannedMedia: planned,
      actualMedia: spent,
      fixedCosts: fixedTotal,
      totalCost: spent + fixedTotal,
      remaining: planned - spent,
    });
  }

  res.json(months);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(budgets).where(eq(budgets.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const [row] = await db.insert(budgets).values(req.body).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(budgets)
    .set({ ...req.body, updatedAt: sql`datetime('now')` })
    .where(eq(budgets.id, +req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(budgets).where(eq(budgets.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
