import { Router } from 'express';
import { db } from '../db/index.js';
import { sheetTabData, sites } from '../db/schema.js';
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

// GET /api/sheet-data?siteId=X&gid=Y
router.get('/', async (req, res) => {
  const { siteId, gid } = req.query;
  const conds = [];
  if (siteId) conds.push(eq(sheetTabData.siteId, +siteId));
  if (gid)    conds.push(eq(sheetTabData.gid, +gid));
  const rows = await db.select().from(sheetTabData)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sheetTabData.rowIndex);
  // Parse rowData JSON before sending
  res.json(rows.map(r => ({ ...r, rowData: JSON.parse(r.rowData) })));
});

// POST /api/sheet-data/sync?siteId=X&gid=Y
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const gid    = req.query.gid    ? +req.query.gid    : undefined;
    if (!siteId || gid == null) return res.status(400).json({ error: 'siteId and gid required' });

    // Get spreadsheetId + column schema from site config
    const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
    if (!site?.sheetConfig) return res.status(400).json({ error: 'Nenhuma planilha configurada para este site' });

    const cfg = JSON.parse(site.sheetConfig);
    const spreadsheetId: string = cfg.spreadsheetId;
    if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId ausente na configuração' });

    const sheetMeta = (cfg.sheets as Array<{ gid: number; headerRows: number; columns: Array<{ index: number; name: string }> }> | undefined)
      ?.find(s => s.gid === gid);
    const headerRows = sheetMeta?.headerRows ?? 1;
    const columns    = sheetMeta?.columns    ?? [];

    // Fetch CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) return res.status(400).json({ error: `Falha ao buscar planilha: ${csvRes.status}` });
    const text = await csvRes.text();

    const allLines = text.split('\n').map(parseCsvLine);
    const dataLines = allLines.slice(headerRows).filter(r => r.some(c => c.trim()));

    // Delete existing rows for this site+gid
    await db.delete(sheetTabData).where(and(eq(sheetTabData.siteId, siteId), eq(sheetTabData.gid, gid)));

    let imported = 0;
    for (let i = 0; i < dataLines.length; i++) {
      const row = dataLines[i];
      const rowData: Record<string, string> = {};

      if (columns.length > 0) {
        // Use detected column schema
        for (const col of columns) {
          const val = row[col.index]?.trim() ?? '';
          if (val) rowData[col.name] = val;
        }
      } else {
        // No schema: use positional keys
        for (let j = 0; j < row.length; j++) {
          const val = row[j]?.trim();
          if (val) rowData[`Coluna ${j + 1}`] = val;
        }
      }

      if (Object.keys(rowData).length === 0) continue;
      await db.insert(sheetTabData).values({ siteId, gid, rowIndex: i, rowData: JSON.stringify(rowData) });
      imported++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Sheet data sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
