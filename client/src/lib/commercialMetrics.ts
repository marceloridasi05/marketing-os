/**
 * Commercial Metrics
 * Handles MQL, SQL, Opportunities, Pipeline, and Revenue data
 * For B2B Sales-Led funnel analysis
 */

export interface CommercialMetricsData {
  month: string; // YYYY-MM format
  mql: number | null;
  sql: number | null;
  opportunities: number | null;
  pipelineValue: number | null; // currency
  revenue: number | null; // currency
  sourceNote?: string;
  updatedAt?: string;
}

export interface CommercialMetricsMonth {
  period: string; // e.g., "Maio 2026"
  data: CommercialMetricsData;
}

/**
 * Calculate conversion rates between funnel stages
 */
export function calculateConversionRates(
  metrics: CommercialMetricsData,
  previousMetrics: CommercialMetricsData | null
) {
  return {
    leadToMql: metrics.mql !== null && metrics.mql !== undefined ? { count: metrics.mql } : null,
    mqlToSql: metrics.mql && metrics.sql ? { rate: (metrics.sql / metrics.mql * 100).toFixed(1) + '%', count: metrics.sql } : null,
    sqlToOpp: metrics.sql && metrics.opportunities ? { rate: (metrics.opportunities / metrics.sql * 100).toFixed(1) + '%', count: metrics.opportunities } : null,
    oppToRevenue: metrics.opportunities && metrics.revenue ? { rate: (metrics.revenue / (metrics.opportunities * 10000) * 100).toFixed(1) + '%', revenue: metrics.revenue } : null,
  };
}

/**
 * Calculate efficiency metrics for B2B Sales-Led
 * Requires budget/spend data from main metrics
 */
export function calculateCommercialEfficiency(
  commercial: CommercialMetricsData,
  totalSpend: number | null
) {
  if (!totalSpend) return null;

  return {
    costPerMql: commercial.mql ? (totalSpend / commercial.mql).toFixed(2) : null,
    costPerSql: commercial.sql ? (totalSpend / commercial.sql).toFixed(2) : null,
    costPerOpp: commercial.opportunities ? (totalSpend / commercial.opportunities).toFixed(2) : null,
    roiRevenue: commercial.revenue ? ((commercial.revenue - totalSpend) / totalSpend * 100).toFixed(1) + '%' : null,
  };
}

/**
 * Determine if commercial metrics are complete for analysis
 */
export function isCommercialMetricsComplete(metrics: CommercialMetricsData): {
  complete: boolean;
  missing: string[];
  percentage: number;
} {
  const fields = [
    { key: 'mql', label: 'MQLs' },
    { key: 'sql', label: 'SQLs' },
    { key: 'opportunities', label: 'Oportunidades' },
    { key: 'pipelineValue', label: 'Pipeline' },
    { key: 'revenue', label: 'Receita' },
  ];

  const filled = fields.filter(f => metrics[f.key as keyof CommercialMetricsData] !== null && metrics[f.key as keyof CommercialMetricsData] !== undefined).length;
  const total = fields.length;
  const missing = fields.filter(f => metrics[f.key as keyof CommercialMetricsData] === null || metrics[f.key as keyof CommercialMetricsData] === undefined).map(f => f.label);

  return {
    complete: filled === total,
    missing,
    percentage: Math.round((filled / total) * 100),
  };
}

/**
 * Format commercial metrics for display
 */
export function formatCommercialMetric(value: number | null, type: 'count' | 'currency'): string {
  if (value === null || value === undefined) return '—';

  if (type === 'currency') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Parse month input to YYYY-MM format
 */
export function parseMonthInput(month: string): string {
  // Handle different input formats: "05/2026", "May 2026", "2026-05", etc.
  const patterns = [
    /(\d{2})\/(\d{4})/, // MM/YYYY
    /(\d{4})-(\d{2})/, // YYYY-MM
    /(\d{4})-(\d{2})-\d{2}/, // YYYY-MM-DD
  ];

  for (const pattern of patterns) {
    const match = month.match(pattern);
    if (match) {
      const [, part1, part2] = match;
      // Determine if part1 is month or year
      if (parseInt(part1) > 12) {
        // part1 is year
        return `${part1}-${part2.padStart(2, '0')}`;
      } else {
        // part1 is month
        return `${part2}-${part1.padStart(2, '0')}`;
      }
    }
  }

  // Fallback: assume YYYY-MM
  return month;
}

/**
 * Get display name for month
 */
export function getMonthDisplayName(monthStr: string): string {
  const months: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  };

  const [year, month] = monthStr.split('-');
  return `${months[month]} ${year}`;
}
