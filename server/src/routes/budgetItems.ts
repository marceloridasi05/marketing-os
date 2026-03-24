import { Router } from 'express';
import { db } from '../db/index.js';
import { budgetItems } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const GID = '554566232';
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

function parseMoney(v: string): number {
  if (!v || v.trim() === '' || v.trim() === '-' || v.trim().toLowerCase() === 'teste' || v.trim().toLowerCase() === 'tbd') return 0;
  // Remove "R$", spaces, then handle Brazilian number format: 1.234,56 -> 1234.56
  let cleaned = v.replace(/R\$\s*/g, '').trim();
  // Remove thousands separators (.) and replace decimal comma with dot
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

// Section detection based on row ranges
const SECTIONS = [
  { name: 'Headcount', startRow: 8, endRow: 9, totalRow: 10 },
  { name: 'Ferramentas', startRow: 13, endRow: 26, totalRow: 27 },
  { name: 'Eventos', startRow: 31, endRow: 47, totalRow: 48 },
  { name: 'Mídia', startRow: 51, endRow: 58, totalRow: 59 },
  { name: 'Viagens', startRow: 62, endRow: 66, totalRow: 67 },
  { name: 'Brindes & Promo', startRow: 70, endRow: 78, totalRow: 79 },
  { name: 'Terceiros', startRow: 82, endRow: 87, totalRow: 88 },
];

function getSectionForRow(rowNum: number): string | null {
  for (const s of SECTIONS) {
    if (rowNum >= s.startRow && rowNum <= s.endRow) return s.name;
  }
  return null;
}

function isTotalOrSummaryRow(rowNum: number): boolean {
  // Total rows for each section
  const totalRows = SECTIONS.map(s => s.totalRow);
  // Summary rows: 90 (Grand Total), 91 (Total budget), 92 (Budget savings), 93 (Savings acum)
  const summaryRows = [89, 90, 91, 92, 93];
  return totalRows.includes(rowNum) || summaryRows.includes(rowNum);
}

// GET / - list all budget items with optional filters
router.get('/', async (req, res) => {
  const { year, month, section, strategy, expenseType } = req.query;
  const conditions = [];
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
  const result = await db.insert(budgetItems).values({
    section, strategy, expenseType, name,
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

// POST /sync - sync from spreadsheet
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Column mapping:
    // A(0)=Strategy, B(1)=Expense Type, C(2)=Name
    // D-O(3-14) = Jan-Dec 2025
    // P(15) = Total 2025
    // Q-AB(16-27) = Jan-Dec 2026
    // AC(28) = Total 2026

    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // 1-indexed row number (header is row 1)
      const row = lines[i];
      if (!row || row.length < 3) continue;

      const name = row[2]?.trim();
      if (!name) continue;

      // Skip total and summary rows
      if (isTotalOrSummaryRow(rowNum)) {
        // But handle budget line (row 85)
        if (rowNum === 91) {
          // "Total budget" row — DO NOT sync from sheet.
          // Budget is managed locally at R$ 100.000/month (Sep/2025 – Dec/2026).
          // User adjusts manually if needed.
        }
        continue;
      }

      const section = getSectionForRow(rowNum);
      if (!section) continue;

      const strategy = row[0]?.trim() || null;
      const expenseType = row[1]?.trim() || null;

      // Process 2025 months (cols 3-14) - values are actual spend
      for (let m = 0; m < 12; m++) {
        const val = parseMoney(row[3 + m] ?? '');
        if (val !== 0) {
          await upsertBudgetItem(section, strategy, expenseType, name, 2025, m + 1, 0, val);
          imported++;
        }
      }

      // Process 2026 months (cols 16-27) - values are actual spend
      for (let m = 0; m < 12; m++) {
        const val = parseMoney(row[16 + m] ?? '');
        if (val !== 0) {
          await upsertBudgetItem(section, strategy, expenseType, name, 2026, m + 1, 0, val);
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

async function upsertBudgetItem(
  section: string, strategy: string | null, expenseType: string | null,
  name: string, year: number, month: number, planned: number, actual: number
) {
  const existing = await db.select().from(budgetItems)
    .where(and(
      eq(budgetItems.section, section),
      eq(budgetItems.name, name),
      eq(budgetItems.year, year),
      eq(budgetItems.month, month),
    )).limit(1);

  if (existing.length > 0) {
    await db.update(budgetItems).set({
      strategy, expenseType, planned, actual,
      updatedAt: new Date().toISOString(),
    }).where(eq(budgetItems.id, existing[0].id));
  } else {
    await db.insert(budgetItems).values({
      section, strategy, expenseType, name, year, month, planned, actual,
    });
  }
}

export default router;
