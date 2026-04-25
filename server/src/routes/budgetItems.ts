import { Router } from 'express';
import { db } from '../db/index.js';
import { budgetItems } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
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

function parseMoney(v: string): number {
  if (!v || v.trim() === '' || v.trim() === '-' || v.trim().toLowerCase() === 'teste' || v.trim().toLowerCase() === 'tbd') return 0;
  // Remove "R$", spaces, then handle Brazilian number format: 1.234,56 -> 1234.56
  let cleaned = v.replace(/R\$\s*/g, '').trim();
  // Remove thousands separators (.) and replace decimal comma with dot
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

// GET / - list all budget items with optional filters
router.get('/', async (req, res) => {
  const { year, month, section, strategy, expenseType, siteId } = req.query;
  const conditions = [];
  if (siteId) conditions.push(eq(budgetItems.siteId, Number(siteId)));
  if (year) conditions.push(eq(budgetItems.year, Number(year)));
  if (month) conditions.push(eq(budgetItems.month, Number(month)));
  if (section) conditions.push(eq(budgetItems.section, String(section)));
  if (strategy) conditions.push(eq(budgetItems.strategy, String(strategy)));
  if (expenseType) conditions.push(eq(budgetItems.expenseType, String(expenseType)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(budgetItems).where(where).orderBy(budgetItems.section, budgetItems.name, budgetItems.year, budgetItems.month);
  res.json(rows);
});

// POST / - create new item
router.post('/', async (req, res) => {
  const { section, strategy, expenseType, name, year, month, planned, actual } = req.body;
  const siteId = req.query.siteId ? +req.query.siteId : undefined;
  const result = await db.insert(budgetItems).values({
    siteId, section, strategy, expenseType, name,
    year, month,
    planned: planned ?? 0,
    actual: actual ?? 0,
  }).returning();
  res.json(result[0]);
});

// PUT /:id - update item
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { section, strategy, expenseType, name, year, month, planned, actual } = req.body;
  const result = await db.update(budgetItems).set({
    section, strategy, expenseType, name,
    year, month,
    planned: planned ?? 0,
    actual: actual ?? 0,
    updatedAt: new Date().toISOString(),
  }).where(eq(budgetItems.id, id)).returning();
  res.json(result[0]);
});

// DELETE /:id - delete item
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(budgetItems).where(eq(budgetItems.id, id));
  res.json({ success: true });
});

// POST /sync - sync planned budget from "Custos e Ferramentas" sheet tab
//
// Grid layout (GID 1316516870):
//   Row 0        : "Marketing" title (ignored)
//   Row 3        : column headers — Estratégia, Tipo de Gasto, Custo com, Jan…Dec 2025, Total 2025, Jan…Dec 2026, Total 2026
//   Section rows : col[0]=section name, col[2] empty  → update currentSection
//   Sub-header   : col[0]="Estratégia" / "Estrategia" → skip
//   Total rows   : col[2].startsWith("Total ")        → skip
//   Data rows    : col[0]=strategy, col[1]=expenseType, col[2]=name
//                  col[3..14]  = planned Jan–Dec 2025
//                  col[16..27] = planned Jan–Dec 2026
//   Stop at      : col[0] starts with "Total Geral", "Budget Savings", "Realizado"
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { sheetId, gid } = await getSheetConfig(siteId, 'budgetItems');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Year → starting column index for Jan (12 monthly cols follow)
    const YEAR_OFFSETS: Array<{ year: number; startCol: number }> = [
      { year: 2025, startCol: 3 },
      { year: 2026, startCol: 16 },
    ];

    let currentSection = '';
    let imported = 0;

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length < 3) continue;

      const col0 = row[0]?.trim() ?? '';
      const col1 = row[1]?.trim() ?? '';
      const col2 = row[2]?.trim() ?? '';
      const col0Lower = col0.toLowerCase();

      // Stop when we reach grand-total / actuals area
      if (
        col0Lower.startsWith('total geral') ||
        col0Lower.startsWith('budget savings') ||
        col0Lower === 'realizado' ||
        col0Lower.startsWith('realizado ')
      ) break;

      // Section header: col[0] non-empty, col[2] blank
      if (col0 && !col2) {
        currentSection = col0;
        continue;
      }

      // Sub-header row inside a section (repeats "Estratégia / Tipo de Gasto / Custo com")
      if (col0Lower === 'estratégia' || col0Lower === 'estrategia') continue;

      // Row-level total (e.g. "Total Headcount", "Total Ferramentas")
      if (col2.toLowerCase().startsWith('total ')) continue;

      // Skip rows with no item name
      if (!col2) continue;

      // ── Data row ──────────────────────────────────────────────────
      const strategy = col0 || null;
      const expenseType = col1 || null;
      const name = col2;
      const section = currentSection || 'Outros';

      for (const { year, startCol } of YEAR_OFFSETS) {
        for (let m = 0; m < 12; m++) {
          const planned = parseMoney(row[startCol + m] ?? '');
          if (planned === 0) continue; // skip empty/zero months
          await upsertBudgetItemPlanned(siteId, section, strategy, expenseType, name, year, m + 1, planned);
          imported++;
        }
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Budget items sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Upsert a budget item updating only the planned value.
 * Existing actual values are preserved; new rows get actual=0.
 */
async function upsertBudgetItemPlanned(
  siteId: number | undefined,
  section: string, strategy: string | null, expenseType: string | null,
  name: string, year: number, month: number, planned: number,
) {
  const conditions = [
    eq(budgetItems.section, section),
    eq(budgetItems.name, name),
    eq(budgetItems.year, year),
    eq(budgetItems.month, month),
  ];
  if (siteId) conditions.push(eq(budgetItems.siteId, siteId));
  const existing = await db.select().from(budgetItems)
    .where(and(...conditions)).limit(1);

  if (existing.length > 0) {
    await db.update(budgetItems).set({
      strategy, expenseType, planned,
      updatedAt: new Date().toISOString(),
    }).where(eq(budgetItems.id, existing[0].id));
  } else {
    await db.insert(budgetItems).values({
      siteId, section, strategy, expenseType, name, year, month, planned, actual: 0,
    });
  }
}

export default router;
