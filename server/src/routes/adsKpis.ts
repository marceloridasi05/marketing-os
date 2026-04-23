import { Router } from 'express';
import { db } from '../db/index.js';
import { adsKpis, liCampaignKpis } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

const SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const GID = '1053786189';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

function parseNum(v: string): number | null {
  if (!v || v.trim() === '' || v.trim() === '-') return null;
  const n = Number(v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim());
  return isNaN(n) ? null : n;
}

function parseDate(v: string): string {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v.trim();
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

// Map campaign names to account type + funnel stage
interface CampaignMeta { accountType: string; funnelStage: string; }
function classifyCampaign(name: string): CampaignMeta {
  const n = name.toLowerCase();
  let accountType = 'Outros';
  let funnelStage = 'other';

  if (n.includes('100% frias')) accountType = '100% Frias';
  else if (n.includes('esfriaram') || n.includes('hipr')) accountType = 'Esfriaram (HiPr)';
  else if (n.includes('seguradora')) accountType = 'Seguradoras + Cargos';
  else if (n.includes('localiza')) accountType = 'Localiza + Cargos';
  else if (n.includes('porto vida') || n.includes('abm')) accountType = 'ABM Porto Vida';

  if (n.includes('awareness')) funnelStage = 'awareness';
  else if (n.includes('interest')) funnelStage = 'interest';
  else if (n.includes('decision')) funnelStage = 'decision';
  else funnelStage = 'other';

  return { accountType, funnelStage };
}

// GET / - all ads kpis
router.get('/', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(adsKpis.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(adsKpis).where(where).orderBy(adsKpis.weekStart);
  res.json(rows);
});

// GET /linkedin - all linkedin campaign kpis
router.get('/linkedin', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(liCampaignKpis.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(liCampaignKpis).where(where).orderBy(liCampaignKpis.weekStart);
  res.json(rows);
});

// POST /sync
router.post('/sync', async (_req, res) => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    const groupHeaders = lines[0];
    const colHeaders = lines[1];

    // Identify LinkedIn campaign blocks from group headers
    // Each campaign has a name in the group header row, spanning multiple columns
    interface CampaignBlock {
      name: string;
      meta: CampaignMeta;
      impCol: number | null;
      clickCol: number | null;
      ctrCol: number | null;
      freqCol: number | null;
      cpcCol: number | null;
      costCol: number | null;
    }

    const campaigns: CampaignBlock[] = [];
    let currentCampaign: CampaignBlock | null = null;

    for (let i = 12; i < groupHeaders.length; i++) {
      const gh = groupHeaders[i]?.trim();
      if (gh && gh.toLowerCase().includes('linkedin')) {
        if (currentCampaign) campaigns.push(currentCampaign);
        currentCampaign = { name: gh, meta: classifyCampaign(gh), impCol: null, clickCol: null, ctrCol: null, freqCol: null, cpcCol: null, costCol: null };
      }
      if (currentCampaign) {
        const ch = colHeaders[i]?.trim();
        if (ch === 'Impressões' && currentCampaign.impCol === null) currentCampaign.impCol = i;
        else if (ch === 'Cliques' && currentCampaign.clickCol === null) currentCampaign.clickCol = i;
        else if (ch === 'CTR' && currentCampaign.ctrCol === null) currentCampaign.ctrCol = i;
        else if (ch === 'Frequência' && currentCampaign.freqCol === null) currentCampaign.freqCol = i;
        else if (ch?.includes('CPC') && currentCampaign.cpcCol === null) currentCampaign.cpcCol = i;
        else if (ch === 'Custo' && currentCampaign.costCol === null) currentCampaign.costCol = i;
      }
    }
    if (currentCampaign) campaigns.push(currentCampaign);

    // Also find LinkedIn aggregate cols for the main adsKpis table
    const liImpCols: number[] = [];
    const liClickCols: number[] = [];
    const liCostCols: number[] = [];
    for (let i = 12; i < colHeaders.length; i++) {
      const h = colHeaders[i]?.trim();
      if (h === 'Impressões') liImpCols.push(i);
      else if (h === 'Cliques') liClickCols.push(i);
      else if (h === 'Custo') liCostCols.push(i);
    }

    const dataRows = lines.slice(2).filter(row => {
      const week = row[0]?.trim();
      const date = row[1]?.trim();
      return week?.startsWith('Semana') && /^\d{2}\/\d{2}\/\d{4}$/.test(date || '');
    });

    let imported = 0;
    for (const row of dataRows) {
      const week = row[0].trim();
      const weekStart = parseDate(row[1]);

      // LinkedIn aggregated
      let liImp = 0, liClick = 0, liCostTotal = 0;
      for (const c of liImpCols) liImp += parseNum(row[c] ?? '') ?? 0;
      for (const c of liClickCols) liClick += parseNum(row[c] ?? '') ?? 0;
      for (const c of liCostCols) liCostTotal += parseNum(row[c] ?? '') ?? 0;

      // Upsert Google Ads + LinkedIn aggregated
      const gaRecord = {
        week, weekStart,
        gaImpressions: parseNum(row[2] ?? ''),
        gaClicks: parseNum(row[3] ?? ''),
        gaCtr: row[4]?.trim() || null,
        gaCpcAvg: row[5]?.trim() || null,
        gaCpmAvg: row[6]?.trim() || null,
        gaCostAvg: row[7]?.trim() || null,
        gaCvr: row[8]?.trim() || null,
        gaConversions: parseNum(row[9] ?? ''),
        gaCostPerConversion: row[10]?.trim() || null,
        liImpressions: liImp,
        liClicks: liClick,
        liCost: Math.round(liCostTotal * 100) / 100,
      };

      const existing = await db.select().from(adsKpis).where(eq(adsKpis.week, week)).limit(1);
      if (existing.length > 0) {
        await db.update(adsKpis).set(gaRecord).where(eq(adsKpis.id, existing[0].id));
      } else {
        await db.insert(adsKpis).values(gaRecord);
      }

      // Upsert each LinkedIn campaign
      for (const camp of campaigns) {
        const imp = parseNum(row[camp.impCol ?? -1] ?? '');
        const clicks = parseNum(row[camp.clickCol ?? -1] ?? '');
        const ctr = camp.ctrCol != null ? row[camp.ctrCol]?.trim() || null : null;
        const freq = camp.freqCol != null ? row[camp.freqCol]?.trim() || null : null;
        const cpc = camp.cpcCol != null ? row[camp.cpcCol]?.trim() || null : null;
        const cost = parseNum(row[camp.costCol ?? -1] ?? '');

        const liRecord = {
          week, weekStart,
          campaignName: camp.name,
          accountType: camp.meta.accountType,
          funnelStage: camp.meta.funnelStage,
          impressions: imp, clicks, ctr, frequency: freq, cpcAvg: cpc, cost,
        };

        const existingLi = await db.select().from(liCampaignKpis)
          .where(and(eq(liCampaignKpis.week, week), eq(liCampaignKpis.campaignName, camp.name)))
          .limit(1);
        if (existingLi.length > 0) {
          await db.update(liCampaignKpis).set(liRecord).where(eq(liCampaignKpis.id, existingLi[0].id));
        } else {
          await db.insert(liCampaignKpis).values(liRecord);
        }
      }

      imported++;
    }

    res.json({ success: true, imported, campaigns: campaigns.map(c => c.name) });
  } catch (err) {
    console.error('Ads sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
