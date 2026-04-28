/**
 * Funnel model type definitions (client-side mirrors of server types).
 * These are used for type safety in the frontend.
 */

export type FunnelModelId = 'aida' | 'aarrr' | 'tofu_mofu_bofu' | 'sales_led';

export interface FunnelStageConfig {
  id: string;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  iconColor: string;
  order: number;
}

export interface FunnelModel {
  id: string;
  name: string;
  description: string;
  stages: FunnelStageConfig[];
  stageToMetrics: Record<string, string[]>;
}

export interface CustomFunnel extends FunnelModel {
  siteId: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Default model names for display.
 */
export const MODEL_NAMES: Record<FunnelModelId, string> = {
  aida: 'AIDA',
  aarrr: 'AARRR',
  tofu_mofu_bofu: 'TOFU/MOFU/BOFU',
  sales_led: 'Sales-led',
};

/**
 * Default descriptions for model selection UI.
 */
export const MODEL_DESCRIPTIONS: Record<FunnelModelId, string> = {
  aida: 'Attention-Interest-Desire-Action: Classic awareness-to-action funnel',
  aarrr: 'Acquisition-Activation-Revenue-Retention-Referral: SaaS growth model',
  tofu_mofu_bofu: 'Top-Middle-Bottom of Funnel: Three-stage awareness-to-close model',
  sales_led: 'Lead-MQL-SQL-Opportunity-Revenue: Sales-driven B2B funnel',
};
