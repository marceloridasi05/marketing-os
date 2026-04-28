import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS performance_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly',
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    campaign_name TEXT,
    campaign_type TEXT,
    impressions INTEGER,
    clicks INTEGER,
    sessions INTEGER,
    users INTEGER,
    new_users INTEGER,
    leads INTEGER,
    conversions INTEGER,
    cost REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    planned_budget REAL NOT NULL DEFAULT 0,
    actual_spent REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fixed_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    monthly_cost REAL NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS initiatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    action_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    priority TEXT NOT NULL DEFAULT 'medium',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    metric TEXT NOT NULL,
    target_value REAL NOT NULL,
    actual_value REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reference_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS site_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week TEXT NOT NULL,
    week_start TEXT NOT NULL,
    sessions INTEGER,
    total_users INTEGER,
    new_users INTEGER,
    pct_new_users TEXT,
    leads_generated INTEGER,
    leads_won INTEGER,
    blog_sessions INTEGER,
    blog_total_users INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS li_campaign_kpis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week TEXT NOT NULL,
    week_start TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    funnel_stage TEXT NOT NULL,
    impressions INTEGER,
    clicks INTEGER,
    ctr TEXT,
    frequency TEXT,
    cpc_avg TEXT,
    cost REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chart_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    chart_key TEXT NOT NULL,
    x_value TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS budget_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    strategy TEXT,
    expense_type TEXT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    planned REAL NOT NULL DEFAULT 0,
    actual REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ads_kpis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week TEXT NOT NULL,
    week_start TEXT NOT NULL,
    ga_impressions INTEGER,
    ga_clicks INTEGER,
    ga_ctr TEXT,
    ga_cpc_avg TEXT,
    ga_cpm_avg TEXT,
    ga_cost_avg TEXT,
    ga_cvr TEXT,
    ga_conversions INTEGER,
    ga_cost_per_conversion TEXT,
    li_impressions INTEGER,
    li_clicks INTEGER,
    li_cost REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS site_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    page_views INTEGER,
    sessions INTEGER,
    active_users INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS linkedin_page (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    followers INTEGER,
    followers_gained INTEGER,
    followers_lost INTEGER,
    impressions INTEGER,
    reactions INTEGER,
    comments INTEGER,
    shares INTEGER,
    page_views INTEGER,
    unique_visitors INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ads_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    daily_google REAL,
    monthly_google REAL,
    daily_linkedin REAL,
    monthly_linkedin REAL,
    daily_total REAL,
    monthly_total_used REAL,
    monthly_available REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS plan_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective TEXT NOT NULL,
    action TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    value TEXT,
    status TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'fornecedor',
    contact_name TEXT,
    website TEXT,
    whatsapp TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    related_event TEXT,
    expected_outcome TEXT,
    complexity TEXT NOT NULL DEFAULT 'medium',
    category TEXT,
    status TEXT NOT NULL DEFAULT 'idea',
    executed INTEGER NOT NULL DEFAULT 0,
    executed_date TEXT,
    priority TEXT DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypothesis TEXT NOT NULL,
    expected_result TEXT,
    duration TEXT,
    start_date TEXT,
    end_date TEXT,
    channel TEXT,
    metric TEXT,
    baseline_value TEXT,
    result_value TEXT,
    learning TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    successful TEXT,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add sheet_config to sites (idempotent)
try { sqlite.exec(`ALTER TABLE sites ADD COLUMN sheet_config TEXT`); } catch { /* already exists */ }

// Migration: add client_config to sites (idempotent)
// JSON: { clientName, businessType, growthModel, mainObjectives }
try { sqlite.exec(`ALTER TABLE sites ADD COLUMN client_config TEXT`); } catch { /* already exists */ }

// Initiative metadata table (idempotent)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS initiative_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    objective TEXT NOT NULL,
    action TEXT NOT NULL,
    business_objective TEXT,
    metric_key TEXT,
    expected_outcome TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Data mappings table (idempotent)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS data_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    gid TEXT NOT NULL,
    tab_name TEXT,
    data_type TEXT NOT NULL,
    header_row INTEGER NOT NULL DEFAULT 0,
    column_mappings TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migrations: add missing columns to site_data and other tables (idempotent)
const siteDataCols = [
  'ALTER TABLE site_data ADD COLUMN paid_clicks INTEGER',
  'ALTER TABLE site_data ADD COLUMN unpaid_sessions INTEGER',
  'ALTER TABLE site_data ADD COLUMN weekly_gains INTEGER',
  'ALTER TABLE site_data ADD COLUMN blog_new_users INTEGER',
  'ALTER TABLE site_data ADD COLUMN blog_new_users_pct TEXT',
  'ALTER TABLE site_data ADD COLUMN ai_sessions INTEGER',
  'ALTER TABLE site_data ADD COLUMN ai_total_users INTEGER',
  // Drizzle schema uses new_users_pct; original CREATE TABLE used pct_new_users
  'ALTER TABLE site_data ADD COLUMN new_users_pct TEXT',
  // goals table: schema uses metric_name, original CREATE TABLE used metric
  'ALTER TABLE goals ADD COLUMN metric_name TEXT',
  'ALTER TABLE performance_entries ADD COLUMN engine_type TEXT',
  'ALTER TABLE budgets ADD COLUMN engine_type TEXT',
  'ALTER TABLE initiatives ADD COLUMN engine_type TEXT',
  // UTM Preset Enforcement: add new columns to channels
  'ALTER TABLE channels ADD COLUMN site_id INTEGER',
  'ALTER TABLE channels ADD COLUMN is_standard INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE channels ADD COLUMN mapping_rule TEXT',
  'ALTER TABLE channels ADD COLUMN allow_custom_names INTEGER NOT NULL DEFAULT 1',
  // UTM Preset Enforcement: utm_campaigns new columns (already added in CREATE TABLE IF NOT EXISTS)
];
for (const stmt of siteDataCols) {
  try { sqlite.exec(stmt); } catch { /* already exists */ }
}

// Set default sheet config on sites that don't have one yet
const NEW_SHEET_CONFIG = JSON.stringify({
  spreadsheetId: '1xUb_3f8Cn3Ngpt2AjhnkGK6_KHmecpGAmE472ftuGBE',
  gids: {
    siteData: 114212584,
    adsKpis: 495214981,
    linkedinPage: 2058764939,
    planSchedule: 1178599085,
    budgetItems: 1316516870,
    adsBudgets: 1217583003,
  },
});
// Migrations: add site_id to all data tables (idempotent)
const tablesNeedingSiteId = [
  'channels', 'performance_entries', 'budgets', 'fixed_costs',
  'initiatives', 'goals', 'budget_items', 'ads_budgets',
  'site_data', 'site_monthly', 'ads_kpis', 'li_campaign_kpis',
  'linkedin_page', 'ideas', 'experiments', 'plan_schedule',
  'suppliers', 'chart_annotations',
];
for (const table of tablesNeedingSiteId) {
  try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN site_id INTEGER`); } catch { /* already exists */ }
}

// Create default site and migrate existing data if no sites exist
const siteCount = (sqlite.prepare('SELECT COUNT(*) as count FROM sites').get() as { count: number }).count;
if (siteCount === 0) {
  sqlite.exec(`INSERT INTO sites (name) VALUES ('Site Padrão')`);
  const defaultId = (sqlite.prepare('SELECT id FROM sites LIMIT 1').get() as { id: number }).id;
  for (const table of tablesNeedingSiteId) {
    try { sqlite.exec(`UPDATE ${table} SET site_id = ${defaultId} WHERE site_id IS NULL`); } catch { /* ignore */ }
  }
}

// Set default sheet config on all sites that don't have one (runs after site creation)
try {
  sqlite.exec(`UPDATE sites SET sheet_config = '${NEW_SHEET_CONFIG}' WHERE sheet_config IS NULL`);
} catch { /* ignore */ }

// Migration: add Meta Ads columns to ads_budgets (idempotent)
try { sqlite.exec(`ALTER TABLE ads_budgets ADD COLUMN daily_meta REAL`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE ads_budgets ADD COLUMN monthly_meta REAL`); } catch { /* already exists */ }

// Migration: update budgetItems GID from old value (261492502) to correct tab (1316516870)
try {
  const sitesWithOldGid = sqlite.prepare(`SELECT id, sheet_config FROM sites WHERE sheet_config LIKE '%261492502%'`).all() as { id: number; sheet_config: string }[];
  for (const site of sitesWithOldGid) {
    const cfg = JSON.parse(site.sheet_config);
    if (cfg?.gids?.budgetItems === 261492502) {
      cfg.gids.budgetItems = 1316516870;
      sqlite.prepare(`UPDATE sites SET sheet_config = ? WHERE id = ?`).run(JSON.stringify(cfg), site.id);
    }
  }
} catch { /* ignore */ }

// Migration: add funnel model columns to sites (idempotent)
try { sqlite.exec(`ALTER TABLE sites ADD COLUMN funnel_model_id TEXT NOT NULL DEFAULT 'sales_led'`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE sites ADD COLUMN funnel_stage_mapping TEXT`); } catch { /* already exists */ }

// Migration: create custom_funnels table if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS custom_funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    stages TEXT NOT NULL,
    stage_to_metrics TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: UTM Preset Enforcement - Enum tables (idempotent)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS utm_source_enum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    source TEXT NOT NULL,
    display_name TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_medium_enum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    medium TEXT NOT NULL,
    display_name TEXT NOT NULL,
    cost_type TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: UTM Management & Attribution Tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS utm_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT NOT NULL,
    medium TEXT NOT NULL,
    campaign TEXT NOT NULL,
    content TEXT,
    term TEXT,
    utm_url TEXT,
    base_url TEXT,
    channels TEXT,
    expected_budget REAL,
    expected_sessions INTEGER,
    expected_leads INTEGER,
    expected_revenue REAL,
    source_enum_id INTEGER REFERENCES utm_source_enum(id),
    medium_enum_id INTEGER REFERENCES utm_medium_enum(id),
    mapped_channel_id INTEGER REFERENCES channels(id),
    campaign_normalized TEXT,
    is_duplicate INTEGER NOT NULL DEFAULT 0,
    duplicate_of INTEGER REFERENCES utm_campaigns(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS utm_ga_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    ga_session_id TEXT NOT NULL UNIQUE,
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    ga_user_id TEXT,
    session_start TEXT NOT NULL,
    session_end TEXT,
    ga_source TEXT,
    ga_medium TEXT,
    ga_campaign TEXT,
    session_duration_seconds INTEGER,
    page_views INTEGER,
    events_count INTEGER,
    engaged_session INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_ga_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    ga_session_id TEXT NOT NULL,
    ga_user_id TEXT,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    conversion_value REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    event_params TEXT,
    is_first_touch INTEGER NOT NULL DEFAULT 0,
    is_last_touch INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_touchpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    ga_user_id TEXT NOT NULL,
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    touch_sequence INTEGER,
    touch_date TEXT NOT NULL,
    ga_session_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    touch_type TEXT,
    sessions_to_conversion INTEGER,
    days_to_conversion INTEGER,
    first_touch_model_credit REAL,
    last_touch_model_credit REAL,
    linear_model_credit REAL,
    time_decay_model_credit REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_attribution_models (
    site_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    primary_model TEXT NOT NULL DEFAULT 'last_touch',
    lookback_window INTEGER NOT NULL DEFAULT 30,
    conversion_events TEXT NOT NULL,
    lead_to_customer_mapping TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_cac_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    first_touch_sessions INTEGER,
    last_touch_sessions INTEGER,
    linear_sessions INTEGER,
    first_touch_leads INTEGER,
    last_touch_leads INTEGER,
    linear_leads INTEGER,
    first_touch_conversions INTEGER,
    last_touch_conversions INTEGER,
    linear_conversions INTEGER,
    first_touch_revenue REAL,
    last_touch_revenue REAL,
    linear_revenue REAL,
    spend_in_period REAL,
    first_touch_cac REAL,
    last_touch_cac REAL,
    linear_cac REAL,
    roi_first_touch REAL,
    roi_last_touch REAL,
    roi_linear REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS utm_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source_preset TEXT,
    medium_preset TEXT,
    campaign_template TEXT,
    content_options TEXT,
    term_options TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS channel_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    source TEXT NOT NULL,
    medium TEXT NOT NULL,
    mapped_channel_id INTEGER NOT NULL REFERENCES channels(id),
    is_automatic INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS campaign_normalization_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS api_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    scope TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gsc_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    property_url TEXT NOT NULL,
    property_type TEXT NOT NULL,
    gc_property_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT,
    sync_frequency INTEGER NOT NULL DEFAULT 86400,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gsc_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    property_id INTEGER NOT NULL REFERENCES gsc_properties(id),
    date TEXT NOT NULL,
    dimension_type TEXT NOT NULL,
    dimension_value TEXT NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    ctr REAL NOT NULL DEFAULT 0,
    position REAL NOT NULL DEFAULT 0,
    period_type TEXT NOT NULL DEFAULT 'daily',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gsc_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    property_id INTEGER NOT NULL REFERENCES gsc_properties(id),
    insight_type TEXT NOT NULL,
    dimension_type TEXT NOT NULL,
    dimension_value TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metrics TEXT NOT NULL,
    recommendation TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    dismissed_at TEXT
  )
`);

// Indexes for GSC metrics queries
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS gsc_metrics_site_date_idx ON gsc_metrics(site_id, date)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS gsc_metrics_dimension_idx ON gsc_metrics(site_id, dimension_type, dimension_value)`); } catch { /* already exists */ }

// Migration: add UTM columns to performance_entries (idempotent)
try { sqlite.exec(`ALTER TABLE performance_entries ADD COLUMN utm_campaign_id INTEGER`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE performance_entries ADD COLUMN ga_session_id TEXT`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE performance_entries ADD COLUMN attribution_model TEXT`); } catch { /* already exists */ }

// Migration: Unit Economics Tables (idempotent)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS unit_economics_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL UNIQUE REFERENCES sites(id),
    cac_cost_components TEXT NOT NULL DEFAULT '["media_spend"]',
    cac_attribution_model TEXT NOT NULL DEFAULT 'last_touch',
    ltv_calculation_method TEXT NOT NULL DEFAULT 'simple',
    ltv_simple_multiplier REAL NOT NULL DEFAULT 3.0,
    ltv_assumed_monthly_churn_rate REAL NOT NULL DEFAULT 0.05,
    ltv_gross_margin_percent REAL NOT NULL DEFAULT 0.7,
    target_payback_months INTEGER NOT NULL DEFAULT 12,
    segment_by TEXT NOT NULL DEFAULT 'channel',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ltv_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    segment_id TEXT,
    segment_type TEXT NOT NULL,
    customers_acquired INTEGER NOT NULL,
    initial_order_value REAL,
    total_revenue REAL,
    simple_ltv REAL,
    churn_based_ltv REAL,
    crm_driven_ltv REAL,
    recommended_ltv REAL,
    monthly_churn_rate REAL,
    estimated_monthly_arpu REAL,
    retention_months INTEGER,
    ltv_health_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS churn_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    segment_id TEXT,
    segment_type TEXT NOT NULL,
    starting_customers INTEGER NOT NULL,
    ending_customers INTEGER NOT NULL,
    new_customers INTEGER NOT NULL,
    churned_customers INTEGER NOT NULL,
    churn_rate REAL NOT NULL,
    retention_rate REAL,
    churn_trend TEXT,
    days_monitored INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payback_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    segment_id TEXT,
    segment_type TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_acquisition_cost REAL NOT NULL,
    customers_acquired INTEGER NOT NULL,
    cac_for_segment REAL NOT NULL,
    revenue_in_month_1 REAL,
    revenue_in_month_2 REAL,
    revenue_in_month_3 REAL,
    revenue_in_month_6 REAL,
    revenue_in_month_12 REAL,
    payback_months REAL,
    payback_health_status TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS unit_economics_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    insight_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    segment_id TEXT,
    segment_type TEXT,
    metric TEXT NOT NULL,
    current_value REAL,
    previous_value REAL,
    delta REAL,
    suggested_actions TEXT,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    dismissed_at TEXT,
    resolved_at TEXT
  )
`);

// Indexes for Unit Economics tables
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS ltv_metrics_site_period_idx ON ltv_metrics(site_id, period_start)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS churn_metrics_site_period_idx ON churn_metrics(site_id, period_start)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS payback_metrics_site_period_idx ON payback_metrics(site_id, period_start)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS unit_economics_insights_site_type_idx ON unit_economics_insights(site_id, insight_type)`); } catch { /* already exists */ }

// Migration: Growth Loops Engine Tables (idempotent)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS growth_loops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    input_type TEXT NOT NULL,
    input_channel_id INTEGER REFERENCES channels(id),
    action_type TEXT NOT NULL,
    action_funnel_stage TEXT,
    output_metric_key TEXT NOT NULL,
    reinvestment_type TEXT,
    reinvestment_percent REAL NOT NULL DEFAULT 0,
    target_cac REAL,
    target_ltv REAL,
    target_payback_months INTEGER,
    target_cycle_hours INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS growth_loop_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    loop_id INTEGER NOT NULL REFERENCES growth_loops(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly',
    input_volume INTEGER NOT NULL,
    input_cost REAL,
    action_count INTEGER NOT NULL,
    action_conversion_rate REAL,
    output_count INTEGER NOT NULL,
    output_revenue REAL,
    output_conversion_rate REAL,
    cycle_time_hours INTEGER,
    cac REAL,
    ltv REAL,
    ltv_cac_ratio REAL,
    payback_months REAL,
    volume_growth_pct REAL,
    conversion_growth_pct REAL,
    cac_degradation_pct REAL,
    health_score REAL,
    strength_level TEXT,
    is_bottleneck INTEGER NOT NULL DEFAULT 0,
    bottleneck_stage TEXT,
    is_self_sustaining INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS growth_loop_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    loop_id INTEGER NOT NULL REFERENCES growth_loops(id),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    stage TEXT NOT NULL,
    stage_count INTEGER NOT NULL,
    stage_conversion_rate REAL,
    avg_time_in_stage_hours INTEGER,
    cost_at_stage REAL,
    count_growth_pct REAL,
    conversion_rate_growth_pct REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS growth_loop_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    loop_id INTEGER NOT NULL REFERENCES growth_loops(id),
    insight_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_stage TEXT,
    metric TEXT,
    current_value REAL,
    previous_value REAL,
    delta REAL,
    suggested_actions TEXT,
    scalability_potential REAL,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    dismissed_at TEXT,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS growth_loop_attributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    loop_id INTEGER NOT NULL REFERENCES growth_loops(id),
    utm_campaign_id INTEGER REFERENCES utm_campaigns(id),
    channel_id INTEGER REFERENCES channels(id),
    funnel_stage_id TEXT,
    cac_source TEXT NOT NULL DEFAULT 'calculated',
    ltv_source TEXT NOT NULL DEFAULT 'calculated',
    attribution_window INTEGER NOT NULL DEFAULT 30,
    attribution_model TEXT NOT NULL DEFAULT 'last_touch',
    attribution_weight REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Indexes for UTM Preset Enforcement tables
try { sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS utm_source_enum_site_source_idx ON utm_source_enum(site_id, source)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS utm_medium_enum_site_medium_idx ON utm_medium_enum(site_id, medium)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS channel_mappings_site_source_medium_idx ON channel_mappings(site_id, source, medium)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS utm_campaigns_source_enum_idx ON utm_campaigns(source_enum_id)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS utm_campaigns_medium_enum_idx ON utm_campaigns(medium_enum_id)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS utm_campaigns_mapped_channel_idx ON utm_campaigns(mapped_channel_id)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS utm_campaigns_site_duplicate_idx ON utm_campaigns(site_id, is_duplicate)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS campaign_normalization_rules_site_idx ON campaign_normalization_rules(site_id, active)`); } catch { /* already exists */ }

// Indexes for Growth Loops tables
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS growth_loop_metrics_site_loop_period_idx ON growth_loop_metrics(site_id, loop_id, period_start)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS growth_loop_stages_site_loop_period_idx ON growth_loop_stages(site_id, loop_id, period_start)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS growth_loop_insights_site_loop_idx ON growth_loop_insights(site_id, loop_id)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS growth_loop_insights_type_severity_idx ON growth_loop_insights(site_id, insight_type, severity)`); } catch { /* already exists */ }
try { sqlite.exec(`CREATE INDEX IF NOT EXISTS growth_loop_attributions_loop_idx ON growth_loop_attributions(site_id, loop_id)`); } catch { /* already exists */ }

export const db = drizzle(sqlite, { schema });
