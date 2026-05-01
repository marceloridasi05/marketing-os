/**
 * Metric Labels Dictionary
 * Central mapping of technical metric keys to friendly, executive-readable names
 * Used throughout the Dashboard to ensure consistent, clear labeling
 */

export const METRIC_LABELS: Record<string, string> = {
  // Awareness / Demand
  sessions: 'Sessões',
  totalSessions: 'Sessões',
  newUsers: 'Novos usuários',
  impressions: 'Impressões',
  gaImpressions: 'Impressões Google Ads',
  metaImpressions: 'Impressões Meta',
  liImpressions: 'Impressões LinkedIn',

  // Clicks / Engagement
  gaClicks: 'Cliques Google Ads',
  metaClicks: 'Cliques Meta',
  liClicks: 'Cliques LinkedIn',
  ctr: 'Taxa de cliques',
  gaCtr: 'Taxa de cliques GA',

  // Conversion
  totalLeads: 'Leads',
  leadsGenerated: 'Leads',
  leads: 'Leads',
  totalGaConversions: 'Conversões',
  gaConversions: 'Conversões GA',
  cvr: 'Taxa de conversão',
  conversionRate: 'Taxa de conversão',

  // Efficiency
  cpl: 'Custo por Lead',
  costPerLead: 'Custo por Lead',
  cac: 'Custo de Aquisição',
  costPerAcquisition: 'Custo de Aquisição',
  cpc: 'Custo por Clique',
  costPerClick: 'Custo por Clique',

  // Channels (normalized friendly names)
  googleAds: 'Google Ads',
  google_ads: 'Google Ads',
  metaAds: 'Meta',
  meta_ads: 'Meta',
  metaSpend: 'Gasto Meta',
  meta_spend: 'Gasto Meta',
  linkedinAds: 'LinkedIn Ads',
  linkedin_ads: 'LinkedIn Ads',
  linkedinSpend: 'Gasto LinkedIn',
  linkedin_spend: 'Gasto LinkedIn',
  googleAdsSpend: 'Gasto Google Ads',
  organic: 'Orgânico',
  direct: 'Direto',
  referral: 'Referência',

  // Budget
  budget: 'Orçamento',
  budgetPlanned: 'Orçamento planejado',
  planned: 'Planejado',
  budgetActual: 'Gasto realizado',
  budgetSpent: 'Gasto realizado',
  spent: 'Gasto realizado',
  actualSpend: 'Gasto realizado',
  totalAdsSpend: 'Gasto Ads',
  adsSpend: 'Gasto Ads',
  budgetBalance: 'Saldo',
  balance: 'Saldo',
  savings: 'Saldo disponível',
  totalSavings: 'Saldo disponível',

  // Pipeline & Revenue (CRM/Commercial)
  mql: 'MQLs',
  mqlCount: 'MQLs',
  sql: 'SQLs',
  sqlCount: 'SQLs',
  opportunities: 'Oportunidades',
  pipeline: 'Pipeline',
  revenue: 'Receita',
  totalRevenue: 'Receita',
  weeklyGains: 'Ganhos da semana',

  // Supporting metrics
  blogSessions: 'Sessões Blog',
  blogTotalUsers: 'Usuários Blog',
  blogNewUsers: 'Novos usuários Blog',
  aiSessions: 'Sessões IA',
  aiTotalUsers: 'Usuários IA',
  followers: 'Seguidores',
};

/**
 * Get friendly label for a metric key
 * Falls back to capitalized key if not found in dictionary
 */
export function getMetricLabel(key: string): string {
  if (!key) return 'Métrica desconhecida';
  return METRIC_LABELS[key] || capitalizeWords(key);
}

/**
 * Capitalize words in a string (for fallback display)
 * E.g., "total_ads_spend" -> "Total Ads Spend"
 */
function capitalizeWords(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ')           // Replace underscores with spaces
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format metric interpretation based on metric type
 * Returns human-readable interpretation of metric changes
 */
export function interpretMetricChange(
  metricKey: string,
  change: number,
  label?: string
): string {
  const displayLabel = label || getMetricLabel(metricKey);
  const absChange = Math.abs(change);
  const direction = change > 0 ? 'cresceu' : 'caiu';
  const verb = change > 0 ? 'aumento' : 'queda';

  // Efficiency metrics: lower is better
  const isEfficiencyMetric =
    metricKey.includes('cpl') ||
    metricKey.includes('cac') ||
    metricKey.includes('cost') ||
    metricKey.includes('cpc') ||
    metricKey.includes('cvr');

  if (isEfficiencyMetric && metricKey.includes('cvr')) {
    // CVR is lower better
    return `${displayLabel} ${direction} ${absChange.toFixed(0)}%`;
  }

  if (isEfficiencyMetric) {
    // Cost metrics: down is good
    const sentiment = change > 0 ? 'aumentou' : 'diminuiu';
    return `${displayLabel} ${sentiment} ${absChange.toFixed(0)}%`;
  }

  // Volume metrics: up is good
  return `${displayLabel} ${direction} ${absChange.toFixed(0)}%`;
}
