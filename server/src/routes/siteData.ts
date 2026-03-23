import { Router } from 'express';
import { db } from '../db/index.js';
import { siteData } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

function parseNum(v: string): number | null {
  if (!v || v.trim() === '') return null;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// GET / — list all site data
router.get('/', async (_req, res) => {
  const rows = await db.select().from(siteData).orderBy(siteData.weekStart);
  res.json(rows);
});

// POST /sync — import from Google Sheets
router.post('/sync', async (_req, res) => {
  try {
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
    const dataRows = lines.slice(2).filter(row => row[0] && row[0].trim() !== '' && row[1] && row[1].trim() !== '');

    let imported = 0;
    for (const row of dataRows) {
      const week = row[0]?.trim();
      const weekStart = row[1]?.trim();
      if (!week || !weekStart) continue;

      // Check if already exists
      const existing = await db.select().from(siteData).where(eq(siteData.week, week)).limit(1);

      const record = {
        week,
        weekStart,
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

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
