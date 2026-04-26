import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const sites = sqliteTable('sites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url'),
  // JSON: { spreadsheetId, gids: { siteData, adsKpis, linkedinPage, planSchedule, budgetItems, adsBudgets } }
  sheetConfig: text('sheet_config'),
  // JSON: { clientName, businessType, growthModel, mainObjectives }
  clientConfig: text('client_config'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const performanceEntries = sqliteTable('performance_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
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
  engineType: text('engine_type'), // SMB | ENTERPRISE | null
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  channelId: integer('channel_id').references(() => channels.id).notNull(),
  plannedBudget: real('planned_budget').notNull(),
  actualSpent: real('actual_spent').default(0).notNull(),
  notes: text('notes'),
  engineType: text('engine_type'), // SMB | ENTERPRISE | null
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const fixedCosts = sqliteTable('fixed_costs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
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

export const siteMonthly = sqliteTable('site_monthly', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  pageViews: integer('page_views'),
  sessions: integer('sessions'),
  activeUsers: integer('active_users'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const planSchedule = sqliteTable('plan_schedule', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  objective: text('objective').notNull(),
  action: text('action').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  value: text('value'), // text content for that cell
  status: text('status'), // done, ongoing, failed, planned, null
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const initiatives = sqliteTable('initiatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
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
  engineType: text('engine_type'), // SMB | ENTERPRISE | null
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
  siteId: integer('site_id'),
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

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  type: text('type').default('fornecedor').notNull(), // 'fornecedor' or 'tool'
  contactName: text('contact_name'),
  website: text('website'),
  whatsapp: text('whatsapp'),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const adsKpis = sqliteTable('ads_kpis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
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
  siteId: integer('site_id'),
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

export const linkedinPage = sqliteTable('linkedin_page', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  weekStart: text('week_start').notNull(),
  followers: integer('followers'),
  followersGained: integer('followers_gained'),
  followersLost: integer('followers_lost'),
  impressions: integer('impressions'),
  reactions: integer('reactions'),
  comments: integer('comments'),
  shares: integer('shares'),
  pageViews: integer('page_views'),
  uniqueVisitors: integer('unique_visitors'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: text('target_date'),
  relatedEvent: text('related_event'),
  expectedOutcome: text('expected_outcome'),
  complexity: text('complexity').default('medium').notNull(), // low, medium, high
  category: text('category'), // Conteúdo, Evento, Campanha, Produto, Parceria, Outro
  status: text('status').default('idea').notNull(), // idea, planned, executed, discarded
  executed: integer('executed', { mode: 'boolean' }).default(false).notNull(),
  executedDate: text('executed_date'),
  priority: text('priority').default('medium'), // low, medium, high
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const experiments = sqliteTable('experiments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  hypothesis: text('hypothesis').notNull(),
  expectedResult: text('expected_result'),
  duration: text('duration'), // ex: "2 semanas", "1 mês"
  startDate: text('start_date'),
  endDate: text('end_date'),
  channel: text('channel'), // Google Ads, LinkedIn, Site, etc
  metric: text('metric'), // CPL, CTR, Conversão, etc
  baselineValue: text('baseline_value'),
  resultValue: text('result_value'),
  learning: text('learning'),
  status: text('status').default('planned').notNull(), // planned, running, completed
  successful: text('successful'), // yes, no, inconclusive, null
  category: text('category'), // Aquisição, Conversão, Retenção, Branding, Outro
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  metricName: text('metric_name').notNull(),
  targetValue: real('target_value').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const budgetItems = sqliteTable('budget_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  section: text('section').notNull(),
  strategy: text('strategy'),
  expenseType: text('expense_type'),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  planned: real('planned').default(0).notNull(),
  actual: real('actual').default(0).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const adsBudgets = sqliteTable('ads_budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12, or 0 for "Disponível" row
  dailyGoogle: real('daily_google'),
  monthlyGoogle: real('monthly_google'),
  dailyLinkedin: real('daily_linkedin'),
  monthlyLinkedin: real('monthly_linkedin'),
  dailyMeta: real('daily_meta'),
  monthlyMeta: real('monthly_meta'),
  dailyTotal: real('daily_total'),
  monthlyTotalUsed: real('monthly_total_used'),
  monthlyAvailable: real('monthly_available'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const initiativeMeta = sqliteTable('initiative_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  objective: text('objective').notNull(),
  action: text('action').notNull(),
  /** The strategic "why" — e.g. "Increase qualified pipeline by 30%" */
  businessObjective: text('business_objective'),
  /** Key from metricClassification registry — e.g. "leads", "sessions" */
  metricKey: text('metric_key'),
  /** Quantified expected result — e.g. "+20% leads by Q3" */
  expectedOutcome: text('expected_outcome'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const dataMappings = sqliteTable('data_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  // GID of the spreadsheet tab
  gid: text('gid').notNull(),
  // Human-readable tab label (user-defined)
  tabName: text('tab_name'),
  // One of: budget, metrics, ads, linkedin, plan, experiments, custom
  dataType: text('data_type').notNull(),
  // 0-indexed row that contains column headers
  headerRow: integer('header_row').default(0).notNull(),
  // JSON: ColumnMapping[] — { index, header, meaning, year?, month? }
  columnMappings: text('column_mappings').default('[]').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const chartAnnotations = sqliteTable('chart_annotations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  page: text('page').notNull(),
  chartKey: text('chart_key').notNull(),
  xValue: text('x_value').notNull(),
  comment: text('comment').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});
