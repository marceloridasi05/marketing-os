import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const performanceEntries = sqliteTable('performance_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  periodType: text('period_type').notNull(),
  channelId: integer('channel_id').references(() => channels.id).notNull(),
  campaignName: text('campaign_name'),
  campaignType: text('campaign_type'),
  impressions: integer('impressions'),
  clicks: integer('clicks'),
  sessions: integer('sessions'),
  users: integer('users'),
  newUsers: integer('new_users'),
  leads: integer('leads'),
  conversions: integer('conversions'),
  cost: real('cost'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  channelId: integer('channel_id').references(() => channels.id).notNull(),
  plannedBudget: real('planned_budget').notNull(),
  actualSpent: real('actual_spent').default(0).notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const fixedCosts = sqliteTable('fixed_costs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  monthlyCost: real('monthly_cost').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const initiatives = sqliteTable('initiatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  objective: text('objective').notNull(),
  actionType: text('action_type').notNull(),
  channel: text('channel').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status').default('planned').notNull(),
  priority: text('priority').default('medium').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const referenceItems = sqliteTable('reference_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // campaign_type, objective, action_type
  value: text('value').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const siteData = sqliteTable('site_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  week: text('week').notNull(),
  weekStart: text('week_start').notNull(),
  // Site Brick + Blog
  sessions: integer('sessions'),
  totalUsers: integer('total_users'),
  paidClicks: integer('paid_clicks'),
  unpaidSessions: integer('unpaid_sessions'),
  newUsers: integer('new_users'),
  newUsersPct: text('new_users_pct'),
  leadsGenerated: integer('leads_generated'),
  weeklyGains: integer('weekly_gains'),
  // Blog
  blogSessions: integer('blog_sessions'),
  blogTotalUsers: integer('blog_total_users'),
  blogNewUsers: integer('blog_new_users'),
  blogNewUsersPct: text('blog_new_users_pct'),
  // Origem IA
  aiSessions: integer('ai_sessions'),
  aiTotalUsers: integer('ai_total_users'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const adsKpis = sqliteTable('ads_kpis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  week: text('week').notNull(),
  weekStart: text('week_start').notNull(),
  // Google Ads
  gaImpressions: integer('ga_impressions'),
  gaClicks: integer('ga_clicks'),
  gaCtr: text('ga_ctr'),
  gaCpcAvg: text('ga_cpc_avg'),
  gaCpmAvg: text('ga_cpm_avg'),
  gaCostAvg: text('ga_cost_avg'),
  gaCvr: text('ga_cvr'),
  gaConversions: integer('ga_conversions'),
  gaCostPerConversion: text('ga_cost_per_conversion'),
  // LinkedIn Ads (aggregated)
  liImpressions: integer('li_impressions'),
  liClicks: integer('li_clicks'),
  liCost: real('li_cost'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const liCampaignKpis = sqliteTable('li_campaign_kpis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  week: text('week').notNull(),
  weekStart: text('week_start').notNull(),
  campaignName: text('campaign_name').notNull(),
  accountType: text('account_type').notNull(),
  funnelStage: text('funnel_stage').notNull(),
  impressions: integer('impressions'),
  clicks: integer('clicks'),
  ctr: text('ctr'),
  frequency: text('frequency'),
  cpcAvg: text('cpc_avg'),
  cost: real('cost'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  metricName: text('metric_name').notNull(),
  targetValue: real('target_value').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
