import { Router } from 'express';
import { db } from '../db/index.js';
import { adsKpis, metaCampaignKpis, liCampaignKpis } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSheetConfig } from '../lib/sheetConfig.js';

const router = Router();

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

// GET /meta - all meta campaign kpis
router.get('/meta', async (req, res) => {
  const conditions = [];
  if (req.query.siteId) conditions.push(eq(metaCampaignKpis.siteId, +req.query.siteId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(metaCampaignKpis).where(where).orderBy(metaCampaignKpis.weekStart);
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
router.post('/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { sheetId, gid } = await getSheetConfig(siteId, 'adsKpis');
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    const lines = text.split('\n').map(parseCsvLine);

    const groupHeaders = lines[0] || [];
    const colHeaders = lines[1] || [];

    // Detect Meta Ads and LinkedIn campaign blocks
    interface CampaignBlock {
      channel: 'meta' | 'linkedin';
      name: string;
      meta?: CampaignMeta;
      campaignId?: string;
      idCol?: number | null;
      impCol: number | null;
      clickCol: number | null;
      ctrCol: number | null;
      freqCol?: number | null;
      cpcCol: number | null;
      costCol: number | null;
    }

    const campaigns: CampaignBlock[] = [];
    let currentMetaImpCol: number | null = null;
    let currentMetaClickCol: number | null = null;
    let currentMetaCtrCol: number | null = null;
    let currentMetaCpcCol: number | null = null;
    let currentMetaCostCol: number | null = null;

    let currentCampaign: CampaignBlock | null = null;

    // Parse headers to identify column positions
    for (let i = 0; i < colHeaders.length; i++) {
      const gh = groupHeaders[i]?.trim() || '';
      const ch = colHeaders[i]?.trim() || '';

      // Check if we're in a Meta Ads section
      if (gh.toLowerCase().includes('meta')) {
        if (ch === 'Impressões') currentMetaImpCol = i;
        else if (ch === 'Cliques') currentMetaClickCol = i;
        else if (ch === 'CTR') currentMetaCtrCol = i;
        else if (ch?.includes('CPC')) currentMetaCpcCol = i;
        else if (ch === 'Custo') currentMetaCostCol = i;
      }

      // Check if we're in a campaign block (Meta or LinkedIn)
      if (gh && (gh.toLowerCase().includes('meta') && ch === 'ID da Campanha')) {
        // Meta campaign with ID
        const metaCampId = '';
        currentCampaign = {
          channel: 'meta',
          name: `Meta Campaign`,
          campaignId: metaCampId,
          idCol: i,
          impCol: null,
          clickCol: null,
          ctrCol: null,
          cpcCol: null,
          costCol: null,
        };
      } else if (gh && (gh.toLowerCase().includes('linkedin') && !gh.toLowerCase().includes('page'))) {
        // LinkedIn campaign
        if (currentCampaign) campaigns.push(currentCampaign);
        const liCampId = ch === 'ID da Campanha' ? '' : '';
        currentCampaign = {
          channel: 'linkedin',
          name: gh,
          meta: classifyCampaign(gh),
          campaignId: liCampId,
          idCol: ch === 'ID da Campanha' ? i : undefined,
          impCol: null,
          clickCol: null,
          ctrCol: null,
          freqCol: null,
          cpcCol: null,
          costCol: null,
        };
      }

      // Fill in campaign-specific columns
      if (currentCampaign) {
        if (ch === 'Impressões' && currentCampaign.impCol === null) currentCampaign.impCol = i;
        else if (ch === 'Cliques' && currentCampaign.clickCol === null) currentCampaign.clickCol = i;
        else if (ch === 'CTR' && currentCampaign.ctrCol === null) currentCampaign.ctrCol = i;
        else if (ch === 'Frequência' && currentCampaign.freqCol === null) currentCampaign.freqCol = i;
        else if (ch?.includes('CPC') && currentCampaign.cpcCol === null) currentCampaign.cpcCol = i;
        else if (ch === 'Custo' && currentCampaign.costCol === null) currentCampaign.costCol = i;
      }
    }
    if (currentCampaign) campaigns.push(currentCampaign);

    // Filter to only data rows
    const dataRows = lines.slice(2).filter(row => {
      const week = row[0]?.trim();
      const date = row[1]?.trim();
      return week?.startsWith('Semana') && /^\d{2}\/\d{2}\/\d{4}$/.test(date || '');
    });

    let imported = 0;
    for (const row of dataRows) {
      const week = row[0].trim();
      const weekStart = parseDate(row[1]);

      // Calculate aggregated values for Meta and LinkedIn
      let metaImp = 0, metaClick = 0, metaCostTotal = 0;
      let liImp = 0, liClick = 0, liCostTotal = 0;

      for (const camp of campaigns) {
        if (camp.channel === 'meta') {
          if (camp.impCol != null) metaImp += parseNum(row[camp.impCol] ?? '') ?? 0;
          if (camp.clickCol != null) metaClick += parseNum(row[camp.clickCol] ?? '') ?? 0;
          if (camp.costCol != null) metaCostTotal += parseNum(row[camp.costCol] ?? '') ?? 0;
        } else if (camp.channel === 'linkedin') {
          if (camp.impCol != null) liImp += parseNum(row[camp.impCol] ?? '') ?? 0;
          if (camp.clickCol != null) liClick += parseNum(row[camp.clickCol] ?? '') ?? 0;
          if (camp.costCol != null) liCostTotal += parseNum(row[camp.costCol] ?? '') ?? 0;
        }
      }

      // Upsert main adsKpis record
      const adsRecord = {
        siteId,
        week,
        weekStart,
        gaImpressions: parseNum(row[2] ?? ''),
        gaClicks: parseNum(row[3] ?? ''),
        gaCtr: row[4]?.trim() || null,
        gaCpcAvg: row[5]?.trim() || null,
        gaCpmAvg: row[6]?.trim() || null,
        gaCostAvg: row[7]?.trim() || null,
        gaCvr: row[8]?.trim() || null,
        gaConversions: parseNum(row[9] ?? ''),
        gaCostPerConversion: row[10]?.trim() || null,
        metaImpressions: metaImp,
        metaClicks: metaClick,
        metaCtr: metaClick > 0 && metaImp > 0 ? `${((metaClick / metaImp) * 100).toFixed(2)}%` : null,
        metaCpcAvg: metaClick > 0 && metaCostTotal > 0 ? `R$ ${(metaCostTotal / metaClick).toFixed(2)}` : null,
        metaCost: Math.round(metaCostTotal * 100) / 100,
        liImpressions: liImp,
        liClicks: liClick,
        liCost: Math.round(liCostTotal * 100) / 100,
      };

      const existingWhere = siteId
        ? and(eq(adsKpis.week, week), eq(adsKpis.siteId, siteId))
        : eq(adsKpis.week, week);
      const existing = await db.select().from(adsKpis).where(existingWhere).limit(1);
      if (existing.length > 0) {
        await db.update(adsKpis).set(adsRecord).where(eq(adsKpis.id, existing[0].id));
      } else {
        await db.insert(adsKpis).values(adsRecord);
      }

      // Upsert each campaign
      for (const camp of campaigns) {
        if (camp.channel === 'meta') {
          const imp = parseNum(row[camp.impCol ?? -1] ?? '');
          const clicks = parseNum(row[camp.clickCol ?? -1] ?? '');
          const ctr = camp.ctrCol != null ? row[camp.ctrCol]?.trim() || null : null;
          const cpc = camp.cpcCol != null ? row[camp.cpcCol]?.trim() || null : null;
          const cost = parseNum(row[camp.costCol ?? -1] ?? '');
          const campaignId = camp.idCol != null ? row[camp.idCol]?.trim() || '' : '';

          const metaRecord = {
            siteId,
            week,
            weekStart,
            campaignName: campaignId || `Meta Ads - Campanha ${campaigns.filter(c => c.channel === 'meta').indexOf(camp) + 1}`,
            campaignId,
            impressions: imp,
            clicks,
            ctr,
            cpcAvg: cpc,
            cost,
          };

          const existingMetaWhere = siteId
            ? and(eq(metaCampaignKpis.week, week), eq(metaCampaignKpis.campaignId, campaignId), eq(metaCampaignKpis.siteId, siteId))
            : and(eq(metaCampaignKpis.week, week), eq(metaCampaignKpis.campaignId, campaignId));
          const existingMeta = await db.select().from(metaCampaignKpis).where(existingMetaWhere).limit(1);

          if (existingMeta.length > 0) {
            await db.update(metaCampaignKpis).set(metaRecord).where(eq(metaCampaignKpis.id, existingMeta[0].id));
          } else {
            await db.insert(metaCampaignKpis).values(metaRecord);
          }
        } else if (camp.channel === 'linkedin') {
          const imp = parseNum(row[camp.impCol ?? -1] ?? '');
          const clicks = parseNum(row[camp.clickCol ?? -1] ?? '');
          const ctr = camp.ctrCol != null ? row[camp.ctrCol]?.trim() || null : null;
          const freq = camp.freqCol != null ? row[camp.freqCol]?.trim() || null : null;
          const cpc = camp.cpcCol != null ? row[camp.cpcCol]?.trim() || null : null;
          const cost = parseNum(row[camp.costCol ?? -1] ?? '');
          const campaignId = camp.idCol != null ? row[camp.idCol]?.trim() || '' : '';

          const liRecord = {
            siteId,
            week,
            weekStart,
            campaignName: camp.name,
            campaignId,
            accountType: camp.meta?.accountType || 'Outros',
            funnelStage: camp.meta?.funnelStage || 'other',
            impressions: imp,
            clicks,
            ctr,
            frequency: freq,
            cpcAvg: cpc,
            cost,
          };

          const existingLiWhere = siteId
            ? and(eq(liCampaignKpis.week, week), eq(liCampaignKpis.campaignId, campaignId), eq(liCampaignKpis.siteId, siteId))
            : and(eq(liCampaignKpis.week, week), eq(liCampaignKpis.campaignId, campaignId));
          const existingLi = await db.select().from(liCampaignKpis).where(existingLiWhere).limit(1);

          if (existingLi.length > 0) {
            await db.update(liCampaignKpis).set(liRecord).where(eq(liCampaignKpis.id, existingLi[0].id));
          } else {
            await db.insert(liCampaignKpis).values(liRecord);
          }
        }
      }

      imported++;
    }

    res.json({
      success: true,
      imported,
      meta: campaigns.filter(c => c.channel === 'meta').length,
      linkedin: campaigns.filter(c => c.channel === 'linkedin').length,
    });
  } catch (err) {
    console.error('Ads sync error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
