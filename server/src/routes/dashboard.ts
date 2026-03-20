import { Router } from 'express';
import { db } from '../db/index.js';
import { performanceEntries, channels } from '../db/schema.js';
import { and, gte, lte, eq, sql } from 'drizzle-orm';

const router = Router();

function buildFilters(query: Record<string, string>) {
  const conditions = [];
  if (query.startDate) conditions.push(gte(performanceEntries.date, query.startDate));
  if (query.endDate) conditions.push(lte(performanceEntries.date, query.endDate));
  if (query.channelId) conditions.push(eq(performanceEntries.channelId, +query.channelId));
  if (query.periodType) conditions.push(eq(performanceEntries.periodType, query.periodType));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Aggregate KPIs for a date range
router.get('/kpis', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const [row] = await db.select({
    totalSpend: sql<number>`coalesce(sum(${performanceEntries.cost}), 0)`,
    totalLeads: sql<number>`coalesce(sum(${performanceEntries.leads}), 0)`,
    totalSessions: sql<number>`coalesce(sum(${performanceEntries.sessions}), 0)`,
    totalConversions: sql<number>`coalesce(sum(${performanceEntries.conversions}), 0)`,
    totalUsers: sql<number>`coalesce(sum(${performanceEntries.users}), 0)`,
    totalNewUsers: sql<number>`coalesce(sum(${performanceEntries.newUsers}), 0)`,
    totalImpressions: sql<number>`coalesce(sum(${performanceEntries.impressions}), 0)`,
    totalClicks: sql<number>`coalesce(sum(${performanceEntries.clicks}), 0)`,
  }).from(performanceEntries).where(where);
  res.json(row);
});

// Channel breakdown
router.get('/by-channel', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const rows = await db.select({
    channelId: performanceEntries.channelId,
    channelName: channels.name,
    spend: sql<number>`coalesce(sum(${performanceEntries.cost}), 0)`,
    leads: sql<number>`coalesce(sum(${performanceEntries.leads}), 0)`,
    sessions: sql<number>`coalesce(sum(${performanceEntries.sessions}), 0)`,
    conversions: sql<number>`coalesce(sum(${performanceEntries.conversions}), 0)`,
    impressions: sql<number>`coalesce(sum(${performanceEntries.impressions}), 0)`,
    clicks: sql<number>`coalesce(sum(${performanceEntries.clicks}), 0)`,
  })
    .from(performanceEntries)
    .innerJoin(channels, eq(performanceEntries.channelId, channels.id))
    .where(where)
    .groupBy(performanceEntries.channelId, channels.name)
    .orderBy(sql`sum(${performanceEntries.cost}) desc`);
  res.json(rows);
});

// Trends over time (grouped by date)
router.get('/trends', async (req, res) => {
  const where = buildFilters(req.query as Record<string, string>);
  const rows = await db.select({
    date: performanceEntries.date,
    spend: sql<number>`coalesce(sum(${performanceEntries.cost}), 0)`,
    leads: sql<number>`coalesce(sum(${performanceEntries.leads}), 0)`,
    sessions: sql<number>`coalesce(sum(${performanceEntries.sessions}), 0)`,
    conversions: sql<number>`coalesce(sum(${performanceEntries.conversions}), 0)`,
    clicks: sql<number>`coalesce(sum(${performanceEntries.clicks}), 0)`,
    impressions: sql<number>`coalesce(sum(${performanceEntries.impressions}), 0)`,
  })
    .from(performanceEntries)
    .where(where)
    .groupBy(performanceEntries.date)
    .orderBy(performanceEntries.date);
  res.json(rows);
});

export default router;
