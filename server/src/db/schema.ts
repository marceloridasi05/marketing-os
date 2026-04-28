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
  // Funnel model: 'aida' | 'aarrr' | 'tofu_mofu_bofu' | 'sales_led' | custom ID
  funnelModelId: text('funnel_model_id').default('sales_led').notNull(),
  // JSON: metric key → stage override (for custom mappings on preset models)
  funnelStageMapping: text('funnel_stage_mapping'),
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
