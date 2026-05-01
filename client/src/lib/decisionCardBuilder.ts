/**
 * Decision Card Builder
 * Generates decision cards based on model and available metrics
 */

import { getMetricLabel, interpretMetricChange } from './metricLabels';

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
    getMetricLabel(primaryKPI.key) || primaryKPI.label,
    primaryKPI.format,
    metrics
  );

  const supportingMetrics = config.pipelineKPIs.slice(1).map((kpi: any) =>
    createMetricValue(
      kpi.key,
      getMetricLabel(kpi.key) || kpi.label,
      kpi.format,
      metrics
    )
  );

  // Check if any pipeline metrics are connected
  const anyMetricConnected = [primaryMetric, ...supportingMetrics].some(m => m.isConnected);

  // Determine status based on data availability
  let status: HealthStatus = determineMetricStatus(primaryMetric);
  if (!anyMetricConnected) {
    status = 'critical';
  }

  let pipelineInsight = '';
  let pipelineAction = '';

  if (!anyMetricConnected) {
    pipelineInsight = `Dados comerciais não conectados. Sem MQLs, SQLs, oportunidades, pipeline ou receita, não é possível validar o impacto dos leads gerados.`;
    pipelineAction = `Preencher dados comerciais manualmente ou conectar CRM (HubSpot, Salesforce, Pipedrive).`;
  } else {
    pipelineInsight =
      insight ||
      determineDefaultInsight('pipeline', primaryMetric);
    pipelineAction = determineAction('pipeline', metrics);
  }

  return {
    area: 'pipeline',
    title: 'Pipeline/Receita',
    status,
    primaryMetric,
    supportingMetrics,
    insight: pipelineInsight,
    recommendedAction: pipelineAction,
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
    createMetricValue(ch, getMetricLabel(ch), 'num', metrics)
  );

  // Filter channels with data
  const channelsWithData = channelMetrics.filter(ch => ch.value !== null && ch.value > 0);

  if (channelsWithData.length === 0) {
    return {
      area: 'channels',
      title: 'Canais',
      status: 'critical',
      primaryMetric: {
        label: 'Dados de canais',
        value: null,
        previous: null,
        format: 'num' as const,
        isConnected: false,
      },
      supportingMetrics: [],
      insight: 'Dados de canais não disponíveis',
      recommendedAction: 'Configurar rastreamento de canais em Google Analytics ou UTM parameters',
    };
  }

  const bestChannel = channelsWithData.reduce(
    (best: any, current: any) =>
      (current.value || 0) > (best.value || 0) ? current : best,
    channelsWithData[0]
  );

  const worstChannel = channelsWithData.reduce(
    (worst: any, current: any) =>
      (current.value || 0) < (worst.value || 0) ? current : worst,
    channelsWithData[0]
  );

  const primaryMetric = bestChannel;
  const supportingMetrics = [worstChannel];

  // Generate contextual insights
  let channelInsight = '';
  if (channelsWithData.length === 1) {
    channelInsight = `Canal com mais dados: ${bestChannel.label}. Ampliar análise para outros canais.`;
  } else {
    const volumeRatio = bestChannel.value && worstChannel.value
      ? ((bestChannel.value / worstChannel.value) * 100).toFixed(0)
      : 'N/A';
    channelInsight = `${bestChannel.label} concentra ${volumeRatio}% mais volume que ${worstChannel.label}. Revisar mix de investimento.`;
  }

  return {
    area: 'channels',
    title: 'Canais',
    status: 'healthy',
    primaryMetric,
    supportingMetrics,
    insight: insight || channelInsight,
    recommendedAction: `Analisar eficiência por ${bestChannel.label.toLowerCase()}. Otimizar ${worstChannel.label.toLowerCase()}.`,
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
  const plannedMetric = createMetricValue('budgetPlanned', getMetricLabel('budgetPlanned'), 'money', metrics);
  const actualMetric = createMetricValue('budgetActual', getMetricLabel('budgetActual'), 'money', metrics);
  const balanceMetric = createMetricValue('budgetBalance', getMetricLabel('budgetBalance'), 'money', metrics);

  let status: HealthStatus = 'healthy';
  let budgetInsight = '';
  let budgetAction = '';

  // Case 1: Both planned and actual available
  if (plannedMetric.value && actualMetric.value) {
    const usageRate = (actualMetric.value / plannedMetric.value) * 100;
    status = actualMetric.value > plannedMetric.value ? 'attention' : 'healthy';

    if (actualMetric.value > plannedMetric.value) {
      budgetInsight = `Orçamento ${actualMetric.value > plannedMetric.value ? 'excedido' : 'dentro'} do planejado. Gasto ${((actualMetric.value / plannedMetric.value - 1) * 100).toFixed(0)}% acima.`;
      budgetAction = `Revisar pacing. Se necessário, realocar budget para canais de melhor ROI.`;
    } else {
      budgetInsight = `Orçamento em pacing normal. ${usageRate.toFixed(0)}% utilizado do planejado.`;
      budgetAction = `Continuar monitorando. Validar se o saldo será utilizado.`;
    }
  }
  // Case 2: Only planned available
  else if (plannedMetric.value && !actualMetric.isConnected) {
    status = 'attention';
    budgetInsight = `Orçamento planejado disponível, mas gasto realizado não conectado.`;
    budgetAction = `Conectar gasto real de mídia ou mapear campo de spend na planilha.`;
  }
  // Case 3: No data
  else {
    status = 'critical';
    budgetInsight = `Dados de orçamento não conectados.`;
    budgetAction = `Preencher orçamento planejado e realizado para melhor controle.`;
  }

  return {
    area: 'budget',
    title: 'Orçamento',
    status,
    primaryMetric: actualMetric,
    supportingMetrics: [plannedMetric, balanceMetric],
    insight: insight || budgetInsight,
    recommendedAction: budgetAction,
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
    return 'Métrica não conectada. Verifique configurações de integração.';
  }
  if (metric.value === null) {
    return 'Sem dados neste período.';
  }
  if (metric.previous === null) {
    return 'Sem comparação com período anterior. Dados do período anterior não disponíveis.';
  }

  const change = (metric.value - metric.previous) / metric.previous;
  const displayLabel = metric.label.toLowerCase();

  if (area === 'demand') {
    if (change > 0.15) {
      return `${displayLabel} em crescimento forte (+${(change * 100).toFixed(0)}%). Validar sustentabilidade.`;
    } else if (change > 0.05) {
      return `${displayLabel} em crescimento moderado (+${(change * 100).toFixed(0)}%).`;
    } else if (change < -0.15) {
      return `${displayLabel} em queda acentuada (${(change * 100).toFixed(0)}%). Investigar causa raiz.`;
    } else if (change < -0.05) {
      return `${displayLabel} em queda moderada (${(change * 100).toFixed(0)}%).`;
    } else {
      return `${displayLabel} estável vs período anterior.`;
    }
  }

  if (area === 'efficiency') {
    // For efficiency metrics, down is good (costs)
    if (metric.label.includes('Custo') || metric.label.includes('Taxa')) {
      if (change > 0.1) {
        return `${displayLabel} aumentou ${(change * 100).toFixed(0)}%. Revisar campanhas e targeting.`;
      } else if (change < -0.1) {
        return `${displayLabel} diminuiu ${Math.abs(change * 100).toFixed(0)}%. Manter estratégia.`;
      } else {
        return `${displayLabel} estável.`;
      }
    }
  }

  return `${displayLabel} variou ${(change * 100).toFixed(0)}% vs período anterior.`;
}

/**
 * Determine recommended action based on metrics and current scenario
 */
function determineAction(area: string, metrics: MetricsData): string {
  const cpl = metrics.cpl?.current;
  const cplPrev = metrics.cpl?.previous;
  const sessions = metrics.sessions?.current;
  const sessionsPrev = metrics.sessions?.previous;
  const leads = metrics.leadsGenerated?.current;
  const leadsPrev = metrics.leadsGenerated?.previous;

  // Calculate trends
  const cplTrend = cpl && cplPrev && cplPrev > 0 ? (cpl - cplPrev) / cplPrev : null;
  const sessionsTrend = sessions && sessionsPrev && sessionsPrev > 0 ? (sessions - sessionsPrev) / sessionsPrev : null;
  const leadsTrend = leads && leadsPrev && leadsPrev > 0 ? (leads - leadsPrev) / leadsPrev : null;

  // Context: Demand growing but CPL rising (efficiency problem)
  if (sessionsTrend && sessionsTrend > 0.1 && cplTrend && cplTrend > 0.1) {
    return 'Demanda crescendo com eficiência caindo. Revisar campanhas com pior CPL. Validar qualidade de leads antes de aumentar budget.';
  }

  const recommendations: Record<string, string> = {
    demand: sessions && sessions > 0
      ? 'Validar origem do tráfego. Concentrar investimento em canais com melhor ROI comprovado.'
      : 'Aumentar visibilidade em canais top-of-funnel. Analisar mix de canais.',

    efficiency: cpl && cpl > 0
      ? 'Revisar campanhas e targeting. Testar novos públicos. Validar qualidade de leads.'
      : 'Configurar rastreamento de CPL. Sem métrica de custo por lead, difícil otimizar ROAS.',

    pipeline: 'Preencher dados de MQL, SQL, oportunidades e receita via CRM ou input manual. Crítico para validar impacto comercial.',

    channels: sessions && sessions > 0
      ? 'Aumentar investimento no melhor canal. Otimizar ou pausar canais com baixo volume.'
      : 'Implementar rastreamento de canais. Sem dados de canal, não há como otimizar mix.',

    budget: 'Revisar alinhamento de gastos reais vs planejado. Validar se o saldo será utilizado até fim do período.',
  };

  return recommendations[area] || 'Revisar dados e métricas relevantes da área.';
}
