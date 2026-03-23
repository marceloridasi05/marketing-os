import { Router } from 'express';
import { db } from '../db/index.js';
import { adsKpis } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const GID = '1053786189';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

function parseNum(v: string): number | null {
  if (!v || v.trim() === '' || v.trim() === '-') return null;
  const n = Number(v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim());
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
router.get('/', async (_req, res) => {
  const rows = await db.select().from(adsKpis).orderBy(adsKpis.weekStart);
  res.json(rows);
});

// POST /sync
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Row 0 = group headers, Row 1 = column headers, Row 2+ = data
    // Google Ads cols: 0=Cohort, 1=Início, 2=Impressões, 3=Cliques, 4=CTR, 5=CPC, 6=CPM, 7=Custo, 8=CVR, 9=Conversões, 10=Custo/Conv
    // Col 11 = empty separator
    // LinkedIn campaigns start at col 12, each block has varying widths
    // We'll aggregate LinkedIn: sum impressions, clicks, cost across all campaigns

    // Identify LinkedIn column blocks from row 0 (group headers)
    const groupHeaders = lines[0];
    const colHeaders = lines[1];

    // Find LinkedIn campaign blocks: they start after col 11
    // Each LinkedIn block has: [ID/empty], Impressões, Cliques, CTR, [Frequência], CPC Médio, Custo
    // We need to find columns with header "Impressões", "Cliques", "Custo" in LinkedIn range
    const liImpCols: number[] = [];
    const liClickCols: number[] = [];
    const liCostCols: number[] = [];

    for (let i = 12; i < colHeaders.length; i++) {
      const h = colHeaders[i]?.trim();
      if (h === 'Impressões') liImpCols.push(i);
      else if (h === 'Cliques') liClickCols.push(i);
      else if (h === 'Custo') liCostCols.push(i);
    }

    const dataRows = lines.slice(2).filter(row => {
      const week = row[0]?.trim();
      const date = row[1]?.trim();
      if (!week || !date) return false;
      if (!week.startsWith('Semana')) return false;
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return false;
      return true;
    });

    let imported = 0;
    for (const row of dataRows) {
      const week = row[0].trim();
      const weekStart = parseDate(row[1]);

      // Aggregate LinkedIn
      let liImp = 0, liClick = 0, liCostTotal = 0;
      for (const c of liImpCols) { liImp += parseNum(row[c] ?? '') ?? 0; }
      for (const c of liClickCols) { liClick += parseNum(row[c] ?? '') ?? 0; }
      for (const c of liCostCols) { liCostTotal += parseNum(row[c] ?? '') ?? 0; }

      const record = {
        week,
        weekStart,
        gaImpressions: parseNum(row[2] ?? ''),
        gaClicks: parseNum(row[3] ?? ''),
        gaCtr: row[4]?.trim() || null,
        gaCpcAvg: row[5]?.trim() || null,
        gaCpmAvg: row[6]?.trim() || null,
        gaCostAvg: row[7]?.trim() || null,
        gaCvr: row[8]?.trim() || null,
        gaConversions: parseNum(row[9] ?? ''),
        gaCostPerConversion: row[10]?.trim() || null,
        liImpressions: liImp > 0 ? liImp : null,
        liClicks: liClick > 0 ? liClick : null,
        liCost: liCostTotal > 0 ? Math.round(liCostTotal * 100) / 100 : null,
      };

      const existing = await db.select().from(adsKpis).where(eq(adsKpis.week, week)).limit(1);
      if (existing.length > 0) {
        await db.update(adsKpis).set(record).where(eq(adsKpis.id, existing[0].id));
      } else {
        await db.insert(adsKpis).values(record);
      }
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Ads sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
