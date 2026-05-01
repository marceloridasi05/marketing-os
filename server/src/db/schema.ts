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
  // Funnel model: 'aida' | 'aarrr' | 'tofu_mofu_bofu' | 'sales_led' | custom ID (LEGACY - for backward compat)
  funnelModelId: text('funnel_model_id').default('sales_led').notNull(),
  // JSON: metric key → stage override (for custom mappings on preset models)
  funnelStageMapping: text('funnel_stage_mapping'),
  // GTM Operating Model: 'b2b_sales_led' | 'b2b_abm' | 'plg' | 'smb_inbound'
  // Defaults to 'b2b_sales_led' for new sites
  gtmOperatingModelId: text('gtm_operating_model_id').default('b2b_sales_led'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  // NEW: UTM Preset Enforcement
  isStandard: integer('is_standard', { mode: 'boolean' }).default(false).notNull(), // Predefined channel
  mappingRule: text('mapping_rule'), // JSON: { source, medium } combinations that map to this channel
  allowCustomNames: integer('allow_custom_names', { mode: 'boolean' }).default(true).notNull(), // Allow campaigns outside presets
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
  // UTM Attribution
  utmCampaignId: integer('utm_campaign_id'), // References utm_campaigns(id) for attribution
  gaSessionId: text('ga_session_id'), // GA4 session ID for linking
  attributionModel: text('attribution_model'), // Which model was used for this data
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
  // Impact/Effort prioritization fields
  impactLevel: text('impact_level').default('medium').notNull(), // low, medium, high
  effortEstimate: text('effort_estimate').default('medium').notNull(), // low, medium, high
  priorityScore: real('priority_score'), // calculated: impact / effort
  confidence: text('confidence').default('medium'), // high, medium, low
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
  // Meta Ads
  metaImpressions: integer('meta_impressions'),
  metaClicks: integer('meta_clicks'),
  metaCtr: text('meta_ctr'),
  metaCpcAvg: text('meta_cpc_avg'),
  metaCost: real('meta_cost'),
  // LinkedIn Ads (aggregated)
  liImpressions: integer('li_impressions'),
  liClicks: integer('li_clicks'),
  liCost: real('li_cost'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const metaCampaignKpis = sqliteTable('meta_campaign_kpis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  week: text('week').notNull(),
  weekStart: text('week_start').notNull(),
  campaignName: text('campaign_name').notNull(),
  campaignId: text('campaign_id'),
  impressions: integer('impressions'),
  clicks: integer('clicks'),
  ctr: text('ctr'),
  cpcAvg: text('cpc_avg'),
  cost: real('cost'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const liCampaignKpis = sqliteTable('li_campaign_kpis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id'),
  week: text('week').notNull(),
  weekStart: text('week_start').notNull(),
  campaignName: text('campaign_name').notNull(),
  campaignId: text('campaign_id'),
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
  priority: text('priority').default('medium'), // low, medium, high (legacy)
  // Impact/Effort prioritization fields
  impact: text('impact').default('medium').notNull(), // low, medium, high
  effort: text('effort').default('medium').notNull(), // low, medium, high
  confidenceScore: real('confidence_score'), // 0-1 scale for confidence in impact estimate
  priorityScore: real('priority_score'), // calculated: impact / effort
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
  // Impact/Effort prioritization fields
  expectedImpact: text('expected_impact').default('medium').notNull(), // low, medium, high
  estimatedEffort: text('estimated_effort').default('medium').notNull(), // low, medium, high
  confidenceScore: real('confidence_score'), // 0-1 scale for confidence
  priorityScore: real('priority_score'), // calculated: impact / effort
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

export const monthlyBudgetAllocation = sqliteTable('monthly_budget_allocation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12 only
  googleBudget: real('google_budget'), // Per-month allocation for Google
  metaBudget: real('meta_budget'),     // Per-month allocation for Meta
  linkedinBudget: real('linkedin_budget'), // Per-month allocation for LinkedIn
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// Index for fast lookups by siteId, year, month
export const monthlyBudgetAllocationIndex = {
  name: 'idx_monthly_allocation_site_year_month',
  on: ['site_id', 'year', 'month'],
};

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

export const customFunnels = sqliteTable('custom_funnels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  name: text('name').notNull(),
  // JSON: FunnelStageConfig[] — list of stage definitions
  stages: text('stages').notNull(),
  // JSON: Record<stageId, metricKey[]> — map stages to metric keys
  stageToMetrics: text('stage_to_metrics').notNull(),
  // Whether this is the default funnel for the site
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// ── UTM Preset Enforcement: Enums ────────────────────────────────────────────

export const utmSourceEnum = sqliteTable('utm_source_enum', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  source: text('source').notNull(), // google, linkedin, facebook, direct, organic, referral, email
  displayName: text('display_name').notNull(), // "Google Ads", "LinkedIn Ads", etc.
  icon: text('icon'), // icon identifier for UI
  category: text('category'), // paid, organic, direct
  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmMediumEnum = sqliteTable('utm_medium_enum', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  medium: text('medium').notNull(), // cpc, cpm, organic, email, social, referral, direct, none
  displayName: text('display_name').notNull(), // "Cost Per Click", "Cost Per Mille", etc.
  costType: text('cost_type'), // paid, organic, direct
  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// UTM Management & Attribution Tables

export const utmCampaigns = sqliteTable('utm_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  name: text('name').notNull(), // Display name: "Q1 2026 SaaS Campaign"
  status: text('status').default('active').notNull(), // active | archived
  source: text('source').notNull(), // Enum: google, linkedin, facebook, direct, organic, referral, email
  medium: text('medium').notNull(), // Enum: cpc, cpm, organic, email, social, referral, direct, none
  campaign: text('campaign').notNull(), // Freeform: product_launch_2026
  content: text('content'), // Variant A/B: variant_a, email_1
  term: text('term'), // Keywords: saas_management
  utmUrl: text('utm_url'), // Full URL with UTMs
  baseUrl: text('base_url'), // Base URL before UTMs
  channels: text('channels'), // JSON: ['google_ads', 'linkedin']
  expectedBudget: real('expected_budget'),
  expectedSessions: integer('expected_sessions'),
  expectedLeads: integer('expected_leads'),
  expectedRevenue: real('expected_revenue'),
  // NEW: UTM Preset Enforcement - Enum Validation
  sourceEnumId: integer('source_enum_id').references(() => utmSourceEnum.id), // FK to source enum
  mediumEnumId: integer('medium_enum_id').references(() => utmMediumEnum.id), // FK to medium enum
  // NEW: Channel Mapping
  mappedChannelId: integer('mapped_channel_id').references(() => channels.id), // Standardized channel from mapping
  // NEW: Campaign Normalization
  campaignNormalized: text('campaign_normalized'), // Normalized campaign name (lowercase, slugified)
  // NEW: Duplicate Detection
  isDuplicate: integer('is_duplicate', { mode: 'boolean' }).default(false).notNull(),
  duplicateOf: integer('duplicate_of'), // FK to primary campaign if duplicate (self-reference, validated at application level)
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
  createdBy: text('created_by'),
  notes: text('notes'),
});

export const utmGaSessions = sqliteTable('utm_ga_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  gaSessionId: text('ga_session_id').notNull().unique(), // From GA4 session_id
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id), // FK to utm_campaigns
  gaUserId: text('ga_user_id'), // From GA4 user_id (anonymized)
  sessionStart: text('session_start').notNull(), // ISO timestamp from GA4
  sessionEnd: text('session_end'),
  // GA4 session metrics
  gaSource: text('ga_source'), // GA4 traffic_source.source
  gaMedium: text('ga_medium'), // GA4 traffic_source.medium
  gaCampaign: text('ga_campaign'), // GA4 traffic_source.campaign
  sessionDurationSeconds: integer('session_duration_seconds'),
  pageViews: integer('page_views'),
  eventsCount: integer('events_count'),
  // Engagement signals
  engagedSession: integer('engaged_session', { mode: 'boolean' }).default(false), // 1 if engagement_time > threshold
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmGaConversions = sqliteTable('utm_ga_conversions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id), // FK to utm_campaigns
  gaSessionId: text('ga_session_id').notNull(), // FK utm_ga_sessions
  gaUserId: text('ga_user_id'),
  // Conversion details
  eventName: text('event_name').notNull(), // lead, signup, purchase, demo_request
  eventDate: text('event_date').notNull(), // ISO timestamp
  conversionValue: real('conversion_value'), // Revenue/MRR if applicable
  currency: text('currency').default('USD').notNull(),
  // Event parameters from GA4
  eventParams: text('event_params'), // JSON: all GA4 event params
  // Attribution touchpoint
  isFirstTouch: integer('is_first_touch', { mode: 'boolean' }).default(false), // This session is first interaction
  isLastTouch: integer('is_last_touch', { mode: 'boolean' }).default(false), // This session is final before conversion
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmTouchpoints = sqliteTable('utm_touchpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  gaUserId: text('ga_user_id').notNull(), // GA4 user (tracks journey)
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id),
  touchSequence: integer('touch_sequence'), // 1st, 2nd, 3rd touch
  touchDate: text('touch_date').notNull(),
  gaSessionId: text('ga_session_id'), // Which session this touch occurred in
  // UTM values at this touch
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  touchType: text('touch_type'), // 'first' | 'middle' | 'last' | 'conversion'
  sessionsToConversion: integer('sessions_to_conversion'),
  daysToConversion: integer('days_to_conversion'),
  // For attribution calculation
  firstTouchModelCredit: real('first_touch_model_credit'),
  lastTouchModelCredit: real('last_touch_model_credit'),
  linearModelCredit: real('linear_model_credit'),
  timeDecayModelCredit: real('time_decay_model_credit'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmAttributionModels = sqliteTable('utm_attribution_models', {
  siteId: integer('site_id').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  primaryModel: text('primary_model').default('last_touch').notNull(), // first_touch | last_touch | linear | time_decay
  lookbackWindow: integer('lookback_window').default(30).notNull(), // Days to attribute back
  conversionEvents: text('conversion_events').notNull(), // JSON: ['lead', 'signup', 'purchase']
  leadToCustomerMapping: text('lead_to_customer_mapping'), // JSON: how leads become customers
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmCacAnalysis = sqliteTable('utm_cac_analysis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id),
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(),
  // Metrics by attribution model
  firstTouchSessions: integer('first_touch_sessions'),
  lastTouchSessions: integer('last_touch_sessions'),
  linearSessions: integer('linear_sessions'),
  firstTouchLeads: integer('first_touch_leads'),
  lastTouchLeads: integer('last_touch_leads'),
  linearLeads: integer('linear_leads'),
  firstTouchConversions: integer('first_touch_conversions'),
  lastTouchConversions: integer('last_touch_conversions'),
  linearConversions: integer('linear_conversions'),
  firstTouchRevenue: real('first_touch_revenue'),
  lastTouchRevenue: real('last_touch_revenue'),
  linearRevenue: real('linear_revenue'),
  spendInPeriod: real('spend_in_period'), // Ad spend, budget
  // CAC Calculations
  firstTouchCac: real('first_touch_cac'), // spend / first_touch_leads
  lastTouchCac: real('last_touch_cac'), // spend / last_touch_leads
  linearCac: real('linear_cac'), // spend / linear_leads
  // ROI Calculations
  roiFirstTouch: real('roi_first_touch'), // revenue / spend (first-touch)
  roiLastTouch: real('roi_last_touch'), // revenue / spend (last-touch)
  roiLinear: real('roi_linear'), // revenue / spend (linear)
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmLibrary = sqliteTable('utm_library', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull(),
  name: text('name').notNull(), // "Product Launch Template"
  description: text('description'),
  // Preset values
  sourcePreset: text('source_preset'), // google | linkedin | facebook
  mediumPreset: text('medium_preset'), // cpc | cpm | organic
  campaignTemplate: text('campaign_template'), // "q{quarter}_2026_launch"
  contentOptions: text('content_options'), // JSON: [variant_a, variant_b]
  termOptions: text('term_options'), // JSON: keywords list
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsed: text('last_used'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// ── UTM Preset Enforcement: Progressive Enforcement Configuration ────────────────

export const utmEnforcementConfig = sqliteTable('utm_enforcement_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Enforcement mode: 'flexible' (warn only) → 'strict' (reject non-standard)
  enforcementMode: text('enforcement_mode').default('flexible').notNull(), // flexible | moderate | strict
  // Strictness level: 0 (none) → 100 (maximum)
  strictnessLevel: integer('strictness_level').default(0).notNull(),
  // Allow free-text but warn
  allowFreeText: integer('allow_free_text', { mode: 'boolean' }).default(true).notNull(),
  // Auto-normalize detected duplicates
  autoNormalize: integer('auto_normalize', { mode: 'boolean' }).default(true).notNull(),
  // Fuzzy matching threshold (0-1): how similar values must be to suggest mapping
  fuzzyMatchThreshold: real('fuzzy_match_threshold').default(0.85).notNull(),
  // Track when strictness was last increased
  lastStrictnessIncrease: text('last_strictness_increase'),
  // Admin notes about enforcement policy
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmDataQualityMetrics = sqliteTable('utm_data_quality_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Period for measurement
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(),
  // Quality scores (0-100%)
  standardizationScore: real('standardization_score'), // % of UTMs using standard values
  attributionCoverageScore: real('attribution_coverage_score'), // % of traffic with complete UTMs
  deduplicationScore: real('deduplication_score'), // % of campaigns without duplicates
  overallDataQuality: real('overall_data_quality'), // Weighted average
  // Detailed metrics
  totalCampaigns: integer('total_campaigns').default(0),
  standardizedCampaigns: integer('standardized_campaigns').default(0),
  duplicateCampaigns: integer('duplicate_campaigns').default(0),
  uniqueSourceValues: integer('unique_source_values').default(0),
  uniqueMediumValues: integer('unique_medium_values').default(0),
  // Trend analysis
  previousScore: real('previous_score'), // Score from previous period
  scoreChange: real('score_change'), // % change from previous period
  // Recommendations
  recommendations: text('recommendations'), // JSON: [{ priority, action, expectedImpact }]
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmSuggestionCache = sqliteTable('utm_suggestion_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // User input (partial or complete)
  userInput: text('user_input').notNull(),
  inputType: text('input_type').notNull(), // 'source' | 'medium' | 'campaign'
  // Cached suggestions (avoid recalculating)
  suggestions: text('suggestions').notNull(), // JSON: [{ value, type, confidence, reason }]
  // How confident we are in these suggestions
  confidenceScore: real('confidence_score'), // 0-1
  // When this cache expires (for periodic refresh)
  expiresAt: text('expires_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const utmValueHistory = sqliteTable('utm_value_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Track how a UTM value evolves
  canonicalValue: text('canonical_value').notNull(), // The standardized version
  variants: text('variants').notNull(), // JSON: [{ value, usageCount, firstSeen, lastSeen }]
  valueType: text('value_type').notNull(), // 'source' | 'medium' | 'campaign'
  // When standardization happened
  standardizedAt: text('standardized_at'), // When this became the canonical version
  // Admin notes
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// ── UTM Preset Enforcement: Mappings & Rules ────────────────────────────────────

export const channelMappings = sqliteTable('channel_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  source: text('source').notNull(), // From utmSourceEnum
  medium: text('medium').notNull(), // From utmMediumEnum
  mappedChannelId: integer('mapped_channel_id').notNull().references(() => channels.id),
  isAutomatic: integer('is_automatic', { mode: 'boolean' }).default(true).notNull(), // System vs user-defined
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const campaignNormalizationRules = sqliteTable('campaign_normalization_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  pattern: text('pattern').notNull(), // Regex pattern: "linkedin_ads|linkedin-ads|linkedinads"
  replacement: text('replacement').notNull(), // Normalized value: "linkedin"
  description: text('description'), // "Normalize LinkedIn campaign variations"
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// ── Google Search Console Integration ────────────────────────────────────────

export const apiCredentials = sqliteTable('api_credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  provider: text('provider').notNull(), // 'google_search_console'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'), // ISO timestamp
  scope: text('scope').notNull(), // e.g., 'https://www.googleapis.com/auth/webmasters'
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const gscProperties = sqliteTable('gsc_properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  propertyUrl: text('property_url').notNull(), // e.g., 'https://example.com'
  propertyType: text('property_type').notNull(), // 'SITE' | 'URL_PREFIX'
  gcPropertyId: text('gc_property_id').notNull(), // From Google API
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncedAt: text('last_synced_at'),
  syncFrequency: integer('sync_frequency').default(86400), // seconds, default 24h
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const gscMetrics = sqliteTable('gsc_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  propertyId: integer('property_id').notNull().references(() => gscProperties.id),
  date: text('date').notNull(), // YYYY-MM-DD
  dimensionType: text('dimension_type').notNull(), // 'query' | 'page'
  dimensionValue: text('dimension_value').notNull(), // search query or URL
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  ctr: real('ctr').default(0), // 0.05 = 5%
  position: real('position').default(0), // average position (1-100+)
  periodType: text('period_type').default('daily'), // daily | weekly | monthly (aggregations)
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const gscInsights = sqliteTable('gsc_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  propertyId: integer('property_id').notNull().references(() => gscProperties.id),
  insightType: text('insight_type').notNull(), // 'high_impressions_low_ctr' | 'rank_4_10' | 'high_traffic_low_conversion' | 'ctr_drop'
  dimensionType: text('dimension_type').notNull(), // 'query' | 'page'
  dimensionValue: text('dimension_value').notNull(),
  severity: text('severity').notNull(), // 'critical' | 'warning' | 'info'
  title: text('title').notNull(),
  description: text('description').notNull(),
  metrics: text('metrics').notNull(), // JSON: { impressions, clicks, ctr, position, prevCtr?, previousPeriod? }
  recommendation: text('recommendation'),
  generatedAt: text('generated_at').default(sql`(datetime('now'))`).notNull(),
  dismissedAt: text('dismissed_at'), // NULL = active
});

// ── Unit Economics Module ──────────────────────────────────────────────────────

export const unitEconomicsConfig = sqliteTable('unit_economics_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id).unique(), // 1 per site
  // CAC configuration
  cacCostComponents: text('cac_cost_components').notNull(), // JSON: ['media_spend', 'team_salary', 'tools', 'fixed_costs']
  cacAttributionModel: text('cac_attribution_model').default('last_touch').notNull(), // 'first_touch' | 'last_touch' | 'linear'
  // LTV configuration
  ltvCalculationMethod: text('ltv_calculation_method').default('simple').notNull(), // 'simple' | 'churn_based' | 'crmdriven'
  ltvSimpleMultiplier: real('ltv_simple_multiplier').default(3.0).notNull(), // Multiplier for simple method
  ltvAssumedMonthlyChurnRate: real('ltv_assumed_monthly_churn_rate').default(0.05).notNull(), // 0.05 = 5%
  ltvGrossMarginPercent: real('ltv_gross_margin_percent').default(0.7).notNull(), // 0.7 = 70%
  // Business assumptions
  targetPaybackMonths: integer('target_payback_months').default(12).notNull(),
  segmentBy: text('segment_by').default('channel').notNull(), // 'channel' | 'campaign' | 'source'
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const ltvMetrics = sqliteTable('ltv_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Cohort identification
  periodStart: text('period_start').notNull(), // YYYY-MM-DD (start of acquisition month)
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD (end of acquisition month)
  segmentId: text('segment_id'), // channel ID, campaign ID, or source name
  segmentType: text('segment_type').notNull(), // 'channel' | 'campaign' | 'source'
  // Customer and revenue data
  customersAcquired: integer('customers_acquired').notNull(),
  initialOrderValue: real('initial_order_value'), // Average first transaction value
  totalRevenue: real('total_revenue'), // Total revenue from this cohort to date
  // LTV calculations (all three methods stored)
  simpleLtv: real('simple_ltv'), // Initial value × multiplier
  churnBasedLtv: real('churn_based_ltv'), // (ARPU × margin) / churn rate
  crmDrivenLtv: real('crm_driven_ltv'), // Observed lifetime revenue
  recommendedLtv: real('recommended_ltv'), // Which method user selected
  // Supporting metrics
  monthlyChurnRate: real('monthly_churn_rate'), // Observed churn for validation
  estimatedMonthlyArpu: real('estimated_monthly_arpu'), // Average recurring revenue
  retentionMonths: integer('retention_months'), // How long we've tracked retention
  ltvHealthScore: real('ltv_health_score'), // 0-100 scale
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const churnMetrics = sqliteTable('churn_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Period and segment
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD
  segmentId: text('segment_id'), // channel, campaign, or source
  segmentType: text('segment_type').notNull(), // 'channel' | 'campaign' | 'source'
  // Customer counts
  startingCustomers: integer('starting_customers').notNull(),
  endingCustomers: integer('ending_customers').notNull(),
  newCustomers: integer('new_customers').notNull(),
  churnedCustomers: integer('churned_customers').notNull(),
  // Calculated metrics
  churnRate: real('churn_rate').notNull(), // (start - end + new) / start
  retentionRate: real('retention_rate'), // 1 - churnRate
  churnTrend: text('churn_trend'), // 'improving' | 'stable' | 'declining'
  daysMonitored: integer('days_monitored'), // Period length
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const paybackMetrics = sqliteTable('payback_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Campaign and period
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id),
  segmentId: text('segment_id'), // Usually campaign/cohort
  segmentType: text('segment_type').notNull(), // 'campaign' | 'channel' | 'cohort'
  periodStart: text('period_start').notNull(), // YYYY-MM-DD (acquisition date)
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD (last tracked month)
  // Cost and customer acquisition
  totalAcquisitionCost: real('total_acquisition_cost').notNull(), // Total spend for acquisition
  customersAcquired: integer('customers_acquired').notNull(),
  cacForSegment: real('cac_for_segment').notNull(), // Cost per customer
  // Monthly revenue recovery (cumulative per customer)
  revenueInMonth1: real('revenue_in_month_1'), // Month 1 cumulative
  revenueInMonth2: real('revenue_in_month_2'), // Month 2 cumulative
  revenueInMonth3: real('revenue_in_month_3'),
  revenueInMonth6: real('revenue_in_month_6'),
  revenueInMonth12: real('revenue_in_month_12'),
  // Calculated payback
  paybackMonths: real('payback_months'), // Months to recover CAC
  paybackHealthStatus: text('payback_health_status'), // 'healthy' | 'warning' | 'critical'
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const unitEconomicsInsights = sqliteTable('unit_economics_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Insight classification
  insightType: text('insight_type').notNull(), // 'rising_cac' | 'falling_ltv' | 'unhealthy_ratio' | 'churn_spike' | 'long_payback'
  severity: text('severity').notNull(), // 'critical' | 'warning' | 'info'
  title: text('title').notNull(),
  description: text('description').notNull(),
  // Affected segment
  segmentId: text('segment_id'),
  segmentType: text('segment_type'), // 'channel' | 'campaign' | 'overall'
  // Metric data
  metric: text('metric').notNull(), // 'cac' | 'ltv' | 'ratio' | 'churn' | 'payback'
  currentValue: real('current_value'),
  previousValue: real('previous_value'),
  delta: real('delta'), // Percentage change or absolute
  // Recommendations (JSON)
  suggestedActions: text('suggested_actions'), // JSON: { title, description, priority, metrics_to_monitor }[]
  // Lifecycle
  detectedAt: text('detected_at').default(sql`(datetime('now'))`).notNull(),
  dismissedAt: text('dismissed_at'), // NULL = active
  resolvedAt: text('resolved_at'), // When issue was addressed
});

// ── Growth Loops Engine ────────────────────────────────────────────────────────

export const growthLoops = sqliteTable('growth_loops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  // Loop identification
  name: text('name').notNull(), // e.g., "Paid Google Ads Loop"
  description: text('description'),
  type: text('type').notNull(), // 'paid' | 'viral' | 'content' | 'sales' | 'abm' | 'event' | 'product'
  // Loop stages: input → action → output → reinvestment
  inputType: text('input_type').notNull(), // 'traffic' | 'leads' | 'users' | 'accounts'
  inputChannelId: integer('input_channel_id').references(() => channels.id), // Source channel (optional)
  actionType: text('action_type').notNull(), // 'click' | 'signup' | 'demo_request' | 'invite' | 'purchase'
  actionFunnelStage: text('action_funnel_stage'), // Which funnel stage represents the action
  outputMetricKey: text('output_metric_key').notNull(), // e.g., 'conversions', 'revenue', 'new_users'
  reinvestmentType: text('reinvestment_type'), // 'profit_reinvest' | 'fixed_budget' | 'variable_budget'
  reinvestmentPercent: real('reinvestment_percent').default(0), // % of revenue reinvested
  // Targets for this loop
  targetCac: real('target_cac'),
  targetLtv: real('target_ltv'),
  targetPaybackMonths: integer('target_payback_months'),
  targetCycleHours: integer('target_cycle_hours'), // Goal cycle time in hours
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isPriority: integer('is_priority', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const growthLoopMetrics = sqliteTable('growth_loop_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  // Period
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(),
  periodType: text('period_type').default('monthly'), // daily | weekly | monthly
  // Input stage
  inputVolume: integer('input_volume').notNull(), // Traffic, leads, users coming in
  inputCost: real('input_cost'), // Cost to acquire input
  // Action stage
  actionCount: integer('action_count').notNull(), // How many took the action
  actionConversionRate: real('action_conversion_rate'), // % of input that converted to action
  // Output stage
  outputCount: integer('output_count').notNull(), // Final customers/revenue units
  outputRevenue: real('output_revenue'), // Revenue generated from output
  outputConversionRate: real('output_conversion_rate'), // % of actions that became output
  // Cycle metrics
  cycleTimeHours: integer('cycle_time_hours'), // Average time from input to output
  // Efficiency metrics
  cac: real('cac'), // CAC specific to this loop
  ltv: real('ltv'), // LTV specific to this loop
  ltvCacRatio: real('ltv_cac_ratio'), // LTV / CAC
  paybackMonths: real('payback_months'),
  // Growth metrics
  volumeGrowthPct: real('volume_growth_pct'), // % change vs previous period
  conversionGrowthPct: real('conversion_growth_pct'), // % change in conversion rate
  cacdegradationPct: real('cac_degradation_pct'), // % change in CAC (negative = better)
  // Health assessment
  healthScore: real('health_score'), // 0-100
  strengthLevel: text('strength_level'), // 'weak' | 'medium' | 'strong'
  isBottleneck: integer('is_bottleneck', { mode: 'boolean' }).default(false),
  bottleneckStage: text('bottleneck_stage'), // 'input' | 'action' | 'output' | null
  isSelfSustaining: integer('is_self_sustaining', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const growthLoopStages = sqliteTable('growth_loop_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  // Period
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(),
  // Stage tracking
  stage: text('stage').notNull(), // 'input' | 'action' | 'output' | 'reinvestment'
  stageCount: integer('stage_count').notNull(), // Volume at this stage
  stageConversionRate: real('stage_conversion_rate'), // % that progress to next stage
  // Timing
  avgTimeInStageHours: integer('avg_time_in_stage_hours'),
  // Cost
  costAtStage: real('cost_at_stage'), // Cost allocated to this stage
  // Growth metrics
  countGrowthPct: real('count_growth_pct'), // % change in volume
  conversionRateGrowthPct: real('conversion_rate_growth_pct'), // % change in conversion
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const growthLoopInsights = sqliteTable('growth_loop_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  // Insight classification
  insightType: text('insight_type').notNull(), // 'bottleneck' | 'degradation' | 'scalability' | 'sustainability' | 'acceleration'
  severity: text('severity').notNull(), // 'critical' | 'warning' | 'info'
  title: text('title').notNull(),
  description: text('description').notNull(),
  // Affected metric
  affectedStage: text('affected_stage'), // 'input' | 'action' | 'output' | null
  metric: text('metric'), // 'conversion_rate' | 'cac' | 'cycle_time' | 'volume'
  currentValue: real('current_value'),
  previousValue: real('previous_value'),
  delta: real('delta'), // % change
  // Recommendations and potential
  suggestedActions: text('suggested_actions'), // JSON: { title, description, priority }[]
  scalabilityPotential: real('scalability_potential'), // How many X can this loop grow (1-10)
  // Lifecycle
  detectedAt: text('detected_at').default(sql`(datetime('now'))`).notNull(),
  dismissedAt: text('dismissed_at'), // NULL = active
  resolvedAt: text('resolved_at'),
});

export const growthLoopAttributions = sqliteTable('growth_loop_attributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  // Links to existing systems
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id),
  channelId: integer('channel_id').references(() => channels.id),
  funnelStageId: text('funnel_stage_id'), // Reference to funnel stage name
  // Data sources for CAC/LTV
  cacSource: text('cac_source').default('calculated'), // 'utm_attribution' | 'calculated' | 'custom'
  ltvSource: text('ltv_source').default('calculated'), // 'utm_attribution' | 'calculated' | 'crmdriven' | 'custom'
  // Attribution configuration
  attributionWindow: integer('attribution_window').default(30), // Days
  attributionModel: text('attribution_model').default('last_touch'), // 'first_touch' | 'last_touch' | 'linear'
  // Weight/portion (for splitting when loop uses multiple sources)
  attributionWeight: real('attribution_weight').default(1.0), // 0-1, sum across channels = 1.0
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

// ──────────────────────────────────────────────────────────────────────────
// GTM OPERATING MODELS - Data Quality & Metric Configuration
// ──────────────────────────────────────────────────────────────────────────

/**
 * GTM Metric Configuration
 * Tracks which metrics are configured for each GTM model + stage per site
 * Allows per-site overrides of default metric mappings
 */
export const gtmMetricConfig = sqliteTable('gtm_metric_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').references(() => sites.id),
  gtmModelId: text('gtm_model_id').notNull(), // 'b2b_sales_led' | 'b2b_abm' | 'plg' | 'smb_inbound'
  stageId: text('stage_id').notNull(), // e.g., 'awareness', 'leads', 'revenue'
  metricKey: text('metric_key').notNull(), // e.g., 'impressions', 'leads_generated'
  isRequired: integer('is_required', { mode: 'boolean' }).default(false), // Is this a required metric for the stage?
  dataSourceType: text('data_source_type').default('auto_sync'), // 'auto_sync' | 'manual_entry' | 'calculated' | 'crm_integrated'
  lastUsed: text('last_used'), // Last time this metric was referenced/used
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

/**
 * GTM Metric Status
 * Tracks the health and data availability of each metric per site
 * Supports data quality visibility: auto/manual/missing/incomplete/stale/not_mapped
 */
export const gtmMetricStatus = sqliteTable('gtm_metric_status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').references(() => sites.id),
  metricKey: text('metric_key').notNull(), // e.g., 'impressions', 'leads_generated'

  // Data Status
  dataStatus: text('data_status').default('missing'), // 'automatic' | 'manual' | 'missing' | 'incomplete' | 'stale' | 'not_mapped'

  // Data Source & Trust
  sourceOfTruth: text('source_of_truth'), // 'GA4' | 'Google Ads' | 'Meta' | 'LinkedIn' | 'Search Console' | 'Google Sheets' | 'CRM'
  lastUpdated: text('last_updated'), // Timestamp of last sync or manual entry

  // Confidence Level
  confidence: text('confidence').default('low'), // 'high' | 'medium' | 'low'
  isManual: integer('is_manual', { mode: 'boolean' }).default(false), // Is this manually entered?

  // Current Value
  value: real('value'), // Last known value

  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
