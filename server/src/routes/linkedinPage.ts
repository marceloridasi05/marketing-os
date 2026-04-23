import { Router } from 'express';
import { db } from '../db/index.js';
import { linkedinPage } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const GID = '339632884';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

function parseNum(v: string): number | null {
  if (!v || v.trim() === '' || v.trim() === '-') return null;
  // These are integer counts — remove both . and , as thousands separators
  const cleaned = v.replace(/R\$\s*/g, '').replace(/[.,]/g, '').trim();
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(v: string): string {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v.trim();
}

function parseCsvLine(line: string): string[] {
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
}

// GET /
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(linkedinPage.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(linkedinPage).where(where).orderBy(linkedinPage.weekStart);
  res.json(rows);
});

// POST /sync
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Row 0: header group, Row 1: column headers, Row 2: empty, Row 3+: data
    // Col B=date, C=Seguidores Totais, D=Seguidores+, E=Seguidores-,
    // F=Impressões, G=Reações, H=Comentários, I=Compartilhamentos,
    // J=Visualizações na página, K=Visitantes únicos

    const dataRows = lines.slice(3).filter(row => {
      const date = row[1]?.trim();
      return date && /^\d{2}\/\d{2}\/\d{4}$/.test(date);
    });

    let imported = 0;
    for (const row of dataRows) {
      const weekStart = parseDate(row[1]);

      const record = {
        weekStart,
        followers: parseNum(row[2] ?? ''),
        followersGained: parseNum(row[3] ?? ''),
        followersLost: parseNum(row[4] ?? ''),
        impressions: parseNum(row[5] ?? ''),
        reactions: parseNum(row[6] ?? ''),
        comments: parseNum(row[7] ?? ''),
        shares: parseNum(row[8] ?? ''),
        pageViews: parseNum(row[9] ?? ''),
        uniqueVisitors: parseNum(row[10] ?? ''),
      };

      const existing = await db.select().from(linkedinPage)
        .where(eq(linkedinPage.weekStart, weekStart)).limit(1);
      if (existing.length > 0) {
        await db.update(linkedinPage).set(record).where(eq(linkedinPage.id, existing[0].id));
      } else {
        await db.insert(linkedinPage).values(record);
      }
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('LinkedIn Page sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
