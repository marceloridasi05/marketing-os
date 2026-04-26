import { Router } from 'express';
import { db } from '../db/index.js';
import { dataMappings, sites } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

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

/**
 * GET /preview?siteId=X&gid=Y&headerRow=Z
 * Fetches the sheet tab via CSV and returns rows around the header row
 * so the client can show real column headers.
 */
router.get('/preview', async (req, res) => {
  const { siteId, gid, headerRow } = req.query;
  if (!siteId || !gid) return res.status(400).json({ error: 'siteId and gid required' });

  const [site] = await db
    .select({ sheetConfig: sites.sheetConfig })
    .from(sites)
    .where(eq(sites.id, +siteId));

  if (!site?.sheetConfig) return res.status(400).json({ error: 'Site has no sheet configured' });

  let spreadsheetId: string;
  try {
    const cfg = JSON.parse(site.sheetConfig);
    if (!cfg.spreadsheetId) return res.status(400).json({ error: 'No spreadsheetId in config' });
    spreadsheetId = cfg.spreadsheetId;
  } catch {
    return res.status(400).json({ error: 'Invalid sheet config JSON' });
  }

  const hRow = headerRow !== undefined ? +headerRow : 0;
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(CSV_URL, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const allLines = text.split('\n').map(parseCsvLine);

    // Return the header row and a few sample data rows after it
    const headerLine = allLines[hRow] ?? [];
    const sampleRows = allLines.slice(hRow + 1, hRow + 4);

    const columns = headerLine.map((h, index) => ({
      index,
      header: h.trim(),
    }));

    res.json({
      columns,
      sampleRows: sampleRows.map(r => r.map(c => c.trim())),
      totalRows: allLines.length,
    });
  } catch (err) {
    console.error('preview error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /?siteId=X  — list all mappings for a site
router.get('/', async (req, res) => {
  const { siteId } = req.query;
  const where = siteId ? eq(dataMappings.siteId, +siteId) : undefined;
  const rows = await db
    .select()
    .from(dataMappings)
    .where(where)
    .orderBy(dataMappings.dataType, dataMappings.tabName);
  res.json(rows);
});

// POST /  — create a new mapping
router.post('/', async (req, res) => {
  const { siteId, gid, tabName, dataType, headerRow, columnMappings } = req.body;
  if (!siteId || !gid || !dataType) {
    return res.status(400).json({ error: 'siteId, gid and dataType are required' });
  }
  const [row] = await db
    .insert(dataMappings)
    .values({
      siteId: +siteId,
      gid: String(gid),
      tabName: tabName ?? null,
      dataType,
      headerRow: headerRow ?? 0,
      columnMappings: typeof columnMappings === 'string'
        ? columnMappings
        : JSON.stringify(columnMappings ?? []),
    })
    .returning();
  res.status(201).json(row);
});

// PUT /:id  — update a mapping
router.put('/:id', async (req, res) => {
  const { gid, tabName, dataType, headerRow, columnMappings } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (gid !== undefined) updates.gid = String(gid);
  if (tabName !== undefined) updates.tabName = tabName;
  if (dataType !== undefined) updates.dataType = dataType;
  if (headerRow !== undefined) updates.headerRow = +headerRow;
  if (columnMappings !== undefined) {
    updates.columnMappings = typeof columnMappings === 'string'
      ? columnMappings
      : JSON.stringify(columnMappings);
  }
  const [row] = await db
    .update(dataMappings)
    .set(updates)
    .where(eq(dataMappings.id, +req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  const [row] = await db
    .delete(dataMappings)
    .where(eq(dataMappings.id, +req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
