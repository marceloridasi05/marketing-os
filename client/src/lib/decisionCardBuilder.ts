/**
 * Decision Card Builder
 * Generates decision cards based on model and available metrics
 */

// Inline types to avoid Vite bundler issues
type HealthStatus = 'healthy' | 'attention' | 'critical';
interface DecisionCardMetric {
  label: string;
  value: number | null;
  previous: number | null;
  format: 'num' | 'money' | 'pct';
  status?: HealthStatus;
  isConnected: boolean;
  source?: string;
}
interface DecisionCard {
  area: 'demand' | 'efficiency' | 'pipeline' | 'channels' | 'budget';
  title: string;
  status: HealthStatus;
  primaryMetric: DecisionCardMetric;
  supportingMetrics: DecisionCardMetric[];
  insight?: string;
  recommendedAction?: string;
}

import { getModelKPIConfig } from './modelKPIConfig';

interface MetricsData {
  [key: string]: {
    current: number | null;
    previous: number | null;
  };
}

interface DecisionCardBuilderInput {
  modelId: string;
  metrics: MetricsData;
  insights?: {
    demandInsight?: string;
    efficiencyInsight?: string;
    pipelineInsight?: string;
    channelsInsight?: string;
    budgetInsight?: string;
  };
}

/**
 * Build Decision Cards for the model
 */
export function buildDecisionCards(input: DecisionCardBuilderInput): DecisionCard[] {
  const config = getModelKPIConfig(input.modelId);
  const cards: DecisionCard[] = [];

  // 1. DEMAND Card
  cards.push(buildDemandCard(config, input.metrics, input.insights?.demandInsight));

  // 2. EFFICIENCY Card
  cards.push(buildEfficiencyCard(config, input.metrics, input.insights?.efficiencyInsight));

  // 3. PIPELINE Card
  cards.push(buildPipelineCard(config, input.metrics, input.insights?.pipelineInsight));

  // 4. CHANNELS Card
  cards.push(buildChannelsCard(config, input.metrics, input.insights?.channelsInsight));

  // 5. BUDGET Card
  cards.push(buildBudgetCard(config, input.metrics, input.insights?.budgetInsight));

  return cards;
}

/**
 * Build DEMAND card (top-of-funnel metrics)
 */
function buildDemandCard(
  config: any,
  metrics: MetricsData,
  insight?: string
): DecisionCard {
  const primaryKPI = config.demandKPIs[0]; // First KPI is primary
  const primaryMetric = createMetricValue(
    primaryKPI.key,
    primaryKPI.label,
    primaryKPI.format,
    metrics
  );

  const supportingMetrics = config.demandKPIs.slice(1).map((kpi: any) =>
    createMetricValue(kpi.key, kpi.label, kpi.format, metrics)
  );

  return {
    area: 'demand',
    title: 'Demanda',
    status: determineMetricStatus(primaryMetric),
    primaryMetric,
    supportingMetrics,
    insight: insight || determineDefaultInsight('demand', primaryMetric),
    recommendedAction: determineAction('demand', metrics),
  };
}

/**
 * Build EFFICIENCY card (acquisition cost, conversion metrics)
 */
function buildEfficiencyCard(
  config: any,
  metrics: MetricsData,
  insight?: string
): DecisionCard {
  const primaryKPI = config.efficiencyKPIs[0];
  const primaryMetric = createMetricValue(
    primaryKPI.key,
    primaryKPI.label,
    primaryKPI.format,
    metrics
  );

  const supportingMetrics = config.efficiencyKPIs.slice(1).map((kpi: any) =>
    createMetricValue(kpi.key, kpi.label, kpi.format, metrics)
  );

  return {
    area: 'efficiency',
    title: 'Eficiência',
    status: determineMetricStatus(primaryMetric),
    primaryMetric,
    supportingMetrics,
    insight: insight || determineDefaultInsight('efficiency', primaryMetric),
    recommendedAction: determineAction('efficiency', metrics),
  };
}

/**
 * Build PIPELINE card (deals, revenue, funnel progression)
 */
function buildPipelineCard(
  config: any,
  metrics: MetricsData,
  insight?: string
): DecisionCard {
  const primaryKPI = config.pipelineKPIs[0];
  const primaryMetric = createMetricValue(
    primaryKPI.key,
    primaryKPI.label,
    primaryKPI.format,
    metrics
  );

  const supportingMetrics = config.pipelineKPIs.slice(1).map((kpi: any) =>
    createMetricValue(kpi.key, kpi.label, kpi.format, metrics)
  );

  return {
    area: 'pipeline',
    title: 'Pipeline/Receita',
    status: determineMetricStatus(primaryMetric),
    primaryMetric,
    supportingMetrics,
    insight:
      insight ||
      (!primaryMetric.isConnected
        ? 'Dados comerciais não conectados — Fonte sugerida: CRM, HubSpot ou input manual'
        : determineDefaultInsight('pipeline', primaryMetric)),
    recommendedAction: determineAction('pipeline', metrics),
  };
}

/**
 * Build CHANNELS card (performance by channel)
 */
function buildChannelsCard(
  config: any,
  metrics: MetricsData,
  insight?: string
): DecisionCard {
  // Find best and worst channels
  const channelMetrics = config.channelMetrics.map((ch: string) =>
    createMetricValue(ch, ch, 'num', metrics)
  );

  const bestChannel = channelMetrics.reduce(
    (best: any, current: any) =>
      (current.value || 0) > (best.value || 0) ? current : best,
    channelMetrics[0]
  );

  const worstChannel = channelMetrics.reduce(
    (worst: any, current: any) =>
      (current.value || 0) < (worst.value || 0) ? current : worst,
    channelMetrics[0]
  );

  const primaryMetric = bestChannel;
  const supportingMetrics = [worstChannel];

  return {
    area: 'channels',
    title: 'Canais',
    status: 'healthy',
    primaryMetric: {
      ...primaryMetric,
      label: `${primaryMetric.label} (Melhor)`,
    },
    supportingMetrics: supportingMetrics.map((m) => ({
      ...m,
      label: `${m.label} (Pior)`,
    })),
    insight:
      insight ||
      `${bestChannel.label} é o melhor canal. ${worstChannel.label} precisa de otimização.`,
    recommendedAction: `Aumentar investimento em ${bestChannel.label}. Revisar ${worstChannel.label}.`,
  };
}

/**
 * Build BUDGET card (planned vs actual)
 */
function buildBudgetCard(
  config: any,
  metrics: MetricsData,
  insight?: string
): DecisionCard {
  const plannedMetric = createMetricValue('budgetPlanned', 'Planejado', 'money', metrics);
  const actualMetric = createMetricValue('budgetActual', 'Realizado', 'money', metrics);
  const balanceMetric = createMetricValue('budgetBalance', 'Saldo', 'money', metrics);

  const status =
    actualMetric.value && plannedMetric.value
      ? actualMetric.value > plannedMetric.value
        ? 'attention'
        : 'healthy'
      : 'critical';

  return {
    area: 'budget',
    title: 'Orçamento',
    status,
    primaryMetric: actualMetric,
    supportingMetrics: [plannedMetric, balanceMetric],
    insight:
      insight ||
      (actualMetric.value && plannedMetric.value
        ? `Gasto ${actualMetric.value > plannedMetric.value ? 'acima' : 'dentro'} do planejado.`
        : 'Dados de orçamento não disponíveis.'),
    recommendedAction: `Revisar pacing do orçamento.`,
  };
}

/**
 * Create a metric value object from metrics data
 */
function createMetricValue(
  key: string,
  label: string,
  format: 'num' | 'money' | 'pct',
  metrics: MetricsData
): DecisionCardMetric {
  const data = metrics[key];

  return {
    label,
    value: data?.current || null,
    previous: data?.previous || null,
    format,
    isConnected: data !== undefined,
  };
}

/**
 * Determine metric status based on trend
 */
function determineMetricStatus(metric: DecisionCardMetric): 'healthy' | 'attention' | 'critical' {
  if (!metric.isConnected) return 'critical';
  if (metric.value === null || metric.previous === null) return 'critical';
  if (metric.previous === 0) return 'healthy';

  const change = (metric.value - metric.previous) / metric.previous;

  // For efficiency metrics (lower is better), flip the logic
  if (metric.label.includes('Custo') || metric.label.includes('CPL') || metric.label.includes('CAC')) {
    if (change > 0.15) return 'critical'; // Cost went up significantly
    if (change > 0.05) return 'attention';
  } else {
    if (change < -0.15) return 'critical'; // Volume dropped significantly
    if (change < -0.05) return 'attention';
  }

  return 'healthy';
}

/**
 * Default insight based on metric
 */
function determineDefaultInsight(
  area: string,
  metric: DecisionCardMetric
): string {
  if (!metric.isConnected) {
    return 'Métrica não conectada. Verifique configurações.';
  }
  if (metric.value === null) {
    return 'Sem dados neste período.';
  }
  if (metric.previous === null) {
    return 'Comparação com período anterior não disponível.';
  }

  const change = (metric.value - metric.previous) / metric.previous;

  if (area === 'demand') {
    return change > 0.1
      ? `${metric.label} em crescimento (+${(change * 100).toFixed(0)}%).`
      : change < -0.1
        ? `${metric.label} em queda (${(change * 100).toFixed(0)}%).`
        : `${metric.label} estável.`;
  }

  return `${metric.label}: ${(change * 100).toFixed(1)}% vs período anterior.`;
}

/**
 * Determine recommended action based on metrics
 */
function determineAction(area: string, metrics: MetricsData): string {
  const recommendations: Record<string, string> = {
    demand: 'Analisar origem do tráfego. Otimizar canais com melhor ROI.',
    efficiency: 'Revisar campanhas com menor eficiência. Testar novos públicos.',
    pipeline: 'Conectar dados de CRM. Validar qualidade de leads.',
    channels: 'Aumentar investimento no melhor canal. Otimizar pior canal.',
    budget: 'Revisar alinhamento de gastos com planejamento.',
  };

  return recommendations[area] || 'Revisar e otimizar.';
}
