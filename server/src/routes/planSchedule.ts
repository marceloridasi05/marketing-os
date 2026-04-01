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

// POST /sync — clean re-import from spreadsheet
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Delete all existing data and re-import (fixes rename duplication)
    await db.delete(planSchedule);

    let imported = 0;
    let currentObjective = '';
    let currentAction = '';

    for (let i = 3; i < lines.length; i++) {
      const row = lines[i];
      const obj = row[0]?.trim();
      const action = row[1]?.trim();

      // Stop at strategies section
      if (action === 'Estratégias') break;

      // Check if row has any month data
      const hasData = MONTH_MAP.some(m => {
        const v = row[m.col]?.trim();
        return v && v !== '-';
      });

      // Skip completely empty rows (no obj, no action, no data)
      if (!obj && !action && !hasData) continue;

      // Track current objective (some rows inherit from above)
      if (obj) currentObjective = obj;

      // Track current action — continuation rows (no action) inherit from above
      if (action) {
        currentAction = action;
      } else if (hasData) {
        // This is a continuation row (like Cases row 2 with Allseg)
        // Keep currentObjective and currentAction from above
      } else {
        continue;
      }

      if (!currentObjective || !currentAction) continue;

      // Process each month column
      for (const { col, year, month } of MONTH_MAP) {
        const val = row[col]?.trim() || '';
        if (!val) continue;

        // Dash means "intentionally empty" — save as marker so frontend knows not to merge-fill
        if (val === '-') {
          await db.insert(planSchedule).values({
            objective: currentObjective,
            action: currentAction,
            year, month,
            value: null,
            status: 'empty', // marker: intentionally empty
          });
          imported++;
          continue;
        }

        const status = detectStatus(val);
        const cleanVal = val.replace(/[✅🔄❌]/g, '').trim() || null;

        if (cleanVal || status) {
          await db.insert(planSchedule).values({
            objective: currentObjective,
            action: currentAction,
            year, month,
            value: cleanVal,
            status,
          });
          imported++;
        }
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Plan schedule sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// PUT /:id - update a single cell
router.put('/:id', async (req, res) => {
  const { value, status, action, objective } = req.body;
  const updates: Record<string, unknown> = {};
  if (value !== undefined) updates.value = value || null;
  if (status !== undefined) updates.status = status || null;
  if (action !== undefined) updates.action = action;
  if (objective !== undefined) updates.objective = objective;
  await db.update(planSchedule).set(updates).where(eq(planSchedule.id, +req.params.id));
  const updated = await db.select().from(planSchedule).where(eq(planSchedule.id, +req.params.id));
  res.json(updated[0]);
});

// POST / - create a new cell
router.post('/', async (req, res) => {
  const { objective, action, year, month, value, status } = req.body;
  const result = await db.insert(planSchedule).values({
    objective, action, year, month, value: value || null, status: status || null,
  }).returning();
  res.json(result[0]);
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  await db.delete(planSchedule).where(eq(planSchedule.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
