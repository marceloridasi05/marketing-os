import { Router } from 'express';
import { db } from '../db/index.js';
import { adsBudgets, monthlyBudgetAllocation } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSheetConfig } from '../lib/sheetConfig.js';

const router = Router();

function parseMoney(v: string): number | null {
  if (!v || v.trim() === '' || v.trim() === '-') return null;
  const clean = v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = Number(clean);
  return isNaN(n) ? null : n;
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

const MONTH_MAP: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// GET /
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(adsBudgets.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(adsBudgets).where(where).orderBy(adsBudgets.year, adsBudgets.month);
  res.json(rows);
});

// POST /sync
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { sheetId, gid } = await getSheetConfig(siteId, 'adsBudgets');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    // Structure:
    // Row 0: headers (,Verba diária Google,Verba mensal Google,...)
    // Row 1: Disponível row for current/first block
    // Row 2: "2025" header row
    // Rows 3-14: Jan-Dec 2025
    // Row 15: Total/Média
    // Row 16: empty
    // Row 17: "2026" header row
    // Row 18: Disponível row for 2026
    // Rows 19+: months 2026

    // Detect if sheet has Meta Ads columns by scanning header row for "meta"
    const headerLine = lines[0] ?? [];
    const hasMeta = headerLine.some(h => h?.trim().toLowerCase().includes('meta'));

    let currentYear = 0;
    let imported = 0;

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i];
      const col0 = row[0]?.trim();

      // Detect year header
      if (/^20\d{2}$/.test(col0)) {
        currentYear = parseInt(col0);
        continue;
      }

      if (!currentYear) continue;

      // Disponível row (budget limits)
      // Sheet column layout (Meta columns are optional, detected by header):
      //   0:Label  1:dG  2:mG  3:dLI  4:mLI  [5:dMeta  6:mMeta]  5or7:dTotal  6or8:mTotalUsed  7or9:mAvail
      if (col0.toLowerCase() === 'disponível') {
        // Detect if Meta columns are present (header row check done earlier via hasMeta)
        const record = {
          siteId,
          year: currentYear,
          month: 0,
          dailyGoogle: parseMoney(row[1] ?? ''),
          monthlyGoogle: parseMoney(row[2] ?? ''),
          dailyLinkedin: parseMoney(row[3] ?? ''),
          monthlyLinkedin: parseMoney(row[4] ?? ''),
          dailyMeta: hasMeta ? parseMoney(row[5] ?? '') : null,
          monthlyMeta: hasMeta ? parseMoney(row[6] ?? '') : null,
          dailyTotal: parseMoney(row[hasMeta ? 7 : 5] ?? ''),
          monthlyTotalUsed: parseMoney(row[hasMeta ? 8 : 6] ?? ''),
          monthlyAvailable: parseMoney(row[hasMeta ? 9 : 7] ?? ''),
        };
        const dispConditions = [eq(adsBudgets.year, currentYear), eq(adsBudgets.month, 0)];
        if (siteId) dispConditions.push(eq(adsBudgets.siteId, siteId));
        const existing = await db.select().from(adsBudgets)
          .where(and(...dispConditions)).limit(1);
        if (existing.length > 0) {
          await db.update(adsBudgets).set(record).where(eq(adsBudgets.id, existing[0].id));
        } else {
          await db.insert(adsBudgets).values(record);
        }
        imported++;
        continue;
      }

      // Month row
      const monthNum = MONTH_MAP[col0.toLowerCase()];
      if (!monthNum) continue;

      const record = {
        siteId,
        year: currentYear,
        month: monthNum,
        dailyGoogle: parseMoney(row[1] ?? ''),
        monthlyGoogle: parseMoney(row[2] ?? ''),
        dailyLinkedin: parseMoney(row[3] ?? ''),
        monthlyLinkedin: parseMoney(row[4] ?? ''),
        dailyMeta: hasMeta ? parseMoney(row[5] ?? '') : null,
        monthlyMeta: hasMeta ? parseMoney(row[6] ?? '') : null,
        dailyTotal: parseMoney(row[hasMeta ? 7 : 5] ?? ''),
        monthlyTotalUsed: parseMoney(row[hasMeta ? 8 : 6] ?? ''),
        monthlyAvailable: parseMoney(row[hasMeta ? 9 : 7] ?? ''),
      };

      const monthConditions = [eq(adsBudgets.year, currentYear), eq(adsBudgets.month, monthNum)];
      if (siteId) monthConditions.push(eq(adsBudgets.siteId, siteId));
      const existing = await db.select().from(adsBudgets)
        .where(and(...monthConditions)).limit(1);
      if (existing.length > 0) {
        await db.update(adsBudgets).set(record).where(eq(adsBudgets.id, existing[0].id));
      } else {
        await db.insert(adsBudgets).values(record);
      }
      imported++;
    }

    // Optional: Parse allocation columns if they exist
    // Check if header row contains allocation columns
    const hasAllocationColumns = headerLine.some(h => {
      const lower = h?.trim().toLowerCase() || '';
      return lower.includes('verba') || lower.includes('alocad');
    });

    // If allocation columns exist, try to parse them
    if (hasAllocationColumns) {
      let currentYear = 0;
      let allocationImported = 0;

      for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        const col0 = row[0]?.trim();

        // Detect year header
        if (/^20\d{2}$/.test(col0)) {
          currentYear = parseInt(col0);
          continue;
        }

        if (!currentYear) continue;

        // Month row
        const monthNum = MONTH_MAP[col0.toLowerCase()];
        if (!monthNum) continue;

        // Try to find and parse allocation columns
        // Look for columns with 'verba' or 'alocad' in header
        let googleAlloc: number | null = null;
        let metaAlloc: number | null = null;
        let linkedinAlloc: number | null = null;

        for (let colIdx = 0; colIdx < headerLine.length; colIdx++) {
          const header = headerLine[colIdx]?.trim().toLowerCase() || '';
          const value = row[colIdx] ?? '';

          if (header.includes('verba') && header.includes('google')) {
            googleAlloc = parseMoney(value);
          } else if (header.includes('verba') && (header.includes('meta') || header.includes('facebook'))) {
            metaAlloc = parseMoney(value);
          } else if (header.includes('verba') && header.includes('linkedin')) {
            linkedinAlloc = parseMoney(value);
          }
        }

        // Only upsert if at least one allocation value is set
        if (googleAlloc != null || metaAlloc != null || linkedinAlloc != null) {
          const allocRecord = {
            siteId,
            year: currentYear,
            month: monthNum,
            googleBudget: googleAlloc,
            metaBudget: metaAlloc,
            linkedinBudget: linkedinAlloc,
          };

          const existing = await db.select()
            .from(monthlyBudgetAllocation)
            .where(
              and(
                eq(monthlyBudgetAllocation.year, currentYear),
                eq(monthlyBudgetAllocation.month, monthNum)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            // Only update if app allocation doesn't exist (app takes precedence)
            const existingAlloc = existing[0];
            if (!existingAlloc.googleBudget && !existingAlloc.metaBudget && !existingAlloc.linkedinBudget) {
              await db.update(monthlyBudgetAllocation)
                .set(allocRecord)
                .where(eq(monthlyBudgetAllocation.id, existingAlloc.id));
              allocationImported++;
            }
          } else {
            await db.insert(monthlyBudgetAllocation).values(allocRecord);
            allocationImported++;
          }
        }
      }

      if (allocationImported > 0) {
        imported += ` (${allocationImported} allocation records)`;
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Ads budgets sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /monthly-allocation - Retrieve monthly budget allocations for a year
router.get('/monthly-allocation', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const year = req.query.year ? +req.query.year : new Date().getFullYear();

    const conditions = [];
    if (siteId) conditions.push(eq(monthlyBudgetAllocation.siteId, siteId));
    conditions.push(eq(monthlyBudgetAllocation.year, year));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select()
      .from(monthlyBudgetAllocation)
      .where(where)
      .orderBy(monthlyBudgetAllocation.month);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching monthly allocations:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /monthly-allocation - Create new monthly budget allocation
router.post('/monthly-allocation', async (req, res) => {
  try {
    const { siteId, year, month, googleBudget, metaBudget, linkedinBudget } = req.body;

    // Validation
    if (!siteId || !year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Invalid input: siteId, year, and month (1-12) are required'
      });
    }

    // Check if allocation already exists for this month
    const existing = await db.select()
      .from(monthlyBudgetAllocation)
      .where(
        and(
          eq(monthlyBudgetAllocation.siteId, siteId),
          eq(monthlyBudgetAllocation.year, year),
          eq(monthlyBudgetAllocation.month, month)
        )
      )
      .limit(1);

    let result;
    if (existing.length > 0) {
      // Update existing
      result = await db.update(monthlyBudgetAllocation)
        .set({
          googleBudget: googleBudget || null,
          metaBudget: metaBudget || null,
          linkedinBudget: linkedinBudget || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(monthlyBudgetAllocation.id, existing[0].id));

      res.json({ success: true, id: existing[0].id });
    } else {
      // Insert new
      const newRecord = await db.insert(monthlyBudgetAllocation).values({
        siteId,
        year,
        month,
        googleBudget: googleBudget || null,
        metaBudget: metaBudget || null,
        linkedinBudget: linkedinBudget || null,
      });

      res.json({ success: true, id: newRecord.lastInsertRowid });
    }
  } catch (err) {
    console.error('Error creating monthly allocation:', err);
    res.status(500).json({ error: String(err) });
  }
});

// PUT /monthly-allocation/:id - Update monthly budget allocation
router.put('/monthly-allocation/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const { googleBudget, metaBudget, linkedinBudget } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Invalid allocation ID' });
    }

    await db.update(monthlyBudgetAllocation)
      .set({
        googleBudget: googleBudget !== undefined ? googleBudget : null,
        metaBudget: metaBudget !== undefined ? metaBudget : null,
        linkedinBudget: linkedinBudget !== undefined ? linkedinBudget : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(monthlyBudgetAllocation.id, id));

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error updating monthly allocation:', err);
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /monthly-allocation/:id - Clear monthly budget allocation
router.delete('/monthly-allocation/:id', async (req, res) => {
  try {
    const id = +req.params.id;

    if (!id) {
      return res.status(400).json({ error: 'Invalid allocation ID' });
    }

    // Soft delete by clearing all budget values
    await db.update(monthlyBudgetAllocation)
      .set({
        googleBudget: null,
        metaBudget: null,
        linkedinBudget: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(monthlyBudgetAllocation.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting monthly allocation:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /monthly-allocation/batch - Batch update (copy-to-all feature)
router.post('/monthly-allocation/batch', async (req, res) => {
  try {
    const { siteId, year, allocations } = req.body;

    if (!siteId || !year || !Array.isArray(allocations)) {
      return res.status(400).json({
        error: 'Invalid input: siteId, year, and allocations array required'
      });
    }

    let successCount = 0;

    for (const allocation of allocations) {
      const { month, googleBudget, metaBudget, linkedinBudget } = allocation;

      if (!month || month < 1 || month > 12) {
        continue;
      }

      // Check if allocation already exists
      const existing = await db.select()
        .from(monthlyBudgetAllocation)
        .where(
          and(
            eq(monthlyBudgetAllocation.siteId, siteId),
            eq(monthlyBudgetAllocation.year, year),
            eq(monthlyBudgetAllocation.month, month)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db.update(monthlyBudgetAllocation)
          .set({
            googleBudget: googleBudget || null,
            metaBudget: metaBudget || null,
            linkedinBudget: linkedinBudget || null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(monthlyBudgetAllocation.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(monthlyBudgetAllocation).values({
          siteId,
          year,
          month,
          googleBudget: googleBudget || null,
          metaBudget: metaBudget || null,
          linkedinBudget: linkedinBudget || null,
        });
      }

      successCount++;
    }

    res.json({ success: true, updated: successCount });
  } catch (err) {
    console.error('Error batch updating allocations:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
