import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { dailySpend } from '../db/schema.js';
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

/**
 * GET / — list all daily spend records
 * Query params: siteId, dateFrom (yyyy-mm-dd), dateTo (yyyy-mm-dd)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { siteId, dateFrom, dateTo } = req.query;
    const conditions = [];

    if (siteId) {
      conditions.push(eq(dailySpend.siteId, parseInt(String(siteId))));
    }

    let query = db.select().from(dailySpend);

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
    console.error('Error fetching daily spend records:', err);
    res.status(500).json({ error: 'Failed to fetch daily spend records' });
  }
});

/**
 * POST /sync — import from Google Sheets "Daily Spend" tab
 * Expected CSV format:
 * Date, Channel, Campaign, Source, Medium, Spend, Clicks, Impressions, Conversions
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const { sheetId, gid } = await getSheetConfig(siteId, 'dailySpend');
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
      const channel = row[1]?.trim() || null;
      const campaign = row[2]?.trim() || null;

      const existing = await db
        .select()
        .from(dailySpend)
        .where(and(
          eq(dailySpend.siteId, siteId),
          eq(dailySpend.date, parsedDate),
          channel ? eq(dailySpend.channel, channel) : undefined
        ).filter(Boolean) as any)
        .limit(1);

      const record = {
        siteId,
        date: parsedDate,
        channel: channel,
        campaign: campaign,
        source: row[3]?.trim() || null,
        medium: row[4]?.trim() || null,
        spend: parseNum(row[5] ?? ''),
        clicks: row[6] ? parseInt(row[6]) || null : null,
        impressions: row[7] ? parseInt(row[7]) || null : null,
        conversions: row[8] ? parseInt(row[8]) || null : null,
        notes: 'Google Sheets sync',
      };

      if (existing.length > 0) {
        await db
          .update(dailySpend)
          .set(record)
          .where(eq(dailySpend.id, existing[0].id));
      } else {
        await db.insert(dailySpend).values(record);
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
 * POST /manual — insert/update manually entered daily spend record
 * Body: { date (dd/mm/yyyy or yyyy-mm-dd), channel, campaign, source, medium, spend, clicks, impressions, conversions, notes }
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const { date, channel, campaign, source, medium, spend, clicks, impressions, conversions, notes } = req.body;

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
    if (!spend && !clicks && !impressions && !conversions) {
      return res.status(400).json({ error: 'At least one metric must be provided (spend, clicks, impressions, or conversions)' });
    }

    // Check if record already exists
    const existing = await db
      .select()
      .from(dailySpend)
      .where(and(
        eq(dailySpend.siteId, siteId),
        eq(dailySpend.date, parsedDate),
        channel ? eq(dailySpend.channel, channel) : undefined
      ).filter(Boolean) as any)
      .limit(1);

    const record = {
      siteId,
      date: parsedDate,
      channel: channel || null,
      campaign: campaign || null,
      source: source || null,
      medium: medium || null,
      spend: spend ? parseNum(String(spend)) : null,
      clicks: clicks ? parseInt(String(clicks)) || null : null,
      impressions: impressions ? parseInt(String(impressions)) || null : null,
      conversions: conversions ? parseInt(String(conversions)) || null : null,
      notes: notes || 'Manual entry',
    };

    if (existing.length > 0) {
      await db
        .update(dailySpend)
        .set(record)
        .where(eq(dailySpend.id, existing[0].id));
      res.json({ success: true, id: existing[0].id, action: 'updated' });
    } else {
      const result = await db.insert(dailySpend).values(record);
      res.json({ success: true, id: result.lastID, action: 'inserted' });
    }
  } catch (err) {
    console.error('Manual entry error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /aggregated — get aggregated spend data by period
 * Query params: siteId, period (daily|weekly|monthly|custom), dateFrom, dateTo
 * Returns aggregated spend with totals
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

    let query = db.select().from(dailySpend).where(eq(dailySpend.siteId, siteId));
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
      channel?: string;
      totalSpend: number | null;
      totalClicks: number | null;
      totalImpressions: number | null;
      totalConversions: number | null;
      cpc?: number | null;
      cpm?: number | null;
    };

    const aggregated: AggregatedRecord[] = [];

    if (period === 'daily') {
      // Return daily records as-is
      for (const row of rows) {
        aggregated.push({
          period: row.date,
          dateStart: row.date,
          dateEnd: row.date,
          channel: row.channel || undefined,
          totalSpend: row.spend,
          totalClicks: row.clicks,
          totalImpressions: row.impressions,
          totalConversions: row.conversions,
          cpc: row.spend && row.clicks ? row.spend / row.clicks : null,
          cpm: row.spend && row.impressions ? (row.spend / row.impressions) * 1000 : null,
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
        const sumMetric = (key: 'spend' | 'clicks' | 'impressions' | 'conversions') => {
          const sum = weekRows.reduce((acc, r) => {
            const val = r[key];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          return sum > 0 ? sum : null;
        };

        const totalSpend = sumMetric('spend');
        const totalClicks = sumMetric('clicks');
        const totalImpressions = sumMetric('impressions');
        const totalConversions = sumMetric('conversions');

        const weekEnd = new Date(new Date(weekKey).getTime() + 6 * 24 * 60 * 60 * 1000);

        aggregated.push({
          period: `${weekKey} to ${weekEnd.toISOString().split('T')[0]}`,
          dateStart: weekKey,
          dateEnd: weekEnd.toISOString().split('T')[0],
          totalSpend,
          totalClicks,
          totalImpressions,
          totalConversions,
          cpc: totalSpend && totalClicks ? totalSpend / totalClicks : null,
          cpm: totalSpend && totalImpressions ? (totalSpend / totalImpressions) * 1000 : null,
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
        const sumMetric = (key: 'spend' | 'clicks' | 'impressions' | 'conversions') => {
          const sum = monthRows.reduce((acc, r) => {
            const val = r[key];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          return sum > 0 ? sum : null;
        };

        const totalSpend = sumMetric('spend');
        const totalClicks = sumMetric('clicks');
        const totalImpressions = sumMetric('impressions');
        const totalConversions = sumMetric('conversions');

        aggregated.push({
          period: monthKey,
          dateStart: monthKey + '-01',
          dateEnd: monthKey + '-31',
          totalSpend,
          totalClicks,
          totalImpressions,
          totalConversions,
          cpc: totalSpend && totalClicks ? totalSpend / totalClicks : null,
          cpm: totalSpend && totalImpressions ? (totalSpend / totalImpressions) * 1000 : null,
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
 * DELETE /:id — delete a daily spend record
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteId = req.query.siteId ? parseInt(String(req.query.siteId)) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const result = await db
      .delete(dailySpend)
      .where(and(eq(dailySpend.id, parseInt(id)), eq(dailySpend.siteId, siteId)))
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
