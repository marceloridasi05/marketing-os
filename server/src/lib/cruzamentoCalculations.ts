/**
 * Cruzamento (Cross-Check) Calculations
 *
 * Analyzes relationships between metrics from different operational sources
 * and consolidations to identify patterns, bottlenecks, and efficiency issues.
 */

import { WeeklyConsolidation, MonthlyConsolidation } from './consolidationAggregation';

export interface Cruzamento {
  id: string;
  label: string;
  metricALabel: string;
  metricBLabel: string;
  currentA: number | null;
  currentB: number | null;
  previousA: number | null;
  previousB: number | null;

  // Derived metric when applicable (e.g., CPL = spend/leads)
  derivedMetric?: {
    label: string;
    value: number | null;
    previousValue: number | null;
    unit?: string;
  };

  // Conversion rate when applicable (e.g., MQL/Leads = conversion %)
  conversionRate?: number | null;

  // Trend indicators
  trend: 'up' | 'down' | 'flat' | null;
  trendPercent: number | null;

  // Status assessment
  status: 'healthy' | 'attention' | 'critical' | 'no-data';
  interpretation: string;

  // Data completeness
  dataReadiness: 'complete' | 'partial' | 'missing';
  missingFields?: string[];
}

/**
 * Calculate cruzamentos from weekly consolidation data
 */
export function calculateCruzamentos(
  current: WeeklyConsolidation,
  previous: WeeklyConsolidation | null
): Cruzamento[] {
  const cruzamentos: Cruzamento[] = [];

  // 1. Gasto vs Leads (CPL)
  cruzamentos.push(
    createCruzamento(
      'gasto-vs-leads',
      'Gasto vs Leads',
      'Gasto Total',
      'Leads',
      current.totalSpend,
      current.leads,
      previous?.totalSpend,
      previous?.leads,
      {
        label: 'CPL (Custo por Lead)',
        value: current.leads && current.totalSpend && current.leads > 0 ? current.totalSpend / current.leads : null,
        previousValue: previous?.cpl,
        unit: 'R$'
      }
    )
  );

  // 2. Gasto vs MQLs
  cruzamentos.push(
    createCruzamento(
      'gasto-vs-mqls',
      'Gasto vs MQLs',
      'Gasto Total',
      'MQLs',
      current.totalSpend,
      current.mqls,
      previous?.totalSpend,
      previous?.mqls,
      {
        label: 'Custo por MQL',
        value: current.mqls && current.totalSpend && current.mqls > 0 ? current.totalSpend / current.mqls : null,
        previousValue: previous?.cpmMql,
        unit: 'R$'
      }
    )
  );

  // 3. Gasto vs SQLs
  cruzamentos.push(
    createCruzamento(
      'gasto-vs-sqls',
      'Gasto vs SQLs',
      'Gasto Total',
      'SQLs',
      current.totalSpend,
      current.sqls,
      previous?.totalSpend,
      previous?.sqls,
      {
        label: 'Custo por SQL',
        value: current.sqls && current.totalSpend && current.sqls > 0 ? current.totalSpend / current.sqls : null,
        previousValue: previous?.cpmSql,
        unit: 'R$'
      }
    )
  );

  // 4. Gasto vs Oportunidades
  cruzamentos.push(
    createCruzamento(
      'gasto-vs-opportunities',
      'Gasto vs Oportunidades',
      'Gasto Total',
      'Oportunidades',
      current.totalSpend,
      current.opportunities,
      previous?.totalSpend,
      previous?.opportunities,
      {
        label: 'CAC Estimado (Oportunidades)',
        value: current.opportunities && current.totalSpend && current.opportunities > 0 ? current.totalSpend / current.opportunities : null,
        unit: 'R$'
      }
    )
  );

  // 5. Gasto vs Receita (ROAS)
  cruzamentos.push(
    createCruzamento(
      'gasto-vs-receita',
      'Gasto vs Receita',
      'Gasto Total',
      'Receita',
      current.totalSpend,
      current.revenue,
      previous?.totalSpend,
      previous?.revenue,
      {
        label: 'ROAS (Receita / Gasto)',
        value: current.revenue && current.totalSpend && current.totalSpend > 0 ? current.revenue / current.totalSpend : null,
        previousValue: previous?.revenue && previous?.totalSpend && previous.totalSpend > 0 ? previous.revenue / previous.totalSpend : null,
      }
    )
  );

  // 6. Acessos vs Leads (Conversion rate)
  cruzamentos.push(
    createCruzamento(
      'acessos-vs-leads',
      'Acessos vs Leads',
      'Acessos',
      'Leads',
      current.sessions,
      current.leads,
      previous?.sessions,
      previous?.leads,
      undefined,
      {
        value: current.sessions && current.leads && current.sessions > 0 ? (current.leads / current.sessions) * 100 : null,
        previousValue: previous?.sessions && previous?.leads && previous.sessions > 0 ? (previous.leads / previous.sessions) * 100 : null,
        label: 'Taxa Acesso → Lead'
      }
    )
  );

  // 7. Leads vs MQLs
  cruzamentos.push(
    createCruzamento(
      'leads-vs-mqls',
      'Leads vs MQLs',
      'Leads',
      'MQLs',
      current.leads,
      current.mqls,
      previous?.leads,
      previous?.mqls,
      undefined,
      {
        value: current.leadToMqlRate,
        previousValue: previous?.leadToMqlRate,
        label: 'Taxa Lead → MQL'
      }
    )
  );

  // 8. MQLs vs SQLs
  cruzamentos.push(
    createCruzamento(
      'mqls-vs-sqls',
      'MQLs vs SQLs',
      'MQLs',
      'SQLs',
      current.mqls,
      current.sqls,
      previous?.mqls,
      previous?.sqls,
      undefined,
      {
        value: current.mqlToSqlRate,
        previousValue: previous?.mqlToSqlRate,
        label: 'Taxa MQL → SQL'
      }
    )
  );

  // 9. SQLs vs Oportunidades
  cruzamentos.push(
    createCruzamento(
      'sqls-vs-opportunities',
      'SQLs vs Oportunidades',
      'SQLs',
      'Oportunidades',
      current.sqls,
      current.opportunities,
      previous?.sqls,
      previous?.opportunities,
      undefined,
      {
        value: current.sqlToOppRate,
        previousValue: previous?.sqlToOppRate,
        label: 'Taxa SQL → Opp'
      }
    )
  );

  // 10. Oportunidades vs Receita
  cruzamentos.push(
    createCruzamento(
      'opportunities-vs-revenue',
      'Oportunidades vs Receita',
      'Oportunidades',
      'Receita',
      current.opportunities,
      current.revenue,
      previous?.opportunities,
      previous?.revenue,
      {
        label: 'Ticket Médio (Receita / Opp)',
        value: current.opportunities && current.revenue && current.opportunities > 0 ? current.revenue / current.opportunities : null,
        previousValue: previous?.opportunities && previous?.revenue && previous.opportunities > 0 ? previous.revenue / previous.opportunities : null,
        unit: 'R$'
      }
    )
  );

  return cruzamentos;
}

/**
 * Helper function to create a cruzamento object
 */
function createCruzamento(
  id: string,
  label: string,
  metricALabel: string,
  metricBLabel: string,
  currentA: number | null,
  currentB: number | null,
  previousA: number | null,
  previousB: number | null,
  derivedMetric?: {
    label: string;
    value: number | null;
    previousValue?: number | null;
    unit?: string;
  },
  conversionMetric?: {
    label: string;
    value: number | null;
    previousValue?: number | null;
  }
): Cruzamento {
  // Calculate trend
  const derivedCurrent = derivedMetric?.value ?? conversionMetric?.value;
  const derivedPrevious = derivedMetric?.previousValue ?? conversionMetric?.previousValue;

  let trend: 'up' | 'down' | 'flat' | null = null;
  let trendPercent: number | null = null;

  if (derivedCurrent !== null && derivedCurrent !== undefined &&
      derivedPrevious !== null && derivedPrevious !== undefined &&
      derivedPrevious !== 0) {
    trendPercent = ((derivedCurrent - derivedPrevious) / Math.abs(derivedPrevious)) * 100;
    if (trendPercent > 2) trend = 'up';
    else if (trendPercent < -2) trend = 'down';
    else trend = 'flat';
  }

  // Determine status
  let status: 'healthy' | 'attention' | 'critical' | 'no-data' = 'no-data';
  let interpretation = '';

  if (currentA === null || currentB === null) {
    status = 'no-data';
    interpretation = 'Dados insuficientes para análise';
  } else if (derivedMetric) {
    // Cost metrics: lower is better
    if (derivedMetric.value === null) {
      status = 'no-data';
      interpretation = 'Não foi possível calcular';
    } else if (derivedPrevious && trendPercent! > 15) {
      status = 'critical';
      interpretation = `${derivedMetric.label} aumentou ${trendPercent!.toFixed(1)}%. Eficiência em declínio.`;
    } else if (derivedPrevious && trendPercent! > 5) {
      status = 'attention';
      interpretation = `${derivedMetric.label} aumentou ${trendPercent!.toFixed(1)}%. Monitorar.`;
    } else {
      status = 'healthy';
      interpretation = `${derivedMetric.label} estável ou melhorando.`;
    }
  } else if (conversionMetric) {
    // Conversion metrics: higher is better
    if (conversionMetric.value === null) {
      status = 'no-data';
      interpretation = 'Taxa de conversão não calculável';
    } else if (conversionPrevious && trendPercent! < -10) {
      status = 'critical';
      interpretation = `Taxa caiu ${Math.abs(trendPercent!).toFixed(1)}%. Conversão em declínio.`;
    } else if (conversionMetric.previousValue && trendPercent! < -5) {
      status = 'attention';
      interpretation = `Taxa caiu ${Math.abs(trendPercent!).toFixed(1)}%. Verificar.`;
    } else {
      status = 'healthy';
      interpretation = `Taxa estável ou melhorando.`;
    }
  }

  // Data readiness
  const dataReadiness = currentA !== null && currentB !== null ? 'complete' : 'partial';

  return {
    id,
    label,
    metricALabel,
    metricBLabel,
    currentA,
    currentB,
    previousA,
    previousB,
    derivedMetric: derivedMetric ? {
      label: derivedMetric.label,
      value: derivedMetric.value,
      previousValue: derivedMetric.previousValue,
      unit: derivedMetric.unit,
    } : undefined,
    trend,
    trendPercent,
    status,
    interpretation,
    dataReadiness,
    missingFields: currentA === null ? [metricALabel] : currentB === null ? [metricBLabel] : undefined,
  };
}

// For conversion metrics, we use a different comparison
const conversionPrevious = undefined; // This is just for the template above
