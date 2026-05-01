/**
 * Model-aware KPI Configuration
 * Maps each GTM Operating Model to its priority KPIs, stages, and interpretations
 */

import { ModelKPIConfig, KPIDefinition, DecisionCardArea } from '../types/dashboardTypes';

// ── B2B Sales-Led ──────────────────────────────────────────────────────────────

export const B2B_SALES_LED: ModelKPIConfig = {
  modelId: 'b2b_sales_led',
  priorityAreas: ['demand', 'efficiency', 'pipeline', 'channels', 'budget'],

  demandKPIs: [
    { key: 'sessions', label: 'Sessões', format: 'num', isRequired: true, defaultSource: 'GA' },
    { key: 'leadsGenerated', label: 'Leads', format: 'num', isRequired: true, defaultSource: 'GA/Manual' },
    { key: 'newUsers', label: 'Novos Usuários', format: 'num', isRequired: false, defaultSource: 'GA' },
  ],

  efficiencyKPIs: [
    { key: 'cpl', label: 'Custo por Lead', format: 'money', isRequired: true, defaultSource: 'Calculated' },
    { key: 'gaClicks', label: 'Cliques Ads', format: 'num', isRequired: false, defaultSource: 'GA Ads' },
    { key: 'gaImpressions', label: 'Impressões Ads', format: 'num', isRequired: false, defaultSource: 'GA Ads' },
  ],

  pipelineKPIs: [
    { key: 'mql', label: 'MQL', format: 'num', isRequired: false, defaultSource: 'CRM/Manual' },
    { key: 'sql', label: 'SQL', format: 'num', isRequired: false, defaultSource: 'CRM/Manual' },
    { key: 'opportunities', label: 'Oportunidades', format: 'num', isRequired: false, defaultSource: 'CRM' },
    { key: 'pipeline', label: 'Pipeline', format: 'money', isRequired: false, defaultSource: 'CRM' },
    { key: 'revenue', label: 'Receita', format: 'money', isRequired: false, defaultSource: 'CRM' },
  ],

  channelMetrics: ['googleAds', 'linkedinAds', 'metaAds', 'organic', 'direct'],
  funnelStages: ['Awareness', 'Consideration', 'Evaluation', 'Negotiation', 'Decision', 'Onboarding', 'Expansion'],
  criticalAlerts: ['leadsDrop', 'cplRise', 'conversionDrop', 'budgetOverrun'],
};

// ── B2B ABM / Enterprise ───────────────────────────────────────────────────────

export const B2B_ABM: ModelKPIConfig = {
  modelId: 'b2b_abm',
  priorityAreas: ['demand', 'efficiency', 'pipeline', 'channels', 'budget'],

  demandKPIs: [
    { key: 'targetAccounts', label: 'Contas-Alvo Identificadas', format: 'num', isRequired: true, defaultSource: 'Manual' },
    { key: 'accountsReached', label: 'Contas Alcançadas', format: 'num', isRequired: true, defaultSource: 'GA/Manual' },
    { key: 'accountsEngaged', label: 'Contas Engajadas', format: 'num', isRequired: true, defaultSource: 'GA/Manual' },
  ],

  efficiencyKPIs: [
    { key: 'engagementRate', label: 'Taxa de Engajamento', format: 'pct', isRequired: true, defaultSource: 'Calculated' },
    { key: 'cac', label: 'Custo de Aquisição', format: 'money', isRequired: false, defaultSource: 'Calculated' },
    { key: 'accountCoverage', label: 'Cobertura de ICP', format: 'pct', isRequired: false, defaultSource: 'Manual' },
  ],

  pipelineKPIs: [
    { key: 'decisionMakers', label: 'Tomadores de Decisão Identificados', format: 'num', isRequired: false, defaultSource: 'CRM/Manual' },
    { key: 'sal', label: 'Sales Accepted Leads', format: 'num', isRequired: false, defaultSource: 'CRM' },
    { key: 'opportunities', label: 'Oportunidades', format: 'num', isRequired: false, defaultSource: 'CRM' },
    { key: 'pipelineByAccount', label: 'Pipeline por Conta', format: 'money', isRequired: false, defaultSource: 'CRM' },
  ],

  channelMetrics: ['googleAds', 'linkedinAds', 'direct', 'referral'],
  funnelStages: ['Account Awareness', 'Engagement', 'Influence', 'Pipeline', 'Closed Revenue'],
  criticalAlerts: ['lowEngagement', 'accountChurn', 'smallPipeline', 'budgetOverrun'],
};

// ── PLG (Product-Led Growth) ───────────────────────────────────────────────────

export const PLG: ModelKPIConfig = {
  modelId: 'plg',
  priorityAreas: ['demand', 'efficiency', 'pipeline', 'channels', 'budget'],

  demandKPIs: [
    { key: 'visitors', label: 'Visitantes', format: 'num', isRequired: true, defaultSource: 'GA' },
    { key: 'signups', label: 'Signups', format: 'num', isRequired: true, defaultSource: 'Product' },
    { key: 'activations', label: 'Ativações', format: 'num', isRequired: true, defaultSource: 'Product' },
  ],

  efficiencyKPIs: [
    { key: 'signupRate', label: 'Taxa de Signup', format: 'pct', isRequired: true, defaultSource: 'Calculated' },
    { key: 'activationRate', label: 'Taxa de Ativação', format: 'pct', isRequired: true, defaultSource: 'Calculated' },
    { key: 'freeToPaidConversion', label: 'Conversão Free→Pago', format: 'pct', isRequired: true, defaultSource: 'Product' },
  ],

  pipelineKPIs: [
    { key: 'activeUsers', label: 'Usuários Ativos', format: 'num', isRequired: true, defaultSource: 'Product' },
    { key: 'payingCustomers', label: 'Clientes Pagantes', format: 'num', isRequired: true, defaultSource: 'Product' },
    { key: 'mrr', label: 'MRR', format: 'money', isRequired: false, defaultSource: 'Billing' },
    { key: 'churnRate', label: 'Taxa de Churn', format: 'pct', isRequired: false, defaultSource: 'Product' },
  ],

  channelMetrics: ['organic', 'googleAds', 'metaAds', 'viral', 'referral'],
  funnelStages: ['Awareness', 'Signup', 'Activation', 'Retention', 'Expansion', 'Virality'],
  criticalAlerts: ['signupDrop', 'churnIncrease', 'lowActivation', 'budgetOverrun'],
};

// ── SMB / Inbound ──────────────────────────────────────────────────────────────

export const SMB_INBOUND: ModelKPIConfig = {
  modelId: 'smb_inbound',
  priorityAreas: ['demand', 'efficiency', 'pipeline', 'channels', 'budget'],

  demandKPIs: [
    { key: 'organicSessions', label: 'Sessões Orgânicas', format: 'num', isRequired: true, defaultSource: 'GA' },
    { key: 'sessionsByContent', label: 'Sessões por Conteúdo', format: 'num', isRequired: false, defaultSource: 'GA' },
    { key: 'leads', label: 'Leads', format: 'num', isRequired: true, defaultSource: 'GA/Manual' },
  ],

  efficiencyKPIs: [
    { key: 'conversionRate', label: 'Taxa de Conversão (Org→Lead)', format: 'pct', isRequired: true, defaultSource: 'Calculated' },
    { key: 'contentConversionRate', label: 'Taxa de Conversão por Página', format: 'pct', isRequired: false, defaultSource: 'GA' },
    { key: 'organicCAC', label: 'CAC Orgânico', format: 'money', isRequired: false, defaultSource: 'Calculated' },
  ],

  pipelineKPIs: [
    { key: 'customers', label: 'Clientes', format: 'num', isRequired: true, defaultSource: 'CRM/Manual' },
    { key: 'revenue', label: 'Receita', format: 'money', isRequired: true, defaultSource: 'CRM' },
    { key: 'ltv', label: 'Lifetime Value', format: 'money', isRequired: false, defaultSource: 'CRM' },
  ],

  channelMetrics: ['organic', 'direct', 'referral'],
  funnelStages: ['Organic Awareness', 'Engagement', 'Lead', 'Customer'],
  criticalAlerts: ['organicSessionsDrop', 'conversionDrop', 'leadsDrop', 'cppIncrease'],
};

// ── Configuration Map ──────────────────────────────────────────────────────────

export const MODEL_KPI_CONFIG_MAP: Record<string, ModelKPIConfig> = {
  b2b_sales_led: B2B_SALES_LED,
  b2b_abm: B2B_ABM,
  plg: PLG,
  smb_inbound: SMB_INBOUND,
};

/**
 * Get KPI configuration for a specific model
 */
export function getModelKPIConfig(modelId: string): ModelKPIConfig {
  return MODEL_KPI_CONFIG_MAP[modelId] || B2B_SALES_LED; // Default to B2B Sales-Led
}

/**
 * Get all KPIs for a model (combined from all areas)
 */
export function getAllKPIsForModel(modelId: string): KPIDefinition[] {
  const config = getModelKPIConfig(modelId);
  return [
    ...config.demandKPIs,
    ...config.efficiencyKPIs,
    ...config.pipelineKPIs,
  ];
}

/**
 * Get required/critical KPIs for a model
 */
export function getRequiredKPIsForModel(modelId: string): KPIDefinition[] {
  return getAllKPIsForModel(modelId).filter(kpi => kpi.isRequired);
}
