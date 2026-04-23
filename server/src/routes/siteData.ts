import { Router } from 'express';
import { db } from '../db/index.js';
import { siteData, siteMonthly } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSheetConfig } from '../lib/sheetConfig.js';

const router = Router();

function parseNum(v: string): number | null {
  if (!v || v.trim() === '') return null;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Convert dd/mm/yyyy to yyyy-mm-dd for proper sorting
function parseDate(v: string): string {
  const trimmed = v.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return trimmed;
}

// GET / — list all site data
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(siteData.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(siteData).where(where).orderBy(siteData.weekStart);
  res.json(rows);
});

// POST /sync — import from Google Sheets
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { sheetId, gid } = await getSheetConfig(siteId, 'siteData');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
    const text = await response.text();

    // Parse CSV (simple parser for this known format)
    const lines = text.split('\n').map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
        current += char;
      }
      result.push(current);
      return result;
    });

    // Row 0 = group headers (Site Brick + Blog, Blog, Origem IA, etc)
    // Row 1 = column headers
    // Row 2+ = data
    const dataRows = lines.slice(2).filter(row => {
      const week = row[0]?.trim();
      const date = row[1]?.trim();
      if (!week || !date) return false;
      // Skip summary rows like "Total", empty weeks, or non-Semana rows
      if (!week.startsWith('Semana')) return false;
      // Skip rows without a valid date (dd/mm/yyyy)
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return false;
      return true;
    });

    let imported = 0;
    for (const row of dataRows) {
      const week = row[0]?.trim();
      const weekStart = row[1]?.trim();
      if (!week || !weekStart) continue;

      // Check if already exists
      const existing = await db.select().from(siteData).where(eq(siteData.week, week)).limit(1);

      const record = {
        week,
        weekStart: parseDate(weekStart),
        sessions: parseNum(row[2] ?? ''),
        totalUsers: parseNum(row[3] ?? ''),
        paidClicks: parseNum(row[4] ?? ''),
        unpaidSessions: parseNum(row[5] ?? ''),
        newUsers: parseNum(row[6] ?? ''),
        newUsersPct: row[7]?.trim() || null,
        leadsGenerated: parseNum(row[8] ?? ''),
        weeklyGains: parseNum(row[9] ?? ''),
        blogSessions: parseNum(row[10] ?? ''),
        blogTotalUsers: parseNum(row[11] ?? ''),
        blogNewUsers: parseNum(row[12] ?? ''),
        blogNewUsersPct: row[13]?.trim() || null,
        aiSessions: parseNum(row[14] ?? ''),
        aiTotalUsers: parseNum(row[15] ?? ''),
      };

      if (existing.length > 0) {
        await db.update(siteData).set(record).where(eq(siteData.id, existing[0].id));
      } else {
        await db.insert(siteData).values(record);
      }
      imported++;
    }

    // Also import monthly data from columns R-V (17-21)
    // Col 17=Year, 18=Month name, 19=Visualizações, 20=Sessions, 21=Active Users
    const MONTH_NAME_MAP: Record<string, number> = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12,
    };
    let currentYear = 0;
    let monthlyImported = 0;
    for (let i = 2; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length < 20) continue;
      const yearStr = row[17]?.trim();
      const monthName = row[18]?.trim();
      if (yearStr && /^\d{4}$/.test(yearStr)) currentYear = parseInt(yearStr);
      if (!monthName || !MONTH_NAME_MAP[monthName] || !currentYear) continue;
      const month = MONTH_NAME_MAP[monthName];
      const pageViews = parseNum(row[19] ?? '');
      const sessions = parseNum(row[20] ?? '');
      const activeUsers = parseNum(row[21] ?? '');
      const existing = await db.select().from(siteMonthly)
        .where(and(eq(siteMonthly.year, currentYear), eq(siteMonthly.month, month)))
        .limit(1);
      if (existing.length > 0) {
        // Always update existing records (even to null) so cleared cells are reflected
        await db.update(siteMonthly).set({ pageViews, sessions, activeUsers }).where(eq(siteMonthly.id, existing[0].id));
      } else if (pageViews != null || sessions != null || activeUsers != null) {
        // Only insert new records if at least one value is non-null
        await db.insert(siteMonthly).values({ year: currentYear, month, pageViews, sessions, activeUsers });
      } else {
        continue; // skip empty new rows
      }
      monthlyImported++;
    }

    res.json({ success: true, imported, monthlyImported });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /monthly - monthly data from planilha columns R-V
router.get('/monthly', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(siteMonthly.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(siteMonthly).where(where).orderBy(siteMonthly.year, siteMonthly.month);
  res.json(rows);
});

export default router;
