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

// Migrations: add missing columns to site_data (idempotent)
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

export const db = drizzle(sqlite, { schema });
