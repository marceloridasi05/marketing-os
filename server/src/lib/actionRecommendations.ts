/**
 * Action Recommendations Library
 *
 * Generates actionable suggestions and next steps based on identified causes.
 * Maps cause descriptions to specific, implementable actions with monitoring metrics.
 */

import { Cause, SuggestedAction } from './causeAnalysis.js';

/**
 * Generate recommended actions based on identified causes
 */
export function generateActions(causes: Cause[], detectedMetric: string): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const actionSet = new Set<string>(); // Prevent duplicates

  for (const cause of causes) {
    if (cause.confidence === 'low') continue; // Skip low-confidence causes

    const desc = cause.description.toLowerCase();

    // ─────────────────────────────────────────────────────────────────────────
    // LEADS DROP / CONVERSIONS DROP
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('tráfego') || desc.includes('traffic')) {
      const actionKey = 'audit_traffic_sources';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Audite fontes de tráfego',
          description:
            'Verifique se há mudanças nas campanhas de tráfego pago, alterações de lance ou desligamento de anúncios. ' +
            'Revise Google Ads, Meta Ads e outras plataformas para impactos em volume.',
          priority: cause.confidence === 'high' ? 'high' : 'medium',
          metrics_to_monitor: ['sessions', 'clicks', 'impressions', 'cost'],
        });
      }
    }

    if (desc.includes('landing page') || desc.includes('página de destino') || desc.includes('conversão')) {
      const actionKey = 'audit_landing_pages';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Audite mudanças em landing pages',
          description:
            'Verifique o histórico de edição das páginas de destino entre os períodos comparados. ' +
            'Procure por mudanças em CTA, design, formulários ou copy que possam ter impactado conversões. ' +
            'Consulte git history ou editor de conteúdo para datas de modificação.',
          priority: cause.confidence === 'high' ? 'high' : 'medium',
          metrics_to_monitor: ['session_to_lead', 'session_to_conversion', 'leads', 'conversions'],
        });
      }
    }

    if (desc.includes('formulário') || desc.includes('form abandon') || desc.includes('abandonment')) {
      const actionKey = 'audit_form_completion';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Analise abandono de formulários no GA4',
          description:
            'No Google Analytics 4, visualize o funil de formulário para identificar em qual etapa os usuários estão saindo. ' +
            'Procure por drops em campos específicos (email, telefone, etc). Se não há evento de abandono, implemente tracking de steps.',
          priority: 'high',
          metrics_to_monitor: ['session_to_lead', 'leads', 'time_on_page'],
        });
      }
    }

    if (desc.includes('oferta') || desc.includes('offer quality') || desc.includes('messaging')) {
      const actionKey = 'review_offer_messaging';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Revise oferta e mensagem',
          description:
            'Avalie se o copy, oferta ou proposta de valor mudou entre períodos. ' +
            'A oferta ainda é relevante para o público? Procure por desvios em: desconto oferecido, ' +
            'prazo de validade, requisitos de qualificação ou alinhamento com personas.',
          priority: 'medium',
          metrics_to_monitor: ['session_to_lead', 'leads', 'cpl'],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CPL INCREASE / COST EFFICIENCY
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('cpl') || desc.includes('custo por lead')) {
      const actionKey = 'reduce_cpl';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Otimize custos por lead',
          description:
            'CPL em alta indica eficiência reduzida. Primeiras ações: ' +
            '1) Verifique segmentação de público-alvo (está muito amplo?), ' +
            '2) Teste criativos novos (possível fadiga de anúncio), ' +
            '3) Revise ofertas (ainda competitiva?), ' +
            '4) Implemente retargeting para reduzir waste.',
          priority: 'high',
          metrics_to_monitor: ['cpl', 'cpc', 'session_to_lead', 'leads'],
        });
      }
    }

    if (desc.includes('licitação') || desc.includes('bid') || desc.includes('competition')) {
      const actionKey = 'adjust_bid_strategy';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Ajuste estratégia de licitação',
          description:
            'Aumento de CPC sugere maior competição. Considere: ' +
            '1) Alterar de "Maximize Conversions" para "Target CPA" com limites mais agressivos, ' +
            '2) Expandir redes de exibição (GDN, YouTube) com menor CPC esperado, ' +
            '3) Testar keywords menos concorridas ou long-tail, ' +
            '4) Revisar Quality Score das campanhas (landing page relevância, CTR histórico).',
          priority: 'medium',
          metrics_to_monitor: ['cpc', 'cpl', 'quality_score', 'impressions'],
        });
      }
    }

    if (desc.includes('mix de canal') || desc.includes('channel mix')) {
      const actionKey = 'analyze_channel_shift';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Analise shifts no mix de canais',
          description:
            'Mudança no mix de canais pode alterar CPL se alguns canais são mais caros que outros. ' +
            'Segmente dados por canal (Google Ads, Meta, LinkedIn) e compare: volume, CPL, e conversion rate por canal. ' +
            'Se canal caro está com mais volume, rebalanceie orçamento.',
          priority: 'medium',
          metrics_to_monitor: ['leads', 'cost', 'cpl', 'channel_performance'],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CTR / AWARENESS ISSUES
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('ctr') || desc.includes('cliques')) {
      const actionKey = 'improve_ctr';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Melhore CTR com novos criativos',
          description:
            'CTR baixo indica que anúncios não estão atraindo cliques. Ações: ' +
            '1) Teste 3-5 variações de headlines e descriptions, ' +
            '2) Adicione ad extensions (sitelinks, callouts, promoções), ' +
            '3) Implemente dynamic ads (Dynamic Search Ads), ' +
            '4) Revise relevância de palavras-chave x landing page (Quality Score).',
          priority: 'high',
          metrics_to_monitor: ['ctr', 'impressions', 'clicks', 'quality_score'],
        });
      }
    }

    if (desc.includes('ad fatigue') || desc.includes('fadiga de anúncio')) {
      const actionKey = 'rotate_creative';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Rotacione criativos para combater fadiga',
          description:
            'Anúncios antigos sofrem fade-out em performance. Crie 5-10 variações de criativos ' +
            'com diferentes ângulos de valor, diferentes imagens/vídeos, e diferentes CTAs. ' +
            'Pause criativos antigos e lance novos gradualmente.',
          priority: 'medium',
          metrics_to_monitor: ['ctr', 'impressions', 'frequency', 'creative_performance'],
        });
      }
    }

    if (desc.includes('relevância') || desc.includes('audience quality')) {
      const actionKey = 'refine_audience';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Refine segmentação de público-alvo',
          description:
            'Público-alvo muito amplo gera impressões de baixa relevância. Ações: ' +
            '1) Use similar audiences ou lookalike audiences baseado em leads de qualidade, ' +
            '2) Implemente custom audiences com behavioral/demographic refinement, ' +
            '3) Teste exclusões (competitors, low-intent audiences), ' +
            '4) Use bid adjustments para públicos de maior conversão.',
          priority: 'medium',
          metrics_to_monitor: ['ctr', 'session_to_lead', 'cost_per_conversion', 'audience_quality'],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRACKING & DATA QUALITY
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('tracking') || desc.includes('rastreamento') || desc.includes('data quality')) {
      const actionKey = 'audit_tracking';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Audite implementação de tracking',
          description:
            'Discrepâncias entre métricas podem indicar tracking quebrado. Ações: ' +
            '1) Verifique se GA4 está corretamente implementado (use DebugView), ' +
            '2) Valide eventos customizados (form submission, lead capture), ' +
            '3) Confirme que UTM parameters estão passando corretamente, ' +
            '4) Teste landing page links end-to-end para garantir tracking.',
          priority: 'high',
          metrics_to_monitor: ['leads', 'conversions', 'session_to_lead', 'click_to_session'],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEASONAL / EXTERNAL FACTORS
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('sazonalidade') || desc.includes('seasonality') || desc.includes('external')) {
      const actionKey = 'account_seasonality';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Considere fatores sazonais / externos',
          description:
            'Drops podem ser sazonais (feriados, períodos de férias) ou ligados a eventos externos. ' +
            'Avalie: data do período coincide com feriado, semana de eleições, evento de mercado, ou mudança regulatória? ' +
            'Se sazonalidade é esperada, não é um problema operacional. Ajuste metas e orçamentos sazonalmente.',
          priority: 'low',
          metrics_to_monitor: ['leads', 'sessions', 'conversions'],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUDGET / SPEND ISSUES
    // ─────────────────────────────────────────────────────────────────────────

    if (desc.includes('orçamento') || desc.includes('budget') || desc.includes('gasto')) {
      const actionKey = 'review_budget_allocation';
      if (!actionSet.has(actionKey)) {
        actionSet.add(actionKey);
        actions.push({
          title: 'Revise alocação de orçamento',
          description:
            'Se orçamento foi aumentado sem aumento de ROI, revise alocação: ' +
            '1) Rebalanceie orçamento para canais de melhor ROAS, ' +
            '2) Reduza orçamento em canais com eficiência em queda, ' +
            '3) Implemente bid caps ou ROAS targets para evitar overspend ineficiente, ' +
            '4) Teste small budgets em novos canais antes de escalar.',
          priority: 'high',
          metrics_to_monitor: ['cost', 'cpl', 'roas', 'leads', 'cost_per_conversion'],
        });
      }
    }
  }

  // If no causes led to actions, provide general diagnostic action
  if (actions.length === 0) {
    actions.push({
      title: 'Conduzir análise diagnóstica geral',
      description:
        `A métrica "${detectedMetric}" apresentou mudança significativa. ` +
        'Ações gerais de diagnóstico: 1) Segmente dados por canal, device, geography, 2) Compare período por período (não apenas ano-a-ano), ' +
        '3) Revise campanhas ligadas (pausadas, criativas atualizadas, bids alterados), 4) Cheque relatórios de erro em plataformas.',
      priority: 'medium',
      metrics_to_monitor: [detectedMetric, 'cost', 'sessions', 'leads'],
    });
  }

  return actions;
}
