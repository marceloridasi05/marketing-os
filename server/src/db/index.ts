import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Auto-create tables if they don't exist
sqlite.exec(`
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
`);

export const db = drizzle(sqlite, { schema });
