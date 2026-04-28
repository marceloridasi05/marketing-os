/**
 * Preset growth funnel models with stage definitions and metric mappings.
 * Each model defines how metrics roll up into business-meaningful stages.
 */

export type FunnelModelId = 'aida' | 'aarrr' | 'tofu_mofu_bofu' | 'sales_led' | 'hourglass';

export interface FunnelStageConfig {
  id: string;           // e.g., 'awareness', 'mql', 'tofu'
  label: string;        // e.g., 'Awareness', 'Marketing Qualified Lead'
  description: string;  // e.g., 'Reachability of the brand'
  color: string;        // Tailwind bg+text classes for badges
  borderColor: string;  // border-t-* for cards
  iconColor: string;    // lucide icon color
  order: number;        // Display order in sequence
}

export interface FunnelModel {
  id: FunnelModelId;
  name: string;
  description: string;
  stages: FunnelStageConfig[];
  /** Map from stage.id to array of metric keys */
  stageToMetrics: Record<string, string[]>;
}

// ─── AIDA: Attention → Interest → Desire → Action ──────────────────────────────

export const AIDA_MODEL: FunnelModel = {
  id: 'aida',
  name: 'AIDA',
  description: 'Attention-Interest-Desire-Action: Classic awareness-to-action funnel',
  stages: [
    {
      id: 'attention',
      label: 'Atenção',
      description: 'Capturar awareness e visibilidade da marca',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      borderColor: 'border-t-purple-500',
      iconColor: 'text-purple-500',
      order: 1,
    },
    {
      id: 'interest',
      label: 'Interesse',
      description: 'Engajar e manter interesse do público',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 2,
    },
    {
      id: 'desire',
      label: 'Desejo',
      description: 'Construir desejo e demonstrar valor',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 3,
    },
    {
      id: 'action',
      label: 'Ação',
      description: 'Impulsionar conversão e vendas',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 4,
    },
  ],
  stageToMetrics: {
    attention: [
      'impressions', 'ga_impressions', 'li_impressions',
      'reach', 'views', 'brand_searches', 'page_views', 'unique_visitors',
      'followers', 'followers_gained',
    ],
    interest: [
      'sessions', 'users', 'new_users', 'clicks', 'ga_clicks', 'li_clicks',
      'paid_clicks', 'organic_sessions', 'traffic', 'unpaid_sessions',
      'blog_sessions', 'ai_sessions', 'weekly_gains',
      'engagement', 'engagement_rate', 'reactions', 'comments', 'shares',
      // Unit Economics - Acquisition
      'cac', 'cpc', 'ga_cpc', 'li_cpc', 'customer_acquisition_count', 'cac_trend',
      // Growth Loops - Input & Action metrics
      'loop_input_volume', 'loop_action_count', 'loop_action_conversion_rate',
    ],
    desire: [
      'leads', 'leads_generated', 'form_submissions', 'signups',
      'demos', 'trials', 'cpl', 'cpc', 'ga_cpc',
      'cost_per_conversion', 'ga_cost_per_conversion',
    ],
    action: [
      'conversions', 'ga_conversions', 'cvr', 'ga_cvr',
      'revenue', 'mrr', 'arr', 'deals', 'cost', 'ga_cost', 'li_cost',
      'roi', 'roas', 'savings',
      // Unit Economics - Revenue & LTV metrics
      'aov', 'ltv', 'ltv_cac_ratio', 'payback_months', 'churn_rate', 'monthly_arpu',
      // Growth Loops - Output, efficiency & health metrics
      'loop_output_count', 'loop_output_revenue', 'loop_cycle_time',
      'loop_cac', 'loop_ltv', 'loop_ltv_cac_ratio', 'loop_payback_months',
      'loop_health_score', 'loop_strength', 'loop_volume_growth',
    ],
  },
};

// ─── AARRR: Acquisition → Activation → Revenue → Retention → Referral ─────────

export const AARRR_MODEL: FunnelModel = {
  id: 'aarrr',
  name: 'AARRR',
  description: 'Acquisition-Activation-Revenue-Retention-Referral: SaaS growth model',
  stages: [
    {
      id: 'acquisition',
      label: 'Aquisição',
      description: 'Novos usuários e tráfego entrante',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 1,
    },
    {
      id: 'activation',
      label: 'Ativação',
      description: 'Primeiras ações e engajamento inicial',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 2,
    },
    {
      id: 'revenue',
      label: 'Receita',
      description: 'Geração de receita e monetização',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 3,
    },
    {
      id: 'retention',
      label: 'Retenção',
      description: 'Retenção e redução de churn',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      borderColor: 'border-t-rose-500',
      iconColor: 'text-rose-500',
      order: 4,
    },
    {
      id: 'referral',
      label: 'Indicação',
      description: 'Crescimento viral e indicações',
      color: 'bg-pink-100 text-pink-700 border-pink-200',
      borderColor: 'border-t-pink-500',
      iconColor: 'text-pink-500',
      order: 5,
    },
  ],
  stageToMetrics: {
    acquisition: [
      'new_users', 'signups', 'traffic', 'clicks', 'ga_clicks', 'li_clicks',
      'impressions', 'ga_impressions', 'li_impressions', 'sessions',
      'paid_clicks', 'organic_sessions', 'unpaid_sessions', 'weekly_gains',
      // Unit Economics - CAC metrics
      'cac', 'cpc', 'ga_cpc', 'li_cpc', 'customer_acquisition_count', 'cac_trend',
      // Growth Loops - Input & acquisition metrics
      'loop_input_volume', 'loop_action_count', 'loop_cac', 'loop_volume_growth',
    ],
    activation: [
      'active_users', 'engagement', 'engagement_rate', 'form_submissions',
      'demos', 'trials', 'ctr', 'ga_ctr', 'blog_sessions', 'ai_sessions',
      'reactions', 'comments', 'shares', 'page_views',
    ],
    revenue: [
      'conversions', 'ga_conversions', 'revenue', 'mrr', 'arr', 'pipeline',
      'deals', 'cost', 'ga_cost', 'li_cost', 'roi', 'roas',
      'cost_per_conversion', 'ga_cost_per_conversion',
      // Unit Economics - LTV & AOV metrics
      'aov', 'ltv', 'ltv_cac_ratio', 'payback_months', 'monthly_arpu',
      // Growth Loops - Output & monetization metrics
      'loop_output_count', 'loop_output_revenue', 'loop_ltv', 'loop_ltv_cac_ratio',
    ],
    retention: [
      'active_users', 'repeat_visits', 'churn', 'churn_rate',
      'engagement', 'engagement_rate', 'nps',
      'retention_rate', 'followers', 'followers_lost',
      // Unit Economics - Retention & LTV metrics
      'churn_rate', 'ltv', 'ltv_cac_ratio', 'payback_months', 'monthly_arpu',
      // Growth Loops - Sustainability & health metrics
      'loop_health_score', 'loop_strength', 'loop_payback_months', 'loop_cycle_time',
    ],
    referral: [
      'brand_searches', 'reach', 'followers', 'followers_gained',
      'shares', 'engagement_rate', 'views',
    ],
  },
};

// ─── TOFU/MOFU/BOFU: Top/Middle/Bottom of Funnel ─────────────────────────────

export const TOFU_MOFU_BOFU_MODEL: FunnelModel = {
  id: 'tofu_mofu_bofu',
  name: 'TOFU/MOFU/BOFU',
  description: 'Top-Middle-Bottom of Funnel: Three-stage awareness-to-close model',
  stages: [
    {
      id: 'tofu',
      label: 'TOFU',
      description: 'Topo do funil: awareness e alcance',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      borderColor: 'border-t-purple-500',
      iconColor: 'text-purple-500',
      order: 1,
    },
    {
      id: 'mofu',
      label: 'MOFU',
      description: 'Meio do funil: consideração e engajamento',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 2,
    },
    {
      id: 'bofu',
      label: 'BOFU',
      description: 'Fundo do funil: decisão e fechamento',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 3,
    },
  ],
  stageToMetrics: {
    tofu: [
      'impressions', 'ga_impressions', 'li_impressions',
      'reach', 'views', 'page_views', 'brand_searches',
      'followers', 'followers_gained', 'unique_visitors',
      'sessions', 'users', 'new_users', 'traffic',
    ],
    mofu: [
      'clicks', 'ga_clicks', 'li_clicks', 'leads', 'leads_generated',
      'form_submissions', 'signups', 'demos', 'engagement',
      'engagement_rate', 'reactions', 'comments', 'shares',
      'ctr', 'ga_ctr', 'cpl', 'cpc',
      // Unit Economics - CAC metrics
      'cac', 'customer_acquisition_count', 'cac_trend',
      // Growth Loops - Middle funnel metrics
      'loop_action_count', 'loop_action_conversion_rate', 'loop_cac',
    ],
    bofu: [
      'trials', 'proposals', 'pipeline', 'conversions', 'ga_conversions',
      'cvr', 'ga_cvr', 'deals', 'revenue', 'mrr', 'arr',
      'cost', 'ga_cost', 'li_cost', 'cost_per_conversion',
      'roi', 'roas',
      // Unit Economics - LTV & AOV metrics
      'aov', 'ltv', 'ltv_cac_ratio', 'payback_months', 'monthly_arpu', 'churn_rate',
      // Growth Loops - Bottom funnel efficiency metrics
      'loop_output_count', 'loop_output_revenue', 'loop_ltv_cac_ratio', 'loop_payback_months', 'loop_health_score',
    ],
  },
};

// ─── Sales-led: Lead → MQL → SQL → Opportunity → Revenue ─────────────────────

export const SALES_LED_MODEL: FunnelModel = {
  id: 'sales_led',
  name: 'Sales-led',
  description: 'Lead-MQL-SQL-Opportunity-Revenue: Sales-driven B2B funnel',
  stages: [
    {
      id: 'lead',
      label: 'Lead',
      description: 'Contatos e interessados iniciais',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 1,
    },
    {
      id: 'mql',
      label: 'MQL',
      description: 'Marketing Qualified Lead: prospects qualificados',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 2,
    },
    {
      id: 'sql',
      label: 'SQL',
      description: 'Sales Qualified Lead: prontos para venda',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 3,
    },
    {
      id: 'opportunity',
      label: 'Oportunidade',
      description: 'Em negociação e propostas',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      borderColor: 'border-t-amber-500',
      iconColor: 'text-amber-500',
      order: 4,
    },
    {
      id: 'revenue',
      label: 'Receita',
      description: 'Deals fechados e receita realizada',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 5,
    },
  ],
  stageToMetrics: {
    lead: [
      'form_submissions', 'signups', 'leads', 'leads_generated',
      'sessions', 'clicks', 'ga_clicks', 'paid_clicks',
      'impressions', 'ga_impressions', 'weekly_gains',
      // Unit Economics - CAC metrics
      'cac', 'cpc', 'ga_cpc', 'customer_acquisition_count', 'cac_trend',
      // Growth Loops - Lead generation metrics
      'loop_input_volume', 'loop_action_count', 'loop_cac', 'loop_volume_growth',
    ],
    mql: [
      'engagement', 'engagement_rate', 'email_opens', 'email_clicks',
      'content_downloads', 'webinar_registrations', 'demos',
      'ctr', 'ga_ctr', 'cpl', 'cost_per_conversion',
    ],
    sql: [
      'demos', 'trials', 'sales_calls', 'consultations',
      'cpc', 'ga_cpc', 'cost_per_lead',
    ],
    opportunity: [
      'proposals', 'pipeline', 'deal_value', 'sales_cycle_days',
      'discount_rate', 'probability',
    ],
    revenue: [
      'deals', 'conversions', 'ga_conversions', 'revenue',
      'mrr', 'arr', 'acv', 'cost', 'roi', 'roas',
      'cvr', 'ga_cvr',
      // Unit Economics - LTV & AOV metrics
      'aov', 'ltv', 'ltv_cac_ratio', 'payback_months', 'monthly_arpu', 'churn_rate',
      // Growth Loops - Deal & revenue metrics
      'loop_output_count', 'loop_output_revenue', 'loop_ltv', 'loop_ltv_cac_ratio', 'loop_payback_months',
      'loop_health_score', 'loop_strength',
    ],
  },
};

// ─── Hourglass: Full Customer Lifecycle Model ───────────────────────────────────
// Awareness → Interest → Consideration → Conversion → Retention → Expansion → Advocacy
// Designed for 7-stage growth with emphasis on post-conversion metrics

export const HOURGLASS_MODEL: FunnelModel = {
  id: 'hourglass',
  name: 'Hourglass',
  description: 'Awareness-Interest-Consideration-Conversion-Retention-Expansion-Advocacy: Complete customer lifecycle model',
  stages: [
    {
      id: 'awareness',
      label: 'Awareness',
      description: 'Capturar visibilidade e reconhecimento da marca',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      borderColor: 'border-t-purple-500',
      iconColor: 'text-purple-500',
      order: 1,
    },
    {
      id: 'interest',
      label: 'Interest',
      description: 'Envolver e manter interesse do público-alvo',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 2,
    },
    {
      id: 'consideration',
      label: 'Consideration',
      description: 'Nutrir leads em avaliação de solução',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 3,
    },
    {
      id: 'conversion',
      label: 'Conversion',
      description: 'Impulsionar decisão e fechamento de vendas',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 4,
    },
    {
      id: 'retention',
      label: 'Retention',
      description: 'Reter clientes e reduzir churn pós-venda',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      borderColor: 'border-t-amber-500',
      iconColor: 'text-amber-500',
      order: 5,
    },
    {
      id: 'expansion',
      label: 'Expansion',
      description: 'Expandir valor: upsells, cross-sells, crescimento de conta',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 6,
    },
    {
      id: 'advocacy',
      label: 'Advocacy',
      description: 'Transformar clientes em advogados da marca',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      borderColor: 'border-t-rose-500',
      iconColor: 'text-rose-500',
      order: 7,
    },
  ],
  stageToMetrics: {
    // Awareness: Brand reach and visibility
    awareness: [
      'impressions', 'ga_impressions', 'li_impressions',
      'reach', 'views', 'page_views', 'unique_visitors',
      'brand_searches', 'followers', 'followers_gained',
      'gsc_impressions', 'gsc_position',
    ],
    // Interest: Engagement and traffic attraction
    interest: [
      'clicks', 'ga_clicks', 'li_clicks', 'paid_clicks',
      'sessions', 'users', 'new_users', 'traffic',
      'organic_sessions', 'blog_sessions', 'ai_sessions',
      'weekly_gains', 'unpaid_sessions',
      'engagement', 'engagement_rate', 'reactions', 'comments', 'shares',
      'gsc_clicks', 'gsc_ctr',
      // Unit Economics - Click/Traffic cost metrics
      'cpc', 'ga_cpc', 'li_cpc', 'cac_trend',
      // Growth Loops - Input & traffic volume metrics
      'loop_input_volume', 'loop_action_count', 'loop_action_conversion_rate', 'loop_volume_growth',
    ],
    // Consideration: Lead generation and qualification
    consideration: [
      'leads', 'leads_generated', 'form_submissions', 'signups',
      'demos', 'trials', 'ctr', 'ga_ctr',
      'cpl', 'cpc', 'ga_cpc', 'li_cpc',
      'cost_per_conversion', 'ga_cost_per_conversion',
    ],
    // Conversion: Revenue and deal closure
    conversion: [
      'conversions', 'ga_conversions', 'cvr', 'ga_cvr',
      'revenue', 'mrr', 'arr', 'deals',
      'cost', 'ga_cost', 'li_cost',
      'roi', 'roas', 'pipeline',
      // Unit Economics - CAC & LTV metrics at conversion point
      'cac', 'cpc', 'aov', 'ltv', 'ltv_cac_ratio', 'customer_acquisition_count', 'payback_months',
      // Growth Loops - Output & efficiency metrics (core loop performance)
      'loop_output_count', 'loop_output_revenue', 'loop_cac', 'loop_ltv', 'loop_ltv_cac_ratio',
      'loop_payback_months', 'loop_cycle_time',
    ],
    // Retention: Customer loyalty and engagement
    retention: [
      'active_users', 'repeat_visits', 'engagement', 'engagement_rate',
      'churn', 'churn_rate', 'nps', 'retention_rate',
      'reactions', 'comments', 'shares',
      'followers', 'followers_lost',
      // Unit Economics - Lifetime value & churn metrics
      'ltv', 'ltv_cac_ratio', 'churn_rate', 'monthly_arpu', 'payback_months',
      // Growth Loops - Health, sustainability & loop quality metrics
      'loop_health_score', 'loop_strength', 'loop_is_self_sustaining', 'loop_cycle_time',
    ],
    // Expansion: Account growth and revenue increase
    expansion: [
      'mrr', 'arr',  // recurring revenue
      'deals',       // expansion deals
      'revenue',     // expansion revenue
      // Placeholders for future CRM integration:
      // 'expansion_deals', 'expansion_revenue', 'upsell_value', 'cross_sell_value'
    ],
    // Advocacy: Referrals and brand promotion
    advocacy: [
      'brand_searches', 'reach', 'followers', 'followers_gained',
      'shares', 'engagement_rate', 'views',
      'nps',
      // Placeholders for future integration:
      // 'referral_rate', 'referral_revenue', 'case_studies', 'testimonials'
    ],
  },
};

// ─── Model registry ───────────────────────────────────────────────────────────

export const PRESET_MODELS: Record<FunnelModelId, FunnelModel> = {
  aida: AIDA_MODEL,
  aarrr: AARRR_MODEL,
  tofu_mofu_bofu: TOFU_MOFU_BOFU_MODEL,
  sales_led: SALES_LED_MODEL,
  hourglass: HOURGLASS_MODEL,
};

export const PRESET_MODEL_IDS: FunnelModelId[] = ['aida', 'aarrr', 'tofu_mofu_bofu', 'sales_led', 'hourglass'];

/**
 * Get a preset model by ID, or undefined if not found.
 */
export function getPresetModel(modelId: string): FunnelModel | undefined {
  return PRESET_MODELS[modelId as FunnelModelId];
}

/**
 * Get all available preset models in order.
 */
export function getAllPresetModels(): FunnelModel[] {
  return PRESET_MODEL_IDS.map(id => PRESET_MODELS[id]);
}
