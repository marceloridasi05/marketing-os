/**
 * Cause Analysis Library
 *
 * Diagnoses why detected issues occurred by analyzing metric correlations.
 * Assigns confidence levels based on evidence from related metrics.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MetricSnapshot {
  impressions: { current: number; previous: number; ratio: number };
  clicks: { current: number; previous: number; ratio: number };
  sessions: { current: number; previous: number; ratio: number };
  leads: { current: number; previous: number; ratio: number };
  conversions: { current: number; previous: number; ratio: number };
  cost: { current: number; previous: number; ratio: number };
}

export interface DerivedMetrics {
  ctr: { current: number; previous: number; ratio: number }; // clicks/impressions
  cpc: { current: number; previous: number; ratio: number }; // cost/clicks
  cpl: { current: number; previous: number; ratio: number }; // cost/leads
  session_to_lead: { current: number; previous: number; ratio: number };
  session_to_conversion: { current: number; previous: number; ratio: number };
  cost_per_conversion: { current: number; previous: number; ratio: number };
}

export interface EvidenceMetric {
  name: string;
  current: number;
  previous: number;
  delta: number; // % change
  direction: 'up' | 'down' | 'stable';
}

export interface Cause {
  description: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceMetrics: EvidenceMetric[];
}

export interface SuggestedAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metrics_to_monitor: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPct(ratio: number): string {
  if (ratio === null || isNaN(ratio)) return 'N/A';
  const sign = ratio >= 0 ? '+' : '';
  return `${sign}${Math.round(ratio * 100)}%`;
}

function getDirection(ratio: number): 'up' | 'down' | 'stable' {
  if (ratio > 0.05) return 'up';
  if (ratio < -0.05) return 'down';
  return 'stable';
}

function createEvidenceMetric(name: string, current: number, previous: number): EvidenceMetric {
  const delta = previous !== 0 ? (current - previous) / previous : 0;
  return {
    name,
    current: Math.round(current),
    previous: Math.round(previous),
    delta,
    direction: getDirection(delta),
  };
}

// ── Cause Detection Functions ──────────────────────────────────────────────────

/**
 * Analyze why leads dropped
 */
export function analyzeLeadsDrop(metrics: MetricSnapshot, derived: DerivedMetrics): Cause[] {
  const causes: Cause[] = [];
  const evidence: Record<string, EvidenceMetric[]> = {};

  // Root cause: Traffic down vs Conversion rate down
  const sessionDelta = metrics.sessions.ratio;
  const conversionDelta = derived.session_to_lead.ratio;

  if (sessionDelta < -0.1) {
    // Traffic dropped significantly
    causes.push({
      description:
        'Redução no tráfego (sessões caíram). Menos visitantes significa menos oportunidades de conversão em leads.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Sessões', metrics.sessions.current, metrics.sessions.previous),
        createEvidenceMetric('Cliques', metrics.clicks.current, metrics.clicks.previous),
        createEvidenceMetric('Impressões', metrics.impressions.current, metrics.impressions.previous),
      ],
    });
  }

  if (conversionDelta < -0.1) {
    // Conversion rate dropped
    causes.push({
      description:
        'Redução na taxa de conversão (menos sessões viram leads). Pode indicar problema na landing page, formulário ou oferta.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Taxa Sessão→Lead', derived.session_to_lead.current, derived.session_to_lead.previous),
        createEvidenceMetric('CPL', derived.cpl.current, derived.cpl.previous),
      ],
    });
  }

  // Secondary factor: Cost increased (efficiency problem)
  const costDelta = metrics.cost.ratio;
  if (costDelta > 0.15) {
    causes.push({
      description: 'Custo aumentou enquanto leads caíram. Problema de eficiência ou qualidade dos leads.',
      confidence: 'medium',
      evidenceMetrics: [
        createEvidenceMetric('Custo Total', metrics.cost.current, metrics.cost.previous),
        createEvidenceMetric('CPL', derived.cpl.current, derived.cpl.previous),
      ],
    });
  }

  // Possible factor: CTR dropped (ad visibility issue)
  const ctrDelta = derived.ctr.ratio;
  if (ctrDelta < -0.1) {
    causes.push({
      description: 'CTR caiu, indicando que menos people estão clicando nos anúncios.',
      confidence: 'low',
      evidenceMetrics: [createEvidenceMetric('CTR', derived.ctr.current, derived.ctr.previous)],
    });
  }

  return causes.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}

/**
 * Analyze why conversions dropped
 */
export function analyzeConversionsDrop(metrics: MetricSnapshot, derived: DerivedMetrics): Cause[] {
  const causes: Cause[] = [];

  // Check if leads also dropped
  const leadsDelta = metrics.leads.ratio;
  if (leadsDelta < -0.1) {
    causes.push({
      description: 'Leads caíram primeiro, causando redução em conversões. Problema na geração de leads.',
      confidence: 'high',
      evidenceMetrics: [createEvidenceMetric('Leads', metrics.leads.current, metrics.leads.previous)],
    });
  } else if (leadsDelta > -0.05 && leadsDelta < 0.05) {
    // Leads stable but conversions dropped
    causes.push({
      description:
        'Leads estáveis mas conversões caíram. Problema no funil de vendas ou nurturing (lead→customer).',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Leads', metrics.leads.current, metrics.leads.previous),
        createEvidenceMetric('Taxa Lead→Conversão', derived.session_to_conversion.current, derived.session_to_conversion.previous),
      ],
    });
  }

  // Traffic related
  const sessionDelta = metrics.sessions.ratio;
  if (sessionDelta < -0.1) {
    causes.push({
      description: 'Redução no tráfego causou queda em conversões.',
      confidence: 'medium',
      evidenceMetrics: [createEvidenceMetric('Sessões', metrics.sessions.current, metrics.sessions.previous)],
    });
  }

  return causes;
}

/**
 * Analyze why CPL (cost per lead) increased
 */
export function analyzeCPLIncrease(metrics: MetricSnapshot, derived: DerivedMetrics): Cause[] {
  const causes: Cause[] = [];

  const cplDelta = derived.cpl.ratio;
  const leadsDelta = metrics.leads.ratio;
  const costDelta = metrics.cost.ratio;
  const conversionDelta = derived.session_to_lead.ratio;

  // Scenario 1: Leads dropped while cost stayed same
  if (leadsDelta < -0.1 && costDelta > -0.05) {
    causes.push({
      description: 'Leads caíram mas o custo permaneceu similar. CPL sobe automaticamente quando há menos conversões.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Leads', metrics.leads.current, metrics.leads.previous),
        createEvidenceMetric('Custo', metrics.cost.current, metrics.cost.previous),
        createEvidenceMetric('CPL', derived.cpl.current, derived.cpl.previous),
      ],
    });
  }

  // Scenario 2: Conversion rate dropped
  if (conversionDelta < -0.1) {
    causes.push({
      description:
        'Taxa de conversão (sessão→lead) caiu. Menos visitantes estão se tornando leads, aumentando o CPL.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Taxa Sessão→Lead', derived.session_to_lead.current, derived.session_to_lead.previous),
      ],
    });
  }

  // Scenario 3: Cost increased while leads flat
  if (costDelta > 0.15 && leadsDelta > -0.05 && leadsDelta < 0.05) {
    causes.push({
      description: 'Custo aumentou sem aumento em leads. Possível aumento em CPC ou mudança de mix de canais.',
      confidence: 'medium',
      evidenceMetrics: [
        createEvidenceMetric('CPC', derived.cpc.current, derived.cpc.previous),
        createEvidenceMetric('Custo', metrics.cost.current, metrics.cost.previous),
      ],
    });
  }

  return causes;
}

/**
 * Analyze why CTR (click-through rate) dropped
 */
export function analyzeCTRDrop(metrics: MetricSnapshot, derived: DerivedMetrics): Cause[] {
  const causes: Cause[] = [];

  const ctrDelta = derived.ctr.ratio;
  const impressionsDelta = metrics.impressions.ratio;
  const cpcDelta = derived.cpc.ratio;

  // Scenario 1: Impressions increased (ad fatigue or audience overlap)
  if (impressionsDelta > 0.1) {
    causes.push({
      description:
        'Impressões aumentaram enquanto cliques não acompanharam. Pode indicar fadiga de anúncio ou publicidade repetida.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Impressões', metrics.impressions.current, metrics.impressions.previous),
        createEvidenceMetric('Cliques', metrics.clicks.current, metrics.clicks.previous),
        createEvidenceMetric('CTR', derived.ctr.current, derived.ctr.previous),
      ],
    });
  }

  // Scenario 2: CPC increased (bid competition)
  if (cpcDelta > 0.2) {
    causes.push({
      description:
        'CPC subiu, indicando maior competição nos leilões. Sistema pode ter reduzido volume para manter orçamento.',
      confidence: 'medium',
      evidenceMetrics: [createEvidenceMetric('CPC', derived.cpc.current, derived.cpc.previous)],
    });
  }

  // Scenario 3: Generic deterioration
  if (ctrDelta < -0.15 && impressionsDelta > -0.05 && impressionsDelta < 0.05) {
    causes.push({
      description: 'CTR caiu sem mudanças em volume. Possível qualidade criativa reduzida ou segmentação menos precisa.',
      confidence: 'medium',
      evidenceMetrics: [
        createEvidenceMetric('CTR', derived.ctr.current, derived.ctr.previous),
        createEvidenceMetric('Impressões', metrics.impressions.current, metrics.impressions.previous),
      ],
    });
  }

  return causes;
}

/**
 * Analyze why sessions dropped
 */
export function analyzeSessionsDrop(metrics: MetricSnapshot, derived: DerivedMetrics): Cause[] {
  const causes: Cause[] = [];

  const sessionsDelta = metrics.sessions.ratio;
  const clicksDelta = metrics.clicks.ratio;
  const impressionsDelta = metrics.impressions.ratio;

  // Root cause: Clicks down
  if (clicksDelta < -0.1) {
    causes.push({
      description: 'Cliques caíram, reduzindo o tráfego para o site. Menos pessoas clicando nos anúncios.',
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Cliques', metrics.clicks.current, metrics.clicks.previous),
        createEvidenceMetric('CTR', derived.ctr.current, derived.ctr.previous),
      ],
    });
  }

  // Root cause: Impressions down
  if (impressionsDelta < -0.1 && clicksDelta > -0.05) {
    causes.push({
      description: 'Impressões caíram. Anúncios exibidos menos vezes, resultado em menos cliques e sessões.',
      confidence: 'high',
      evidenceMetrics: [createEvidenceMetric('Impressões', metrics.impressions.current, metrics.impressions.previous)],
    });
  }

  // Tracking issue: Sessions flat despite clicks
  const ctr = metrics.clicks.current / (metrics.impressions.current || 1);
  const prevCtr = metrics.clicks.previous / (metrics.impressions.previous || 1);
  if (
    clicksDelta > 0 &&
    sessionsDelta < -0.1 &&
    Math.abs(ctr - prevCtr) / prevCtr < 0.1
  ) {
    causes.push({
      description: 'Cliques estáveis mas sessões caíram. Possível problema de tracking no Google Analytics.',
      confidence: 'medium',
      evidenceMetrics: [
        createEvidenceMetric('Cliques', metrics.clicks.current, metrics.clicks.previous),
        createEvidenceMetric('Sessões', metrics.sessions.current, metrics.sessions.previous),
      ],
    });
  }

  return causes;
}

/**
 * Analyze why budget was exceeded
 */
export function analyzeBudgetOverrun(
  metrics: MetricSnapshot,
  derived: DerivedMetrics,
  budgetRatio: number
): Cause[] {
  const causes: Cause[] = [];

  const costDelta = metrics.cost.ratio;
  const cpcDelta = derived.cpc.ratio;
  const clicksDelta = metrics.clicks.ratio;

  // Scenario 1: Volume increased (scale)
  if (clicksDelta > 0.2) {
    causes.push({
      description: `Orçamento aumentado para ${Math.round(budgetRatio * 100)}%. Volume de cliques subiu, consumindo mais.`,
      confidence: 'high',
      evidenceMetrics: [
        createEvidenceMetric('Cliques', metrics.clicks.current, metrics.clicks.previous),
        createEvidenceMetric('Custo', metrics.cost.current, metrics.cost.previous),
      ],
    });
  }

  // Scenario 2: CPC increased (competition)
  if (cpcDelta > 0.15 && clicksDelta > -0.05) {
    causes.push({
      description: 'CPC subiu. Leilões mais competitivos aumentaram custo por clique.',
      confidence: 'medium',
      evidenceMetrics: [createEvidenceMetric('CPC', derived.cpc.current, derived.cpc.previous)],
    });
  }

  // Scenario 3: Auto-scaling issue
  if (costDelta > 0.3 && clicksDelta < 0.1) {
    causes.push({
      description:
        'Custo subiu muito mas volume pouco mudou. Sistema de bidding/orçamento automático pode ter aumentado bids desnecessariamente.',
      confidence: 'medium',
      evidenceMetrics: [
        createEvidenceMetric('CPC', derived.cpc.current, derived.cpc.previous),
        createEvidenceMetric('Custo', metrics.cost.current, metrics.cost.previous),
      ],
    });
  }

  return causes;
}

/**
 * Comprehensive cause detection dispatcher
 */
export function detectCauses(
  metric: string,
  metrics: MetricSnapshot,
  derived: DerivedMetrics,
  delta: number,
  budgetRatio?: number
): Cause[] {
  const causes: Cause[] = [];

  if (delta < -0.1) {
    // Metric dropped significantly
    switch (metric) {
      case 'leads':
        return analyzeLeadsDrop(metrics, derived);
      case 'conversions':
        return analyzeConversionsDrop(metrics, derived);
      case 'sessions':
        return analyzeSessionsDrop(metrics, derived);
      case 'clicks':
        return analyzeSessionsDrop(metrics, derived); // Clicks drop → sessions drop
      case 'ctr':
        return analyzeCTRDrop(metrics, derived);
    }
  }

  if (metric === 'cpl' && delta > 0.15) {
    return analyzeCPLIncrease(metrics, derived);
  }

  if (metric === 'budget' && budgetRatio && budgetRatio > 1.15) {
    return analyzeBudgetOverrun(metrics, derived, budgetRatio);
  }

  return causes;
}

/**
 * Calculate derived metrics from base metrics
 */
export function calculateDerivedMetrics(metrics: MetricSnapshot): DerivedMetrics {
  const safe = (num: number) => (isFinite(num) ? num : 0);

  return {
    ctr: {
      current: safe(metrics.clicks.current / (metrics.impressions.current || 1)),
      previous: safe(metrics.clicks.previous / (metrics.impressions.previous || 1)),
      ratio: 0, // Will be calculated from current/previous
    },
    cpc: {
      current: safe(metrics.cost.current / (metrics.clicks.current || 1)),
      previous: safe(metrics.cost.previous / (metrics.clicks.previous || 1)),
      ratio: 0,
    },
    cpl: {
      current: safe(metrics.cost.current / (metrics.leads.current || 1)),
      previous: safe(metrics.cost.previous / (metrics.leads.previous || 1)),
      ratio: 0,
    },
    session_to_lead: {
      current: safe(metrics.leads.current / (metrics.sessions.current || 1)),
      previous: safe(metrics.leads.previous / (metrics.sessions.previous || 1)),
      ratio: 0,
    },
    session_to_conversion: {
      current: safe(metrics.conversions.current / (metrics.sessions.current || 1)),
      previous: safe(metrics.conversions.previous / (metrics.sessions.previous || 1)),
      ratio: 0,
    },
    cost_per_conversion: {
      current: safe(metrics.cost.current / (metrics.conversions.current || 1)),
      previous: safe(metrics.cost.previous / (metrics.conversions.previous || 1)),
      ratio: 0,
    },
  };
}
