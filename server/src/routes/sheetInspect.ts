import { Router } from 'express';

const router = Router();

// ── Section detection signatures ──────────────────────────────────────────────
// Each section type has keyword hints for the tab name AND for the CSV headers.
// A match in either is sufficient to classify the tab.

const SECTION_SIGNATURES: Record<string, { nameKw: string[]; headerKw: string[] }> = {
  siteData: {
    nameKw: ['semanal', 'semanas', 'site', 'tráfego', 'trafego', 'weekly', 'desempenho'],
    headerKw: ['semana', 'sessões', 'sessoes', 'total users', 'usuários totais', 'usuarios totais'],
  },
  adsKpis: {
    nameKw: ['kpis ads', 'ads kpis', 'mídia paga', 'midia paga', 'campanhas ads', 'anúncios', 'ads performance'],
    headerKw: ['google ads', 'impressões linkedin', 'ga_impressions', 'ctr', 'custo linkedin'],
  },
  linkedinPage: {
    nameKw: ['linkedin page', 'li page', 'página linkedin', 'pagina linkedin', 'linkedin orgânico', 'linkedin organico'],
    headerKw: ['seguidores totais', 'followers', 'seguidores+', 'seguidores -'],
  },
  planSchedule: {
    nameKw: ['plano', 'cronograma', 'schedule', 'plan ', 'planejamento'],
    headerKw: ['objetivo', 'ação', 'acao', 'etapa do funil'],
  },
  budgetItems: {
    nameKw: ['orçamento', 'orcamento', 'budget', 'capex', 'despesas mkt'],
    headerKw: ['headcount', 'ferramentas', 'eventos', 'brindes', 'terceiros'],
  },
  adsBudgets: {
    nameKw: ['verba ads', 'ads budget', 'verba mídia', 'verba paga', 'verba mensal'],
    headerKw: ['verba diária', 'verba diaria', 'verba mensal google', 'disponível', 'disponivel'],
  },
};

// ── Column detection maps per section ────────────────────────────────────────
const COLUMN_MAPS: Record<string, Record<string, string[]>> = {
  siteData: {
    sessions:        ['sessões', 'sessions', 'sessoes'],
    totalUsers:      ['usuários totais', 'total users', 'usuarios totais'],
    paidClicks:      ['cliques pagos', 'paid clicks'],
    unpaidSessions:  ['sessões orgânicas', 'sessoes organicas', 'orgânicas', 'organicas'],
    newUsers:        ['novos usuários', 'new users', 'novos usuarios'],
    newUsersPct:     ['% novos', '% new', '% novos usuários'],
    leadsGenerated:  ['leads', 'leads gerados', 'leads generated'],
    weeklyGains:     ['ganhos semanais', 'weekly gains'],
    blogSessions:    ['sessões blog', 'blog sessions', 'blog sessões'],
    blogTotalUsers:  ['usuários blog', 'blog users', 'usuários totais blog'],
    blogNewUsers:    ['novos blog', 'new users blog'],
    aiSessions:      ['sessões ia', 'ai sessions', 'origem ia', 'sessoes ia'],
    aiTotalUsers:    ['usuários ia', 'ai users', 'usuarios ia'],
  },
  adsKpis: {
    gaImpressions:        ['impressões ga', 'ga impressões', 'google impressões'],
    gaClicks:             ['cliques ga', 'ga cliques', 'google cliques'],
    gaCtr:                ['ctr'],
    gaCpcAvg:             ['cpc'],
    gaConversions:        ['conversões', 'conversoes'],
    gaCostPerConversion:  ['custo por conversão', 'cpa'],
    liImpressions:        ['impressões li', 'linkedin impressões'],
    liClicks:             ['cliques li', 'linkedin cliques'],
    liCost:               ['custo li', 'custo linkedin', 'linkedin custo'],
  },
  linkedinPage: {
    followers:        ['seguidores totais', 'total followers'],
    followersGained:  ['seguidores+', 'novos seguidores'],
    followersLost:    ['seguidores-', 'seguidores perdidos'],
    impressions:      ['impressões', 'impressoes'],
    reactions:        ['reações', 'reacoes'],
    comments:         ['comentários', 'comentarios'],
    shares:           ['compartilhamentos'],
    pageViews:        ['visualizações', 'visualizacoes', 'page views'],
    uniqueVisitors:   ['visitantes únicos', 'unique visitors'],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function detectSectionType(tabName: string, csvText: string): string | null {
  const nameLower = tabName.toLowerCase().trim();
  const lines = csvText.split('\n').slice(0, 4);
  const allCells = lines.flatMap(l => parseCsvLine(l)).map(c => c.toLowerCase().trim());
  const headerText = allCells.filter(Boolean).join(' ');

  for (const [key, sig] of Object.entries(SECTION_SIGNATURES)) {
    const nameMatch = sig.nameKw.some(kw => nameLower.includes(kw));
    const headerMatch = sig.headerKw.some(kw => headerText.includes(kw));
    if (nameMatch || headerMatch) return key;
  }
  return null;
}

function detectColumns(sectionKey: string, csvText: string): string[] {
  const colMap = COLUMN_MAPS[sectionKey];
  if (!colMap) return [];

  const lines = csvText.split('\n').slice(0, 3);
  const allCells = lines.flatMap(l => parseCsvLine(l)).map(c => c.toLowerCase().trim());
  const headerText = allCells.filter(Boolean).join(' ');

  const found: string[] = [];
  for (const [colKey, aliases] of Object.entries(colMap)) {
    if (aliases.some(a => headerText.includes(a))) found.push(colKey);
  }
  // If we found nothing specific, return all keys (backward compat — don't hide everything)
  return found.length > 0 ? found : Object.keys(colMap);
}

function extractTabsFromHtml(html: string): Array<{ gid: number; name: string }> {
  const tabs: Array<{ gid: number; name: string }> = [];
  const seen = new Set<number>();

  const add = (gid: number, name: string) => {
    if (!seen.has(gid)) { seen.add(gid); tabs.push({ gid, name }); }
  };

  // Pattern 1: "sheetId":123456,"title":"Name"  (Sheets v3 HTML)
  for (const m of html.matchAll(/"sheetId":(\d+),"title":"([^"]+)"/g)) {
    add(parseInt(m[1]), m[2]);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 2: ["Tab Name",null,0] — array format in embedded JS
  for (const m of html.matchAll(/\["([^"]{1,80})",null,(\d+)\]/g)) {
    const gid = parseInt(m[2]);
    if (!isNaN(gid)) add(gid, m[1]);
  }
  if (tabs.length > 0) return tabs;

  // Pattern 3: gid=<number> anywhere in page URLs
  for (const m of html.matchAll(/[?&#]gid=(\d+)/g)) {
    const gid = parseInt(m[1]);
    if (!isNaN(gid)) add(gid, `Aba ${gid}`);
  }

  return tabs;
}

// ── Route ──────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url?.trim()) return res.status(400).json({ error: 'URL é obrigatória' });

    // Extract spreadsheet ID
    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) return res.status(400).json({ error: 'URL do Google Sheets inválida' });
    const spreadsheetId = idMatch[1];

    // Extract gid from URL if the user pasted a link to a specific tab
    const urlGidMatch = url.match(/[?&#]gid=(\d+)/);
    const urlGid = urlGidMatch ? parseInt(urlGidMatch[1]) : null;

    // Fetch spreadsheet HTML to discover all tabs
    let rawTabs: Array<{ gid: number; name: string }> = [];
    try {
      const htmlRes = await fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingOS/1.0)' } }
      );
      if (htmlRes.ok) {
        rawTabs = extractTabsFromHtml(await htmlRes.text());
      }
    } catch { /* network error — fall through */ }

    // Fallback: try the specific gid from URL + gid=0
    if (rawTabs.length === 0) {
      rawTabs = [{ gid: 0, name: 'Planilha' }];
      if (urlGid != null && urlGid !== 0) rawTabs.push({ gid: urlGid, name: `Aba ${urlGid}` });
    }

    // Inspect each tab
    const detectedGids: Record<string, number> = {};
    const detectedSections: string[] = [];
    const columnMap: Record<string, string[]> = {};
    const tabDetails: Array<{ name: string; gid: number; type: string | null }> = [];

    for (const tab of rawTabs.slice(0, 20)) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${tab.gid}`;
        const csvRes = await fetch(csvUrl);
        if (!csvRes.ok) { tabDetails.push({ ...tab, type: null }); continue; }
        const csvText = await csvRes.text();

        const sectionType = detectSectionType(tab.name, csvText);
        tabDetails.push({ name: tab.name, gid: tab.gid, type: sectionType });

        if (sectionType && !detectedGids[sectionType]) {
          detectedGids[sectionType] = tab.gid;
          detectedSections.push(sectionType);
          columnMap[sectionType] = detectColumns(sectionType, csvText);
        }
      } catch {
        tabDetails.push({ ...tab, type: null });
      }
    }

    const config = {
      spreadsheetId,
      gids: detectedGids,
      tabs: detectedSections,     // which sections were found
      columns: columnMap,         // detected columns per section
    };

    res.json({ config, tabDetails });
  } catch (err) {
    console.error('Sheet inspect error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
