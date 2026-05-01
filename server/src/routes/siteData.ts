import { Router } from 'express';
import { db } from '../db/index.js';
import { siteData, siteMonthly, gtmMetricStatus } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSheetConfig } from '../lib/sheetConfig.js';
import { determineMetricDataStatus, calculateMetricConfidence } from '../lib/gtmDataQuality.js';

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

// Track metric status after manual entry or sync
async function trackMetricStatus(siteId: number | undefined, isManual: boolean, lastUpdated: string) {
  if (!siteId) return;

  const metrics = [
    { key: 'sessions', value: null },
    { key: 'totalUsers', value: null },
    { key: 'newUsers', value: null },
    { key: 'leadsGenerated', value: null },
    { key: 'paidClicks', value: null },
    { key: 'weeklyGains', value: null },
    { key: 'blogSessions', value: null },
    { key: 'aiSessions', value: null },
  ];

  for (const metric of metrics) {
    const dataStatus = determineMetricDataStatus(true, lastUpdated, isManual, true);
    const confidence = calculateMetricConfidence(dataStatus, lastUpdated, isManual);

    // Check if record exists
    const existing = await db.select().from(gtmMetricStatus)
      .where(and(eq(gtmMetricStatus.siteId, siteId), eq(gtmMetricStatus.metricKey, metric.key)))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db.update(gtmMetricStatus)
        .set({
          dataStatus,
          confidence,
          lastUpdated,
          isManual,
          sourceOfTruth: isManual ? 'Google Sheets' : undefined,
        })
        .where(eq(gtmMetricStatus.id, existing[0].id));
    } else {
      // Insert
      await db.insert(gtmMetricStatus).values({
        siteId,
        metricKey: metric.key,
        dataStatus,
        confidence,
        lastUpdated,
        isManual,
        sourceOfTruth: isManual ? 'Google Sheets' : undefined,
      });
    }
  }
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

      // Check if already exists (scoped to this site)
      const existingWhere = siteId
        ? and(eq(siteData.week, week), eq(siteData.siteId, siteId))
        : eq(siteData.week, week);
      const existing = await db.select().from(siteData).where(existingWhere).limit(1);

      const record = {
        siteId,
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
      const monthlyConditions = [eq(siteMonthly.year, currentYear), eq(siteMonthly.month, month)];
      if (siteId) monthlyConditions.push(eq(siteMonthly.siteId, siteId));
      const existing = await db.select().from(siteMonthly)
        .where(and(...monthlyConditions))
        .limit(1);
      if (existing.length > 0) {
        // Always update existing records (even to null) so cleared cells are reflected
        await db.update(siteMonthly).set({ siteId, pageViews, sessions, activeUsers }).where(eq(siteMonthly.id, existing[0].id));
      } else if (pageViews != null || sessions != null || activeUsers != null) {
        // Only insert new records if at least one value is non-null
        await db.insert(siteMonthly).values({ siteId, year: currentYear, month, pageViews, sessions, activeUsers });
      } else {
        continue; // skip empty new rows
      }
      monthlyImported++;
    }

    // Track metric status for data quality (from Google Sheets = not manual)
    if (siteId) {
      await trackMetricStatus(siteId, false, new Date().toISOString());
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

// POST /manual - insert/update manually entered site data
router.post('/manual', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const {
      week,
      weekStart,
      sessions,
      totalUsers,
      paidClicks,
      unpaidSessions,
      newUsers,
      newUsersPct,
      leadsGenerated,
      weeklyGains,
      blogSessions,
      blogTotalUsers,
      blogNewUsers,
      blogNewUsersPct,
      aiSessions,
      aiTotalUsers,
    } = req.body;

    // Validate required fields
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return res.status(400).json({ error: 'Invalid weekStart format (must be YYYY-MM-DD)' });
    }
    if (sessions === null || sessions === undefined) {
      return res.status(400).json({ error: 'sessions is required' });
    }
    if (totalUsers === null || totalUsers === undefined) {
      return res.status(400).json({ error: 'totalUsers is required' });
    }
    if (newUsers === null || newUsers === undefined) {
      return res.status(400).json({ error: 'newUsers is required' });
    }
    if (leadsGenerated === null || leadsGenerated === undefined) {
      return res.status(400).json({ error: 'leadsGenerated is required' });
    }

    // Check if record already exists (by weekStart + siteId)
    const existingWhere = siteId
      ? and(eq(siteData.weekStart, weekStart), eq(siteData.siteId, siteId))
      : eq(siteData.weekStart, weekStart);
    const existing = await db.select().from(siteData).where(existingWhere).limit(1);

    const record = {
      siteId,
      week: week || `Semana ${new Date(weekStart).getWeek()}`,
      weekStart,
      sessions,
      totalUsers,
      paidClicks: paidClicks || null,
      unpaidSessions: unpaidSessions || null,
      newUsers,
      newUsersPct: newUsersPct || null,
      leadsGenerated,
      weeklyGains: weeklyGains || null,
      blogSessions: blogSessions || null,
      blogTotalUsers: blogTotalUsers || null,
      blogNewUsers: blogNewUsers || null,
      blogNewUsersPct: blogNewUsersPct || null,
      aiSessions: aiSessions || null,
      aiTotalUsers: aiTotalUsers || null,
    };

    if (existing.length > 0) {
      // Update existing record
      await db.update(siteData).set(record).where(eq(siteData.id, existing[0].id));
      // Track metric status for data quality
      await trackMetricStatus(siteId, true, new Date().toISOString());
      res.json({ success: true, id: existing[0].id, action: 'updated' });
    } else {
      // Insert new record
      const result = await db.insert(siteData).values(record);
      // Track metric status for data quality
      await trackMetricStatus(siteId, true, new Date().toISOString());
      res.json({ success: true, id: result.lastID, action: 'inserted' });
    }
  } catch (err) {
    console.error('Manual entry error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /metric-status — get metric health status for a site
router.get('/metric-status', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const statuses = await db.select().from(gtmMetricStatus)
      .where(eq(gtmMetricStatus.siteId, siteId));

    res.json({
      siteId,
      metrics: statuses,
      summary: {
        total: statuses.length,
        automatic: statuses.filter(s => !s.isManual).length,
        manual: statuses.filter(s => s.isManual).length,
        highConfidence: statuses.filter(s => s.confidence === 'high').length,
        mediumConfidence: statuses.filter(s => s.confidence === 'medium').length,
        lowConfidence: statuses.filter(s => s.confidence === 'low').length,
      },
    });
  } catch (err) {
    console.error('Metric status fetch error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
