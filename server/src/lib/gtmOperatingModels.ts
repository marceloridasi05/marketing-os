/**
 * GTM Operating Models: Real-world revenue operations aligned to business context
 *
 * Unlike generic funnel models (AIDA, AARRR, etc.), GTM Operating Models define
 * concrete stage progressions specific to each revenue model. Each model comes with:
 * - Stage definitions (semantic to the business operation)
 * - Default metric mappings (prevent empty dashboards)
 * - Data source strategies (where metrics come from)
 * - Required metrics per stage (track data completeness)
 */

export type GTMOperatingModelId = 'b2b_sales_led' | 'b2b_abm' | 'plg' | 'smb_inbound';

export type DataSourceType = 'auto_sync' | 'manual_entry' | 'calculated' | 'crm_integrated';

export interface GTMStageConfig {
  id: string;               // e.g., 'awareness', 'lead', 'opportunity'
  label: string;            // e.g., 'Awareness', 'Marketing Qualified Lead'
  description: string;      // Business context for this stage
  color: string;            // Tailwind classes for badge styling
  borderColor: string;      // Tailwind classes for card border
  iconColor: string;        // Tailwind classes for icon
  order: number;            // Display sequence

  // GTM-specific: data completeness tracking
  requiredMetrics: string[];      // Must have values for stage to be "ready"
  recommendedMetrics: string[];   // Nice-to-have metrics
  dataSourceType: DataSourceType; // Where data typically comes from
}

export interface GTMOperatingModel {
  id: GTMOperatingModelId;
  name: string;
  businessContext: string;  // E.g., "Enterprise B2B SaaS with direct sales team"
  description: string;

  // Core funnel structure
  stages: GTMStageConfig[];

  // Default metric mappings: stage → [metric keys]
  // User can override these in Google Sheets
  stageToMetrics: Record<string, string[]>;

  // Primary success metric for this model
  primarySuccessMetric: string; // E.g., 'revenue', 'arr', 'mrr', 'customers'

  // Key indicators that signal health/problems in this model
  keyHealthIndicators: {
    metric: string;
    direction: 'up' | 'down';  // Should go up or down to be healthy?
    reason: string;
  }[];
}

// ─── B2B SALES-LED (DEFAULT) ──────────────────────────────────────────────────

export const B2B_SALES_LED_MODEL: GTMOperatingModel = {
  id: 'b2b_sales_led',
  name: 'B2B Sales-Led',
  businessContext: 'Enterprise B2B SaaS with direct sales team and moderately long sales cycles',
  description:
    'Traditional B2B motion: Build awareness → drive leads → qualify leads → build pipeline → close deals → drive expansion',

  stages: [
    {
      id: 'awareness',
      label: 'Awareness',
      description: 'Build brand visibility and capture attention from target market',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      borderColor: 'border-t-indigo-500',
      iconColor: 'text-indigo-500',
      order: 1,
      requiredMetrics: ['impressions'],
      recommendedMetrics: ['reach', 'brand_searches'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Drive traffic and engagement from target audience',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 2,
      requiredMetrics: ['sessions'],
      recommendedMetrics: ['users', 'new_users', 'clicks', 'engagement_rate'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'leads',
      label: 'Leads',
      description: 'Capture leads through forms, demo requests, and sales inquiries',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 3,
      requiredMetrics: ['leads_generated'],
      recommendedMetrics: ['cpl', 'cpc', 'lead_source'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'sqls',
      label: 'SQLs',
      description: 'Sales Qualified Leads: leads that sales team has accepted for qualification',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      borderColor: 'border-t-amber-500',
      iconColor: 'text-amber-500',
      order: 4,
      requiredMetrics: ['sqls'], // Typically from CRM
      recommendedMetrics: ['sql_source', 'days_to_sql'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      description: 'Open sales opportunities with deal value and timeline',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 5,
      requiredMetrics: ['opportunities'],
      recommendedMetrics: ['pipeline_value', 'avg_deal_size', 'sales_cycle_days'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      description: 'Closed-won deals and revenue recognition',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 6,
      requiredMetrics: ['revenue'],
      recommendedMetrics: ['arr', 'mrr', 'deals_closed'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'expansion',
      label: 'Expansion',
      description: 'Land-and-expand: upsell, cross-sell, renewal, growth with existing customers',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      borderColor: 'border-t-rose-500',
      iconColor: 'text-rose-500',
      order: 7,
      requiredMetrics: ['nrr'],
      recommendedMetrics: ['expansion_revenue', 'churn_rate', 'ltv'],
      dataSourceType: 'crm_integrated',
    },
  ],

  stageToMetrics: {
    awareness: [
      'impressions',
      'ga_impressions',
      'li_impressions',
      'reach',
      'brand_searches',
      'page_views',
      'unique_visitors',
    ],
    engagement: [
      'sessions',
      'users',
      'new_users',
      'clicks',
      'ga_clicks',
      'li_clicks',
      'paid_clicks',
      'organic_sessions',
      'engagement',
      'engagement_rate',
      'cpc',
      'ga_cpc',
      'li_cpc',
    ],
    leads: [
      'leads',
      'leads_generated',
      'form_submissions',
      'cpl',
      'cost_per_lead',
    ],
    sqls: [
      'sqls',
      'sql_count',
      'sql_source',
    ],
    opportunities: [
      'opportunities',
      'pipeline_value',
      'avg_deal_size',
    ],
    revenue: [
      'revenue',
      'arr',
      'mrr',
      'deals',
      'deals_closed',
      'roas',
      'roi',
    ],
    expansion: [
      'nrr',
      'expansion_revenue',
      'churn_rate',
      'ltv',
      'ltv_cac_ratio',
    ],
  },

  primarySuccessMetric: 'revenue',

  keyHealthIndicators: [
    { metric: 'impressions', direction: 'up', reason: 'More awareness = more top-of-funnel' },
    { metric: 'sessions', direction: 'up', reason: 'More engaged traffic' },
    { metric: 'leads_generated', direction: 'up', reason: 'More lead volume' },
    { metric: 'sqls', direction: 'up', reason: 'More sales-qualified pipeline' },
    { metric: 'revenue', direction: 'up', reason: 'Primary success metric' },
    { metric: 'churn_rate', direction: 'down', reason: 'Lower churn = better retention' },
  ],
};

// ─── B2B ABM / ENTERPRISE ──────────────────────────────────────────────────────

export const B2B_ABM_MODEL: GTMOperatingModel = {
  id: 'b2b_abm',
  name: 'B2B ABM / Enterprise',
  businessContext: 'High-ticket B2B SaaS using Account-Based Marketing strategy',
  description:
    'Account-first motion: Identify target accounts → drive account awareness → engage buying committee → build influence → move to pipeline → close deals',

  stages: [
    {
      id: 'account_awareness',
      label: 'Account Awareness',
      description: 'Identify and generate awareness with target accounts',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      borderColor: 'border-t-indigo-500',
      iconColor: 'text-indigo-500',
      order: 1,
      requiredMetrics: ['account_sessions', 'targeted_accounts'],
      recommendedMetrics: ['account_reach'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Drive engagement and interaction with key decision makers',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 2,
      requiredMetrics: ['decision_makers_engaged'],
      recommendedMetrics: ['multi_threaded_contacts', 'engagement_velocity'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'influence',
      label: 'Influence',
      description: 'Build influence and buying consensus within the account',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      borderColor: 'border-t-amber-500',
      iconColor: 'text-amber-500',
      order: 3,
      requiredMetrics: ['buying_committee_size', 'sals'],
      recommendedMetrics: ['influence_score', 'consensus_stage'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Open pipeline deals with high engagement and value',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 4,
      requiredMetrics: ['opportunities'],
      recommendedMetrics: ['pipeline_value', 'avg_deal_size', 'account_fit_score'],
      dataSourceType: 'crm_integrated',
    },
    {
      id: 'closed_revenue',
      label: 'Closed Revenue',
      description: 'Closed-won deals and account expansion',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 5,
      requiredMetrics: ['revenue'],
      recommendedMetrics: ['arr', 'deals_closed', 'net_new_revenue'],
      dataSourceType: 'crm_integrated',
    },
  ],

  stageToMetrics: {
    account_awareness: [
      'impressions',
      'account_sessions',
      'targeted_accounts',
      'reach',
    ],
    engagement: [
      'decision_makers_engaged',
      'multi_threaded_contacts',
      'sessions',
      'engagement_rate',
    ],
    influence: [
      'buying_committee_size',
      'sals',
      'consensus_stage',
      'influence_score',
    ],
    pipeline: [
      'opportunities',
      'pipeline_value',
      'avg_deal_size',
      'account_fit_score',
    ],
    closed_revenue: [
      'revenue',
      'arr',
      'deals_closed',
      'net_new_revenue',
      'ltv',
    ],
  },

  primarySuccessMetric: 'revenue',

  keyHealthIndicators: [
    { metric: 'account_sessions', direction: 'up', reason: 'More account engagement' },
    { metric: 'decision_makers_engaged', direction: 'up', reason: 'More decision makers = better deal odds' },
    { metric: 'pipeline_value', direction: 'up', reason: 'More open opportunities' },
    { metric: 'revenue', direction: 'up', reason: 'Primary success metric' },
  ],
};

// ─── PLG (PRODUCT-LED GROWTH) ──────────────────────────────────────────────────

export const PLG_MODEL: GTMOperatingModel = {
  id: 'plg',
  name: 'PLG / Product-Led',
  businessContext: 'SaaS with product-led growth: free tier, self-onboarding, usage-based expansion',
  description:
    'Product-first motion: Drive awareness → get signups → activate users → build retention → drive expansion → viral growth',

  stages: [
    {
      id: 'awareness',
      label: 'Awareness',
      description: 'Build brand and product awareness in target market',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      borderColor: 'border-t-indigo-500',
      iconColor: 'text-indigo-500',
      order: 1,
      requiredMetrics: ['impressions'],
      recommendedMetrics: ['reach', 'brand_searches'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'signup',
      label: 'Signup',
      description: 'Drive free trial or freemium signups',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 2,
      requiredMetrics: ['signups', 'new_accounts'],
      recommendedMetrics: ['signup_source', 'weekly_signups'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'activation',
      label: 'Activation',
      description: 'Get users to core "aha!" moment and active usage',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 3,
      requiredMetrics: ['active_users'],
      recommendedMetrics: ['activation_rate', 'time_to_aha', 'daily_active_users'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'retention',
      label: 'Retention',
      description: 'Keep users active and engaged long-term',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      borderColor: 'border-t-amber-500',
      iconColor: 'text-amber-500',
      order: 4,
      requiredMetrics: ['retention_rate'],
      recommendedMetrics: ['churn_rate', 'monthly_active_users', 'engagement_score'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'expansion',
      label: 'Expansion',
      description: 'Upgrade users to paid plans and grow usage',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 5,
      requiredMetrics: ['paying_customers', 'mrr'],
      recommendedMetrics: ['arr', 'conversion_rate', 'upsell_revenue'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'virality',
      label: 'Virality',
      description: 'Drive referrals and viral growth within product',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderColor: 'border-t-emerald-500',
      iconColor: 'text-emerald-500',
      order: 6,
      requiredMetrics: ['viral_coefficient'],
      recommendedMetrics: ['referral_rate', 'referred_signups'],
      dataSourceType: 'auto_sync',
    },
  ],

  stageToMetrics: {
    awareness: [
      'impressions',
      'reach',
      'brand_searches',
      'page_views',
    ],
    signup: [
      'signups',
      'new_accounts',
      'signup_source',
      'weekly_signups',
    ],
    activation: [
      'active_users',
      'activation_rate',
      'time_to_aha',
      'daily_active_users',
    ],
    retention: [
      'retention_rate',
      'churn_rate',
      'monthly_active_users',
      'engagement_score',
    ],
    expansion: [
      'paying_customers',
      'mrr',
      'arr',
      'conversion_rate',
      'upsell_revenue',
    ],
    virality: [
      'viral_coefficient',
      'referral_rate',
      'referred_signups',
    ],
  },

  primarySuccessMetric: 'arr',

  keyHealthIndicators: [
    { metric: 'signups', direction: 'up', reason: 'More signups = larger funnel' },
    { metric: 'activation_rate', direction: 'up', reason: 'Higher activation = better product' },
    { metric: 'retention_rate', direction: 'up', reason: 'Retention drives LTV' },
    { metric: 'mrr', direction: 'up', reason: 'Primary revenue metric' },
    { metric: 'churn_rate', direction: 'down', reason: 'Lower churn = longer customer lifetime' },
  ],
};

// ─── SMB / INBOUND ────────────────────────────────────────────────────────────

export const SMB_INBOUND_MODEL: GTMOperatingModel = {
  id: 'smb_inbound',
  name: 'SMB / Inbound',
  businessContext: 'Content-driven acquisition for SMB market: organic search, blog, educational content',
  description:
    'Inbound motion: Create content → capture organic traffic → convert to leads → nurture → sell → onboard',

  stages: [
    {
      id: 'organic_awareness',
      label: 'Organic Awareness',
      description: 'Organic search visibility and content discovery',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      borderColor: 'border-t-indigo-500',
      iconColor: 'text-indigo-500',
      order: 1,
      requiredMetrics: ['organic_sessions'],
      recommendedMetrics: ['organic_impressions', 'organic_ctr'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'engagement',
      label: 'Engagement',
      description: 'Content engagement and time spent on site',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      borderColor: 'border-t-blue-500',
      iconColor: 'text-blue-500',
      order: 2,
      requiredMetrics: ['sessions', 'pages_per_session'],
      recommendedMetrics: ['avg_session_duration', 'scroll_depth'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'lead_capture',
      label: 'Lead Capture',
      description: 'Capture leads via forms, email signup, etc.',
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      borderColor: 'border-t-cyan-500',
      iconColor: 'text-cyan-500',
      order: 3,
      requiredMetrics: ['leads_generated'],
      recommendedMetrics: ['form_conversion_rate', 'cpl'],
      dataSourceType: 'auto_sync',
    },
    {
      id: 'sales',
      label: 'Sales',
      description: 'Convert leads to customers through sales process',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-t-orange-500',
      iconColor: 'text-orange-500',
      order: 4,
      requiredMetrics: ['revenue'],
      recommendedMetrics: ['customers', 'avg_deal_size'],
      dataSourceType: 'crm_integrated',
    },
  ],

  stageToMetrics: {
    organic_awareness: [
      'organic_sessions',
      'organic_impressions',
      'organic_ctr',
      'organic_users',
    ],
    engagement: [
      'sessions',
      'pages_per_session',
      'avg_session_duration',
      'scroll_depth',
      'bounce_rate',
    ],
    lead_capture: [
      'leads_generated',
      'form_submissions',
      'form_conversion_rate',
      'cpl',
    ],
    sales: [
      'revenue',
      'customers',
      'avg_deal_size',
      'conversions',
    ],
  },

  primarySuccessMetric: 'revenue',

  keyHealthIndicators: [
    { metric: 'organic_sessions', direction: 'up', reason: 'More organic traffic' },
    { metric: 'leads_generated', direction: 'up', reason: 'More lead volume' },
    { metric: 'revenue', direction: 'up', reason: 'Primary success metric' },
  ],
};

/**
 * All GTM Operating Models
 * Indexed by model ID for easy lookup
 */
export const GTM_OPERATING_MODELS: Record<GTMOperatingModelId, GTMOperatingModel> = {
  b2b_sales_led: B2B_SALES_LED_MODEL,
  b2b_abm: B2B_ABM_MODEL,
  plg: PLG_MODEL,
  smb_inbound: SMB_INBOUND_MODEL,
};

/**
 * Model metadata for UI display
 */
export const GTM_MODEL_METADATA = {
  b2b_sales_led: {
    id: 'b2b_sales_led',
    displayName: 'B2B Sales-Led',
    priority: 1,
    description: 'Traditional B2B with direct sales',
    icon: 'TrendingUp',
  },
  b2b_abm: {
    id: 'b2b_abm',
    displayName: 'B2B ABM / Enterprise',
    priority: 2,
    description: 'Account-based marketing',
    icon: 'Target',
  },
  plg: {
    id: 'plg',
    displayName: 'PLG / Product-Led',
    priority: 3,
    description: 'Product-led growth',
    icon: 'Zap',
  },
  smb_inbound: {
    id: 'smb_inbound',
    displayName: 'SMB / Inbound',
    priority: 4,
    description: 'Content-driven SMB',
    icon: 'BookOpen',
  },
};
