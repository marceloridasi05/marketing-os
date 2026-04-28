/**
 * Universal Metric Classification Layer
 *
 * Supports dynamic funnel models. Each funnel model has its own stage definitions.
 * Provides fallback to legacy 5-stage model when needed.
 *
 * Rules:
 *  - getStage(metricKey, model) returns the stage for a metric in the given model.
 *  - For unknown metrics, returns null.
 *  - Dimension keys (date, section, strategy, …) return null — they are
 *    structural fields, not metrics, and should not appear in stage groups.
 */

import type { FunnelModel } from './funnelModels';

export type FunnelStage = 'awareness' | 'acquisition' | 'conversion' | 'revenue' | 'retention';

// ─── Stage metadata ───────────────────────────────────────────────────────────

export const STAGE_META: Record<FunnelStage, {
  label: string;
  description: string;
  color: string;          // badge Tailwind classes
  borderColor: string;    // border-t-* for cards
  iconColor: string;      // lucide icon color
  order: number;          // display order
}> = {
  awareness: {
    label: 'Awareness',
    description: 'Alcance e visibilidade da marca',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    borderColor: 'border-t-purple-500',
    iconColor: 'text-purple-500',
    order: 1,
  },
  acquisition: {
    label: 'Aquisicao',
    description: 'Geracao de trafego e novos visitantes',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    borderColor: 'border-t-blue-500',
    iconColor: 'text-blue-500',
    order: 2,
  },
  conversion: {
    label: 'Conversao',
    description: 'Transformacao de visitantes em leads ou clientes',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    borderColor: 'border-t-orange-500',
    iconColor: 'text-orange-500',
    order: 3,
  },
  revenue: {
    label: 'Receita',
    description: 'Impacto financeiro e retorno sobre investimento',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    borderColor: 'border-t-emerald-500',
    iconColor: 'text-emerald-500',
    order: 4,
  },
  retention: {
    label: 'Retencao',
    description: 'Engajamento e fidelizacao de clientes existentes',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    borderColor: 'border-t-rose-500',
    iconColor: 'text-rose-500',
    order: 5,
  },
};

export const STAGE_ORDER: FunnelStage[] = ['awareness', 'acquisition', 'conversion', 'revenue', 'retention'];

// ─── Dimension keys (structural — not classified) ─────────────────────────────

const DIMENSIONS = new Set([
  'date', 'section', 'strategy', 'expense_type', 'item_name',
  'objective', 'action', 'channel', 'status', 'platform', 'campaign',
  'hypothesis', 'expected_result', 'baseline', 'result', 'learning',
  'start_date', 'end_date', 'label', 'category', 'text', 'number',
  'month_value', 'ignore', '',
]);

// ─── Default classification per meaning key ───────────────────────────────────

const REGISTRY: Record<string, FunnelStage> = {
  // ── Awareness ───────────────────────────────────────────────────────────────
  impressions:          'awareness',
  li_impressions:       'awareness',
  ga_impressions:       'awareness',
  followers:            'awareness',
  followers_gained:     'awareness',
  page_views:           'awareness',
  unique_visitors:      'awareness',
  reach:                'awareness',
  brand_searches:       'awareness',
  views:                'awareness',
  video_views:          'awareness',
  story_views:          'awareness',

  // ── Acquisition ─────────────────────────────────────────────────────────────
  sessions:             'acquisition',
  users:                'acquisition',
  new_users:            'acquisition',
  clicks:               'acquisition',
  paid_clicks:          'acquisition',
  ga_clicks:            'acquisition',
  li_clicks:            'acquisition',
  organic_sessions:     'acquisition',
  blog_sessions:        'acquisition',
  blog_total_users:     'acquisition',
  blog_new_users:       'acquisition',
  ai_sessions:          'acquisition',
  ai_total_users:       'acquisition',
  traffic:              'acquisition',
  weekly_gains:         'acquisition',
  unpaid_sessions:      'acquisition',

  // ── Conversion ──────────────────────────────────────────────────────────────
  leads:                'conversion',
  leads_generated:      'conversion',
  conversions:          'conversion',
  ga_conversions:       'conversion',
  ctr:                  'conversion',
  ga_ctr:               'conversion',
  cvr:                  'conversion',
  ga_cvr:               'conversion',
  cpl:                  'conversion',
  cpc:                  'conversion',
  ga_cpc:               'conversion',
  li_cpc:               'conversion',
  signups:              'conversion',
  form_submissions:     'conversion',
  demos:                'conversion',
  trials:               'conversion',
  cost_per_conversion:  'conversion',
  ga_cost_per_conversion: 'conversion',

  // ── Revenue ──────────────────────────────────────────────────────────────────
  cost:                 'revenue',
  li_cost:              'revenue',
  ga_cost:              'revenue',
  planned_month:        'revenue',
  actual_month:         'revenue',
  planned_total:        'revenue',
  actual_total:         'revenue',
  revenue:              'revenue',
  mrr:                  'revenue',
  arr:                  'revenue',
  pipeline:             'revenue',
  deals:                'revenue',
  savings:              'revenue',
  budget:               'revenue',
  monthly_budget:       'revenue',
  ads_spend:            'revenue',
  mktg_spend:           'revenue',
  roi:                  'revenue',
  roas:                 'revenue',

  // ── Retention ────────────────────────────────────────────────────────────────
  reactions:            'retention',
  comments:             'retention',
  shares:               'retention',
  engagement:           'retention',
  engagement_rate:      'retention',
  churn:                'retention',
  churn_rate:           'retention',
  nps:                  'retention',
  active_users:         'retention',
  retention_rate:       'retention',
  repeat_visits:        'retention',
  followers_lost:       'retention',
  saves:                'retention',
  clicks_on_post:       'retention',
};

// ─── Human-readable labels for every metric key ──────────────────────────────

export const METRIC_LABELS: Record<string, string> = {
  // Awareness
  impressions: 'Impressões', li_impressions: 'Impressões LinkedIn',
  ga_impressions: 'Impressões Google Ads', followers: 'Seguidores',
  followers_gained: 'Seguidores Ganhos', page_views: 'Visualizações de Página',
  unique_visitors: 'Visitantes Únicos', reach: 'Alcance',
  brand_searches: 'Buscas de Marca', views: 'Views', video_views: 'Views de Vídeo',
  // Acquisition
  sessions: 'Sessões', users: 'Usuários', new_users: 'Novos Usuários',
  clicks: 'Cliques', paid_clicks: 'Cliques Pagos', ga_clicks: 'Cliques Google Ads',
  li_clicks: 'Cliques LinkedIn', organic_sessions: 'Sessões Orgânicas',
  blog_sessions: 'Sessões Blog', ai_sessions: 'Sessões via IA',
  traffic: 'Tráfego Total', weekly_gains: 'Ganhos Semanais',
  // Conversion
  leads: 'Leads', leads_generated: 'Leads Gerados', conversions: 'Conversões',
  ga_conversions: 'Conversões Google Ads', ctr: 'CTR', ga_ctr: 'CTR Google Ads',
  cvr: 'Taxa de Conversão', cpl: 'Custo por Lead', cpc: 'CPC',
  signups: 'Cadastros', form_submissions: 'Envios de Formulário',
  demos: 'Demos', trials: 'Trials', cost_per_conversion: 'Custo por Conversão',
  // Revenue
  cost: 'Custo', li_cost: 'Custo LinkedIn', ga_cost: 'Custo Google Ads',
  revenue: 'Receita', mrr: 'MRR', arr: 'ARR', pipeline: 'Pipeline',
  deals: 'Negócios Fechados', savings: 'Savings', budget: 'Budget',
  ads_spend: 'Gasto Ads', mktg_spend: 'Gasto Marketing', roi: 'ROI', roas: 'ROAS',
  // Retention
  reactions: 'Reações', comments: 'Comentários', shares: 'Compartilhamentos',
  engagement: 'Engajamento', engagement_rate: 'Taxa de Engajamento',
  churn: 'Churn', churn_rate: 'Taxa de Churn', nps: 'NPS',
  active_users: 'Usuários Ativos', retention_rate: 'Taxa de Retenção',
  repeat_visits: 'Visitas Recorrentes', followers_lost: 'Seguidores Perdidos',
};

export function getMetricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key;
}

/**
 * Grouped metric options for <select> / autocomplete inputs.
 * Each group contains the metrics belonging to that funnel stage.
 */
export const METRIC_OPTION_GROUPS: { stage: FunnelStage; label: string; options: { key: string; label: string }[] }[] =
  STAGE_ORDER.map(stage => ({
    stage,
    label: STAGE_META[stage].label,
    options: Object.entries(REGISTRY)
      .filter(([, s]) => s === stage)
      .map(([key]) => ({ key, label: METRIC_LABELS[key] ?? key }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the funnel stage for a meaning key.
 * Returns null for dimension/structural keys and unknown keys.
 * If an explicit override is provided it takes priority.
 */
export function getStage(
  meaningKey: string,
  override?: FunnelStage | null,
): FunnelStage | null {
  if (override) return override;
  if (DIMENSIONS.has(meaningKey)) return null;
  return REGISTRY[meaningKey] ?? null;
}

/**
 * Returns stage metadata, or null if not a metric.
 */
export function getStageMeta(
  meaningKey: string,
  override?: FunnelStage | null,
) {
  const stage = getStage(meaningKey, override);
  return stage ? STAGE_META[stage] : null;
}

/**
 * Groups an array of items by funnel stage.
 * Items whose key has no classification are dropped from the result.
 * Returned map preserves STAGE_ORDER ordering.
 */
export function groupByStage<T extends { key: string; classification?: FunnelStage | null }>(
  items: T[],
): Map<FunnelStage, T[]> {
  const map = new Map<FunnelStage, T[]>();
  for (const stage of STAGE_ORDER) map.set(stage, []);
  for (const item of items) {
    const stage = getStage(item.key, item.classification);
    if (!stage) continue;
    map.get(stage)!.push(item);
  }
  // Remove empty stages
  for (const [stage, arr] of map) {
    if (arr.length === 0) map.delete(stage);
  }
  return map;
}

// ─── Dynamic funnel model support ─────────────────────────────────────────────

/**
 * Get the stage ID for a metric in a given funnel model.
 * Returns null if metric is not found in any stage.
 */
export function getStageInModel(metricKey: string, model: FunnelModel | null): string | null {
  if (!model) return null;
  if (DIMENSIONS.has(metricKey)) return null;

  for (const stage of model.stages) {
    if (model.stageToMetrics[stage.id]?.includes(metricKey)) {
      return stage.id;
    }
  }
  return null;
}

/**
 * Group items by stage within a specific funnel model.
 * Items without a stage classification in the model are dropped.
 */
export function groupByStageInModel<T extends { key: string }>(
  items: T[],
  model: FunnelModel | null,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!model) return map;

  for (const stage of model.stages) {
    map.set(stage.id, []);
  }

  for (const item of items) {
    const stageId = getStageInModel(item.key, model);
    if (!stageId) continue;
    map.get(stageId)!.push(item);
  }

  // Remove empty stages
  for (const [stageId, arr] of map) {
    if (arr.length === 0) map.delete(stageId);
  }

  return map;
}

/**
 * Get stage metadata from a funnel model by stage ID.
 */
export function getStageMetaInModel(stageId: string, model: FunnelModel | null) {
  if (!model) return null;
  return model.stages.find(s => s.id === stageId) ?? null;
}
