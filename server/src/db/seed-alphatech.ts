/**
 * Seed: AlphaTech mock dataset
 * Run: npx tsx src/db/seed-alphatech.ts   (from server/)
 *
 * Pattern: Acquisition UP + Conversion DOWN (clear bottleneck)
 * Profile : B2B SaaS · Risk Management · Sales-led · 60-90d cycle
 */

import { db } from './index.js';
import {
  sites, channels, performanceEntries, budgetItems, adsBudgets,
  siteData, adsKpis, goals, planSchedule, initiativeMeta,
  experiments, ideas, suppliers,
} from './schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 Seeding AlphaTech...\n');

  // ── 1. Site ────────────────────────────────────────────────────────────────
  const existing = await db.select().from(sites).where(eq(sites.name, 'AlphaTech'));
  if (existing.length > 0) {
    const old = existing[0].id;
    console.log(`  Limpando site existente (id=${old})...`);
    await db.delete(channels).where(eq(channels.siteId, old));
    await db.delete(performanceEntries).where(eq(performanceEntries.siteId, old));
    await db.delete(budgetItems).where(eq(budgetItems.siteId, old));
    await db.delete(adsBudgets).where(eq(adsBudgets.siteId, old));
    await db.delete(siteData).where(eq(siteData.siteId, old));
    await db.delete(adsKpis).where(eq(adsKpis.siteId, old));
    await db.delete(goals).where(eq(goals.siteId, old));
    await db.delete(planSchedule).where(eq(planSchedule.siteId, old));
    await db.delete(initiativeMeta).where(eq(initiativeMeta.siteId, old));
    await db.delete(experiments).where(eq(experiments.siteId, old));
    await db.delete(ideas).where(eq(ideas.siteId, old));
    await db.delete(suppliers).where(eq(suppliers.siteId, old));
    await db.delete(sites).where(eq(sites.id, old));
  }

  const [site] = await db.insert(sites).values({
    name: 'AlphaTech',
    url: 'https://alphatech.com.br',
    clientConfig: JSON.stringify({
      clientName: 'AlphaTech',
      businessType: 'B2B SaaS',
      growthModel: 'Sales-led',
      mainObjectives: ['Aquisição', 'Conversão', 'Receita'],
    }),
  }).returning();
  const sid = site.id;
  console.log(`  Site criado id=${sid}\n`);

  // ── 2. Channels ────────────────────────────────────────────────────────────
  console.log('Canais...');
  const [chG] = await db.insert(channels).values({ siteId: sid, name: 'Google Ads',   category: 'Paid' }).returning();
  const [chL] = await db.insert(channels).values({ siteId: sid, name: 'LinkedIn Ads', category: 'Paid' }).returning();
  const [chO] = await db.insert(channels).values({ siteId: sid, name: 'Orgânico',     category: 'Organic' }).returning();
  const [chD] = await db.insert(channels).values({ siteId: sid, name: 'Direto',       category: 'Direct' }).returning();

  // ── 3. Performance Entries (monthly) ──────────────────────────────────────
  // Aquisição sobe: sessions Feb→Mar→Apr: 6800 → 8100 → 7500 (parcial abr)
  // Conversão cai:  CVR      Feb→Mar→Apr: 3.1% → 2.4% → 1.8%
  console.log('Performance entries (mensal)...');
  await db.insert(performanceEntries).values([
    // Feb 2026
    { siteId: sid, date: '2026-02-01', periodType: 'monthly', channelId: chG.id, campaignName: 'Search – Risk Management', impressions: 42000, clicks: 3200, sessions: 2800, leads: 124, conversions: 34, cost: 22000 },
    { siteId: sid, date: '2026-02-01', periodType: 'monthly', channelId: chL.id, campaignName: 'LinkedIn – Enterprise DM',   impressions: 18000, clicks: 1400, sessions: 1200, leads: 28,  conversions: 7,  cost: 8000  },
    { siteId: sid, date: '2026-02-01', periodType: 'monthly', channelId: chO.id, impressions: null,  clicks: null,  sessions: 2100, leads: 46, conversions: 12, cost: 0 },
    { siteId: sid, date: '2026-02-01', periodType: 'monthly', channelId: chD.id, impressions: null,  clicks: null,  sessions: 700,  leads: 12, conversions: 3,  cost: 0 },
    // Mar 2026 — mais tráfego, menos leads por sessão
    { siteId: sid, date: '2026-03-01', periodType: 'monthly', channelId: chG.id, campaignName: 'Search – Risk Management', impressions: 52000, clicks: 4100, sessions: 3400, leads: 108, conversions: 24, cost: 27000 },
    { siteId: sid, date: '2026-03-01', periodType: 'monthly', channelId: chL.id, campaignName: 'LinkedIn – Enterprise DM',   impressions: 24000, clicks: 2000, sessions: 1600, leads: 34,  conversions: 6,  cost: 10000 },
    { siteId: sid, date: '2026-03-01', periodType: 'monthly', channelId: chO.id, impressions: null,  clicks: null,  sessions: 2400, leads: 42, conversions: 9,  cost: 0 },
    { siteId: sid, date: '2026-03-01', periodType: 'monthly', channelId: chD.id, impressions: null,  clicks: null,  sessions: 700,  leads: 11, conversions: 2,  cost: 0 },
    // Apr 2026 — parcial (26 dias), CVR ainda mais baixo
    { siteId: sid, date: '2026-04-01', periodType: 'monthly', channelId: chG.id, campaignName: 'Search – Risk Management', impressions: 48000, clicks: 3800, sessions: 3100, leads: 72, conversions: 14, cost: 24000 },
    { siteId: sid, date: '2026-04-01', periodType: 'monthly', channelId: chL.id, campaignName: 'LinkedIn – Enterprise DM',   impressions: 22000, clicks: 1900, sessions: 1500, leads: 24, conversions: 4,  cost: 9000  },
    { siteId: sid, date: '2026-04-01', periodType: 'monthly', channelId: chO.id, impressions: null,  clicks: null,  sessions: 2200, leads: 28, conversions: 5,  cost: 0 },
    { siteId: sid, date: '2026-04-01', periodType: 'monthly', channelId: chD.id, impressions: null,  clicks: null,  sessions: 700,  leads: 8,  conversions: 1,  cost: 0 },
  ]);

  // ── 4. Ads KPIs (weekly) ──────────────────────────────────────────────────
  // GA impressions/clicks sobem semana a semana; GA CVR cai progressivamente
  console.log('Ads KPIs (semanal)...');
  const kpiWeeks = [
    { week: 'Sem 17/02', weekStart: '2026-02-17', gaImpressions: 62000,  gaClicks: 940,  gaCtr: '1.52%', gaCpcAvg: 'R$7,20', gaCvr: '2.98%', gaConversions: 28, gaCostPerConversion: 'R$271', liImpressions: 18000, liClicks: 280, liCost: 2200 },
    { week: 'Sem 24/02', weekStart: '2026-02-24', gaImpressions: 68000,  gaClicks: 1050, gaCtr: '1.54%', gaCpcAvg: 'R$7,10', gaCvr: '2.76%', gaConversions: 29, gaCostPerConversion: 'R$257', liImpressions: 20000, liClicks: 310, liCost: 2500 },
    { week: 'Sem 03/03', weekStart: '2026-03-03', gaImpressions: 73000,  gaClicks: 1120, gaCtr: '1.53%', gaCpcAvg: 'R$7,05', gaCvr: '2.50%', gaConversions: 28, gaCostPerConversion: 'R$282', liImpressions: 22000, liClicks: 340, liCost: 2700 },
    { week: 'Sem 10/03', weekStart: '2026-03-10', gaImpressions: 79000,  gaClicks: 1200, gaCtr: '1.52%', gaCpcAvg: 'R$7,00', gaCvr: '2.25%', gaConversions: 27, gaCostPerConversion: 'R$311', liImpressions: 23000, liClicks: 360, liCost: 2800 },
    { week: 'Sem 17/03', weekStart: '2026-03-17', gaImpressions: 84000,  gaClicks: 1280, gaCtr: '1.52%', gaCpcAvg: 'R$6,95', gaCvr: '2.03%', gaConversions: 26, gaCostPerConversion: 'R$342', liImpressions: 25000, liClicks: 390, liCost: 3100 },
    { week: 'Sem 24/03', weekStart: '2026-03-24', gaImpressions: 88000,  gaClicks: 1340, gaCtr: '1.52%', gaCpcAvg: 'R$6,90', gaCvr: '1.79%', gaConversions: 24, gaCostPerConversion: 'R$385', liImpressions: 26000, liClicks: 410, liCost: 3200 },
    { week: 'Sem 31/03', weekStart: '2026-03-31', gaImpressions: 94000,  gaClicks: 1430, gaCtr: '1.52%', gaCpcAvg: 'R$6,85', gaCvr: '1.54%', gaConversions: 22, gaCostPerConversion: 'R$445', liImpressions: 28000, liClicks: 430, liCost: 3400 },
    { week: 'Sem 07/04', weekStart: '2026-04-07', gaImpressions: 98000,  gaClicks: 1490, gaCtr: '1.52%', gaCpcAvg: 'R$6,80', gaCvr: '1.34%', gaConversions: 20, gaCostPerConversion: 'R$508', liImpressions: 30000, liClicks: 460, liCost: 3600 },
    { week: 'Sem 14/04', weekStart: '2026-04-14', gaImpressions: 102000, gaClicks: 1540, gaCtr: '1.51%', gaCpcAvg: 'R$6,75', gaCvr: '1.17%', gaConversions: 18, gaCostPerConversion: 'R$578', liImpressions: 32000, liClicks: 480, liCost: 3800 },
  ];
  for (const r of kpiWeeks) await db.insert(adsKpis).values({ siteId: sid, ...r });

  // ── 5. Site Data (weekly) ──────────────────────────────────────────────────
  // Sessions crescem; leads gerados diminuem → CVR caindo
  console.log('Site data (semanal)...');
  const sdWeeks = [
    { week: 'Sem 17/02', weekStart: '2026-02-17', sessions: 1680, totalUsers: 1420, paidClicks: 940,  newUsers: 1200, leadsGenerated: 50, weeklyGains: 0   },
    { week: 'Sem 24/02', weekStart: '2026-02-24', sessions: 1800, totalUsers: 1520, paidClicks: 1050, newUsers: 1280, leadsGenerated: 52, weeklyGains: 120 },
    { week: 'Sem 03/03', weekStart: '2026-03-03', sessions: 1950, totalUsers: 1640, paidClicks: 1120, newUsers: 1380, leadsGenerated: 50, weeklyGains: 150 },
    { week: 'Sem 10/03', weekStart: '2026-03-10', sessions: 2100, totalUsers: 1760, paidClicks: 1200, newUsers: 1480, leadsGenerated: 47, weeklyGains: 150 },
    { week: 'Sem 17/03', weekStart: '2026-03-17', sessions: 2200, totalUsers: 1840, paidClicks: 1280, newUsers: 1550, leadsGenerated: 45, weeklyGains: 100 },
    { week: 'Sem 24/03', weekStart: '2026-03-24', sessions: 2280, totalUsers: 1900, paidClicks: 1340, newUsers: 1600, leadsGenerated: 43, weeklyGains: 80  },
    { week: 'Sem 31/03', weekStart: '2026-03-31', sessions: 2380, totalUsers: 1980, paidClicks: 1430, newUsers: 1680, leadsGenerated: 40, weeklyGains: 100 },
    { week: 'Sem 07/04', weekStart: '2026-04-07', sessions: 2450, totalUsers: 2040, paidClicks: 1490, newUsers: 1720, leadsGenerated: 36, weeklyGains: 70  },
    { week: 'Sem 14/04', weekStart: '2026-04-14', sessions: 2520, totalUsers: 2100, paidClicks: 1540, newUsers: 1770, leadsGenerated: 32, weeklyGains: 70  },
  ];
  for (const r of sdWeeks) await db.insert(siteData).values({ siteId: sid, ...r });

  // ── 6. Budget Items ────────────────────────────────────────────────────────
  // 70-85% uso em Mídia Paga; Ferramentas 100%; Fornecedores variável
  console.log('Budget items...');
  const budgetRows = [
    // Feb
    { year: 2026, month: 2, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'Google Ads',          planned: 30000, actual: 22000 },
    { year: 2026, month: 2, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'LinkedIn Ads',         planned: 12000, actual: 8000  },
    { year: 2026, month: 2, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'HubSpot CRM',          planned: 2500,  actual: 2500  },
    { year: 2026, month: 2, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'SEMrush',              planned: 800,   actual: 800   },
    { year: 2026, month: 2, section: 'Budget', strategy: 'Fornecedores', expenseType: 'Variável', name: 'Agência de Conteúdo',  planned: 5000,  actual: 4200  },
    // Mar
    { year: 2026, month: 3, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'Google Ads',          planned: 30000, actual: 27000 },
    { year: 2026, month: 3, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'LinkedIn Ads',         planned: 12000, actual: 10000 },
    { year: 2026, month: 3, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'HubSpot CRM',          planned: 2500,  actual: 2500  },
    { year: 2026, month: 3, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'SEMrush',              planned: 800,   actual: 800   },
    { year: 2026, month: 3, section: 'Budget', strategy: 'Fornecedores', expenseType: 'Variável', name: 'Agência de Conteúdo',  planned: 5000,  actual: 5000  },
    // Apr
    { year: 2026, month: 4, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'Google Ads',          planned: 30000, actual: 24000 },
    { year: 2026, month: 4, section: 'Budget', strategy: 'Mídia Paga',   expenseType: 'Variável', name: 'LinkedIn Ads',         planned: 12000, actual: 9000  },
    { year: 2026, month: 4, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'HubSpot CRM',          planned: 2500,  actual: 2500  },
    { year: 2026, month: 4, section: 'Budget', strategy: 'Ferramentas',  expenseType: 'Fixo',     name: 'SEMrush',              planned: 800,   actual: 800   },
    { year: 2026, month: 4, section: 'Budget', strategy: 'Fornecedores', expenseType: 'Variável', name: 'Agência de Conteúdo',  planned: 5000,  actual: 3500  },
  ];
  for (const r of budgetRows) await db.insert(budgetItems).values({ siteId: sid, ...r });

  // ── 7. Ads Budgets ─────────────────────────────────────────────────────────
  // month=0 = limite disponível; months 2-4 = consumo real
  console.log('Verbas Ads...');
  await db.insert(adsBudgets).values([
    { siteId: sid, year: 2026, month: 0, dailyGoogle: 1000, monthlyGoogle: 30000, dailyLinkedin: 400, monthlyLinkedin: 12000, dailyTotal: 1400, monthlyTotalUsed: 42000, monthlyAvailable: 42000 },
    { siteId: sid, year: 2026, month: 2, dailyGoogle: 786,  monthlyGoogle: 22000, dailyLinkedin: 286, monthlyLinkedin: 8000,  dailyTotal: 1071, monthlyTotalUsed: 30000, monthlyAvailable: 12000 },
    { siteId: sid, year: 2026, month: 3, dailyGoogle: 871,  monthlyGoogle: 27000, dailyLinkedin: 323, monthlyLinkedin: 10000, dailyTotal: 1194, monthlyTotalUsed: 37000, monthlyAvailable: 5000  },
    { siteId: sid, year: 2026, month: 4, dailyGoogle: 923,  monthlyGoogle: 24000, dailyLinkedin: 346, monthlyLinkedin: 9000,  dailyTotal: 1269, monthlyTotalUsed: 33000, monthlyAvailable: 9000  },
  ]);

  // ── 8. Goals ──────────────────────────────────────────────────────────────
  // Metas vs actuals: sessions OK, leads abaixo, CPL acima
  console.log('Metas...');
  await db.insert(goals).values([
    { siteId: sid, year: 2026, month: 2, metricName: 'sessions', targetValue: 7000, notes: 'Meta tráfego fev' },
    { siteId: sid, year: 2026, month: 2, metricName: 'leads',    targetValue: 220,  notes: 'Meta leads fev' },
    { siteId: sid, year: 2026, month: 2, metricName: 'cpl',      targetValue: 140,  notes: 'CPL target fev — actual ≈ R$143' },
    { siteId: sid, year: 2026, month: 3, metricName: 'sessions', targetValue: 8000, notes: 'Meta tráfego mar' },
    { siteId: sid, year: 2026, month: 3, metricName: 'leads',    targetValue: 230,  notes: 'Meta leads mar' },
    { siteId: sid, year: 2026, month: 3, metricName: 'cpl',      targetValue: 155,  notes: 'CPL target mar — actual ≈ R$189' },
    { siteId: sid, year: 2026, month: 4, metricName: 'sessions', targetValue: 9000, notes: 'Meta tráfego abr' },
    { siteId: sid, year: 2026, month: 4, metricName: 'leads',    targetValue: 240,  notes: 'Meta leads abr' },
    { siteId: sid, year: 2026, month: 4, metricName: 'cpl',      targetValue: 160,  notes: 'CPL target abr — actual ≈ R$250' },
  ]);

  // ── 9. Plan Schedule ──────────────────────────────────────────────────────
  console.log('Plano de marketing...');
  const planRows = [
    // Aquisição — Expansão LinkedIn Ads
    { objective: 'Aquisição',  action: 'Expansão LinkedIn Ads',       year: 2026, month: 2, value: 'Segmentação enterprise por cargo e setor (CFO, CRO)',    status: 'ongoing'  },
    { objective: 'Aquisição',  action: 'Expansão LinkedIn Ads',       year: 2026, month: 3, value: 'Novos formatos: Document Ads + Sponsored Content',         status: 'ongoing'  },
    { objective: 'Aquisição',  action: 'Expansão LinkedIn Ads',       year: 2026, month: 4, value: 'Expansão de targeting + retargeting visitantes do site',    status: 'planned'  },
    { objective: 'Aquisição',  action: 'Expansão LinkedIn Ads',       year: 2026, month: 5, value: 'Teste de campanhas Conversation Ads para nurturing',        status: 'planned'  },
    // Conversão — LP Otimização
    { objective: 'Conversão',  action: 'Otimização de Landing Pages', year: 2026, month: 3, value: 'A/B test: headlines e CTA principal',                      status: 'done'     },
    { objective: 'Conversão',  action: 'Otimização de Landing Pages', year: 2026, month: 4, value: 'Prova social: logos de clientes + depoimentos em vídeo',    status: 'ongoing'  },
    { objective: 'Conversão',  action: 'Otimização de Landing Pages', year: 2026, month: 5, value: 'Otimização mobile + velocidade de carregamento (Core Web)', status: 'planned'  },
    // Conversão — Qualificação de Leads
    { objective: 'Conversão',  action: 'Qualificação de Leads (ICP)', year: 2026, month: 3, value: 'Revisão critérios MQL com time de vendas',                  status: 'done'     },
    { objective: 'Conversão',  action: 'Qualificação de Leads (ICP)', year: 2026, month: 4, value: 'Ajuste de formulários + lead scoring progressivo (HubSpot)', status: 'ongoing'  },
    { objective: 'Conversão',  action: 'Qualificação de Leads (ICP)', year: 2026, month: 5, value: 'Integração score HubSpot → critérios de passagem MQL→SQL',  status: 'planned'  },
    // Receita — Pipeline CRM
    { objective: 'Receita',    action: 'Otimização Pipeline CRM',     year: 2026, month: 2, value: 'Mapeamento dos estágios do funil no HubSpot',               status: 'done'     },
    { objective: 'Receita',    action: 'Otimização Pipeline CRM',     year: 2026, month: 3, value: 'Automações de follow-up por estágio + alertas de inatividade', status: 'done'   },
    { objective: 'Receita',    action: 'Otimização Pipeline CRM',     year: 2026, month: 4, value: 'Dashboard de pipeline + forecast de receita',               status: 'ongoing'  },
    { objective: 'Receita',    action: 'Otimização Pipeline CRM',     year: 2026, month: 5, value: 'Treinamento do time de vendas no novo processo',             status: 'planned'  },
  ];
  for (const r of planRows) await db.insert(planSchedule).values({ siteId: sid, ...r });

  // ── 10. Initiative Meta ────────────────────────────────────────────────────
  console.log('Initiative metadata...');
  await db.insert(initiativeMeta).values([
    {
      siteId: sid,
      objective: 'Aquisição',
      action: 'Expansão LinkedIn Ads',
      businessObjective: 'Aumentar volume de leads qualificados de ICP enterprise em 40% até Q3 2026',
      metricKey: 'leads',
      expectedOutcome: '+40 leads/mês de perfil enterprise, CPL < R$400',
      notes: 'Foco em empresas Financeiro/Seguros/Indústria com 500+ funcionários',
    },
    {
      siteId: sid,
      objective: 'Conversão',
      action: 'Otimização de Landing Pages',
      businessObjective: 'Aumentar taxa de conversão site→lead de 1.8% para 3.0% até maio',
      metricKey: 'sessions',
      expectedOutcome: 'CVR 1.8% → 3.0%, CPL de R$250 → R$170',
      notes: 'Prioridade: LP principal Google Ads e LP específica de LinkedIn',
    },
    {
      siteId: sid,
      objective: 'Conversão',
      action: 'Qualificação de Leads (ICP)',
      businessObjective: 'Melhorar taxa lead→oportunidade de 18% para 30% alinhando critérios MQL com vendas',
      metricKey: 'leads',
      expectedOutcome: 'Lead-to-opp rate 18% → 30%, redução de ruído no pipeline',
      notes: 'Trabalho conjunto com CS e Vendas para definir ICP scoring no HubSpot',
    },
    {
      siteId: sid,
      objective: 'Receita',
      action: 'Otimização Pipeline CRM',
      businessObjective: 'Reduzir ciclo de vendas de 75 para 60 dias e aumentar forecast accuracy',
      metricKey: 'conversions',
      expectedOutcome: 'Ciclo 75d → 60d, forecast accuracy > 80%, win rate +5pp',
      notes: 'CRM: HubSpot. Estágios: MQL → SQL → Demo → Proposta → Fechamento',
    },
  ]);

  // ── 11. Experiments ────────────────────────────────────────────────────────
  console.log('Experimentos...');
  await db.insert(experiments).values([
    {
      siteId: sid,
      hypothesis: 'Segmentando LinkedIn Ads por setor (Financeiro e Seguros), a qualidade dos leads melhora e a taxa lead→oportunidade sobe de 18% para 28%+',
      expectedResult: 'Lead-to-opportunity rate acima de 28% (baseline 18%)',
      duration: '4 semanas',
      startDate: '2026-04-01',
      endDate: null,
      channel: 'LinkedIn Ads',
      metric: 'Lead-to-opportunity rate',
      baselineValue: '18%',
      resultValue: null,
      learning: null,
      status: 'running',
      successful: null,
      category: 'Conversão',
    },
    {
      siteId: sid,
      hypothesis: 'Reduzindo o formulário de captação de 8 para 5 campos, a taxa de conversão da landing page aumenta significativamente',
      expectedResult: 'CVR da landing page sobe de 2.1% para 3.5%+',
      duration: '4 semanas',
      startDate: '2026-03-01',
      endDate: '2026-03-28',
      channel: 'Site',
      metric: 'CVR (Landing Page)',
      baselineValue: '2.1%',
      resultValue: '3.2%',
      learning: 'Formulário curto aumentou CVR em 52%. Resultado estatisticamente significativo (p<0.05). Aplicar em todas as LPs imediatamente.',
      status: 'completed',
      successful: 'yes',
      category: 'Conversão',
    },
  ]);

  // ── 12. Ideas ─────────────────────────────────────────────────────────────
  console.log('Ideas...');
  await db.insert(ideas).values([
    {
      siteId: sid,
      title: 'Webinar: Gestão de Risco em 2026 — Como PMEs reduzem exposição com SaaS',
      description: 'Evento online de 1h posicionando a AlphaTech como autoridade em risk management. Convidar 2 clientes para depoimento ao vivo. Co-produzir com parceiro do setor financeiro.',
      targetDate: '2026-05-20',
      relatedEvent: 'Q2 Pipeline Generation',
      expectedOutcome: '150+ inscritos, 40+ leads qualificados, 5 oportunidades abertas',
      complexity: 'medium',
      category: 'Evento',
      status: 'planned',
      priority: 'high',
    },
    {
      siteId: sid,
      title: 'Calculadora de ROI interativa no site',
      description: 'Widget onde o prospect insere receita anual, setor e nível de risco atual e recebe estimativa de economia e redução de risco com AlphaTech. Gera lead automaticamente ao mostrar resultado.',
      targetDate: '2026-06-01',
      relatedEvent: null,
      expectedOutcome: '+30 leads/mês de alta qualidade via calculadora, aumento de 2min no tempo de sessão',
      complexity: 'high',
      category: 'Produto',
      status: 'planned',
      priority: 'high',
    },
    {
      siteId: sid,
      title: 'Case study aprofundado: Banco Regional com AlphaTech',
      description: 'Documentar caso de sucesso completo com métricas de redução de risco, tempo de implementação, ROI e depoimento do CRO. Publicar como PDF para nurturing e use em demos.',
      targetDate: null,
      relatedEvent: null,
      expectedOutcome: 'Acelerar ciclo de vendas enterprise, aumentar credibilidade em demos, win rate +8%',
      complexity: 'high',
      category: 'Conteúdo',
      status: 'idea',
      priority: 'medium',
    },
    {
      siteId: sid,
      title: 'Sequência de email nurturing para leads com score baixo',
      description: 'Fluxo automatizado de 8 emails em 30 dias para leads que entraram mas não avançaram no funil (score < 40 no HubSpot). Foco em educação sobre risk management e reativação.',
      targetDate: '2026-05-15',
      relatedEvent: null,
      expectedOutcome: '10-15% dos leads frios reativados para SQL, +20 oportunidades/mês',
      complexity: 'medium',
      category: 'Campanha',
      status: 'idea',
      priority: 'medium',
    },
  ]);

  // ── 13. Suppliers ─────────────────────────────────────────────────────────
  console.log('Fornecedores...');
  await db.insert(suppliers).values([
    { siteId: sid, name: 'Agência Performance Digital', category: 'Mídia Paga',        type: 'fornecedor', website: 'https://agencia-perf.com.br', notes: 'Gestão Google Ads + LinkedIn Ads' },
    { siteId: sid, name: 'HubSpot',                     category: 'CRM e Automação',   type: 'tool',       website: 'https://hubspot.com',         notes: 'CRM principal, automações de mkt e vendas' },
    { siteId: sid, name: 'SEMrush',                     category: 'SEO e Analytics',   type: 'tool',       website: 'https://semrush.com',         notes: 'Monitoramento SEO, análise concorrência' },
    { siteId: sid, name: 'Estúdio de Conteúdo B2B',     category: 'Conteúdo',          type: 'fornecedor', website: null,                          notes: 'Produção blog, cases e materiais ricos' },
  ]);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ AlphaTech seed concluído!');
  console.log(`   Site ID : ${sid}`);
  console.log('   Padrão  : Aquisição ↑ (sessions +19% fev→mar) | Conversão ↓ (CVR 3.1% → 1.8%)');
  console.log('   ─────────────────────────────────────────────────────────');
  console.log('   4   canais');
  console.log('   12  performance entries (4 canais × 3 meses)');
  console.log('   9   semanas de Ads KPIs');
  console.log('   9   semanas de dados do site');
  console.log('   15  itens de orçamento (3 meses)');
  console.log('   4   entradas de verbas ads');
  console.log('   9   metas (sessions, leads, CPL por mês)');
  console.log('   14  células do plano (4 iniciativas)');
  console.log('   4   initiative metas');
  console.log('   2   experimentos');
  console.log('   4   ideias');
  console.log('   4   fornecedores');
}

main().catch(err => { console.error('Seed falhou:', err); process.exit(1); });
