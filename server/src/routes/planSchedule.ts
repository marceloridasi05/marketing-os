import { Router } from 'express';
import { db } from '../db/index.js';
import { planSchedule } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const GID = '1215258222';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

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

function detectStatus(val: string): string | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  if (val.includes('✅')) return 'done';
  if (val.includes('🔄')) return 'ongoing';
  if (val.includes('❌')) return 'failed';
  return 'planned';
}

// Month columns map: col index -> { year, month }
// Row 2 (index 2) has: Objetivo, Ação, Setembro, Outubro, Novembro, Dezembro, Janeiro, Fevereiro', Março...
// Cols 2-5 = Sep-Dec 2025, Cols 6-17 = Jan-Dec 2026
const MONTH_MAP: { col: number; year: number; month: number }[] = [
  { col: 2, year: 2025, month: 9 },
  { col: 3, year: 2025, month: 10 },
  { col: 4, year: 2025, month: 11 },
  { col: 5, year: 2025, month: 12 },
  { col: 6, year: 2026, month: 1 },
  { col: 7, year: 2026, month: 2 },
  { col: 8, year: 2026, month: 3 },
  { col: 9, year: 2026, month: 4 },
  { col: 10, year: 2026, month: 5 },
  { col: 11, year: 2026, month: 6 },
  { col: 12, year: 2026, month: 7 },
  { col: 13, year: 2026, month: 8 },
  { col: 14, year: 2026, month: 9 },
  { col: 15, year: 2026, month: 10 },
  { col: 16, year: 2026, month: 11 },
  { col: 17, year: 2026, month: 12 },
];

// GET /
router.get('/', async (_req, res) => {
  const rows = await db.select().from(planSchedule).orderBy(planSchedule.objective, planSchedule.action, planSchedule.year, planSchedule.month);
  res.json(rows);
});

// POST /sync
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Data rows start at index 3 (row 4 in spreadsheet)
    // Skip header rows (0=empty, 1=year header, 2=column headers)
    // Stop at empty rows or "Estratégias" section
    let imported = 0;
    let currentObjective = '';

    for (let i = 3; i < lines.length; i++) {
      const row = lines[i];
      const obj = row[0]?.trim();
      const action = row[1]?.trim();

      // Stop at strategies section
      if (row[1]?.trim() === 'Estratégias') break;

      // Skip completely empty rows
      if (!obj && !action) {
        const hasData = MONTH_MAP.some(m => row[m.col]?.trim());
        if (!hasData) continue;
      }

      // Track current objective (some rows inherit from above)
      if (obj) currentObjective = obj;
      if (!currentObjective || !action) continue;

      // Process each month column
      for (const { col, year, month } of MONTH_MAP) {
        const val = row[col]?.trim() || '';
        const status = detectStatus(val);
        const cleanVal = val.replace(/[✅🔄❌]/g, '').trim() || null;

        // Upsert
        const existing = await db.select().from(planSchedule)
          .where(and(
            eq(planSchedule.objective, currentObjective),
            eq(planSchedule.action, action),
            eq(planSchedule.year, year),
            eq(planSchedule.month, month)
          )).limit(1);

        if (existing.length > 0) {
          await db.update(planSchedule).set({ value: cleanVal, status }).where(eq(planSchedule.id, existing[0].id));
        } else if (cleanVal || status) {
          await db.insert(planSchedule).values({
            objective: currentObjective, action, year, month, value: cleanVal, status,
          });
        }
      }
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Plan schedule sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// PUT /:id - update a single cell
router.put('/:id', async (req, res) => {
  const { value, status } = req.body;
  await db.update(planSchedule).set({ value: value || null, status: status || null }).where(eq(planSchedule.id, +req.params.id));
  const updated = await db.select().from(planSchedule).where(eq(planSchedule.id, +req.params.id));
  res.json(updated[0]);
});

export default router;
