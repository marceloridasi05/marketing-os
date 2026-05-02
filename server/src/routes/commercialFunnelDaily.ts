import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { commercialFunnelDaily } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
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

// Format yyyy-mm-dd to dd/mm/yyyy for display
function formatDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return dateStr;
}

/**
 * GET / — list all daily commercial funnel records
 * Query params: siteId, dateFrom (yyyy-mm-dd), dateTo (yyyy-mm-dd)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, dateFrom, dateTo } = req.query;
    const conditions = [];

    if (siteId) {
      conditions.push(eq(commercialFunnelDaily.siteId, parseInt(String(siteId))));
    }

    let query = db.select().from(commercialFunnelDaily);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    let rows = await query.all();

    // Apply date filtering
    if (dateFrom) {
      rows = rows.filter(row => row.date >= String(dateFrom));
    }
    if (dateTo) {
      rows = rows.filter(row => row.date <= String(dateTo));
    }

    // Sort by date descending (most recent first)
    rows.sort((a, b) => b.date.localeCompare(a.date));

    res.json(rows);
  } catch (err) {
    console.error('Error fetching daily records:', err);
    res.status(500).json({ error: 'Failed to fetch daily records' });
  }
});

/**
 * POST /sync — import from Google Sheets "Commercial Funnel Daily" tab
 * Expected CSV format:
 * Data, Leads, MQLs, SQLs, Reuniões, Oportunidades, Pipeline criado, Receita fechada, Observações
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const { sheetId, gid } = await getSheetConfig(siteId, 'commercialFunnelDaily');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
    const text = await response.text();

    // Parse CSV
    const lines = text.split('\n').map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
          continue;
        }
        current += char;
      }
      result.push(current);
      return result;
    });

    // Row 0 = headers, Row 1+ = data
    const dataRows = lines.slice(1).filter(row => {
      const date = row[0]?.trim();
      if (!date) return false;
      // Validate dd/mm/yyyy format
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return false;
      return true;
    });

    let imported = 0;
    for (const row of dataRows) {
      const date = row[0]?.trim();
      if (!date) continue;

      // Check if already exists for this site + date
      const parsedDate = parseDate(date);
      const existing = await db
        .select()
        .from(commercialFunnelDaily)
        .where(and(eq(commercialFunnelDaily.siteId, siteId), eq(commercialFunnelDaily.date, parsedDate)))
        .limit(1);

      const record = {
        siteId,
        date: parsedDate,
        leads: parseNum(row[1] ?? ''),
        mql: parseNum(row[2] ?? ''),
        sql: parseNum(row[3] ?? ''),
        meetings: parseNum(row[4] ?? ''),
        opportunities: parseNum(row[5] ?? ''),
        pipelineCreated: parseNum(row[6] ?? ''),
        revenueClosed: parseNum(row[7] ?? ''),
        notes: row[8]?.trim() || null,
      };

      if (existing.length > 0) {
        await db
          .update(commercialFunnelDaily)
          .set(record)
          .where(eq(commercialFunnelDaily.id, existing[0].id));
      } else {
        await db.insert(commercialFunnelDaily).values(record);
      }
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /manual — insert/update manually entered daily record
 * Body: { date (dd/mm/yyyy or yyyy-mm-dd), leads, mql, sql, meetings, opportunities, pipelineCreated, revenueClosed, notes }
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const { date, leads, mql, sql, meetings, opportunities, pipelineCreated, revenueClosed, notes } = req.body;

    // Validate date format
    let parsedDate: string;
    if (date.includes('/')) {
      parsedDate = parseDate(date);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      parsedDate = date;
    } else {
      return res.status(400).json({ error: 'Invalid date format (use dd/mm/yyyy or yyyy-mm-dd)' });
    }

    // Validate at least one metric is provided
    if (leads === null || leads === undefined || leads === '') {
      return res.status(400).json({ error: 'At least one metric must be provided' });
    }

    // Check if record already exists
    const existing = await db
      .select()
      .from(commercialFunnelDaily)
      .where(and(eq(commercialFunnelDaily.siteId, siteId), eq(commercialFunnelDaily.date, parsedDate)))
      .limit(1);

    const record = {
      siteId,
      date: parsedDate,
      leads: parseNum(String(leads ?? '')),
      mql: parseNum(String(mql ?? '')),
      sql: parseNum(String(sql ?? '')),
      meetings: parseNum(String(meetings ?? '')),
      opportunities: parseNum(String(opportunities ?? '')),
      pipelineCreated: parseNum(String(pipelineCreated ?? '')),
      revenueClosed: parseNum(String(revenueClosed ?? '')),
      notes: notes || null,
    };

    if (existing.length > 0) {
      await db
        .update(commercialFunnelDaily)
        .set(record)
        .where(eq(commercialFunnelDaily.id, existing[0].id));
      res.json({ success: true, id: existing[0].id, action: 'updated' });
    } else {
      const result = await db.insert(commercialFunnelDaily).values(record);
      res.json({ success: true, id: result.lastID, action: 'inserted' });
    }
  } catch (err) {
    console.error('Manual entry error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /aggregated — get aggregated data by period
 * Query params: siteId, period (daily|weekly|monthly|custom), dateFrom, dateTo
 * Returns aggregated records with conversion rates
 */
router.get('/aggregated', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    const period = String(req.query.period || 'daily');
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    let query = db.select().from(commercialFunnelDaily).where(eq(commercialFunnelDaily.siteId, siteId));
    let rows = await query.all();

    // Filter by date range
    if (dateFrom) {
      rows = rows.filter(row => row.date >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter(row => row.date <= dateTo);
    }

    // Aggregate based on period
    type AggregatedRecord = {
      period: string;
      dateStart: string;
      dateEnd: string;
      leads: number | null;
      mql: number | null;
      sql: number | null;
      meetings: number | null;
      opportunities: number | null;
      pipelineCreated: number | null;
      revenueClosed: number | null;
      leadToMqlRate: number | null;
      mqlToSqlRate: number | null;
      sqlToMeetingRate: number | null;
      meetingToOppRate: number | null;
    };

    const aggregated: AggregatedRecord[] = [];

    if (period === 'daily') {
      // Return daily records with calculated conversion rates
      for (const row of rows) {
        aggregated.push({
          period: row.date,
          dateStart: row.date,
          dateEnd: row.date,
          leads: row.leads,
          mql: row.mql,
          sql: row.sql,
          meetings: row.meetings,
          opportunities: row.opportunities,
          pipelineCreated: row.pipelineCreated,
          revenueClosed: row.revenueClosed,
          leadToMqlRate: row.leads && row.mql ? (row.mql / row.leads) * 100 : null,
          mqlToSqlRate: row.mql && row.sql ? (row.sql / row.mql) * 100 : null,
          sqlToMeetingRate: row.sql && row.meetings ? (row.meetings / row.sql) * 100 : null,
          meetingToOppRate: row.meetings && row.opportunities ? (row.opportunities / row.meetings) * 100 : null,
        });
      }
    } else if (period === 'weekly') {
      // Group by ISO week
      const byWeek: Record<string, typeof rows> = {};
      for (const row of rows) {
        const date = new Date(row.date + 'T00:00:00Z');
        const weekStart = new Date(date);
        const day = weekStart.getUTCDay();
        const diff = weekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
        weekStart.setUTCDate(diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!byWeek[weekKey]) {
          byWeek[weekKey] = [];
        }
        byWeek[weekKey].push(row);
      }

      for (const [weekKey, weekRows] of Object.entries(byWeek)) {
        const sumMetric = (key: keyof typeof rows[0]) => {
          const sum = weekRows.reduce((acc, r) => {
            const val = r[key as any];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          return sum > 0 ? sum : null;
        };

        const leads = sumMetric('leads');
        const mql = sumMetric('mql');
        const sql = sumMetric('sql');
        const meetings = sumMetric('meetings');
        const opportunities = sumMetric('opportunities');
        const pipelineCreated = sumMetric('pipelineCreated');
        const revenueClosed = sumMetric('revenueClosed');

        const weekEnd = new Date(new Date(weekKey).getTime() + 6 * 24 * 60 * 60 * 1000);

        aggregated.push({
          period: `${weekKey} to ${weekEnd.toISOString().split('T')[0]}`,
          dateStart: weekKey,
          dateEnd: weekEnd.toISOString().split('T')[0],
          leads,
          mql,
          sql,
          meetings,
          opportunities,
          pipelineCreated,
          revenueClosed,
          leadToMqlRate: leads && mql ? (mql / leads) * 100 : null,
          mqlToSqlRate: mql && sql ? (sql / mql) * 100 : null,
          sqlToMeetingRate: sql && meetings ? (meetings / sql) * 100 : null,
          meetingToOppRate: meetings && opportunities ? (opportunities / meetings) * 100 : null,
        });
      }
    } else if (period === 'monthly') {
      // Group by year-month
      const byMonth: Record<string, typeof rows> = {};
      for (const row of rows) {
        const monthKey = row.date.substring(0, 7); // YYYY-MM
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(row);
      }

      for (const [monthKey, monthRows] of Object.entries(byMonth)) {
        const sumMetric = (key: keyof typeof rows[0]) => {
          const sum = monthRows.reduce((acc, r) => {
            const val = r[key as any];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          return sum > 0 ? sum : null;
        };

        const leads = sumMetric('leads');
        const mql = sumMetric('mql');
        const sql = sumMetric('sql');
        const meetings = sumMetric('meetings');
        const opportunities = sumMetric('opportunities');
        const pipelineCreated = sumMetric('pipelineCreated');
        const revenueClosed = sumMetric('revenueClosed');

        aggregated.push({
          period: monthKey,
          dateStart: monthKey + '-01',
          dateEnd: monthKey + '-31',
          leads,
          mql,
          sql,
          meetings,
          opportunities,
          pipelineCreated,
          revenueClosed,
          leadToMqlRate: leads && mql ? (mql / leads) * 100 : null,
          mqlToSqlRate: mql && sql ? (sql / mql) * 100 : null,
          sqlToMeetingRate: sql && meetings ? (meetings / sql) * 100 : null,
          meetingToOppRate: meetings && opportunities ? (opportunities / meetings) * 100 : null,
        });
      }
    }

    // Sort by date descending
    aggregated.sort((a, b) => b.dateStart.localeCompare(a.dateStart));

    res.json({
      period,
      siteId,
      records: aggregated,
    });
  } catch (err) {
    console.error('Aggregation error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /:id — delete a daily record
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const result = await db
      .delete(commercialFunnelDaily)
      .where(and(eq(commercialFunnelDaily.id, parseInt(id)), eq(commercialFunnelDaily.siteId, siteId)))
      .returning()
      .get();

    if (!result) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true, deleted: result });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
