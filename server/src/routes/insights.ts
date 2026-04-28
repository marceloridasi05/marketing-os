import { Router } from 'express';
import { db } from '../db/index.js';
import { performanceEntries, budgets, goals, sites, customFunnels } from '../db/schema.js';
import { sql, and, eq } from 'drizzle-orm';
import { PRESET_MODELS } from '../lib/funnelModels.js';

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'warning' | 'info';
type InsightType = 'drop' | 'inconsistency' | 'spend' | 'goal';

export interface Insight {
  id: string;
  type: InsightType;
  severity: Severity;
  title: string;
  body: string;
  metric?: string;
  stage?: string;
  delta?: number;   // % integer — negative = drop, positive = rise
  period?: string;  // human-readable period label
}

type PerfRow = {
  period: string;
  impressions: number;
  clicks: number;
  sessions: number;
  leads: number;
  conversions: number;
  cost: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the relative change as a fraction (e.g. -0.35 = -35%), or null if prev is 0. */
function deltaRatio(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return (curr - prev) / prev;
}

function fmtPct(ratio: number): string {
  const sign = ratio >= 0 ? '+' : '';
  return `${sign}${Math.round(ratio * 100)}%`;
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}

function fmtCurr(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function monthLabel(period: string): string {
  const [y, m] = period.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ── Route ──────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const siteId = +(req.query.siteId as string);
  if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

  const insights: Insight[] = [];
  let counter = 0;
  const nextId = () => `ins_${++counter}`;

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  // ── 1. Performance: last 2 monthly periods ───────────────────────────────────

  const perfRows = await db.select({
    period: sql<string>`substr(${performanceEntries.date}, 1, 7)`,
    impressions: sql<number>`COALESCE(SUM(${performanceEntries.impressions}), 0)`,
    clicks:      sql<number>`COALESCE(SUM(${performanceEntries.clicks}), 0)`,
    sessions:    sql<number>`COALESCE(SUM(${performanceEntries.sessions}), 0)`,
    leads:       sql<number>`COALESCE(SUM(${performanceEntries.leads}), 0)`,
    conversions: sql<number>`COALESCE(SUM(${performanceEntries.conversions}), 0)`,
    cost:        sql<number>`COALESCE(SUM(${performanceEntries.cost}), 0)`,
  })
    .from(performanceEntries)
    .where(and(
      eq(performanceEntries.siteId, siteId),
      eq(performanceEntries.periodType, 'monthly'),
    ))
    .groupBy(sql`substr(${performanceEntries.date}, 1, 7)`)
    .orderBy(sql`substr(${performanceEntries.date}, 1, 7) DESC`)
    .limit(2) as PerfRow[];

  const curr = perfRows[0] ?? null;
  const prev = perfRows[1] ?? null;
  const periodLabel = curr && prev
    ? `${monthLabel(curr.period)} vs ${monthLabel(prev.period)}`
    : undefined;

  // ── 1a. Metric drops (month-over-month) ─────────────────────────────────────

  if (curr && prev) {
    const checks: {
      key: string;
      label: string;
      stage: string;
      curr: number;
      prev: number;
      warnAt: number;
      critAt: number;
      minPrev: number;
    }[] = [
      { key: 'leads',       label: 'Leads',       stage: 'conversion', curr: curr.leads,       prev: prev.leads,       warnAt: -0.15, critAt: -0.30, minPrev: 5   },
      { key: 'conversions', label: 'Conversões',  stage: 'conversion', curr: curr.conversions, prev: prev.conversions, warnAt: -0.20, critAt: -0.35, minPrev: 3   },
      { key: 'sessions',    label: 'Sessões',     stage: 'acquisition', curr: curr.sessions,   prev: prev.sessions,   warnAt: -0.20, critAt: -0.35, minPrev: 100 },
      { key: 'clicks',      label: 'Cliques',     stage: 'acquisition', curr: curr.clicks,     prev: prev.clicks,     warnAt: -0.20, critAt: -0.35, minPrev: 50  },
      { key: 'impressions', label: 'Impressões',  stage: 'awareness',   curr: curr.impressions,prev: prev.impressions, warnAt: -0.30, critAt: -0.50, minPrev: 1000},
    ];

    for (const c of checks) {
      if (c.prev < c.minPrev) continue;
      const ratio = deltaRatio(c.curr, c.prev);
      if (ratio === null) continue;

      if (ratio <= c.critAt) {
        insights.push({
          id: nextId(), type: 'drop', severity: 'critical',
          title: `Queda acentuada em ${c.label}`,
          body: `${c.label} caiu ${fmtPct(ratio)} — de ${fmtN(c.prev)} para ${fmtN(c.curr)} (${periodLabel}).`,
          metric: c.key, stage: c.stage,
          delta: Math.round(ratio * 100), period: periodLabel,
        });
      } else if (ratio <= c.warnAt) {
        insights.push({
          id: nextId(), type: 'drop', severity: 'warning',
          title: `Queda em ${c.label}`,
          body: `${c.label} recuou ${fmtPct(ratio)} — de ${fmtN(c.prev)} para ${fmtN(c.curr)} (${periodLabel}).`,
          metric: c.key, stage: c.stage,
          delta: Math.round(ratio * 100), period: periodLabel,
        });
      }
    }

    // Cost up + leads flat/down → flagrant inefficiency
    const costRatio  = deltaRatio(curr.cost, prev.cost);
    const leadsRatio = deltaRatio(curr.leads, prev.leads);
    if (
      costRatio !== null && leadsRatio !== null &&
      costRatio > 0.15 && leadsRatio < 0.05 &&
      prev.cost > 200
    ) {
      insights.push({
        id: nextId(), type: 'spend', severity: 'critical',
        title: 'Gasto cresceu sem retorno em leads',
        body: `Custo subiu ${fmtPct(costRatio)} enquanto leads ficaram estagnados (${fmtPct(leadsRatio)}). Revise segmentação e qualidade dos anúncios.`,
        metric: 'cost', stage: 'conversion',
        delta: Math.round(costRatio * 100), period: periodLabel,
      });
    }
  }

  // ── 1b. CPL trend ────────────────────────────────────────────────────────────

  if (curr && prev && prev.leads >= 5 && curr.leads >= 5 && prev.cost > 0) {
    const cplCurr = curr.cost / curr.leads;
    const cplPrev = prev.cost / prev.leads;
    const cplRatio = deltaRatio(cplCurr, cplPrev);
    if (cplRatio !== null && cplRatio > 0.25) {
      insights.push({
        id: nextId(), type: 'spend', severity: 'warning',
        title: 'CPL em alta',
        body: `Custo por Lead subiu ${fmtPct(cplRatio)} — de ${fmtCurr(cplPrev)} para ${fmtCurr(cplCurr)} (${periodLabel}).`,
        metric: 'cpl', stage: 'conversion',
        delta: Math.round(cplRatio * 100), period: periodLabel,
      });
    }
  }

  // ── 1c. Funnel ratio inconsistencies (current period) ───────────────────────

  if (curr) {
    // CTR: clicks / impressions
    if (curr.impressions >= 1_000 && curr.clicks >= 0) {
      const ctr = curr.impressions > 0 ? curr.clicks / curr.impressions : 0;
      if (ctr < 0.005) {
        insights.push({
          id: nextId(), type: 'inconsistency', severity: 'warning',
          title: 'CTR muito baixo',
          body: `CTR atual de ${(ctr * 100).toFixed(2)}% com ${fmtN(curr.impressions)} impressões. Criativos e segmentação merecem revisão imediata.`,
          metric: 'ctr', stage: 'acquisition',
        });
      } else if (ctr < 0.01) {
        insights.push({
          id: nextId(), type: 'inconsistency', severity: 'info',
          title: 'CTR abaixo de 1%',
          body: `CTR atual de ${(ctr * 100).toFixed(2)}%. Há margem para melhorar criativos ou refinar o público-alvo.`,
          metric: 'ctr', stage: 'acquisition',
        });
      }
    }

    // Session-to-lead conversion
    if (curr.sessions >= 300) {
      const s2l = curr.sessions > 0 ? curr.leads / curr.sessions : 0;
      if (s2l < 0.003) {
        insights.push({
          id: nextId(), type: 'inconsistency', severity: 'warning',
          title: 'Conversão sessão→lead muito baixa',
          body: `Apenas ${(s2l * 100).toFixed(2)}% das sessões viram lead (${fmtN(curr.leads)} leads em ${fmtN(curr.sessions)} sessões). Revise landing pages e CTAs.`,
          metric: 'session_to_lead', stage: 'conversion',
        });
      } else if (s2l < 0.01) {
        insights.push({
          id: nextId(), type: 'inconsistency', severity: 'info',
          title: 'Taxa sessão→lead abaixo de 1%',
          body: `${(s2l * 100).toFixed(2)}% das sessões convertem em lead. Há oportunidade de melhoria nos formulários e ofertas de conteúdo.`,
          metric: 'session_to_lead', stage: 'conversion',
        });
      }
    }

    // Click-to-session gap (tracking integrity check)
    if (curr.clicks >= 100 && curr.sessions > 0) {
      const c2s = curr.sessions / curr.clicks;
      if (c2s < 0.5) {
        insights.push({
          id: nextId(), type: 'inconsistency', severity: 'warning',
          title: 'Discrepância cliques×sessões',
          body: `Apenas ${Math.round(c2s * 100)}% dos cliques registram sessão (${fmtN(curr.clicks)} cliques → ${fmtN(curr.sessions)} sessões). Verifique o tracking no Analytics.`,
          metric: 'click_to_session', stage: 'acquisition',
        });
      }
    }

    // Impressions with zero clicks
    if (curr.impressions >= 2_000 && curr.clicks === 0) {
      insights.push({
        id: nextId(), type: 'inconsistency', severity: 'warning',
        title: 'Impressões sem cliques registrados',
        body: `${fmtN(curr.impressions)} impressões sem nenhum clique. Verifique se os anúncios estão ativos e os links de destino estão funcionando.`,
        metric: 'clicks', stage: 'acquisition',
      });
    }
  }

  // ── 2. Budget checks (current month) ────────────────────────────────────────

  const budgetAgg = await db.select({
    totalPlanned: sql<number>`COALESCE(SUM(${budgets.plannedBudget}), 0)`,
    totalActual:  sql<number>`COALESCE(SUM(${budgets.actualSpent}), 0)`,
  })
    .from(budgets)
    .where(and(
      eq(budgets.siteId, siteId),
      eq(budgets.year, cy),
      eq(budgets.month, cm),
    ));

  const bRow = budgetAgg[0];
  if (bRow && bRow.totalPlanned > 0) {
    const budgetRatio = bRow.totalActual / bRow.totalPlanned;
    if (budgetRatio > 1.15) {
      insights.push({
        id: nextId(), type: 'spend', severity: 'warning',
        title: 'Orçamento excedido',
        body: `Gasto atual ${fmtCurr(bRow.totalActual)} está ${Math.round((budgetRatio - 1) * 100)}% acima do planejado ${fmtCurr(bRow.totalPlanned)}.`,
        metric: 'budget', stage: 'revenue',
        delta: Math.round((budgetRatio - 1) * 100),
      });
    } else if (monthProgress > 0.6 && budgetRatio < 0.4) {
      insights.push({
        id: nextId(), type: 'spend', severity: 'info',
        title: 'Orçamento subutilizado',
        body: `Com ${Math.round(monthProgress * 100)}% do mês decorrido, apenas ${Math.round(budgetRatio * 100)}% do orçamento foi utilizado (${fmtCurr(bRow.totalActual)} de ${fmtCurr(bRow.totalPlanned)}).`,
        metric: 'budget', stage: 'revenue',
      });
    }
  }

  // ── 3. ABM-specific insights ────────────────────────────────────────────────

  // Try to fetch ABM data if available
  const abmInsights: Insight[] = [];
  try {
    const abmResponse = await fetch(
      process.env.ABM_API_URL ? `${process.env.ABM_API_URL}/api/stats` : 'https://ip-tracker-production-73ef.up.railway.app/api/stats'
    ).catch(() => null);

    if (abmResponse && abmResponse.ok) {
      const abmStats = await abmResponse.json();
      const { identified_logos = 0, estimated_logos = 0 } = abmStats;
      const coverage = estimated_logos > 0 ? identified_logos / estimated_logos : 0;

      // Low ICP coverage alert
      if (estimated_logos > 50 && coverage < 0.40) {
        abmInsights.push({
          id: nextId(), type: 'goal', severity: 'warning',
          title: 'Cobertura baixa de contas ICP',
          body: `Apenas ${Math.round(coverage * 100)}% das contas-alvo (${identified_logos} de ${estimated_logos}) foram identificadas. Aumente os esforços de rastreamento de conta.`,
          metric: 'icp_coverage', stage: 'acquisition',
        });
      }
    }

    // Try to fetch intelligence data for engagement trends
    const intResponse = await fetch(
      process.env.ABM_API_URL ? `${process.env.ABM_API_URL}/api/intelligence` : 'https://ip-tracker-production-73ef.up.railway.app/api/intelligence'
    ).catch(() => null);

    if (intResponse && intResponse.ok) {
      const intelligence = await intResponse.json();
      const stats = intelligence.stats || {};
      const { total_accounts = 0, hot = 0, warm = 0, cold = 0 } = stats;

      const activeAccounts = hot + warm;
      const engagementRate = total_accounts > 0 ? activeAccounts / total_accounts : 0;

      // Check for engagement shift
      if (total_accounts >= 20 && engagementRate < 0.30) {
        abmInsights.push({
          id: nextId(), type: 'drop', severity: 'warning',
          title: 'Engajamento baixo de contas-alvo',
          body: `Apenas ${Math.round(engagementRate * 100)}% das contas-alvo estão ativas (hot/warm). ${cold} contas estão frias — re-engaje com conteúdo direcionado.`,
          metric: 'account_engagement', stage: 'acquisition',
        });
      }

      // High engagement but low conversion (implicit from high visits, few leads)
      if (hot > 0 && curr && curr.leads < 5 && curr.sessions > 50) {
        abmInsights.push({
          id: nextId(), type: 'inconsistency', severity: 'critical',
          title: 'Alto engajamento mas baixa conversão de contas-alvo',
          body: `${hot} contas estão muito engajadas (hot), mas apenas ${curr.leads} leads foram gerados. Revise calls-to-action e ofertas de demo.`,
          metric: 'account_conversion_gap', stage: 'conversion',
        });
      }
    }
  } catch (err) {
    // Silently fail if ABM API is unavailable
  }

  // Add ABM insights to the main pool
  insights.push(...abmInsights);

  // ── 4. Goal tracking ─────────────────────────────────────────────────────────

  const currentGoals = await db.select()
    .from(goals)
    .where(and(
      eq(goals.siteId, siteId),
      eq(goals.year, cy),
      eq(goals.month, cm),
    ));

  if (curr && currentGoals.length > 0) {
    for (const g of currentGoals) {
      const key = (g.metricName ?? '').toLowerCase();
      let actual: number | null = null;

      if (key.includes('lead'))                             actual = curr.leads;
      else if (key.includes('session') || key.includes('sessão')) actual = curr.sessions;
      else if (key.includes('click') || key.includes('clique'))   actual = curr.clicks;
      else if (key.includes('convers'))                     actual = curr.conversions;
      else if (key.includes('impression') || key.includes('impressão')) actual = curr.impressions;

      if (actual === null || g.targetValue <= 0) continue;
      const progress = actual / g.targetValue;

      if (monthProgress > 0.65 && progress < 0.60) {
        insights.push({
          id: nextId(), type: 'goal', severity: 'critical',
          title: `Meta de ${g.metricName} em risco`,
          body: `Com ${Math.round(monthProgress * 100)}% do mês passado, apenas ${Math.round(progress * 100)}% da meta foi atingida (${fmtN(actual)} de ${fmtN(g.targetValue)} esperados).`,
          metric: key, delta: Math.round(progress * 100),
        });
      } else if (monthProgress > 0.40 && progress < 0.40) {
        insights.push({
          id: nextId(), type: 'goal', severity: 'warning',
          title: `Meta de ${g.metricName} atrasada`,
          body: `Progresso de ${Math.round(progress * 100)}% com ${Math.round(monthProgress * 100)}% do mês decorrido. Aceleração necessária para atingir ${fmtN(g.targetValue)}.`,
          metric: key, delta: Math.round(progress * 100),
        });
      }
    }
  }

  // Sort: critical → warning → info
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);

  // Load site's funnel model and map insights to stage IDs
  const site = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  const funnelModelId = site[0]?.funnelModelId ?? 'sales_led';

  // Build metric-to-stage mapping for the selected model
  let metricToStage: Record<string, string> = {};

  // Check if it's a preset model
  if (PRESET_MODELS[funnelModelId as keyof typeof PRESET_MODELS]) {
    const model = PRESET_MODELS[funnelModelId as keyof typeof PRESET_MODELS];
    for (const [stageId, metrics] of Object.entries(model.stageToMetrics)) {
      for (const metric of metrics) {
        metricToStage[metric] = stageId;
      }
    }
  } else {
    // Otherwise try to load as custom funnel
    const customId = parseInt(funnelModelId);
    if (!isNaN(customId)) {
      const custom = await db
        .select()
        .from(customFunnels)
        .where(and(
          eq(customFunnels.id, customId),
          eq(customFunnels.siteId, siteId)
        ))
        .limit(1);

      if (custom[0]) {
        const mapping = JSON.parse(custom[0].stageToMetrics);
        for (const [stageId, metrics] of Object.entries(mapping)) {
          for (const metric of metrics as string[]) {
            metricToStage[metric] = stageId;
          }
        }
      }
    }
  }

  // Map insight metrics to stage IDs in the selected funnel
  for (const insight of insights) {
    if (insight.metric) {
      const stageId = metricToStage[insight.metric];
      if (stageId) {
        insight.stage = stageId;
      }
    }
  }

  // Group insights by stage
  const stageInsights: Record<string, Insight[]> = {};
  for (const insight of insights) {
    const stageId = insight.stage || 'uncategorized';
    if (!stageInsights[stageId]) {
      stageInsights[stageId] = [];
    }
    stageInsights[stageId].push(insight);
  }

  res.json({
    funnelModelId,
    stageInsights,
    insights, // Keep flat array for backward compatibility
    generatedAt: new Date().toISOString(),
  });
});

export default router;
