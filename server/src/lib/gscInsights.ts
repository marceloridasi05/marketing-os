import { db } from '../db/index.js';
import { gscMetrics } from '../db/schema.js';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GscMetric {
  id: number;
  siteId: number;
  propertyId: number;
  date: string;
  dimensionType: string;
  dimensionValue: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  periodType: string;
  createdAt: string;
  updatedAt: string;
}

export interface GscInsightData {
  siteId: number;
  propertyId: number;
  insightType: string;
  dimensionType: string;
  dimensionValue: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metrics: string; // JSON stringified
  recommendation: string | null;
  generatedAt: string;
  dismissedAt: null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return Math.round(n).toString();
}

function fmtPct(p: number): string {
  return (p * 100).toFixed(1) + '%';
}

// ── Insight Generators ─────────────────────────────────────────────────────────

/**
 * Insight Type: High Impressions + Low CTR
 * Identifies queries with good visibility but poor click-through rates
 * Thresholds:
 *   Critical: >100 impressions AND <1% CTR
 *   Warning: >50 impressions AND <2% CTR
 *   Info: >20 impressions AND <3% CTR
 */
function analyzeHighImpressionsLowCtr(
  metrics: Map<string, { impressions: number; clicks: number; ctr: number; position: number }>,
  siteId: number,
  propertyId: number
): GscInsightData[] {
  const insights: GscInsightData[] = [];

  // Calculate percentiles for threshold
  const impressionValues = Array.from(metrics.values())
    .map((m) => m.impressions)
    .filter((v) => v > 0);
  const p50 = getPercentile(impressionValues, 50);

  for (const [query, data] of metrics) {
    if (data.impressions === 0) continue;

    let severity: 'critical' | 'warning' | 'info' | null = null;
    if (data.impressions > 100 && data.ctr < 0.01) {
      severity = 'critical';
    } else if (data.impressions > 50 && data.ctr < 0.02) {
      severity = 'warning';
    } else if (data.impressions > 20 && data.ctr < 0.03) {
      severity = 'info';
    }

    if (!severity) continue;

    insights.push({
      siteId,
      propertyId,
      insightType: 'high_impressions_low_ctr',
      dimensionType: 'query',
      dimensionValue: query,
      severity,
      title: `"${query}" - ${fmtNum(data.impressions)} impressões mas ${fmtPct(data.ctr)} CTR`,
      description: `Esta consulta de busca recebe muitas impressões (${fmtNum(
        data.impressions
      )}), mas tem uma taxa de clique baixa (${fmtPct(
        data.ctr
      )}). Isso indica que a página está ranqueando bem, mas o snippet (título/descrição) não está atraindo cliques.`,
      metrics: JSON.stringify({
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: fmtPct(data.ctr),
        position: data.position.toFixed(1),
      }),
      recommendation:
        'Otimize o título (title tag) e meta description para aumentar o CTR. Considere adicionar números, emojis ou call-to-action mais atrativo. Verifique se o snippet está sendo truncado.',
      dismissedAt: null,
    });
  }

  return insights;
}

/**
 * Insight Type: Pages Ranking 4-10
 * Identifies search queries ranking in positions 4-10 (improvement opportunity)
 * These are close to top 3, which is where most clicks happen
 */
function analyzeRank4To10(
  metrics: Map<string, { impressions: number; clicks: number; ctr: number; position: number }>,
  siteId: number,
  propertyId: number
): GscInsightData[] {
  const insights: GscInsightData[] = [];

  for (const [query, data] of metrics) {
    if (data.position >= 4 && data.position <= 10) {
      insights.push({
        siteId,
        propertyId,
        insightType: 'rank_4_10',
        dimensionType: 'query',
        dimensionValue: query,
        severity: 'warning',
        title: `"${query}" ranqueando na posição ${data.position.toFixed(1)}`,
        description: `A consulta "${query}" está ranqueando entre a posição 4-10 com ${fmtNum(
          data.impressions
        )} impressões. Este é um grande potencial de melhoria, pois as posições 1-3 recebem ~60% dos cliques.`,
        metrics: JSON.stringify({
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: fmtPct(data.ctr),
          position: data.position.toFixed(1),
        }),
        recommendation:
          'Aumente a qualidade do conteúdo para esta consulta. Considere: melhorar formatação (headings, listas), adicionar mais contexto, otimizar para intenção de busca, melhorar Core Web Vitals.',
        dismissedAt: null,
      });
    }
  }

  return insights;
}

/**
 * Insight Type: CTR Drop Month-over-Month
 * Identifies queries where CTR has dropped significantly
 */
function analyzeCtrDrop(
  currentMetrics: Map<string, { impressions: number; clicks: number; ctr: number; position: number; prevCtr?: number }>,
  siteId: number,
  propertyId: number
): GscInsightData[] {
  const insights: GscInsightData[] = [];

  for (const [query, data] of currentMetrics) {
    if (!data.prevCtr || data.impressions < 20) continue;

    const ctrChange = (data.ctr - data.prevCtr) / data.prevCtr;

    if (ctrChange < -0.15) {
      // > 15% drop
      insights.push({
        siteId,
        propertyId,
        insightType: 'ctr_drop',
        dimensionType: 'query',
        dimensionValue: query,
        severity: 'warning',
        title: `"${query}" - CTR caiu ${Math.abs(Math.round(ctrChange * 100))}% no mês`,
        description: `O CTR para a consulta "${query}" caiu de ${fmtPct(data.prevCtr)} para ${fmtPct(
          data.ctr
        )}. Isso pode indicar mudanças no SERP (novos rich snippets, PAA, anúncios) ou redução na visibilidade do seu resultado.`,
        metrics: JSON.stringify({
          currentCtr: fmtPct(data.ctr),
          previousCtr: fmtPct(data.prevCtr),
          change: Math.round(ctrChange * 100) + '%',
          impressions: data.impressions,
          position: data.position.toFixed(1),
        }),
        recommendation:
          'Verifique como o SERP mudou para esta consulta. Analise títulos de concorrentes, ajuste seu snippet para ser mais competitivo, ou revise se a página ainda responde melhor à intenção de busca.',
        dismissedAt: null,
      });
    }
  }

  return insights;
}

// ── Main Insight Generator ─────────────────────────────────────────────────────

/**
 * Generate all GSC insights for a property
 */
export async function generateGscInsights(siteId: number, propertyId: number): Promise<GscInsightData[]> {
  try {
    const now = new Date();
    const currentMonth = formatDate(now);
    const lastMonth = formatDate(subtractMonths(now, 1));
    const twoMonthsAgo = formatDate(subtractMonths(now, 2));

    // Fetch current month metrics
    const currentMetricsRaw = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          eq(gscMetrics.dimensionType, 'query'),
          gte(gscMetrics.date, lastMonth),
          lte(gscMetrics.date, currentMonth)
        )
      );

    // Group current metrics by query
    const currentMetricsMap = new Map<string, { impressions: number; clicks: number; ctr: number; position: number }>();
    for (const m of currentMetricsRaw) {
      const key = m.dimensionValue;
      const existing = currentMetricsMap.get(key) || { impressions: 0, clicks: 0, ctr: 0, position: 0 };
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.position = (existing.position + m.position) / 2; // Average position
      currentMetricsMap.set(key, existing);
    }

    // Calculate CTR for current period
    for (const [key, data] of currentMetricsMap) {
      data.ctr = data.impressions > 0 ? data.clicks / data.impressions : 0;
    }

    // Fetch previous month metrics for comparison
    const previousMetricsRaw = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          eq(gscMetrics.dimensionType, 'query'),
          gte(gscMetrics.date, twoMonthsAgo),
          lte(gscMetrics.date, lastMonth)
        )
      );

    // Group previous metrics by query
    const previousMetricsMap = new Map<string, { impressions: number; clicks: number; ctr: number }>();
    for (const m of previousMetricsRaw) {
      const key = m.dimensionValue;
      const existing = previousMetricsMap.get(key) || { impressions: 0, clicks: 0, ctr: 0 };
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      previousMetricsMap.set(key, existing);
    }

    // Calculate CTR for previous period
    for (const [key, data] of previousMetricsMap) {
      data.ctr = data.impressions > 0 ? data.clicks / data.impressions : 0;
    }

    // Enrich current metrics with previous CTR for comparison
    for (const [key, data] of currentMetricsMap) {
      const prev = previousMetricsMap.get(key);
      if (prev) {
        (data as any).prevCtr = prev.ctr;
      }
    }

    // Generate insights
    const insights: GscInsightData[] = [];

    insights.push(...analyzeHighImpressionsLowCtr(currentMetricsMap, siteId, propertyId));
    insights.push(...analyzeRank4To10(currentMetricsMap, siteId, propertyId));
    insights.push(...analyzeCtrDrop(currentMetricsMap as any, siteId, propertyId));

    // Sort by severity (critical > warning > info) then by impact
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary sort by impressions (higher impact first)
      const aMetrics = JSON.parse(a.metrics);
      const bMetrics = JSON.parse(b.metrics);
      return (bMetrics.impressions || 0) - (aMetrics.impressions || 0);
    });

    return insights;
  } catch (err) {
    console.error('Error generating GSC insights:', err);
    return [];
  }
}
