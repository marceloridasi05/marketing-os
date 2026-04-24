import { Router } from 'express';

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnMeta {
  index: number;
  name: string;
  type: 'text' | 'number' | 'date' | 'percentage' | 'currency';
}

export interface SheetMeta {
  gid: number;
  name: string;
  /** Matched to a known specialised section type, or null for generic tabs */
  type: string | null;
  headerRows: number;
  columns: ColumnMeta[];
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

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

// ── Column type detection ─────────────────────────────────────────────────────

function detectColumnType(samples: string[]): ColumnMeta['type'] {
  const nonEmpty = samples.map(s => s.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return 'text';

  if (nonEmpty.every(v => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))) return 'date';
  if (nonEmpty.every(v => v.endsWith('%'))) return 'percentage';

  const hasCurrency = nonEmpty.some(v => v.includes('R$') || v.includes('$'));
  const numericValues = nonEmpty.map(v =>
    Number(v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim())
  );
  if (numericValues.every(n => !isNaN(n))) {
    return hasCurrency ? 'currency' : 'number';
  }

  return 'text';
}

// ── Tab structure analysis ────────────────────────────────────────────────────

function analyzeTab(csvText: string): { headerRows: number; columns: ColumnMeta[] } {
  const lines = csvText.split('\n').map(parseCsvLine);
  // Filter out completely empty lines
  const nonEmpty = lines.filter(r => r.some(c => c.trim()));
  if (nonEmpty.length === 0) return { headerRows: 1, columns: [] };

  // Detect header rows:
  // If row 0 has far fewer non-empty cells than row 1, row 0 is a "group header" row
  const row0NonEmpty = nonEmpty[0]?.filter(c => c.trim()).length ?? 0;
  const row1NonEmpty = nonEmpty[1]?.filter(c => c.trim()).length ?? 0;
  const headerRows = (nonEmpty.length >= 2 && row1NonEmpty > row0NonEmpty * 1.4) ? 2 : 1;

  // Use the last header row for actual column names
  const headerRow = nonEmpty[headerRows - 1] ?? nonEmpty[0];
  const dataRows = nonEmpty.slice(headerRows);

  const columns: ColumnMeta[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    const name = headerRow[i]?.trim();
    if (!name) continue; // skip unnamed columns
    const samples = dataRows.slice(0, 20).map(r => r[i] ?? '');
    columns.push({ index: i, name, type: detectColumnType(samples) });
  }

  return { headerRows, columns };
}

// ── Known section classification (optional enhancement) ───────────────────────
// These patterns try to match a tab to a specialised page that already exists.
// If nothing matches the tab is still included as a generic data section.

const KNOWN_TYPES: Array<{ key: string; namePat: RegExp; colPat: RegExp }> = [
  {
    key: 'siteData',
    namePat: /semanal|tráfego|trafego|desempenho.site|weekly/i,
    colPat:  /semana|sessões|sessoes/i,
  },
  {
    key: 'adsKpis',
    namePat: /kpis.ads|ads.kpis|mídia.paga|midia.paga|campanhas.ads/i,
    colPat:  /google.ads|impressões.linkedin|li.impressões/i,
  },
  {
    key: 'linkedinPage',
    namePat: /linkedin.page|li.page|página.linkedin/i,
    colPat:  /seguidores.totais|total.followers/i,
  },
  {
    key: 'planSchedule',
    namePat: /plano|cronograma|schedule|planejamento/i,
    colPat:  /objetivo|etapa.do.funil/i,
  },
  {
    key: 'budgetItems',
    namePat: /orçamento|orcamento|budget(?!.ads)/i,
    colPat:  /headcount|ferramentas|brindes/i,
  },
  {
    key: 'adsBudgets',
    namePat: /verba.ads|ads.budget|verba.mídia|verba.paga/i,
    colPat:  /verba.diária|verba.diaria|disponível|disponivel/i,
  },
];

function classifyTab(tabName: string, columns: ColumnMeta[]): string | null {
  const colText = columns.map(c => c.name).join(' ');
  for (const { key, namePat, colPat } of KNOWN_TYPES) {
    if (namePat.test(tabName) || colPat.test(colText)) return key;
  }
  return null;
}

// ── HTML tab extraction ───────────────────────────────────────────────────────

function extractTabsFromHtml(html: string): Array<{ gid: number; name: string }> {
  const tabs: Array<{ gid: number; name: string }> = [];
  const seen = new Set<number>();
  const add = (gid: number, name: string) => {
    if (!seen.has(gid)) { seen.add(gid); tabs.push({ gid, name }); }
  };

  // Pattern 1: "sheetId":123,"title":"Name"
  for (const m of html.matchAll(/"sheetId":(\d+),"title":"([^"]+)"/g)) add(+m[1], m[2]);
  if (tabs.length > 0) return tabs;

  // Pattern 2: ["Tab Name",null,0] embedded arrays
  for (const m of html.matchAll(/\["([^"]{1,80})",null,(\d+)\]/g)) {
    const gid = +m[2];
    if (!isNaN(gid)) add(gid, m[1]);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 3: gid= query params
  for (const m of html.matchAll(/[?&#]gid=(\d+)/g)) {
    const gid = +m[1];
    if (!isNaN(gid)) add(gid, `Aba ${gid}`);
  }

  return tabs;
}

// ── Route ──────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url?.trim()) return res.status(400).json({ error: 'URL é obrigatória' });

    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return res.status(400).json({ error: 'URL do Google Sheets inválida' });
    const spreadsheetId = idMatch[1];

    // The gid the user linked to specifically (if any)
    const urlGid = url.match(/[?&#]gid=(\d+)/)?.[1];

    // ── Discover tabs ──────────────────────────────────────────────────────
    let rawTabs: Array<{ gid: number; name: string }> = [];
    try {
      const htmlRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingOS/1.0)' } }
      );
      if (htmlRes.ok) rawTabs = extractTabsFromHtml(await htmlRes.text());
    } catch { /* fall through */ }

    // Fallbacks if HTML parsing yielded nothing
    if (rawTabs.length === 0) {
      rawTabs.push({ gid: 0, name: 'Planilha' });
      if (urlGid && urlGid !== '0') rawTabs.push({ gid: +urlGid, name: `Aba ${urlGid}` });
    }

    // ── Analyse each tab ───────────────────────────────────────────────────
    const sheets: SheetMeta[] = [];
    const usedTypes = new Set<string>();

    for (const tab of rawTabs.slice(0, 25)) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${tab.gid}`;
        const csvRes = await fetch(csvUrl);
        if (!csvRes.ok) continue;

        const csvText = await csvRes.text();
        // Skip tabs with almost no data (single-cell sheets, error pages, etc.)
        if (csvText.split('\n').filter(l => l.trim()).length < 2) continue;

        const { headerRows, columns } = analyzeTab(csvText);
        if (columns.length === 0) continue;

        // Classify — allow each specialised type to match only once
        const rawType = classifyTab(tab.name, columns);
        const type = rawType && !usedTypes.has(rawType) ? rawType : null;
        if (type) usedTypes.add(type);

        sheets.push({ gid: tab.gid, name: tab.name, type, headerRows, columns });
      } catch {
        // skip problematic tabs silently
      }
    }

    // ── Build legacy gids/tabs for backward compat ─────────────────────────
    const gids: Record<string, number> = {};
    const tabs: string[] = [];
    for (const s of sheets) {
      if (s.type) { gids[s.type] = s.gid; tabs.push(s.type); }
    }

    const config = { spreadsheetId, gids, tabs, sheets };
    res.json({ config, sheets });
  } catch (err) {
    console.error('Sheet inspect error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
