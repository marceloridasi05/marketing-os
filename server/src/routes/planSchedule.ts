import { Router } from 'express';
import { db } from '../db/index.js';
import { planSchedule } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getSheetConfig } from '../lib/sheetConfig.js';

const router = Router();

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

// Base month sequence (Sep 2025 → Dec 2026). Col index is relative to firstMonthCol.
const MONTHS_SEQUENCE = [
  { year: 2025, month: 9 },
  { year: 2025, month: 10 },
  { year: 2025, month: 11 },
  { year: 2025, month: 12 },
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
  { year: 2026, month: 4 },
  { year: 2026, month: 5 },
  { year: 2026, month: 6 },
  { year: 2026, month: 7 },
  { year: 2026, month: 8 },
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
  { year: 2026, month: 12 },
];

// GET /
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(planSchedule.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(planSchedule).where(where).orderBy(planSchedule.objective, planSchedule.action, planSchedule.year, planSchedule.month);
  res.json(rows);
});

// POST /sync — clean re-import from spreadsheet
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { sheetId, gid } = await getSheetConfig(siteId, 'planSchedule');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Delete existing data for this site and re-import (fixes rename duplication)
    if (siteId) {
      await db.delete(planSchedule).where(eq(planSchedule.siteId, siteId));
    } else {
      await db.delete(planSchedule);
    }

    // Auto-detect column structure from the header row (lines[2])
    // Old format: Objetivo, Ação, [months from col 2]
    // New format: Objetivo, Etapa do Funil, Ação, [months from col 3]
    const headerRow = lines[2] || [];
    const hasFunnelCol = headerRow[1]?.trim().toLowerCase().includes('funil') ||
                         headerRow[1]?.trim().toLowerCase().includes('etapa');
    const actionCol = hasFunnelCol ? 2 : 1;
    const firstMonthCol = hasFunnelCol ? 3 : 2;

    // Build MONTH_MAP with correct column indices
    const MONTH_MAP = MONTHS_SEQUENCE.map((m, i) => ({ ...m, col: firstMonthCol + i }));

    let imported = 0;
    let currentObjective = '';
    let currentAction = '';

    for (let i = 3; i < lines.length; i++) {
      const row = lines[i];
      const obj = row[0]?.trim();
      const action = row[actionCol]?.trim();

      // Stop at strategies section
      if (action === 'Estratégias') break;

      // Check if row has any month data
      const hasData = MONTH_MAP.some(m => {
        const v = row[m.col]?.trim();
        return v && v !== '-';
      });

      // Skip completely empty rows
      if (!obj && !action && !hasData) continue;

      // Track current objective (some rows inherit from above)
      if (obj) currentObjective = obj;

      // Track current action — continuation rows inherit from above
      if (action) {
        currentAction = action;
      } else if (hasData) {
        // Continuation row — keep currentObjective and currentAction
      } else {
        continue;
      }

      if (!currentObjective || !currentAction) continue;

      // Process each month column
      for (const { col, year, month } of MONTH_MAP) {
        const val = row[col]?.trim() || '';
        if (!val) continue;

        // Dash means "intentionally empty"
        if (val === '-') {
          await db.insert(planSchedule).values({
            siteId,
            objective: currentObjective,
            action: currentAction,
            year, month,
            value: null,
            status: 'empty',
          });
          imported++;
          continue;
        }

        const status = detectStatus(val);
        const cleanVal = val.replace(/[✅🔄❌]/g, '').trim() || null;

        if (cleanVal || status) {
          await db.insert(planSchedule).values({
            siteId,
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
  const siteId = req.query.siteId ? +req.query.siteId : undefined;
  const result = await db.insert(planSchedule).values({
    siteId, objective, action, year, month, value: value || null, status: status || null,
  }).returning();
  res.json(result[0]);
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  await db.delete(planSchedule).where(eq(planSchedule.id, +req.params.id));
  res.json({ deleted: true });
});

export default router;
