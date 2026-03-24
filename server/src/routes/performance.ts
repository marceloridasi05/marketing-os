import { Router } from 'express';
import { db } from '../db/index.js';
import { performanceEntries, channels } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

const router = Router();

function buildFilters(query: Record<string, string>) {
  const conditions = [];
  if (query.startDate) conditions.push(gte(performanceEntries.date, query.startDate));
  if (query.endDate) conditions.push(lte(performanceEntries.date, query.endDate));
  if (query.channelId) conditions.push(eq(performanceEntries.channelId, +query.channelId));
  if (query.periodType) conditions.push(eq(performanceEntries.periodType, query.periodType));
  if (query.campaignType) conditions.push(eq(performanceEntries.campaignType, query.campaignType));
  if (query.engineType) conditions.push(eq(performanceEntries.engineType, query.engineType));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// List with optional filters + join channel name
router.get('/', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const rows = await db
    .select({
      id: performanceEntries.id,
      date: performanceEntries.date,
      periodType: performanceEntries.periodType,
      channelId: performanceEntries.channelId,
      channelName: channels.name,
      campaignName: performanceEntries.campaignName,
      campaignType: performanceEntries.campaignType,
      impressions: performanceEntries.impressions,
      clicks: performanceEntries.clicks,
      sessions: performanceEntries.sessions,
      users: performanceEntries.users,
      newUsers: performanceEntries.newUsers,
      leads: performanceEntries.leads,
      conversions: performanceEntries.conversions,
      cost: performanceEntries.cost,
      notes: performanceEntries.notes,
      engineType: performanceEntries.engineType,
      createdAt: performanceEntries.createdAt,
      updatedAt: performanceEntries.updatedAt,
    })
    .from(performanceEntries)
    .innerJoin(channels, eq(performanceEntries.channelId, channels.id))
    .where(where)
    .orderBy(performanceEntries.date);
  res.json(rows);
});

// Aggregate KPIs for performance page
router.get('/kpis', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const [row] = await db.select({
    totalImpressions: sql<number>`coalesce(sum(${performanceEntries.impressions}), 0)`,
    totalClicks: sql<number>`coalesce(sum(${performanceEntries.clicks}), 0)`,
    totalSessions: sql<number>`coalesce(sum(${performanceEntries.sessions}), 0)`,
    totalLeads: sql<number>`coalesce(sum(${performanceEntries.leads}), 0)`,
    totalConversions: sql<number>`coalesce(sum(${performanceEntries.conversions}), 0)`,
    totalSpend: sql<number>`coalesce(sum(${performanceEntries.cost}), 0)`,
  }).from(performanceEntries).where(where);
  res.json(row);
});

// Trends for performance page
router.get('/trends', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const rows = await db.select({
    date: performanceEntries.date,
    clicks: sql<number>`coalesce(sum(${performanceEntries.clicks}), 0)`,
    sessions: sql<number>`coalesce(sum(${performanceEntries.sessions}), 0)`,
    leads: sql<number>`coalesce(sum(${performanceEntries.leads}), 0)`,
    spend: sql<number>`coalesce(sum(${performanceEntries.cost}), 0)`,
  })
    .from(performanceEntries)
    .where(where)
    .groupBy(performanceEntries.date)
    .orderBy(performanceEntries.date);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(performanceEntries).where(eq(performanceEntries.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const [row] = await db.insert(performanceEntries).values(req.body).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const [row] = await db.update(performanceEntries)
    .set({ ...req.body, updatedAt: sql`datetime('now')` })
    .where(eq(performanceEntries.id, +req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(performanceEntries).where(eq(performanceEntries.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
