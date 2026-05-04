/**
 * Insights & Alerts Generator
 *
 * Analyzes consolidation and cross-check data to generate structured alerts
 * about performance, costs, conversions, budgets, and data quality.
 */

import { WeeklyConsolidation, MonthlyConsolidation } from './consolidationAggregation';

export interface Insight {
  id: string;
  type: 'performance_improved' | 'performance_declined' | 'cost_increased' |
        'conversion_dropped' | 'budget_risk' | 'missing_data' |
        'field_not_applicable' | 'target_at_risk' | 'target_on_track';
  severity: 'info' | 'attention' | 'critical';
  area: 'aquisição' | 'funil' | 'orçamento' | 'receita' | 'dados';
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  previousValue?: number;
  delta?: number;
  likelyMeaning: string;
  recommendedAction: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

/**
 * Generate insights from weekly consolidation data
 */
export function generateInsights(
  current: WeeklyConsolidation,
  previous: WeeklyConsolidation | null,
  activeFields?: Set<string>
): Insight[] {
  const insights: Insight[] = [];
  const timestamp = new Date().toISOString();

  // If no previous data, only generate data quality insights
  if (!previous) {
    generateDataQualityInsights(current, activeFields, insights, timestamp);
    return insights;
  }

  // 1. CPL Trend Analysis
  if (current.cpl !== null && previous.cpl !== null && previous.cpl > 0) {
    const cplDelta = ((current.cpl - previous.cpl) / previous.cpl) * 100;

    if (cplDelta > 25) {
      insights.push({
        id: `cpl-spike-${Date.now()}`,
        type: 'cost_increased',
        severity: 'critical',
        area: 'aquisição',
        title: 'Custo por Lead disparou',
        description: `CPL aumentou ${cplDelta.toFixed(1)}% semana a semana`,
        metric: 'CPL',
        currentValue: current.cpl,
        previousValue: previous.cpl,
        delta: cplDelta,
        likelyMeaning: 'Lances em alta, qualidade de leads caindo, ou menor volume de leads com mesmo gasto',
        recommendedAction: 'Revisar segmentação, testar novos públicos, verificar qualidade de leads, considerar pausa de campanhas de baixo ROAS',
        confidence: 'high',
        timestamp,
      });
    } else if (cplDelta > 10) {
      insights.push({
        id: `cpl-increase-${Date.now()}`,
        type: 'cost_increased',
        severity: 'attention',
        area: 'aquisição',
        title: 'Custo por Lead aumentou',
        description: `CPL subiu ${cplDelta.toFixed(1)}% semana a semana`,
        metric: 'CPL',
        currentValue: current.cpl,
        previousValue: previous.cpl,
        delta: cplDelta,
        likelyMeaning: 'Pressão de lances ou menor eficiência em conversão',
        recommendedAction: 'Monitorar trends em lances, testar otimizações de página, ajustar segmentação',
        confidence: 'high',
        timestamp,
      });
    }
  }

  // 2. Conversion Rate Drops
  if (current.leadToMqlRate !== null && previous.leadToMqlRate !== null && previous.leadToMqlRate > 0) {
    const leadMqlDelta = ((current.leadToMqlRate - previous.leadToMqlRate) / previous.leadToMqlRate) * 100;

    if (leadMqlDelta < -15) {
      insights.push({
        id: `lead-mql-drop-${Date.now()}`,
        type: 'conversion_dropped',
        severity: 'critical',
        area: 'funil',
        title: 'Taxa Lead→MQL caiu drasticamente',
        description: `Taxa de conversão desabou ${Math.abs(leadMqlDelta).toFixed(1)}%`,
        metric: 'Lead→MQL %',
        currentValue: current.leadToMqlRate,
        previousValue: previous.leadToMqlRate,
        delta: leadMqlDelta,
        likelyMeaning: 'Leads de menor qualidade, ou processo de nurturing/scoring com problemas',
        recommendedAction: 'Verificar qualidade de leads, revisar critérios de MQL, testar copy/oferta, verificar volume de spam',
        confidence: 'high',
        timestamp,
      });
    }
  }

  if (current.mqlToSqlRate !== null && previous.mqlToSqlRate !== null && previous.mqlToSqlRate > 0) {
    const mqlSqlDelta = ((current.mqlToSqlRate - previous.mqlToSqlRate) / previous.mqlToSqlRate) * 100;

    if (mqlSqlDelta < -15) {
      insights.push({
        id: `mql-sql-drop-${Date.now()}`,
        type: 'conversion_dropped',
        severity: 'critical',
        area: 'funil',
        title: 'Taxa MQL→SQL caiu drasticamente',
        description: `Taxa de qualificação desabou ${Math.abs(mqlSqlDelta).toFixed(1)}%`,
        metric: 'MQL→SQL %',
        currentValue: current.mqlToSqlRate,
        previousValue: previous.mqlToSqlRate,
        delta: mqlSqlDelta,
        likelyMeaning: 'MQLs de menor qualidade ou equipe de vendas sobrecarregada/menos responsiva',
        recommendedAction: 'Revisar critérios de MQL com sales, verificar SLA de resposta, aumentar suporte/treinamento de vendas',
        confidence: 'high',
        timestamp,
      });
    }
  }

  // 3. Traffic Growth vs Lead Growth (Efficiency)
  if (current.sessions !== null && previous.sessions !== null && previous.sessions > 0 &&
      current.leads !== null && previous.leads !== null && previous.leads > 0) {
    const sessionDelta = ((current.sessions - previous.sessions) / previous.sessions) * 100;
    const leadDelta = ((current.leads - previous.leads) / previous.leads) * 100;

    // If traffic up but leads stagnant
    if (sessionDelta > 10 && leadDelta < 2) {
      insights.push({
        id: `traffic-conversion-disconnect-${Date.now()}`,
        type: 'performance_declined',
        severity: 'attention',
        area: 'funil',
        title: 'Tráfego cresceu, mas leads não acompanharam',
        description: `Tráfego +${sessionDelta.toFixed(1)}%, Leads +${leadDelta.toFixed(1)}%`,
        metric: 'Sessions vs Leads',
        likelyMeaning: 'Conversão de página/form caiu. Tráfego pode estar em piores públicos',
        recommendedAction: 'Testar landing pages, revisar UX do form, verificar se tráfego vem de novo canal/público',
        confidence: 'medium',
        timestamp,
      });
    }
  }

  // 4. Revenue Growth
  if (current.revenue !== null && previous.revenue !== null && previous.revenue > 0) {
    const revenueDelta = ((current.revenue - previous.revenue) / previous.revenue) * 100;

    if (revenueDelta > 20) {
      insights.push({
        id: `revenue-growth-${Date.now()}`,
        type: 'performance_improved',
        severity: 'info',
        area: 'receita',
        title: 'Receita em crescimento forte',
        description: `Receita cresceu ${revenueDelta.toFixed(1)}% semana a semana`,
        metric: 'Receita',
        currentValue: current.revenue,
        previousValue: previous.revenue,
        delta: revenueDelta,
        likelyMeaning: 'Momentum positivo em vendas/conversões',
        recommendedAction: 'Manter estratégia, aumentar investimento em canais que dirigem essa receita',
        confidence: 'high',
        timestamp,
      });
    }
  }

  // 5. Budget Spend Trends
  if (current.totalSpend !== null && previous.totalSpend !== null && previous.totalSpend > 0) {
    const spendDelta = ((current.totalSpend - previous.totalSpend) / previous.totalSpend) * 100;

    if (spendDelta > 30) {
      insights.push({
        id: `spend-spike-${Date.now()}`,
        type: 'budget_risk',
        severity: 'attention',
        area: 'orçamento',
        title: 'Gasto aumentou significativamente',
        description: `Gasto subiu ${spendDelta.toFixed(1)}% em relação à semana anterior`,
        metric: 'Gasto Total',
        currentValue: current.totalSpend,
        previousValue: previous.totalSpend,
        delta: spendDelta,
        likelyMeaning: 'Maior investimento em campanhas ou aumento de lances',
        recommendedAction: 'Revisar ROI/ROAS dos canais, garantir que o aumento de gasto está gerando retorno proporcional',
        confidence: 'high',
        timestamp,
      });
    }
  }

  // 6. Data Quality Issues
  generateDataQualityInsights(current, activeFields, insights, timestamp);

  return insights.sort((a, b) => {
    const severityOrder = { critical: 0, attention: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate data quality insights
 */
function generateDataQualityInsights(
  current: WeeklyConsolidation,
  activeFields: Set<string> | undefined,
  insights: Insight[],
  timestamp: string
) {
  const timestamp_val = new Date().toISOString();

  // Check for missing critical fields
  const criticalFields = ['sessions', 'leads', 'mqls', 'sqls', 'revenue'];
  const missingCritical = [];

  if (current.sessions === null) missingCritical.push('Acessos');
  if (current.leads === null) missingCritical.push('Leads');
  if (current.mqls === null) missingCritical.push('MQLs');
  if (current.sqls === null) missingCritical.push('SQLs');
  if (current.revenue === null) missingCritical.push('Receita');

  if (missingCritical.length > 0) {
    insights.push({
      id: `missing-fields-${Date.now()}`,
      type: 'missing_data',
      severity: missingCritical.length > 2 ? 'critical' : 'attention',
      area: 'dados',
      title: 'Dados críticos ausentes',
      description: `${missingCritical.join(', ')} não foram preenchidos`,
      likelyMeaning: 'Análise completa do funil não é possível',
      recommendedAction: `Preencher: ${missingCritical.join(', ')}`,
      confidence: 'high',
      timestamp: timestamp_val,
    });
  }

  // Check for spend data without leads
  if (current.totalSpend && current.totalSpend > 0 && !current.leads) {
    insights.push({
      id: `spend-no-leads-${Date.now()}`,
      type: 'missing_data',
      severity: 'attention',
      area: 'dados',
      title: 'Gasto registrado sem leads',
      description: 'Existe gasto em campanhas, mas nenhum lead foi registrado',
      likelyMeaning: 'CPL não pode ser calculado. Leads podem estar sendo perdidos.',
      recommendedAction: 'Verificar se leads estão sendo registrados corretamente',
      confidence: 'medium',
      timestamp: timestamp_val,
    });
  }
}
