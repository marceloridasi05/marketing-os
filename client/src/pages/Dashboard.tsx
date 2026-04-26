import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Brain, Loader2, Clock, Radar, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Activity, BarChart3, Target, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { STAGE_META, STAGE_ORDER, groupByStage, type FunnelStage } from '../lib/metricClassification';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { CollapsibleCard } from '../components/CollapsibleCard';

// --- Types ---
interface SiteRow {
  id: number;
  week: string;
  weekStart: string;
  sessions: number | null;
  totalUsers: number | null;
  paidClicks: number | null;
  unpaidSessions: number | null;
  newUsers: number | null;
  newUsersPct: string | null;
  leadsGenerated: number | null;
  weeklyGains: number | null;
  blogSessions: number | null;
  blogTotalUsers: number | null;
  blogNewUsers: number | null;
  blogNewUsersPct: string | null;
  aiSessions: number | null;
  aiTotalUsers: number | null;
}

interface AdsKpiRow {
  id: number;
  week: string;
  weekStart: string;
  gaImpressions: number | null;
  gaClicks: number | null;
  gaCtr: string | null;
  gaCpcAvg: string | null;
  gaCpmAvg: string | null;
  gaCostAvg: string | null;
  gaCvr: string | null;
  gaConversions: number | null;
  gaCostPerConversion: string | null;
  liImpressions: number | null;
  liClicks: number | null;
  liCost: number | null;
}

interface LiCampaignRow {
  id: number;
  week: string;
  weekStart: string;
  campaignName: string;
  accountType: string;
  funnelStage: string;
  impressions: number | null;
  clicks: number | null;
  ctr: string | null;
  frequency: string | null;
  cpcAvg: string | null;
  cost: number | null;
}

interface LinkedinPageRow {
  id: number;
  weekStart: string;
  followers: number | null;
  followersGained: number | null;
  followersLost: number | null;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  pageViews: number | null;
  uniqueVisitors: number | null;
}

interface BudgetItemRow {
  id: number;
  section: string;
  strategy: string | null;
  expenseType: string | null;
  name: string;
  year: number;
  month: number;
  planned: number;
  actual: number;
}

interface AdsBudgetRow {
  id: number;
  year: number;
  month: number;
  dailyGoogle: number | null;
  monthlyGoogle: number | null;
  dailyLinkedin: number | null;
  monthlyLinkedin: number | null;
  dailyTotal: number | null;
  monthlyTotalUsed: number | null;
  monthlyAvailable: number | null;
}

// --- Helpers ---
const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtMoneyFull = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Time period filter (centralized)
import { TimeFilter, useTimeFilter, getDateRange, type TimePeriod } from '../components/TimeFilter';

function filterByWeekStart<T extends { weekStart: string }>(rows: T[], range: { start: string; end: string } | null): T[] {
  if (!range) return rows;
  return rows.filter(r => r.weekStart >= range.start && r.weekStart <= range.end);
}

function filterBudgetByRange(rows: BudgetItemRow[], range: { start: string; end: string } | null): BudgetItemRow[] {
  if (!range) return rows;
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const startYM = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);
  const endYM = endDate.getFullYear() * 100 + (endDate.getMonth() + 1);
  return rows.filter(r => {
    const ym = r.year * 100 + r.month;
    return ym >= startYM && ym <= endYM;
  });
}

function filterAdsBudgetByRange(rows: AdsBudgetRow[], range: { start: string; end: string } | null): AdsBudgetRow[] {
  if (!range) return rows.filter(r => r.month > 0);
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const startYM = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);
  const endYM = endDate.getFullYear() * 100 + (endDate.getMonth() + 1);
  return rows.filter(r => {
    if (r.month === 0) return false;
    const ym = r.year * 100 + r.month;
    return ym >= startYM && ym <= endYM;
  });
}

// Simple markdown to HTML
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-5 mb-2">$1</h2>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700">$1</li>');
  // Numbered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-gray-700">$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="space-y-1 my-2">$1</ul>');
  // Paragraphs for remaining lines
  html = html.replace(/^(?!<[hul])((?!\s*$).+)$/gm, '<p class="text-sm text-gray-700 my-1">$1</p>');
  // Line breaks
  html = html.replace(/\n{2,}/g, '\n');
  return html;
}

// --- KPI Tile ---
function KpiTile({ label, value, icon }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </Card>
  );
}

// --- Main ---
export function Dashboard() {
  const { timePeriod, dateRange, filterProps } = useTimeFilter('this_year');
  const [engineFilter, setEngineFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Raw data
  const [siteData, setSiteData] = useState<SiteRow[]>([]);
  const [adsKpis, setAdsKpis] = useState<AdsKpiRow[]>([]);
  const [liCampaigns, setLiCampaigns] = useState<LiCampaignRow[]>([]);
  const [linkedinPage, setLinkedinPage] = useState<LinkedinPageRow[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemRow[]>([]);
  const [adsBudgets, setAdsBudgets] = useState<AdsBudgetRow[]>([]);

  // ABM Intelligence state
  const [abmData, setAbmData] = useState<{
    stats: { totalVisits: number; identifiedLogos: number; estimatedLogos: number; totalLogoReach: number; corporateVisits: number; icpInferredLogos: number; lastVisit: string };
    intelligence: { totalAccounts: number; onFire: number; hot: number; warm: number; cold: number; identityConfirmed: number };
    targets: { total: number; manualTargets: number; detected: number };
    topAccounts: { name: string; domain: string | null; visits: number; sessions: number; intent: string; lastSeen: string; pages: number; heatScore: number; outboundScore: number }[];
    linhaDeChegada: { name: string; domain: string; heatScore: number; abmScore: number; outboundScore: number; visits: number; accountStatus: string }[];
    recentVisits: { company: string; page: string; source: string; timestamp: string; intent: string; confidence: string }[];
    abmUrl: string;
  } | null>(null);
  const [abmLoading, setAbmLoading] = useState(false);
  const [showChannelNames, setShowChannelNames] = useState(true);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiCardRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [site, ads, liCamp, liPage, budget, adsB] = await Promise.allSettled([
        api.get<SiteRow[]>('/site-data'),
        api.get<AdsKpiRow[]>('/ads-kpis'),
        api.get<LiCampaignRow[]>('/ads-kpis/linkedin'),
        api.get<LinkedinPageRow[]>('/linkedin-page'),
        api.get<BudgetItemRow[]>('/budget-items'),
        api.get<AdsBudgetRow[]>('/ads-budgets'),
      ]);
      if (site.status === 'fulfilled') setSiteData(site.value);
      if (ads.status === 'fulfilled') setAdsKpis(ads.value);
      if (liCamp.status === 'fulfilled') setLiCampaigns(liCamp.value);
      if (liPage.status === 'fulfilled') setLinkedinPage(liPage.value);
      if (budget.status === 'fulfilled') setBudgetItems(budget.value);
      if (adsB.status === 'fulfilled') setAdsBudgets(adsB.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Sync state — must be declared AFTER fetchAll
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setSyncStatus(null);
    const syncRoutes = [
      { label: 'Dados do Site', path: '/site-data/sync' },
      { label: 'KPIs Ads', path: '/ads-kpis/sync' },
      { label: 'LinkedIn Page', path: '/linkedin-page/sync' },
      { label: 'Itens de Budget', path: '/budget-items/sync' },
      { label: 'Verbas Ads', path: '/ads-budgets/sync' },
      { label: 'Plano', path: '/plan-schedule/sync' },
    ];
    const results: string[] = [];
    for (const route of syncRoutes) {
      try {
        await api.post(route.path, {});
        results.push(`✓ ${route.label}`);
      } catch (e) {
        results.push(`✗ ${route.label}: ${String(e)}`);
      }
    }
    setSyncStatus(results.join('\n'));
    setSyncing(false);
    await fetchAll();
  }, [fetchAll]);

  // Fetch ABM data separately (external API, may be slow)
  useEffect(() => {
    setAbmLoading(true);
    api.get<typeof abmData>('/abm/summary')
      .then(d => setAbmData(d))
      .catch(() => setAbmData(null))
      .finally(() => setAbmLoading(false));
  }, []);

  // Filtered data
  // dateRange comes from useTimeFilter hook
  const fSite = useMemo(() => filterByWeekStart(siteData, dateRange), [siteData, dateRange]);
  const fAds = useMemo(() => filterByWeekStart(adsKpis, dateRange), [adsKpis, dateRange]);
  const fLiPage = useMemo(() => filterByWeekStart(linkedinPage, dateRange), [linkedinPage, dateRange]);
  const fBudget = useMemo(() => filterBudgetByRange(budgetItems, dateRange), [budgetItems, dateRange]);
  const fAdsBudgets = useMemo(() => filterAdsBudgetByRange(adsBudgets, dateRange), [adsBudgets, dateRange]);

  // --- KPI computations ---
  const totalSessions = fSite.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const totalLeads = fSite.reduce((s, r) => s + (r.leadsGenerated ?? 0), 0);
  const totalGaConversions = fAds.reduce((s, r) => s + (r.gaConversions ?? 0), 0);
  const totalLiImpressions = fLiPage.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const latestFollowers = [...fLiPage].reverse().find(r => r.followers != null)?.followers ?? 0;
  const totalAdsSpend = fAdsBudgets.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);
  const isNotTotalRow = (r: BudgetItemRow) => !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt';
  const totalMktgSpend = fBudget.filter(r => r.section !== 'Budget' && r.section !== 'Headcount' && isNotTotalRow(r)).reduce((s, r) => s + r.actual, 0);

  // Savings: current year only (resets per year), from SAVINGS_START, excl Headcount & Total rows
  const currentYear = new Date().getFullYear();
  const savingsYear = timePeriod === 'this_year' ? currentYear : (timePeriod === 'last_month' ? (new Date().getMonth() === 0 ? currentYear - 1 : currentYear) : currentYear);
  const savingsCostItems = fBudget.filter(r => r.section !== 'Budget' && r.section !== 'Headcount' && isNotTotalRow(r) && r.year === savingsYear);
  const savingsBudgetItems = fBudget.filter(r => r.section === 'Budget' && r.year === savingsYear);
  const totalSavings = savingsBudgetItems.reduce((s, r) => s + r.planned, 0) - savingsCostItems.reduce((s, r) => s + r.actual, 0);

  // --- ANALYTICS ENGINE (deterministic) ---
  // Previous period data for comparison
  const prevRange = useMemo(() => {
    if (!dateRange) return null;
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    const diff = e.getTime() - s.getTime() + 86400000;
    const prevEnd = new Date(s.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - diff + 86400000);
    return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
  }, [dateRange]);

  const pSite = useMemo(() => filterByWeekStart(siteData, prevRange), [siteData, prevRange]);
  const pAds = useMemo(() => filterByWeekStart(adsKpis, prevRange), [adsKpis, prevRange]);
  const pLiPage = useMemo(() => filterByWeekStart(linkedinPage, prevRange), [linkedinPage, prevRange]);
  const pAdsBudgets = useMemo(() => filterAdsBudgetByRange(adsBudgets, prevRange), [adsBudgets, prevRange]);

  const prevSessions = pSite.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const prevLeads = pSite.reduce((s, r) => s + (r.leadsGenerated ?? 0), 0);
  const prevGaConv = pAds.reduce((s, r) => s + (r.gaConversions ?? 0), 0);
  const prevLiImp = pLiPage.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const prevAdsSpend = pAdsBudgets.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);

  const safePct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
  const safeDivide = (a: number, b: number) => b > 0 ? a / b : null;

  // KPI Comparisons
  const kpiComparisons = useMemo(() => {
    const cpl = safeDivide(totalAdsSpend, totalLeads);
    const prevCpl = safeDivide(prevAdsSpend, prevLeads);
    const gaClicks = fAds.reduce((s, r) => s + (r.gaClicks ?? 0), 0);
    const gaImp = fAds.reduce((s, r) => s + (r.gaImpressions ?? 0), 0);
    const prevGaClicks = pAds.reduce((s, r) => s + (r.gaClicks ?? 0), 0);
    const prevGaImp = pAds.reduce((s, r) => s + (r.gaImpressions ?? 0), 0);
    const ctr = safeDivide(gaClicks, gaImp);
    const prevCtr = safeDivide(prevGaClicks, prevGaImp);
    const convRate = safeDivide(totalGaConversions, gaClicks);
    const prevConvRate = safeDivide(prevGaConv, prevGaClicks);
    return [
      { label: 'Sessões', cur: totalSessions, prev: prevSessions, fmt: 'num' as const },
      { label: 'Leads', cur: totalLeads, prev: prevLeads, fmt: 'num' as const },
      { label: 'Investimento', cur: totalAdsSpend, prev: prevAdsSpend, fmt: 'money' as const },
      { label: 'CPL', cur: cpl, prev: prevCpl, fmt: 'money' as const },
      { label: 'CTR', cur: ctr != null ? ctr * 100 : null, prev: prevCtr != null ? prevCtr * 100 : null, fmt: 'pct' as const },
      { label: 'Taxa Conv.', cur: convRate != null ? convRate * 100 : null, prev: prevConvRate != null ? prevConvRate * 100 : null, fmt: 'pct' as const },
    ];
  }, [totalSessions, prevSessions, totalLeads, prevLeads, totalAdsSpend, prevAdsSpend, totalGaConversions, prevGaConv, fAds, pAds]);

  // Rule-based Alerts
  const alerts = useMemo(() => {
    const items: { severity: 'critical' | 'warning' | 'good'; msg: string }[] = [];
    // Spend > 0 but leads = 0
    if (totalAdsSpend > 0 && totalLeads === 0) items.push({ severity: 'critical', msg: 'Investimento em Ads sem gerar leads no período' });
    // CPL > 1.5x prev
    const cpl = safeDivide(totalAdsSpend, totalLeads);
    const prevCpl = safeDivide(prevAdsSpend, prevLeads);
    if (cpl != null && prevCpl != null && prevCpl > 0 && cpl > prevCpl * 1.5) items.push({ severity: 'warning', msg: `CPL subiu ${((cpl / prevCpl - 1) * 100).toFixed(0)}% vs período anterior` });
    // Spend up, leads down
    if (totalAdsSpend > prevAdsSpend && totalLeads < prevLeads && prevLeads > 0) items.push({ severity: 'warning', msg: 'Investimento subiu mas leads caíram' });
    // Sessions up, leads down
    if (totalSessions > prevSessions && totalLeads < prevLeads && prevLeads > 0) items.push({ severity: 'warning', msg: 'Sessões subiram mas leads caíram — problema de conversão' });
    // Budget overrun
    if (totalSavings < 0) items.push({ severity: 'critical', msg: `Orçamento estourado: ${fmtMoney(Math.abs(totalSavings))} acima` });
    // Good signals
    if (totalLeads > prevLeads && prevLeads > 0) items.push({ severity: 'good', msg: `Leads cresceram ${safePct(totalLeads, prevLeads).toFixed(0)}% vs anterior` });
    if (totalSavings > 0 && totalMktgSpend > 0) items.push({ severity: 'good', msg: `Savings de ${fmtMoney(totalSavings)} no período` });
    if (cpl != null && prevCpl != null && cpl < prevCpl) items.push({ severity: 'good', msg: `CPL melhorou ${((1 - cpl / prevCpl) * 100).toFixed(0)}%` });
    return items;
  }, [totalAdsSpend, totalLeads, prevAdsSpend, prevLeads, totalSessions, prevSessions, totalSavings, totalMktgSpend]);

  // Bottleneck Detection
  const bottleneck = useMemo(() => {
    // Score each dimension 0-2 (0=bad, 1=attention, 2=good)
    const sessionsTrend = totalSessions > prevSessions ? 2 : totalSessions === prevSessions ? 1 : 0;
    const leadsTrend = totalLeads > prevLeads ? 2 : totalLeads === prevLeads ? 1 : 0;
    const cpl = safeDivide(totalAdsSpend, totalLeads);
    const prevCplVal = safeDivide(prevAdsSpend, prevLeads);
    const efficiencyTrend = cpl != null && prevCplVal != null ? (cpl <= prevCplVal ? 2 : cpl <= prevCplVal * 1.3 ? 1 : 0) : 1;
    const budgetOk = totalSavings >= 0 ? 2 : totalSavings > -10000 ? 1 : 0;

    if (sessionsTrend === 0 && leadsTrend <= 1) return { type: 'Aquisição', desc: 'Tráfego em queda — revisar canais e campanhas', icon: '🔍', color: 'red' };
    if (sessionsTrend >= 1 && leadsTrend === 0) return { type: 'Conversão', desc: 'Tráfego ok mas leads caíram — revisar landing pages e CTAs', icon: '🎯', color: 'orange' };
    if (efficiencyTrend === 0) return { type: 'Eficiência', desc: 'CPL subindo — otimizar campanhas ou realocar budget', icon: '💰', color: 'orange' };
    if (budgetOk === 0) return { type: 'Orçamento', desc: 'Gastos acima do planejado — priorizar cortes ou renegociar', icon: '📊', color: 'red' };
    return { type: 'Saudável', desc: 'Sem gargalos críticos identificados', icon: '✅', color: 'green' };
  }, [totalSessions, prevSessions, totalLeads, prevLeads, totalAdsSpend, prevAdsSpend, totalSavings]);

  // Health Score (0-10)
  const healthScore = useMemo(() => {
    let score = 5; // baseline
    // Lead trend (+/- 2)
    if (prevLeads > 0) { const d = safePct(totalLeads, prevLeads); score += d > 10 ? 2 : d > 0 ? 1 : d > -10 ? 0 : d > -25 ? -1 : -2; }
    // Efficiency (+/- 2)
    const cpl = safeDivide(totalAdsSpend, totalLeads);
    const pCpl = safeDivide(prevAdsSpend, prevLeads);
    if (cpl != null && pCpl != null && pCpl > 0) { const d = ((cpl - pCpl) / pCpl) * 100; score += d < -10 ? 2 : d < 0 ? 1 : d < 15 ? 0 : d < 30 ? -1 : -2; }
    // Budget adherence (+/- 2)
    score += totalSavings > 10000 ? 2 : totalSavings >= 0 ? 1 : totalSavings > -10000 ? -1 : -2;
    // Session trend (+/- 1)
    if (prevSessions > 0) { const d = safePct(totalSessions, prevSessions); score += d > 5 ? 1 : d < -5 ? -1 : 0; }
    // Clamp 0-10
    return Math.max(0, Math.min(10, score));
  }, [totalLeads, prevLeads, totalAdsSpend, prevAdsSpend, totalSessions, prevSessions, totalSavings]);

  const healthStatus = healthScore >= 7 ? 'Saudável' : healthScore >= 4 ? 'Atenção' : 'Crítico';
  const healthColor = healthScore >= 7 ? 'green' : healthScore >= 4 ? 'yellow' : 'red';

  // ── Grouped metrics — driven by the universal classification registry ────────
  const metricGroups = useMemo(() => {
    const gaClicks  = fAds.reduce((s, r) => s + (r.gaClicks  ?? 0), 0);
    const gaImp     = fAds.reduce((s, r) => s + (r.gaImpressions ?? 0), 0);
    const liImp     = fLiPage.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const liReact   = fLiPage.reduce((s, r) => s + (r.reactions ?? 0), 0);
    const liComments= fLiPage.reduce((s, r) => s + (r.comments  ?? 0), 0);
    const liShares  = fLiPage.reduce((s, r) => s + (r.shares    ?? 0), 0);
    const newUsers  = fSite.reduce((s, r) => s + (r.newUsers ?? 0), 0);

    const pGaClicks  = pAds.reduce((s, r) => s + (r.gaClicks  ?? 0), 0);
    const pGaImp     = pAds.reduce((s, r) => s + (r.gaImpressions ?? 0), 0);
    const pLiImp     = pLiPage.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const pLiReact   = pLiPage.reduce((s, r) => s + (r.reactions ?? 0), 0);
    const pLiComments= pLiPage.reduce((s, r) => s + (r.comments  ?? 0), 0);
    const pLiShares  = pLiPage.reduce((s, r) => s + (r.shares    ?? 0), 0);
    const pNewUsers  = pSite.reduce((s, r) => s + (r.newUsers ?? 0), 0);

    const ctr  = safeDivide(gaClicks, gaImp);
    const pCtr = safeDivide(pGaClicks, pGaImp);
    const cvr  = safeDivide(totalGaConversions, gaClicks);
    const pCvr = safeDivide(prevGaConv, pGaClicks);
    const cpl  = safeDivide(totalAdsSpend, totalLeads);
    const pCpl = safeDivide(prevAdsSpend, prevLeads);

    type DashMetric = {
      key: string;            // must match a key in REGISTRY or be overridden
      label: string;
      value: number | null;
      prev: number | null;
      fmt: 'num' | 'money' | 'pct';
      lowerIsBetter?: boolean;
      available: boolean;
      classification?: FunnelStage; // explicit override (optional)
    };

    const all: DashMetric[] = [
      // ── Awareness ────────────────────────────────────────────────────────
      { key: 'impressions',  label: 'Impressões (GA)',   value: gaImp,        prev: pGaImp,        fmt: 'num',   available: gaImp > 0                },
      { key: 'li_impressions',label:'Impressões (LI)',   value: liImp,        prev: pLiImp,        fmt: 'num',   available: liImp > 0                },
      { key: 'followers',    label: 'Seguidores LI',     value: latestFollowers, prev: null,       fmt: 'num',   available: latestFollowers > 0      },
      // ── Acquisition ──────────────────────────────────────────────────────
      { key: 'sessions',     label: 'Sessões',           value: totalSessions, prev: prevSessions, fmt: 'num',   available: totalSessions > 0        },
      { key: 'new_users',    label: 'Novos Usuários',    value: newUsers,     prev: pNewUsers,     fmt: 'num',   available: newUsers > 0             },
      { key: 'clicks',       label: 'Cliques (GA)',      value: gaClicks,     prev: pGaClicks,     fmt: 'num',   available: gaClicks > 0             },
      // ── Conversion ───────────────────────────────────────────────────────
      { key: 'leads',        label: 'Leads',             value: totalLeads,   prev: prevLeads,     fmt: 'num',   available: totalLeads > 0           },
      { key: 'conversions',  label: 'Conversões GA',     value: totalGaConversions, prev: prevGaConv, fmt: 'num', available: totalGaConversions > 0  },
      { key: 'ctr',          label: 'CTR',               value: ctr  != null ? ctr  * 100 : null, prev: pCtr != null ? pCtr * 100 : null, fmt: 'pct', available: ctr != null },
      { key: 'cvr',          label: 'Taxa Conv.',        value: cvr  != null ? cvr  * 100 : null, prev: pCvr != null ? pCvr * 100 : null, fmt: 'pct', available: cvr != null },
      { key: 'cpl',          label: 'CPL',               value: cpl,          prev: pCpl,          fmt: 'money', lowerIsBetter: true, available: cpl != null },
      // ── Revenue ───────────────────────────────────────────────────────────
      { key: 'ads_spend',    label: 'Gasto Ads',         value: totalAdsSpend,  prev: prevAdsSpend, fmt: 'money', lowerIsBetter: true, available: totalAdsSpend > 0  },
      { key: 'mktg_spend',   label: 'Gasto Mktg',        value: totalMktgSpend, prev: null,         fmt: 'money', lowerIsBetter: true, available: totalMktgSpend > 0 },
      { key: 'savings',      label: 'Savings',           value: totalSavings,   prev: null,         fmt: 'money', available: fBudget.length > 0       },
      // ── Retention ─────────────────────────────────────────────────────────
      { key: 'reactions',    label: 'Reações LI',        value: liReact,      prev: pLiReact,      fmt: 'num',   available: liReact > 0              },
      { key: 'comments',     label: 'Comentários LI',    value: liComments,   prev: pLiComments,   fmt: 'num',   available: liComments > 0           },
      { key: 'shares',       label: 'Compartilhamentos', value: liShares,     prev: pLiShares,     fmt: 'num',   available: liShares > 0             },
    ];

    // Use groupByStage — respects any per-metric classification override
    return groupByStage(all.filter(m => m.available));
  }, [
    fAds, pAds, fLiPage, pLiPage, fSite, pSite,
    totalSessions, prevSessions, totalLeads, prevLeads, latestFollowers,
    totalGaConversions, prevGaConv, totalAdsSpend, prevAdsSpend,
    totalMktgSpend, totalSavings, fBudget,
  ]);

  // ── Biggest drop / growth across all metrics ───────────────────────────────
  const momentum = useMemo(() => {
    const all = Array.from(metricGroups.values())
      .flat()
      .filter(m => m.value != null && m.prev != null && (m.prev ?? 0) > 0);

    const withPct = all.map(m => {
      const raw = safePct(m.value!, m.prev!);
      // For "lower is better" metrics (CPL, spend), flip the sign for ranking
      const ranked = m.lowerIsBetter ? -raw : raw;
      return { ...m, pct: raw, ranked };
    });

    withPct.sort((a, b) => b.ranked - a.ranked);
    const biggest  = withPct[0]  ?? null;
    const smallest = withPct[withPct.length - 1] ?? null;
    return { growth: biggest, drop: smallest };
  }, [metricGroups]);

  // Rankings (top channels by spend from budget items)
  const rankings = useMemo(() => {
    const costItems = fBudget.filter(r => r.section === 'Mídia' && isNotTotalRow(r));
    const byName = new Map<string, { spend: number; name: string }>();
    for (const r of costItems) {
      const cur = byName.get(r.name) ?? { spend: 0, name: r.name };
      cur.spend += r.actual;
      byName.set(r.name, cur);
    }
    const sorted = [...byName.values()].filter(v => v.spend > 0).sort((a, b) => b.spend - a.spend);
    return {
      highestSpend: sorted[0] ?? null,
      lowestSpend: sorted.length > 1 ? sorted[sorted.length - 1] : null,
      topSpenders: sorted.slice(0, 5),
    };
  }, [fBudget]);

  // --- Chart data ---
  const siteChartData = useMemo(() => {
    const withData = fSite.filter(r => r.sessions != null && (r.sessions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.week?.replace('Semana ', 'S') ?? r.weekStart,
      'Sessões': r.sessions ?? 0,
      'Leads': r.leadsGenerated ?? 0,
    }));
  }, [fSite]);

  const adsChartData = useMemo(() => {
    const withData = fAds.filter(r => (r.gaClicks ?? 0) > 0 || (r.gaConversions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.week?.replace('Semana ', 'S') ?? r.weekStart,
      'Cliques': r.gaClicks ?? 0,
      'Conversões': r.gaConversions ?? 0,
    }));
  }, [fAds]);

  const liPageChartData = useMemo(() => {
    const withData = fLiPage.filter(r => (r.impressions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.weekStart,
      'Impressões': r.impressions ?? 0,
    }));
  }, [fLiPage]);

  const budgetChartData = useMemo(() => {
    // Monthly aggregation from 2025-09
    const allItems = budgetItems.filter(r => {
      const ym = r.year * 100 + r.month;
      return ym >= 202509 && r.section !== 'Budget' && !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt';
    });
    // Also apply date range filter if set
    const items = dateRange ? filterBudgetByRange(allItems, dateRange) : allItems;
    const byMonth = new Map<string, { planned: number; actual: number }>();
    for (const r of items) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { planned: 0, actual: 0 };
      cur.planned += r.planned;
      cur.actual += r.actual;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        return {
          month: `${MONTH_NAMES[parseInt(m) - 1]}/${y.slice(2)}`,
          'Budget': Math.round(v.planned),
          'Gasto': Math.round(v.actual),
        };
      });
  }, [budgetItems, dateRange]);

  // --- Table data: Top Canais por Gasto ---
  const topChannels = useMemo(() => {
    const byName = new Map<string, number>();
    for (const r of fBudget) {
      if (r.section === 'Budget' || r.name.startsWith('Total ') || r.name === 'Grand Total Mkt') continue;
      const cur = byName.get(r.name) ?? 0;
      byName.set(r.name, cur + r.actual);
    }
    const sorted = Array.from(byName.entries())
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    return sorted.map(([name, spend]) => ({ name, spend, pct: (spend / max) * 100 }));
  }, [fBudget]);

  // --- Table data: LinkedIn Ads - latest week with data ---
  // LinkedIn campaigns aggregated for the selected period
  const fLiCampaigns = useMemo(() => filterByWeekStart(liCampaigns, dateRange), [liCampaigns, dateRange]);
  const liAdsLatest = useMemo(() => {
    if (fLiCampaigns.length === 0) return [];
    // Aggregate by campaign name across all weeks in period
    const byCamp = new Map<string, { campaignName: string; impressions: number; clicks: number; cost: number }>();
    for (const r of fLiCampaigns) {
      if ((r.impressions ?? 0) === 0 && (r.clicks ?? 0) === 0) continue;
      const cur = byCamp.get(r.campaignName) ?? { campaignName: r.campaignName, impressions: 0, clicks: 0, cost: 0 };
      cur.impressions += r.impressions ?? 0;
      cur.clicks += r.clicks ?? 0;
      cur.cost += r.cost ?? 0;
      byCamp.set(r.campaignName, cur);
    }
    return [...byCamp.values()].sort((a, b) => b.cost - a.cost);
  }, [fLiCampaigns]);

  // --- Table data: Savings por Mes ---
  const savingsTable = useMemo(() => {
    const costItems = budgetItems.filter(r => {
      const ym = r.year * 100 + r.month;
      return ym >= 202509 && r.section !== 'Budget' && r.section !== 'Headcount' && !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt';
    });
    const budgetLines = budgetItems.filter(r => r.section === 'Budget');
    const filteredCost = dateRange ? filterBudgetByRange(costItems, dateRange) : costItems;
    const filteredBudget = dateRange ? filterBudgetByRange(budgetLines, dateRange) : budgetLines.filter(r => (r.year * 100 + r.month) >= 202509);

    // Get unique months from both
    const allKeys = new Set<string>();
    filteredCost.forEach(r => allKeys.add(`${r.year}-${String(r.month).padStart(2, '0')}`));
    filteredBudget.forEach(r => allKeys.add(`${r.year}-${String(r.month).padStart(2, '0')}`));

    return [...allKeys].sort().map(key => {
      const [y, m] = key.split('-').map(Number);
      const budget = filteredBudget.filter(r => r.year === y && r.month === m).reduce((s, r) => s + r.planned, 0);
      const actual = filteredCost.filter(r => r.year === y && r.month === m).reduce((s, r) => s + r.actual, 0);
      return {
        label: `${MONTH_NAMES[m - 1]}/${y}`,
        planned: budget,
        actual,
        savings: budget - actual,
      };
    });
  }, [budgetItems, dateRange]);

  // --- AI Analysis ---
  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const dashboardData = {
        site: {
          totalSessions,
          totalLeads,
          weeklyTrend: siteChartData.slice(-8),
        },
        googleAds: {
          totalConversions: totalGaConversions,
          totalClicks: fAds.reduce((s, r) => s + (r.gaClicks ?? 0), 0),
          totalImpressions: fAds.reduce((s, r) => s + (r.gaImpressions ?? 0), 0),
          weeklyTrend: adsChartData.slice(-8),
        },
        linkedinPage: {
          totalImpressions: totalLiImpressions,
          latestFollowers,
          weeklyTrend: liPageChartData.slice(-8),
        },
        linkedinAds: {
          campaigns: liAdsLatest.slice(0, 10).map(c => ({
            name: c.campaignName,
            impressions: c.impressions,
            clicks: c.clicks,
            cost: c.cost,
            ctr: c.ctr,
          })),
        },
        budget: {
          totalAdsSpend,
          totalMktgSpend,
          totalSavings,
          topChannels: topChannels.slice(0, 5).map(c => ({ name: c.name, spend: c.spend })),
          monthlyTrend: budgetChartData,
        },
      };

      const result = await api.post<{ analysis: string; timestamp: string }>('/ai-analysis/analyze', { dashboardData });
      setAiAnalysis(result.analysis);
      setAiTimestamp(result.timestamp);
    } catch (err) {
      setAiError(String(err));
    }
    setAiLoading(false);
    // Scroll to AI card
    setTimeout(() => {
      aiCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Consciência situacional e tomada de decisão"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={syncing || loading}
              title="Sincronizar todas as abas da planilha"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 disabled:opacity-50 border border-gray-200 transition-colors"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar
            </button>
            <button
              onClick={handleAiAnalysis}
              disabled={aiLoading || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 shadow-sm"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              Análise IA
            </button>
          </div>
        }
      />

      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <TimeFilter {...filterProps} />
      </div>

      {/* Sync status toast */}
      {syncStatus && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{syncStatus}</pre>
            <button onClick={() => setSyncStatus(null)} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">✕</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Empty state: no data synced yet */}
          {siteData.length === 0 && adsKpis.length === 0 && budgetItems.length === 0 && (
            <div className="mb-6 flex flex-col items-center justify-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
              <RefreshCw size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">Nenhum dado encontrado para este site</p>
              <p className="text-xs text-gray-400 mb-4 max-w-xs">
                Configure a planilha Google Sheets em <strong>Configurações</strong> e clique em <strong>Sincronizar</strong> para importar os dados.
              </p>
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                Sincronizar agora
              </button>
            </div>
          )}

          {/* ── Grouped Metric Groups — driven by universal classification ── */}
          {(() => {
            const fmtV = (v: number | null, fmt: 'num' | 'money' | 'pct') => {
              if (v == null) return '—';
              if (fmt === 'money') return fmtMoney(v);
              if (fmt === 'pct')   return `${v.toFixed(1)}%`;
              return fmtNum(v);
            };

            type DashM = { key: string; label: string; value: number | null; prev: number | null; fmt: 'num'|'money'|'pct'; lowerIsBetter?: boolean; available: boolean };

            const MetricRow = ({ m }: { m: DashM }) => {
              const diff = (m.value ?? 0) - (m.prev ?? 0);
              const pct  = (m.prev ?? 0) > 0 ? safePct(m.value ?? 0, m.prev ?? 0) : null;
              const up   = diff > 0;
              const positive = m.lowerIsBetter ? !up : up;
              const noChange = diff === 0 || (m.prev ?? 0) === 0;
              return (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-600">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{fmtV(m.value, m.fmt)}</span>
                    {!noChange && pct !== null && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {positive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {Math.abs(pct).toFixed(0)}%
                      </span>
                    )}
                    {noChange && m.prev != null && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400">
                        <Minus size={9} /> —
                      </span>
                    )}
                  </div>
                </div>
              );
            };

            const stagesWithData = STAGE_ORDER.filter(s => (metricGroups.get(s)?.length ?? 0) > 0);
            const cols = stagesWithData.length <= 2 ? stagesWithData.length : stagesWithData.length <= 3 ? 3 : stagesWithData.length <= 4 ? 4 : 3;

            return (
              <div className={`grid grid-cols-1 gap-4 mb-6 md:grid-cols-${cols}`}>
                {stagesWithData.map(stage => {
                  const meta = STAGE_META[stage];
                  const metrics = metricGroups.get(stage) ?? [];
                  return (
                    <Card key={stage} className={`border-t-2 ${meta.borderColor} pt-3`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${meta.iconColor}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{metrics.length} métricas</span>
                      </div>
                      {metrics.map((m: DashM) => <MetricRow key={m.key} m={m} />)}
                    </Card>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Analytics row: Health + Momentum + Bottleneck + Alerts ────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">

            {/* Health Score */}
            <Card className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 ${
                healthColor === 'green' ? 'bg-green-100 text-green-700' :
                healthColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {healthScore}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Saúde</p>
                <p className={`text-sm font-bold ${
                  healthColor === 'green' ? 'text-green-600' :
                  healthColor === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>{healthStatus}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Score 0–10</p>
              </div>
            </Card>

            {/* Biggest Growth / Drop */}
            <Card className="col-span-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Maiores Variações</p>
              <div className="space-y-2">
                {momentum.growth && (momentum.growth.pct ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 shrink-0">
                      <TrendingUp size={12} className="text-green-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 leading-none">Maior alta</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{momentum.growth.label}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-green-600 shrink-0">
                      +{Math.abs(momentum.growth.pct ?? 0).toFixed(0)}%
                    </span>
                  </div>
                )}
                {momentum.drop && (momentum.drop.pct ?? 0) < 0 && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 shrink-0">
                      <TrendingDown size={12} className="text-red-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 leading-none">Maior queda</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{momentum.drop.label}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-red-600 shrink-0">
                      {Math.abs(momentum.drop.pct ?? 0).toFixed(0)}%
                    </span>
                  </div>
                )}
                {(!momentum.growth || (momentum.growth.pct ?? 0) <= 0) &&
                 (!momentum.drop  || (momentum.drop.pct  ?? 0) >= 0) && (
                  <p className="text-xs text-gray-400">Sem variações no período</p>
                )}
              </div>
            </Card>

            {/* Bottleneck */}
            <Card className={`border-l-4 ${
              bottleneck.color === 'green' ? 'border-l-green-500' :
              bottleneck.color === 'orange' ? 'border-l-orange-500' :
              'border-l-red-500'
            }`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Gargalo Principal</p>
              <div className="flex items-start gap-2">
                <span className="text-lg mt-0.5">{bottleneck.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{bottleneck.type}</p>
                  <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{bottleneck.desc}</p>
                </div>
              </div>
            </Card>

            {/* Alerts */}
            <Card>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Alertas</p>
              <div className="space-y-1.5">
                {alerts.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem alertas no período</p>
                ) : alerts.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    {a.severity === 'critical' ? <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" /> :
                     a.severity === 'warning'  ? <AlertTriangle size={12} className="text-yellow-500 mt-0.5 shrink-0" /> :
                     <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />}
                    <span className={`leading-tight ${
                      a.severity === 'critical' ? 'text-red-700' :
                      a.severity === 'warning'  ? 'text-yellow-700' :
                      'text-green-700'
                    }`}>{a.msg}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* KPI Comparisons: current vs previous */}
          <CollapsibleCard title="Comparação com Período Anterior" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpiComparisons.map(k => {
                const cur = k.cur ?? 0;
                const prev = k.prev ?? 0;
                const diff = cur - prev;
                const pct = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
                const positive = k.label === 'CPL' || k.label === 'Investimento' ? diff <= 0 : diff >= 0;
                const fmtV = (v: number) => k.fmt === 'money' ? fmtMoney(v) : k.fmt === 'pct' ? `${v.toFixed(1)}%` : fmtNum(v);
                return (
                  <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{fmtV(cur)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {diff !== 0 && (
                        positive
                          ? <TrendingUp size={10} className="text-green-500" />
                          : <TrendingDown size={10} className="text-red-500" />
                      )}
                      <span className={`text-[10px] font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                        {diff > 0 ? '+' : ''}{fmtV(diff)}
                      </span>
                      <span className={`text-[10px] ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        ({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-300 mt-0.5">Anterior: {fmtV(prev)}</p>
                  </div>
                );
              })}
            </div>
          </CollapsibleCard>

          {/* Rankings */}
          {rankings.topSpenders.length > 0 && (
            <CollapsibleCard title="Ranking — Mídia por Investimento" className="mb-6">
              <div className="space-y-1.5">
                {rankings.topSpenders.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="text-xs font-medium text-gray-700 w-40 truncate">{r.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 rounded-full h-2" style={{ width: `${(r.spend / (rankings.topSpenders[0]?.spend || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right">{fmtMoney(r.spend)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleCard>
          )}

          {/* Row 2: Mini sparkline charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart
              title="Sessões & Leads"
              data={siteChartData}
              xKey="week"
              lines={[
                { dataKey: 'Sessões', color: '#3b82f6', name: 'Sessões' },
                { dataKey: 'Leads', color: '#10b981', name: 'Leads' },
              ]}
              page="dashboard" chartKey="site-sessions-leads" height={150}
            />
            <AnnotatedChart
              title="Google Ads — Cliques & Conversões"
              data={adsChartData}
              xKey="week"
              lines={[
                { dataKey: 'Cliques', color: '#f59e0b', name: 'Cliques' },
                { dataKey: 'Conversões', color: '#ef4444', name: 'Conversões' },
              ]}
              page="dashboard" chartKey="ads-clicks-conv" height={150}
            />
            <AnnotatedChart
              title="LinkedIn Page — Impressões"
              data={liPageChartData}
              xKey="week"
              lines={[
                { dataKey: 'Impressões', color: '#0077b5', name: 'Impressões' },
              ]}
              page="dashboard" chartKey="li-impressions" height={150}
            />
            <AnnotatedChart
              title="Orçamento — Gasto vs Budget"
              data={budgetChartData}
              xKey="month"
              lines={[
                { dataKey: 'Budget', color: '#6366f1', name: 'Budget' },
                { dataKey: 'Gasto', color: '#ef4444', name: 'Gasto' },
              ]}
              page="dashboard" chartKey="budget-vs-spend" height={150}
            />
          </div>

          {/* Row 3: Quick tables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Top Canais por Gasto */}
            <CollapsibleCard title="Top Canais por Gasto" defaultOpen={true}
              actions={
                <button onClick={() => setShowChannelNames(!showChannelNames)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-600 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                  title={showChannelNames ? 'Ocultar valores' : 'Revelar valores'}>
                  {showChannelNames ? <EyeOff size={10} /> : <Eye size={10} />}
                  {showChannelNames ? 'Ocultar' : 'Revelar'}
                </button>
              }>
              {topChannels.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {topChannels.map((ch, i) => {
                    const isSensitive = /head|designer\s*sr/i.test(ch.name);
                    const showValue = !isSensitive || showChannelNames;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 truncate mr-2">{ch.name}</span>
                          {showValue ? (
                            <span className="text-gray-900 font-medium whitespace-nowrap">{fmtMoneyFull(ch.spend)}</span>
                          ) : (
                            <span className="text-gray-400 select-none" style={{ filter: 'blur(5px)' }}>R$ ••••••</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${ch.pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleCard>

            {/* LinkedIn Ads - Campanhas Ativas */}
            <CollapsibleCard title="LinkedIn Ads — Campanhas Ativas" defaultOpen={true}>
              {liAdsLatest.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem dados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Campanha</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Impr.</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Cliques</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liAdsLatest.slice(0, 8).map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 px-1 text-gray-700 truncate max-w-[140px]" title={c.campaignName}>{c.campaignName}</td>
                          <td className="py-1.5 px-1 text-right text-gray-900">{fmtNum(c.impressions ?? 0)}</td>
                          <td className="py-1.5 px-1 text-right text-gray-900">{fmtNum(c.clicks ?? 0)}</td>
                          <td className="py-1.5 px-1 text-right text-gray-900">{fmtMoneyFull(c.cost ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCard>

            {/* Savings por Mes */}
            <CollapsibleCard title="Savings por Mes" defaultOpen={true}>
              {savingsTable.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem dados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Mes</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Budget</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Gasto</th>
                        <th className="text-right py-1.5 px-1 font-medium text-gray-500">Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savingsTable.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 px-1 text-gray-700">{r.label}</td>
                          <td className="py-1.5 px-1 text-right text-gray-900">{fmtMoney(r.planned)}</td>
                          <td className="py-1.5 px-1 text-right text-gray-900">{fmtMoney(r.actual)}</td>
                          <td className={`py-1.5 px-1 text-right font-medium ${r.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmtMoney(r.savings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCard>
          </div>

          {/* ABM Intelligence Widget */}
          <CollapsibleCard title="ABM Intelligence" className="mb-6"
            actions={
              abmData?.abmUrl ? (
                <a href={abmData.abmUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors">
                  <ExternalLink size={12} /> Abrir ABM Control Center
                </a>
              ) : undefined
            }>
            {abmLoading ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 size={20} className="animate-spin text-indigo-500" />
                <span className="text-sm text-gray-400">Carregando dados ABM...</span>
              </div>
            ) : !abmData ? (
              <div className="py-8 text-center">
                <Radar size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">ABM Control Center indisponível</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPI tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-gradient-to-br from-indigo-50 to-white rounded-lg border border-indigo-100 p-3">
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Total Visitas</p>
                    <p className="text-xl font-bold text-indigo-700 mt-0.5">{abmData.stats.totalVisits.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100 p-3">
                    <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Logos Identificados</p>
                    <p className="text-xl font-bold text-green-700 mt-0.5">{abmData.stats.totalLogoReach.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-100 p-3">
                    <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Contas Warm</p>
                    <p className="text-xl font-bold text-orange-600 mt-0.5">{abmData.intelligence.warm}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-100 p-3">
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Contas Hot</p>
                    <p className="text-xl font-bold text-red-600 mt-0.5">{abmData.intelligence.hot + abmData.intelligence.onFire}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 p-3">
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Contas Alvo</p>
                    <p className="text-xl font-bold text-purple-700 mt-0.5">{abmData.targets.total}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 p-3">
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">ICP Inferido</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">{abmData.stats.icpInferredLogos.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {/* Linha de Chegada */}
                {abmData.linhaDeChegada && abmData.linhaDeChegada.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Linha de Chegada — Contas Alvo</h4>
                    {/* Milestone header */}
                    <div className="relative h-5 ml-[140px] mr-12 mb-1">
                      {[
                        { pct: 28, label: '📞 Contatar', color: 'text-blue-500' },
                        { pct: 58, label: '🤝 Nutrir', color: 'text-amber-500' },
                        { pct: 83, label: '🏁 Fechar', color: 'text-emerald-600' },
                      ].map(m => (
                        <div key={m.label} className="absolute flex flex-col items-center" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
                          <span className={`text-[10px] font-semibold whitespace-nowrap ${m.color}`}>{m.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Track rows */}
                    <div className="space-y-1">
                      {abmData.linhaDeChegada.map((t, i) => {
                        const pct = Math.max(1, Math.min(99, t.heatScore));
                        const fillColor = pct >= 70 ? 'from-red-300 to-red-500' :
                          pct >= 45 ? 'from-orange-200 to-orange-400' :
                          pct >= 20 ? 'from-yellow-200 to-yellow-400' :
                          'from-gray-100 to-gray-300';
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-[132px] shrink-0 flex items-center gap-1.5">
                              {t.domain ? (
                                <img src={`https://www.google.com/s2/favicons?domain=${t.domain}&sz=20`} alt="" className="w-5 h-5 rounded-full shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">
                                  {t.name?.[0] || '?'}
                                </div>
                              )}
                              <span className="text-[11px] font-medium text-gray-700 truncate leading-tight">{t.name}</span>
                            </div>
                            <div className="flex-1 relative h-6 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                              {/* Milestone lines */}
                              {[28, 58, 83].map(mp => (
                                <div key={mp} className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-200 opacity-40" style={{ left: `${mp}%` }} />
                              ))}
                              {/* Fill bar */}
                              <div className={`absolute top-1 bottom-1 left-1 rounded bg-gradient-to-r transition-all ${fillColor}`}
                                style={{ width: `calc(${pct}% - 8px)` }} />
                              {/* Avatar on track */}
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                style={{ left: `${pct}%` }}>
                                <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600 shadow-sm">
                                  {t.name?.[0] || '?'}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs tabular-nums font-bold text-gray-500 w-7 text-right shrink-0">{t.heatScore}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Accounts Table (compact) */}
                {abmData.topAccounts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Contas por Visitas</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Empresa</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-500 text-xs">Visitas</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-500 text-xs">Sessões</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-500 text-xs">Páginas</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-500 text-xs">Intenção</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-500 text-xs">Última Visita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abmData.topAccounts.map((a, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800 text-xs">
                                <span className="flex items-center gap-1.5">
                                  {a.domain ? (
                                    <img src={`https://www.google.com/s2/favicons?domain=${a.domain}&sz=16`} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  ) : (
                                    <span className="w-4 h-4 rounded-sm bg-gray-200 shrink-0 flex items-center justify-center text-[8px] text-gray-400 font-bold">{(a.name || '?')[0]}</span>
                                  )}
                                  {a.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-center text-gray-900 text-xs">{a.visits}</td>
                              <td className="py-1.5 px-2 text-center text-gray-600 text-xs">{a.sessions}</td>
                              <td className="py-1.5 px-2 text-center text-gray-600 text-xs">{a.pages}</td>
                              <td className="py-1.5 px-2 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  a.intent === 'hot' || a.intent === 'on_fire' ? 'bg-red-100 text-red-700' :
                                  a.intent === 'warm' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{a.intent || 'cold'}</span>
                              </td>
                              <td className="py-1.5 px-2 text-gray-500 text-xs">{a.lastSeen ? new Date(a.lastSeen).toLocaleDateString('pt-BR') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Identified Visits */}
                {abmData.recentVisits.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visitas Identificadas Recentes</h4>
                    <div className="space-y-1">
                      {abmData.recentVisits.slice(0, 8).map((v, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 text-xs">
                          <span className="font-medium text-gray-800 w-40 truncate">{v.company}</span>
                          <span className="text-gray-500 truncate flex-1">{v.page}</span>
                          <span className="text-gray-400 shrink-0">{v.source}</span>
                          <span className="text-gray-400 shrink-0">{v.timestamp ? new Date(v.timestamp).toLocaleDateString('pt-BR') : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleCard>

          {/* AI Analysis Section */}
          <div ref={aiCardRef}>
            <CollapsibleCard
              title="Análise IA"
              subtitle={aiTimestamp ? `Ultima analise: ${new Date(aiTimestamp).toLocaleString('pt-BR')}` : undefined}
              defaultOpen={!!aiAnalysis || aiLoading}
              actions={
                aiTimestamp ? (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{new Date(aiTimestamp).toLocaleString('pt-BR')}</span>
                  </div>
                ) : undefined
              }
            >
              {aiLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 size={24} className="animate-spin text-purple-600" />
                  <span className="text-sm text-gray-500">Analisando dados com IA...</span>
                </div>
              ) : aiError ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-red-600 mb-2">Erro ao gerar analise</p>
                  <p className="text-xs text-gray-400">{aiError}</p>
                </div>
              ) : aiAnalysis ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }}
                />
              ) : (
                <div className="py-8 text-center">
                  <Brain size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">
                    Clique em &quot;Análise IA&quot; para gerar uma analise completa dos dados do painel
                  </p>
                </div>
              )}
            </CollapsibleCard>
          </div>
        </>
      )}
    </div>
  );
}
