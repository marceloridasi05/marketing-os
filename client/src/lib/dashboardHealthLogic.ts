/**
 * Dashboard Health Logic - Calculate health status and recommendations based on model
 */

import { getModelKPIConfig } from './modelKPIConfig';

// ── Inline Type Definitions (avoid dashboardTypes.ts import) ────────────────────

type HealthStatus = 'healthy' | 'attention' | 'critical';
type DataConfidence = 'high' | 'medium' | 'low';

interface DecisionCardMetric {
  label: string;
  value: number | null;
  previous: number | null;
  format: 'num' | 'money' | 'pct';
  status?: HealthStatus;
  isConnected: boolean;
  source?: string;
}

interface MarketingHealthSummary {
  status: HealthStatus;
  mainReason: string;
  recommendedAction: string;
  dataConfidence: DataConfidence;
  metrics: {
    topPositive: { label: string; value: string; change: number };
    topNegative: { label: string; value: string; change: number };
  };
}

interface ModelAwareRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  relatedMetrics: string[];
}

interface MetricValue {
  label: string;
  current: number | null;
  previous: number | null;
  format: 'num' | 'money' | 'pct';
  threshold?: { critical: number; warning: number }; // For trend thresholds
}

interface HealthInput {
  modelId: string;
  metrics: Record<string, MetricValue>;
  dataCompleteness: number; // 0-100: % of required metrics available
}

/**
 * Calculate overall health status based on model and metrics
 */
export function calculateHealthStatus(input: HealthInput): MarketingHealthSummary {
  const config = getModelKPIConfig(input.modelId);
  const requiredKPIs = config.demandKPIs.filter(k => k.isRequired) || [];

  // Calculate metric trends
  const metricTrends = Object.entries(input.metrics)
    .map(([key, metric]) => ({
      key,
      label: metric.label || `Métrica ${key}`, // Fallback if label is missing
      change: metric.previous && metric.previous !== 0
        ? ((metric.current || 0) - metric.previous) / metric.previous
        : 0,
      current: metric.current,
      isCritical: metric.threshold?.critical !== undefined,
    }))
    .filter(m => m.current !== null && m.label && m.label !== 'undefined') // Filter out undefined labels
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Find top positive and negative changes
  const topPositive = metricTrends.find(m => m.change > 0.05);
  const topNegative = metricTrends.find(m => m.change < -0.05);

  // Determine health status
  let status: HealthStatus = 'healthy';
  let mainReason = '';
  let recommendedAction = '';

  if (input.dataCompleteness < 40) {
    // Insufficient data
    status = 'critical';
    mainReason = 'Dados insuficientes para avaliação confiável.';
    recommendedAction = 'Complete os dados obrigatórios no período.';
  } else if (topNegative && topNegative.change < -0.20) {
    // Major decline
    status = 'critical';
    mainReason = `${topNegative.label} caiu ${Math.abs(topNegative.change * 100).toFixed(0)}%.`;
    recommendedAction = `Investigar causa da queda em ${topNegative.label}.`;
  } else if (topNegative && topNegative.change < -0.10) {
    // Moderate decline
    status = 'attention';
    mainReason = `${topNegative.label} caiu ${Math.abs(topNegative.change * 100).toFixed(0)}%.`;
    recommendedAction = `Revisar ${topNegative.label} e próximos passos do funil.`;
  } else if (
    topPositive &&
    topNegative &&
    topPositive.change > 0.10 &&
    topNegative.change < -0.08
  ) {
    // Mixed signals (conflicting metrics)
    status = 'attention';
    mainReason = `${topPositive.label} cresceu, mas ${topNegative.label} caiu.`;
    recommendedAction = `Correlacionar crescimento com queda para entender o padrão.`;
  } else if (topPositive && topPositive.change > 0.15) {
    // Strong growth
    status = 'healthy';
    mainReason = `${topPositive.label} cresceu ${(topPositive.change * 100).toFixed(0)}%.`;
    recommendedAction = `Manter momentum. Avaliar sustentabilidade.`;
  } else if (metricTrends.length === 0 || input.dataCompleteness < 60) {
    // Insufficient trend data
    status = 'attention';
    mainReason = 'Dados limitados para análise de tendência.';
    recommendedAction = 'Ampliar período de análise ou completar dados faltantes.';
  } else {
    // Stable
    status = 'healthy';
    mainReason = 'Operação estável sem grandes variações.';
    recommendedAction = 'Continuar monitorando. Buscar oportunidades de crescimento.';
  }

  // Determine data confidence
  let dataConfidence: DataConfidence = 'high';
  if (input.dataCompleteness < 60) dataConfidence = 'low';
  else if (input.dataCompleteness < 80) dataConfidence = 'medium';

  return {
    status,
    mainReason,
    recommendedAction,
    dataConfidence,
    metrics: {
      topPositive: topPositive ? {
        label: topPositive.label,
        value: formatMetricValue(topPositive.current, 'num'),
        change: topPositive.change * 100,
      } : { label: 'N/A', value: '—', change: 0 },
      topNegative: topNegative ? {
        label: topNegative.label,
        value: formatMetricValue(topNegative.current, 'num'),
        change: topNegative.change * 100,
      } : { label: 'N/A', value: '—', change: 0 },
    },
  };
}

/**
 * Format metric value for display
 */
function formatMetricValue(value: number | null, format: 'num' | 'money' | 'pct'): string {
  if (value === null) return '—';
  if (format === 'money') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  if (format === 'pct') return `${value.toFixed(1)}%`;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// ── Model-Aware Recommendations ────────────────────────────────────────────────

/**
 * Generate model-aware recommendations based on health status and metrics
 */
export function generateModelAwareRecommendations(
  modelId: string,
  healthStatus: MarketingHealthSummary,
  metrics: Record<string, { current: number | null; previous: number | null }>
): ModelAwareRecommendation[] {
  const recommendations: ModelAwareRecommendation[] = [];

  if (modelId === 'b2b_sales_led') {
    recommendations.push(...generateB2BSalesLedRecommendations(healthStatus, metrics));
  } else if (modelId === 'b2b_abm') {
    recommendations.push(...generateB2BABMRecommendations(healthStatus, metrics));
  } else if (modelId === 'plg') {
    recommendations.push(...generatePLGRecommendations(healthStatus, metrics));
  } else if (modelId === 'smb_inbound') {
    recommendations.push(...generateSMBInboundRecommendations(healthStatus, metrics));
  }

  return recommendations;
}

function generateB2BSalesLedRecommendations(
  health: MarketingHealthSummary,
  metrics: Record<string, any>
): ModelAwareRecommendation[] {
  const recs: ModelAwareRecommendation[] = [];

  // Check leads trend
  const leads = metrics.leadsGenerated;
  if (leads?.current && leads?.previous) {
    const change = (leads.current - leads.previous) / leads.previous;
    if (change > 0.15) {
      recs.push({
        priority: 'high',
        title: 'Validar qualidade de leads',
        description: 'Leads cresceram significativamente. Verificar se estão gerando MQLs e SQLs.',
        actionItems: [
          'Comparar lead quality com período anterior',
          'Verificar se conversão lead→MQL/SQL está mantida',
          'Revisar origem dos novos leads',
        ],
        relatedMetrics: ['leadsGenerated', 'mql', 'sql'],
      });
    } else if (change < -0.10) {
      recs.push({
        priority: 'high',
        title: 'Investigar queda em leads',
        description: 'Leads caíram. Analisar causa raiz.',
        actionItems: [
          'Revisar campanhas com maior gasto',
          'Verificar landing page conversion rate',
          'Analisar mudanças em targeting ou budget',
        ],
        relatedMetrics: ['leadsGenerated', 'sessions', 'gaClicks'],
      });
    }
  }

  // Check CPL trend
  const cpl = metrics.cpl;
  if (cpl?.current && cpl?.previous) {
    const change = (cpl.current - cpl.previous) / cpl.previous;
    if (change > 0.20) {
      recs.push({
        priority: 'high',
        title: 'Revisar campanhas de alto CPL',
        description: 'Custo por lead subiu. Possível saturação de audiência ou targeting fraco.',
        actionItems: [
          'Identificar campanhas com CPL acima da média',
          'Avaliar frequência de anúncios',
          'Testar novos públicos ou formatos',
        ],
        relatedMetrics: ['cpl', 'gaClicks', 'leadsGenerated'],
      });
    }
  }

  // Check pipeline connection
  if (!metrics.mql?.current && !metrics.sql?.current) {
    recs.push({
      priority: 'medium',
      title: 'Conectar dados de pipeline',
      description: 'Dados de MQL/SQL não estão disponíveis.',
      actionItems: [
        'Preencher MQL/SQL na planilha manualmente ou via CRM',
        'Validar definição de MQL na organização',
        'Configurar integração com CRM',
      ],
      relatedMetrics: ['mql', 'sql'],
    });
  }

  return recs;
}

function generateB2BABMRecommendations(
  health: MarketingHealthSummary,
  metrics: Record<string, any>
): ModelAwareRecommendation[] {
  const recs: ModelAwareRecommendation[] = [];

  recs.push({
    priority: 'high',
    title: 'Validar engajamento de contas-alvo',
    description: 'Verificar se contas-alvo estão engajando com conteúdo/anúncios.',
    actionItems: [
      'Correlacionar contas-alvo com visitas identificadas',
      'Priorizar contas com múltiplas visitas',
      'Analisar padrão de engajamento por tipo de conta',
    ],
    relatedMetrics: ['accountsReached', 'accountsEngaged', 'engagementRate'],
  });

  recs.push({
    priority: 'high',
    title: 'Cruzar GA identificado com ICP',
    description: 'Identificar quais contas em target aparecem nos dados de tráfego.',
    actionItems: [
      'Usar ferramentas de identificação de conta (Clearbit, Lusha)',
      'Mapear domínios de contas-alvo no GA',
      'Criar audiência de ICP no GA',
    ],
    relatedMetrics: ['accountsReached', 'sessions'],
  });

  return recs;
}

function generatePLGRecommendations(
  health: MarketingHealthSummary,
  metrics: Record<string, any>
): ModelAwareRecommendation[] {
  const recs: ModelAwareRecommendation[] = [];

  if (!metrics.signups?.current) {
    recs.push({
      priority: 'high',
      title: 'Conectar dados de produto',
      description: 'Dados de signup e ativação são críticos para PLG.',
      actionItems: [
        'Integrar analytics de produto (Amplitude, Mixpanel)',
        'Rastrear eventos de signup e primeira ativação',
        'Configurar funil de ativação',
      ],
      relatedMetrics: ['signups', 'activations'],
    });
  } else {
    recs.push({
      priority: 'high',
      title: 'Otimizar funil free→pago',
      description: 'Comparar crescimento de tráfego com conversão para pago.',
      actionItems: [
        'Analisar taxa de conversão free→pago',
        'Identificar estágios com maior atrito',
        'Testar gatilhos de upgrade',
      ],
      relatedMetrics: ['signups', 'activations', 'payingCustomers'],
    });
  }

  return recs;
}

function generateSMBInboundRecommendations(
  health: MarketingHealthSummary,
  metrics: Record<string, any>
): ModelAwareRecommendation[] {
  const recs: ModelAwareRecommendation[] = [];

  recs.push({
    priority: 'high',
    title: 'Auditar páginas de alto tráfego e baixa conversão',
    description: 'SMB Inbound depende de otimização de landing pages.',
    actionItems: [
      'Identificar páginas com mais tráfego orgânico',
      'Verificar conversion rate de cada página',
      'Otimizar CTA, copy, design das top 3 páginas',
    ],
    relatedMetrics: ['organicSessions', 'conversionRate'],
  });

  recs.push({
    priority: 'high',
    title: 'Priorizar conteúdo com potencial SEO',
    description: 'Revisar tópicos com maior intenção de compra.',
    actionItems: [
      'Analisar keywords com maior traffic potential',
      'Criar/otimizar conteúdo para buyer intent keywords',
      'Medir ROI de conteúdo por tema',
    ],
    relatedMetrics: ['organicSessions', 'leads'],
  });

  return recs;
}
