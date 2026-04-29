import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { FunnelSelector } from '../components/FunnelSelector';
import { ModeToggle, useDashboardMode } from '../components/ModeToggle';
import { api } from '../lib/api';
import { useFunnel } from '../context/FunnelContext';
import { groupByStageInModel, getStageMetaInModel } from '../lib/metricClassification';
import {
  TrendingUp, TrendingDown, Minus, Brain, Loader2, Clock, Radar, ExternalLink,
  AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw, Target, ArrowRight,
} from 'lucide-react';
import { STAGE_META } from '../lib/metricClassification';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { UtmCampaignFilter } from '../components/UtmCampaignFilter';
import { CacWidget } from '../components/CacWidget';
import { ExecutionPriority } from '../components/ExecutionPriority';
import { UnitEconomicsWidget } from '../components/UnitEconomicsWidget';
import GrowthLoopWidget from '../components/GrowthLoopWidget';
import { useSite } from '../context/SiteContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SiteRow {
  id: number; week: string; weekStart: string;
  sessions: number | null; totalUsers: number | null; paidClicks: number | null;
  unpaidSessions: number | null; newUsers: number | null; newUsersPct: string | null;
  leadsGenerated: number | null; weeklyGains: number | null;
  blogSessions: number | null; blogTotalUsers: number | null; blogNewUsers: number | null;
  blogNewUsersPct: string | null; aiSessions: number | null; aiTotalUsers: number | null;
}
interface AdsKpiRow {
  id: number; week: string; weekStart: string;
  gaImpressions: number | null; gaClicks: number | null; gaCtr: string | null;
  gaCpcAvg: string | null; gaCpmAvg: string | null; gaCostAvg: string | null;
  gaCvr: string | null; gaConversions: number | null; gaCostPerConversion: string | null;
  liImpressions: number | null; liClicks: number | null; liCost: number | null;
}
interface LiCampaignRow {
  id: number; week: string; weekStart: string; campaignName: string;
  accountType: string; funnelStage: string; impressions: number | null;
  clicks: number | null; ctr: string | null; frequency: string | null;
  cpcAvg: string | null; cost: number | null;
}
interface LinkedinPageRow {
  id: number; weekStart: string; followers: number | null;
  followersGained: number | null; followersLost: number | null;
  impressions: number | null; reactions: number | null; comments: number | null;
  shares: number | null; pageViews: number | null; uniqueVisitors: number | null;
}
interface BudgetItemRow {
  id: number; section: string; strategy: string | null; expenseType: string | null;
  name: string; year: number; month: number; planned: number; actual: number;
}
interface AdsBudgetRow {
  id: number; year: number; month: number;
  dailyGoogle: number | null; monthlyGoogle: number | null;
  dailyLinkedin: number | null; monthlyLinkedin: number | null;
  dailyTotal: number | null; monthlyTotalUsed: number | null; monthlyAvailable: number | null;
}

// ── Module-level helpers ───────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtMoneyFull = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function renderMarkdown(md: string): string {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-5 mb-2">$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-gray-700">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="space-y-1 my-2">$1</ul>');
  html = html.replace(/^(?!<[hul])((?!\s*$).+)$/gm, '<p class="text-sm text-gray-700 my-1">$1</p>');
  html = html.replace(/\n{2,}/g, '\n');
  return html;
}

// ── Shared sub-components ──────────────────────────────────────────────────────

type ObjStatus = 'good' | 'stable' | 'warning' | 'critical' | 'neutral';

const STATUS_CFG: Record<ObjStatus, { label: string; cls: string }> = {
  good:     { label: 'No Alvo',   cls: 'bg-emerald-100 text-emerald-700' },
  stable:   { label: 'Estável',   cls: 'bg-gray-100 text-gray-500' },
  warning:  { label: 'Atenção',   cls: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Crítico',   cls: 'bg-red-100 text-red-700' },
  neutral:  { label: 'Sem Dados', cls: 'bg-gray-100 text-gray-400' },
};

function StatusBadge({ status }: { status: ObjStatus }) {
  const { label, cls } = STATUS_CFG[status];
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function DeltaBadge({
  value, prev, lowerIsBetter, size = 'sm',
}: {
  value: number | null; prev: number | null | undefined; lowerIsBetter?: boolean; size?: 'sm' | 'xs';
}) {
  if (value == null || prev == null || prev === 0) return null;
  const pct = ((value - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <Minus size={10} className="text-gray-300" />;
  const isPositive = lowerIsBetter ? pct < 0 : pct > 0;
  const cls = isPositive ? 'text-emerald-600' : 'text-red-500';
  const textCls = size === 'xs' ? 'text-[11px]' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${cls} ${textCls}`}>
      {pct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

type MetricSpec = {
  label: string; value: number | null; prev?: number | null;
  fmt: 'num' | 'money' | 'pct'; lowerIsBetter?: boolean;
};

function fmtV(v: number | null, fmt: 'num' | 'money' | 'pct'): string {
  if (v == null) return '—';
  if (fmt === 'money') return fmtMoney(v);
  if (fmt === 'pct') return `${v.toFixed(1)}%`;
  return fmtNum(v);
}

interface ObjectiveCardProps {
  title: string;
  stageId: string;
  stageMeta: { label: string; color: string; borderColor: string; iconColor: string } | null;
  status: ObjStatus;
  hero: MetricSpec;
  metrics: MetricSpec[];
  budgetBar?: { planned: number; actual: number };
}

function ObjectiveCard({ title, stageId, stageMeta, status, hero, metrics, budgetBar }: ObjectiveCardProps) {
  // Fallback to gray colors if stage metadata not available
  const meta = stageMeta || {
    label: title,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    borderColor: 'border-t-gray-300',
    iconColor: 'text-gray-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-t-2 ${meta.borderColor} p-4 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[11px] font-bold uppercase tracking-widest ${meta.iconColor}`}>
          {title}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* Hero metric */}
      <div className="mb-4">
        <p className="text-[11px] text-gray-400 mb-0.5">{hero.label}</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900 leading-none tabular-nums">
            {fmtV(hero.value, hero.fmt)}
          </span>
          <DeltaBadge value={hero.value} prev={hero.prev} lowerIsBetter={hero.lowerIsBetter} />
        </div>
        {hero.prev != null && hero.prev > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">
            Anterior: {fmtV(hero.prev, hero.fmt)}
          </p>
        )}
      </div>

      {/* Supporting metrics */}
      <div className="space-y-2 border-t border-gray-100 pt-3 flex-1">
        {metrics.filter(m => m.value != null).map(m => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{m.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-800 tabular-nums">
                {fmtV(m.value, m.fmt)}
              </span>
              <DeltaBadge value={m.value} prev={m.prev} lowerIsBetter={m.lowerIsBetter} size="xs" />
            </div>
          </div>
        ))}
      </div>

      {/* Budget bar (revenue card) */}
      {budgetBar && budgetBar.planned > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Utilização do orçamento</span>
            <span>{Math.min(999, Math.round((budgetBar.actual / budgetBar.planned) * 100))}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetBar.actual > budgetBar.planned      ? 'bg-red-500' :
                budgetBar.actual > budgetBar.planned * 0.9 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (budgetBar.actual / budgetBar.planned) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { selectedSite } = useSite();
  const { timePeriod, dateRange, filterProps } = useTimeFilter('this_year');
  const { funnelConfig, funnelModelId } = useFunnel();
  const { mode: dashboardMode, setMode: setDashboardMode } = useDashboardMode();
  const [loading, setLoading] = useState(true);

  const [siteData,    setSiteData]    = useState<SiteRow[]>([]);
  const [adsKpis,     setAdsKpis]     = useState<AdsKpiRow[]>([]);
  const [liCampaigns, setLiCampaigns] = useState<LiCampaignRow[]>([]);
  const [linkedinPage,setLinkedinPage]= useState<LinkedinPageRow[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemRow[]>([]);
  const [adsBudgets,  setAdsBudgets]  = useState<AdsBudgetRow[]>([]);

  // ABM
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

  // AI
  const [aiAnalysis,  setAiAnalysis]  = useState<string | null>(null);
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState<string | null>(null);
  const aiCardRef = useRef<HTMLDivElement>(null);

  // Sync
  const [syncing,    setSyncing]    = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selectedUtmCampaignId, setSelectedUtmCampaignId] = useState<number | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

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
      if (site.status   === 'fulfilled') setSiteData(site.value);
      if (ads.status    === 'fulfilled') setAdsKpis(ads.value);
      if (liCamp.status === 'fulfilled') setLiCampaigns(liCamp.value);
      if (liPage.status === 'fulfilled') setLinkedinPage(liPage.value);
      if (budget.status === 'fulfilled') setBudgetItems(budget.value);
      if (adsB.status   === 'fulfilled') setAdsBudgets(adsB.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setAbmLoading(true);
    api.get<typeof abmData>('/abm/summary')
      .then(d => setAbmData(d))
      .catch(() => setAbmData(null))
      .finally(() => setAbmLoading(false));
  }, []);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true); setSyncStatus(null);
    const routes = [
      { label: 'Dados do Site',   path: '/site-data/sync' },
      { label: 'KPIs Ads',        path: '/ads-kpis/sync' },
      { label: 'LinkedIn Page',   path: '/linkedin-page/sync' },
      { label: 'Itens de Budget', path: '/budget-items/sync' },
      { label: 'Verbas Ads',      path: '/ads-budgets/sync' },
      { label: 'Plano',           path: '/plan-schedule/sync' },
    ];
    const results: string[] = [];
    for (const r of routes) {
      try { await api.post(r.path, {}); results.push(`✓ ${r.label}`); }
      catch (e) { results.push(`✗ ${r.label}: ${String(e)}`); }
    }
    setSyncStatus(results.join('\n'));
    setSyncing(false);
    await fetchAll();
  }, [fetchAll]);

  // ── Filtering helpers ────────────────────────────────────────────────────────

  function filterByWeekStart<T extends { weekStart: string }>(
    rows: T[], range: { start: string; end: string } | null,
  ): T[] {
    if (!range) return rows;
    return rows.filter(r => r.weekStart >= range.start && r.weekStart <= range.end);
  }
  const isNotTotalRow = (r: BudgetItemRow) =>
    !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt';

  function filterBudgetByRange(rows: BudgetItemRow[], range: { start: string; end: string } | null) {
    if (!range) return rows;
    const s = new Date(range.start), e = new Date(range.end);
    const sYM = s.getFullYear() * 100 + (s.getMonth() + 1);
    const eYM = e.getFullYear() * 100 + (e.getMonth() + 1);
    return rows.filter(r => { const ym = r.year * 100 + r.month; return ym >= sYM && ym <= eYM; });
  }
  function filterAdsBudgetByRange(rows: AdsBudgetRow[], range: { start: string; end: string } | null) {
    if (!range) return rows.filter(r => r.month > 0);
    const s = new Date(range.start), e = new Date(range.end);
    const sYM = s.getFullYear() * 100 + (s.getMonth() + 1);
    const eYM = e.getFullYear() * 100 + (e.getMonth() + 1);
    return rows.filter(r => { if (!r.month) return false; const ym = r.year * 100 + r.month; return ym >= sYM && ym <= eYM; });
  }

  // Previous period range
  const prevRange = useMemo(() => {
    if (!dateRange) return null;
    const s = new Date(dateRange.start), e = new Date(dateRange.end);
    const diff = e.getTime() - s.getTime() + 86400000;
    const pEnd = new Date(s.getTime() - 86400000);
    const pStart = new Date(pEnd.getTime() - diff + 86400000);
    return { start: pStart.toISOString().slice(0, 10), end: pEnd.toISOString().slice(0, 10) };
  }, [dateRange]);

  // Filtered slices
  const fSite      = useMemo(() => filterByWeekStart(siteData,     dateRange), [siteData,     dateRange]);
  const fAds       = useMemo(() => filterByWeekStart(adsKpis,      dateRange), [adsKpis,      dateRange]);
  const fLiPage    = useMemo(() => filterByWeekStart(linkedinPage, dateRange), [linkedinPage, dateRange]);
  const fBudget    = useMemo(() => filterBudgetByRange(budgetItems, dateRange),   [budgetItems, dateRange]);
  const fAdsBudgets= useMemo(() => filterAdsBudgetByRange(adsBudgets, dateRange), [adsBudgets, dateRange]);
  const fLiCampaigns = useMemo(() => filterByWeekStart(liCampaigns, dateRange), [liCampaigns, dateRange]);

  const pSite      = useMemo(() => filterByWeekStart(siteData,     prevRange), [siteData,     prevRange]);
  const pAds       = useMemo(() => filterByWeekStart(adsKpis,      prevRange), [adsKpis,      prevRange]);
  const pLiPage    = useMemo(() => filterByWeekStart(linkedinPage, prevRange), [linkedinPage, prevRange]);
  const pAdsBudgets= useMemo(() => filterAdsBudgetByRange(adsBudgets, prevRange), [adsBudgets, prevRange]);

  // ── KPI aggregates ───────────────────────────────────────────────────────────

  const safePct    = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
  const safeDivide = (a: number, b: number) => b > 0 ? a / b : null;

  const totalSessions      = fSite.reduce((s, r) => s + (r.sessions       ?? 0), 0);
  const totalLeads         = fSite.reduce((s, r) => s + (r.leadsGenerated ?? 0), 0);
  const totalGaConversions = fAds.reduce( (s, r) => s + (r.gaConversions  ?? 0), 0);
  const totalAdsSpend      = fAdsBudgets.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);
  const totalMktgSpend     = fBudget
    .filter(r => r.section !== 'Budget' && r.section !== 'Headcount' && isNotTotalRow(r))
    .reduce((s, r) => s + r.actual, 0);

  const currentYear = new Date().getFullYear();
  const savingsYear = timePeriod === 'this_year' ? currentYear
    : timePeriod === 'last_month' ? (new Date().getMonth() === 0 ? currentYear - 1 : currentYear)
    : currentYear;
  const totalSavings = (
    fBudget.filter(r => r.section === 'Budget' && r.year === savingsYear)
           .reduce((s, r) => s + r.planned, 0)
  ) - (
    fBudget.filter(r => r.section !== 'Budget' && r.section !== 'Headcount'
                     && isNotTotalRow(r) && r.year === savingsYear)
           .reduce((s, r) => s + r.actual, 0)
  );
  const budgetPlanned = fBudget
    .filter(r => r.section === 'Budget')
    .reduce((s, r) => s + r.planned, 0);

  const prevSessions  = pSite.reduce( (s, r) => s + (r.sessions       ?? 0), 0);
  const prevLeads     = pSite.reduce( (s, r) => s + (r.leadsGenerated ?? 0), 0);
  const prevGaConv    = pAds.reduce(  (s, r) => s + (r.gaConversions  ?? 0), 0);
  const prevAdsSpend  = pAdsBudgets.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);

  const gaClicks      = fAds.reduce((s, r) => s + (r.gaClicks       ?? 0), 0);
  const gaImp         = fAds.reduce((s, r) => s + (r.gaImpressions  ?? 0), 0);
  const pGaClicks     = pAds.reduce((s, r) => s + (r.gaClicks       ?? 0), 0);
  const pGaImp        = pAds.reduce((s, r) => s + (r.gaImpressions  ?? 0), 0);
  const newUsers      = fSite.reduce((s, r) => s + (r.newUsers       ?? 0), 0);
  const pNewUsers     = pSite.reduce((s, r) => s + (r.newUsers       ?? 0), 0);
  const blogSessions  = fSite.reduce((s, r) => s + (r.blogSessions   ?? 0), 0);
  const latestFollowers = [...fLiPage].reverse().find(r => r.followers != null)?.followers ?? 0;
  const liImpressions = fLiPage.reduce((s, r) => s + (r.impressions  ?? 0), 0);
  const prevLiImp     = pLiPage.reduce((s, r) => s + (r.impressions  ?? 0), 0);

  const ctr     = gaImp    > 0 ? gaClicks / gaImp       : null;
  const prevCtr = pGaImp   > 0 ? pGaClicks / pGaImp     : null;
  const cvr     = gaClicks > 0 ? totalGaConversions / gaClicks : null;
  const prevCvr = pGaClicks> 0 ? prevGaConv / pGaClicks  : null;
  const cpl     = totalLeads > 0 && totalAdsSpend > 0 ? totalAdsSpend / totalLeads : null;
  const prevCpl = prevLeads  > 0 && prevAdsSpend  > 0 ? prevAdsSpend  / prevLeads  : null;

  // ── Objective statuses ───────────────────────────────────────────────────────

  const acqPct    = prevSessions > 0 ? safePct(totalSessions, prevSessions) : null;
  const leadsPct  = prevLeads    > 0 ? safePct(totalLeads,    prevLeads)    : null;
  const cplPct    = cpl != null && prevCpl != null && prevCpl > 0
    ? safePct(cpl, prevCpl) : null;

  const acquisitionStatus: ObjStatus =
    totalSessions === 0                         ? 'neutral'
    : acqPct === null                           ? 'stable'
    : acqPct < -25                              ? 'critical'
    : acqPct < -8                               ? 'warning'
    : acqPct > 8                                ? 'good'
    :                                             'stable';

  const conversionStatus: ObjStatus =
    totalLeads === 0                                              ? 'neutral'
    : (leadsPct !== null && leadsPct < -25) ||
      (cplPct   !== null && cplPct   > 50)                       ? 'critical'
    : (leadsPct !== null && leadsPct < -10) ||
      (cplPct   !== null && cplPct   > 20)                       ? 'warning'
    : (leadsPct !== null && leadsPct >  8) &&
      (cplPct === null || cplPct <= 0)                           ? 'good'
    :                                                              'stable';

  const revenueStatus: ObjStatus =
    budgetPlanned === 0 && totalMktgSpend === 0 ? 'neutral'
    : totalSavings < -5000                      ? 'critical'
    : totalSavings < -1000                      ? 'warning'
    : totalSavings > 1000                       ? 'good'
    :                                             'stable';

  // ── Bottleneck ───────────────────────────────────────────────────────────────

  const bottleneck = useMemo(() => {
    const sessionsTrend  = totalSessions > prevSessions ? 2 : totalSessions < prevSessions ? 0 : 1;
    const leadsTrend     = totalLeads    > prevLeads    ? 2 : totalLeads    < prevLeads    ? 0 : 1;
    const efficiencyTrend= cpl != null && prevCpl != null
      ? (cpl <= prevCpl ? 2 : cpl <= prevCpl * 1.3 ? 1 : 0) : 1;
    const budgetOk       = totalSavings >= 0 ? 2 : totalSavings > -10000 ? 1 : 0;

    if (sessionsTrend === 0 && leadsTrend <= 1)
      return { type: 'Aquisição',  desc: 'Tráfego em queda — revisar canais e campanhas ativas.', icon: '🔍', color: 'red' as const };
    if (sessionsTrend >= 1 && leadsTrend === 0)
      return { type: 'Conversão',  desc: 'Tráfego ok mas leads caíram — revisar landing pages e CTAs.', icon: '🎯', color: 'orange' as const };
    if (efficiencyTrend === 0)
      return { type: 'Eficiência', desc: 'CPL subindo — otimizar campanhas ou realocar budget.', icon: '💰', color: 'orange' as const };
    if (budgetOk === 0)
      return { type: 'Orçamento',  desc: 'Gastos acima do planejado — priorizar cortes ou renegociar.', icon: '📊', color: 'red' as const };
    return { type: 'Saudável',   desc: 'Nenhum gargalo crítico identificado no período.', icon: '✅', color: 'green' as const };
  }, [totalSessions, prevSessions, totalLeads, prevLeads, cpl, prevCpl, totalSavings]);

  // ── Alerts ───────────────────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const items: { severity: 'critical' | 'warning' | 'good'; msg: string }[] = [];
    if (totalAdsSpend > 0 && totalLeads === 0)
      items.push({ severity: 'critical', msg: 'Investimento em Ads sem gerar leads no período' });
    if (cpl != null && prevCpl != null && prevCpl > 0 && cpl > prevCpl * 1.5)
      items.push({ severity: 'warning', msg: `CPL subiu ${((cpl / prevCpl - 1) * 100).toFixed(0)}% vs período anterior` });
    if (totalAdsSpend > prevAdsSpend && totalLeads < prevLeads && prevLeads > 0)
      items.push({ severity: 'warning', msg: 'Investimento subiu mas leads caíram' });
    if (totalSessions > prevSessions && totalLeads < prevLeads && prevLeads > 0)
      items.push({ severity: 'warning', msg: 'Sessões subiram mas leads caíram — problema de conversão' });
    if (totalSavings < 0)
      items.push({ severity: 'critical', msg: `Orçamento excedido: ${fmtMoney(Math.abs(totalSavings))} acima do planejado` });
    if (totalLeads > prevLeads && prevLeads > 0)
      items.push({ severity: 'good', msg: `Leads cresceram ${safePct(totalLeads, prevLeads).toFixed(0)}% vs anterior` });
    if (totalSavings > 0 && totalMktgSpend > 0)
      items.push({ severity: 'good', msg: `Savings de ${fmtMoney(totalSavings)} no período` });
    if (cpl != null && prevCpl != null && cpl < prevCpl)
      items.push({ severity: 'good', msg: `CPL melhorou ${((1 - cpl / prevCpl) * 100).toFixed(0)}%` });
    return items;
  }, [totalAdsSpend, totalLeads, cpl, prevCpl, totalSessions, prevSessions, prevLeads, prevAdsSpend, totalSavings, totalMktgSpend]);

  // ── Executive Summary ────────────────────────────────────────────────────────

  const executiveSummary = useMemo(() => {
    const hasData = totalSessions > 0 || totalLeads > 0 || totalAdsSpend > 0;
    if (!hasData) return null;

    const sentences: string[] = [];

    // Acquisition sentence
    if (totalSessions > 0) {
      const verb = acqPct === null  ? 'registrou'
        : acqPct > 15  ? 'cresceu com'
        : acqPct >  3  ? 'avançou levemente com'
        : acqPct < -25 ? 'recuou significativamente para'
        : acqPct < -5  ? 'caiu para'
        : 'manteve-se em';
      const delta = acqPct !== null && Math.abs(acqPct) > 3
        ? ` (${acqPct > 0 ? '+' : ''}${acqPct.toFixed(0)}%)`
        : '';
      sentences.push(`A aquisição ${verb} ${fmtNum(totalSessions)} sessões${delta}.`);
    }

    // Conversion sentence
    if (totalLeads > 0) {
      let s = '';
      if (leadsPct !== null && Math.abs(leadsPct) > 5) {
        s = `A conversão ${leadsPct > 0 ? 'cresceu' : 'caiu'} ${Math.abs(leadsPct).toFixed(0)}% — ${fmtNum(totalLeads)} leads gerados`;
      } else {
        s = `A conversão gerou ${fmtNum(totalLeads)} leads`;
      }
      if (cpl != null) s += ` com CPL de ${fmtMoney(cpl)}`;
      sentences.push(s + '.');
    }

    // Budget sentence
    if (fBudget.length > 0 && (totalSavings !== 0 || totalAdsSpend > 0)) {
      if (totalSavings > 2000)
        sentences.push(`Orçamento controlado com ${fmtMoney(totalSavings)} de savings.`);
      else if (totalSavings < -1000)
        sentences.push(`Orçamento excedido em ${fmtMoney(Math.abs(totalSavings))}.`);
      else if (totalAdsSpend > 0)
        sentences.push(`Investimento de ${fmtMoney(totalAdsSpend)} em Ads no período.`);
    }

    // Main issue
    if (bottleneck.type !== 'Saudável')
      sentences.push(`Principal atenção: ${bottleneck.desc}`);

    return sentences.join(' ');
  }, [totalSessions, totalLeads, totalAdsSpend, acqPct, leadsPct, cpl, fBudget.length, totalSavings, bottleneck]);

  // ── Key movements ────────────────────────────────────────────────────────────

  type Movement = {
    label: string; cur: number; prev: number; pct: number;
    fmt: 'num' | 'money' | 'pct'; lowerIsBetter: boolean; isPositive: boolean;
  };

  const keyMovements = useMemo<Movement[]>(() => {
    const candidates: { label: string; cur: number | null; prev: number | null; fmt: 'num'|'money'|'pct'; lowerIsBetter: boolean }[] = [
      { label: 'Leads',        cur: totalLeads,         prev: prevLeads,     fmt: 'num',   lowerIsBetter: false },
      { label: 'Sessões',      cur: totalSessions,      prev: prevSessions,  fmt: 'num',   lowerIsBetter: false },
      { label: 'Cliques GA',   cur: gaClicks,           prev: pGaClicks,     fmt: 'num',   lowerIsBetter: false },
      { label: 'Impressões GA',cur: gaImp,              prev: pGaImp,        fmt: 'num',   lowerIsBetter: false },
      { label: 'Impr. LI',     cur: liImpressions,      prev: prevLiImp,     fmt: 'num',   lowerIsBetter: false },
      { label: 'Novos Usuários',cur: newUsers,           prev: pNewUsers,     fmt: 'num',   lowerIsBetter: false },
      { label: 'CPL',          cur: cpl,                prev: prevCpl,       fmt: 'money', lowerIsBetter: true  },
      { label: 'Gasto Ads',    cur: totalAdsSpend,      prev: prevAdsSpend,  fmt: 'money', lowerIsBetter: true  },
    ];
    return candidates
      .filter(c => c.cur != null && c.prev != null && c.prev > 0 && c.cur !== c.prev)
      .map(c => {
        const pct = safePct(c.cur!, c.prev!);
        return {
          label: c.label, cur: c.cur!, prev: c.prev!, pct, fmt: c.fmt,
          lowerIsBetter: c.lowerIsBetter,
          isPositive: c.lowerIsBetter ? pct < 0 : pct > 0,
        };
      })
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 5);
  }, [totalLeads, prevLeads, totalSessions, prevSessions, gaClicks, pGaClicks, gaImp, pGaImp,
      liImpressions, prevLiImp, newUsers, pNewUsers, cpl, prevCpl, totalAdsSpend, prevAdsSpend]);

  // ── Recommended actions ──────────────────────────────────────────────────────

  const recommendedActions = useMemo(() => {
    const actions: string[] = [];
    const hasCplAlert  = alerts.some(a => a.msg.includes('CPL'));
    const hasInvestAlert = alerts.some(a => a.msg.includes('Investimento subiu'));

    if (bottleneck.type === 'Aquisição') {
      actions.push('Revisar campanhas de tráfego: ajustar palavras-chave, lance e segmentação de audiência.');
      actions.push('Verificar criativos e landing pages — testar variações de headline e CTA.');
    } else if (bottleneck.type === 'Conversão') {
      actions.push('Auditar o caminho de conversão: onde os visitantes abandonam o funil?');
      actions.push('Testar novos CTAs, formulários e ofertas de conteúdo nas landing pages.');
    } else if (bottleneck.type === 'Eficiência') {
      actions.push('Pausar grupos de anúncios com CPL acima da meta e redistribuir budget.');
      actions.push('Analisar qualidade do tráfego: intenção de busca, frequência e sobreposição de audiências.');
    } else if (bottleneck.type === 'Orçamento') {
      actions.push('Revisar maiores itens de custo e negociar condições com fornecedores.');
      actions.push('Avaliar redistribuição de verba: cortar canais de baixa performance, reforçar os melhores.');
    }

    if (hasCplAlert && !actions.some(a => a.includes('CPL')))
      actions.push('Investigar a alta de CPL: verificar qualidade do tráfego e relevância da oferta.');
    if (hasInvestAlert && !actions.some(a => a.includes('qualidade')))
      actions.push('Analisar a qualidade dos leads gerados — crescimento de gasto deve gerar retorno proporcional.');

    if (actions.length === 0 && bottleneck.type === 'Saudável') {
      actions.push('Manter cadência atual e monitorar tendências de CPL e sessões semana a semana.');
      actions.push('Explorar oportunidades de escala nos canais com melhor performance histórica.');
    }

    return actions.slice(0, 3);
  }, [bottleneck, alerts]);

  // ── Chart data ───────────────────────────────────────────────────────────────

  const siteChartData = useMemo(() => fSite
    .filter(r => (r.sessions ?? 0) > 0).slice(-20)
    .map(r => ({ week: r.week?.replace('Semana ', 'S') ?? r.weekStart, Sessões: r.sessions ?? 0, Leads: r.leadsGenerated ?? 0 })),
  [fSite]);

  const adsChartData = useMemo(() => fAds
    .filter(r => (r.gaClicks ?? 0) > 0 || (r.gaConversions ?? 0) > 0).slice(-20)
    .map(r => ({ week: r.week?.replace('Semana ', 'S') ?? r.weekStart, Cliques: r.gaClicks ?? 0, Conversões: r.gaConversions ?? 0 })),
  [fAds]);

  const liPageChartData = useMemo(() => fLiPage
    .filter(r => (r.impressions ?? 0) > 0).slice(-20)
    .map(r => ({ week: r.weekStart, Impressões: r.impressions ?? 0 })),
  [fLiPage]);

  const budgetChartData = useMemo(() => {
    const items = budgetItems.filter(r => {
      const ym = r.year * 100 + r.month;
      return ym >= 202509 && r.section !== 'Budget' && !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt';
    });
    const filtered = dateRange ? filterBudgetByRange(items, dateRange) : items;
    const byMonth = new Map<string, { planned: number; actual: number }>();
    for (const r of filtered) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { planned: 0, actual: 0 };
      cur.planned += r.planned; cur.actual += r.actual;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        const [y, m] = k.split('-');
        return { month: `${MONTH_NAMES[+m - 1]}/${y.slice(2)}`, Budget: Math.round(v.planned), Gasto: Math.round(v.actual) };
      });
  }, [budgetItems, dateRange]);

  const topChannels = useMemo(() => {
    const byName = new Map<string, number>();
    for (const r of fBudget) {
      if (r.section === 'Budget' || r.name.startsWith('Total ') || r.name === 'Grand Total Mkt') continue;
      byName.set(r.name, (byName.get(r.name) ?? 0) + r.actual);
    }
    const sorted = Array.from(byName.entries()).filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a).slice(0, 10);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, spend]) => ({ name, spend, pct: (spend / max) * 100 }));
  }, [fBudget]);

  const liAdsLatest = useMemo(() => {
    if (!fLiCampaigns.length) return [];
    const byCamp = new Map<string, { campaignName: string; impressions: number; clicks: number; cost: number }>();
    for (const r of fLiCampaigns) {
      if (!r.impressions && !r.clicks) continue;
      const cur = byCamp.get(r.campaignName) ?? { campaignName: r.campaignName, impressions: 0, clicks: 0, cost: 0 };
      cur.impressions += r.impressions ?? 0;
      cur.clicks      += r.clicks      ?? 0;
      cur.cost        += r.cost        ?? 0;
      byCamp.set(r.campaignName, cur);
    }
    return [...byCamp.values()].sort((a, b) => b.cost - a.cost);
  }, [fLiCampaigns]);

  const savingsTable = useMemo(() => {
    const costItems   = budgetItems.filter(r => { const ym = r.year * 100 + r.month; return ym >= 202509 && r.section !== 'Budget' && r.section !== 'Headcount' && !r.name.startsWith('Total ') && r.name !== 'Grand Total Mkt'; });
    const budgetLines = budgetItems.filter(r => r.section === 'Budget');
    const fCost   = dateRange ? filterBudgetByRange(costItems,   dateRange) : costItems;
    const fBudgetL= dateRange ? filterBudgetByRange(budgetLines, dateRange) : budgetLines.filter(r => (r.year * 100 + r.month) >= 202509);
    const allKeys = new Set<string>();
    fCost.forEach(r => allKeys.add(`${r.year}-${String(r.month).padStart(2,'0')}`));
    fBudgetL.forEach(r => allKeys.add(`${r.year}-${String(r.month).padStart(2,'0')}`));
    return [...allKeys].sort().map(key => {
      const [y, m] = key.split('-').map(Number);
      const budget = fBudgetL.filter(r => r.year === y && r.month === m).reduce((s, r) => s + r.planned, 0);
      const actual = fCost.filter(r => r.year === y && r.month === m).reduce((s, r) => s + r.actual, 0);
      return { label: `${MONTH_NAMES[m - 1]}/${y}`, planned: budget, actual, savings: budget - actual };
    });
  }, [budgetItems, dateRange]);

  // ── AI Analysis ──────────────────────────────────────────────────────────────

  const handleAiAnalysis = async () => {
    setAiLoading(true); setAiError(null);
    try {
      const dashboardData = {
        site: { totalSessions, totalLeads, weeklyTrend: siteChartData.slice(-8) },
        googleAds: { totalConversions: totalGaConversions, totalClicks: gaClicks, totalImpressions: gaImp, weeklyTrend: adsChartData.slice(-8) },
        linkedinPage: { totalImpressions: liImpressions, latestFollowers, weeklyTrend: liPageChartData.slice(-8) },
        linkedinAds: { campaigns: liAdsLatest.slice(0, 10).map(c => ({ name: c.campaignName, impressions: c.impressions, clicks: c.clicks, cost: c.cost })) },
        budget: { totalAdsSpend, totalMktgSpend, totalSavings, topChannels: topChannels.slice(0, 5).map(c => ({ name: c.name, spend: c.spend })), monthlyTrend: budgetChartData },
      };
      const result = await api.post<{ analysis: string; timestamp: string }>('/ai-analysis/analyze', { dashboardData });
      setAiAnalysis(result.analysis); setAiTimestamp(result.timestamp);
    } catch (err) { setAiError(String(err)); }
    setAiLoading(false);
    setTimeout(() => aiCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Build dynamic objective cards based on funnel config ─────────────────────

  // Debug: Log when funnel config changes
  useEffect(() => {
    if (funnelConfig) {
      console.log('[Dashboard] FunnelConfig updated:', {
        modelId: funnelConfig.id,
        name: funnelConfig.name,
        stageCount: funnelConfig.stages.length,
        stages: funnelConfig.stages.map(s => ({ id: s.id, label: s.label })),
      });
    }
  }, [funnelConfig]);

  const buildObjectiveCards = useMemo(() => {
    if (!funnelConfig) {
      // Fallback to default layout if no funnel config
      return [
        {
          title: 'Aquisição',
          stage: 'acquisition',
          status: acquisitionStatus,
          hero: { label: 'Sessões', value: totalSessions, prev: prevSessions, fmt: 'num' as const },
          metrics: [
            { label: 'Cliques GA', value: gaClicks || null, prev: pGaClicks || null, fmt: 'num' as const },
            { label: 'Novos Usuários', value: newUsers || null, prev: pNewUsers || null, fmt: 'num' as const },
            { label: 'Blog', value: blogSessions || null, fmt: 'num' as const },
          ],
        },
        {
          title: 'Conversão',
          stage: 'conversion',
          status: conversionStatus,
          hero: { label: 'Leads', value: totalLeads, prev: prevLeads, fmt: 'num' as const },
          metrics: [
            { label: 'CTR', value: ctr != null ? ctr * 100 : null, prev: prevCtr != null ? prevCtr * 100 : null, fmt: 'pct' as const },
            { label: 'CVR', value: cvr != null ? cvr * 100 : null, prev: prevCvr != null ? prevCvr * 100 : null, fmt: 'pct' as const },
            { label: 'CPL', value: cpl, prev: prevCpl, fmt: 'money' as const, lowerIsBetter: true },
          ],
        },
        {
          title: 'Receita',
          stage: 'revenue',
          status: revenueStatus,
          hero: { label: 'Investimento Ads', value: totalAdsSpend || null, prev: prevAdsSpend || null, fmt: 'money' as const, lowerIsBetter: true },
          metrics: [
            { label: 'Total Mktg', value: totalMktgSpend || null, fmt: 'money' as const, lowerIsBetter: true },
            { label: 'Savings', value: fBudget.length > 0 ? totalSavings : null, fmt: 'money' as const },
          ],
          budgetBar: budgetPlanned > 0 ? { planned: budgetPlanned, actual: totalMktgSpend } : undefined,
        },
      ];
    }

    // Build cards dynamically from funnelConfig stages
    // Map each stage to appropriate metrics based on position in funnel
    const cards = funnelConfig.stages.map((stage, idx) => {
      const stageId = stage.id;
      const stagePosition = idx;
      const totalStages = funnelConfig.stages.length;

      let title = stage.name;
      let heroMetric = { label: '', value: null as number | null, prev: null as number | null, fmt: 'num' as const };
      let metrics: MetricSpec[] = [];
      let status: ObjStatus = 'neutral';

      // Map based on funnel position (order) rather than specific stage IDs
      // This works for all funnel models
      const isEarlyStage = stagePosition < Math.ceil(totalStages / 3);        // First 1/3: awareness/acquisition
      const isMiddleStage = stagePosition >= Math.ceil(totalStages / 3) && stagePosition < Math.ceil(2 * totalStages / 3); // Middle: consideration/engagement
      const isLateStage = stagePosition >= Math.ceil(2 * totalStages / 3);    // Last 1/3: conversion/revenue

      if (isEarlyStage) {
        // Early stage: Focus on awareness/acquisition metrics
        heroMetric = { label: 'Sessões', value: totalSessions, prev: prevSessions, fmt: 'num' as const };
        metrics = [
          { label: 'Cliques', value: gaClicks || null, prev: pGaClicks || null, fmt: 'num' as const },
          { label: 'Novos Usuários', value: newUsers || null, prev: pNewUsers || null, fmt: 'num' as const },
        ];
        status = acquisitionStatus;
      } else if (isMiddleStage) {
        // Middle stage: Focus on engagement/consideration metrics
        heroMetric = { label: 'Leads', value: totalLeads, prev: prevLeads, fmt: 'num' as const };
        metrics = [
          { label: 'CTR', value: ctr != null ? ctr * 100 : null, prev: prevCtr != null ? prevCtr * 100 : null, fmt: 'pct' as const },
          { label: 'CPL', value: cpl, prev: prevCpl, fmt: 'money' as const, lowerIsBetter: true },
        ];
        status = conversionStatus;
      } else {
        // Late stage: Focus on conversion/revenue metrics
        heroMetric = { label: 'Investimento Ads', value: totalAdsSpend || null, prev: prevAdsSpend || null, fmt: 'money' as const, lowerIsBetter: true };
        metrics = [
          { label: 'CVR', value: cvr != null ? cvr * 100 : null, prev: prevCvr != null ? prevCvr * 100 : null, fmt: 'pct' as const },
          { label: 'Total Mktg', value: totalMktgSpend || null, fmt: 'money' as const, lowerIsBetter: true },
        ];
        status = revenueStatus;
      }

      return {
        title,
        stage: stageId,
        status,
        hero: heroMetric,
        metrics,
        budgetBar: isLateStage && budgetPlanned > 0 ? { planned: budgetPlanned, actual: totalMktgSpend } : undefined,
      };
    });

    return cards;
  }, [funnelConfig, totalSessions, prevSessions, gaClicks, pGaClicks, newUsers, pNewUsers, blogSessions, totalLeads, prevLeads, ctr, prevCtr, cvr, prevCvr, cpl, prevCpl, totalAdsSpend, prevAdsSpend, totalMktgSpend, fBudget, totalSavings, budgetPlanned, acquisitionStatus, conversionStatus, revenueStatus]);

  // ── Overall status ───────────────────────────────────────────────────────────

  const overallStatus: ObjStatus =
    acquisitionStatus === 'critical' || conversionStatus === 'critical' || revenueStatus === 'critical' ? 'critical'
    : acquisitionStatus === 'warning'  || conversionStatus === 'warning'  || revenueStatus === 'warning'  ? 'warning'
    : acquisitionStatus === 'neutral'  && conversionStatus === 'neutral'                                  ? 'neutral'
    : acquisitionStatus === 'good'     && conversionStatus === 'good'                                     ? 'good'
    :                                                                                                       'stable';

  const bottleneckBg = bottleneck.color === 'green'  ? 'bg-emerald-50 border-emerald-200 border-l-emerald-500'
    : bottleneck.color === 'orange' ? 'bg-amber-50  border-amber-200  border-l-amber-500'
    :                                  'bg-red-50    border-red-200    border-l-red-500';
  const bottleneckText = bottleneck.color === 'green' ? 'text-emerald-700'
    : bottleneck.color === 'orange' ? 'text-amber-700' : 'text-red-700';
  const bottleneckIconBg = bottleneck.color === 'green'  ? 'bg-emerald-100'
    : bottleneck.color === 'orange' ? 'bg-amber-100' : 'bg-red-100';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Painel"
        description="Visão por objetivo de negócio"
        actions={
          <div className="flex items-center gap-3">
            <ModeToggle mode={dashboardMode} onModeChange={setDashboardMode} />
            <button onClick={handleSyncAll} disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 disabled:opacity-50 border border-gray-200 transition-colors">
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar
            </button>
            <button onClick={handleAiAnalysis} disabled={aiLoading || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 shadow-sm">
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              Análise IA
            </button>
          </div>
        }
      />

      {/* Controls: Period, Funnel Model, UTM Campaign, etc. */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <TimeFilter {...filterProps} />
        <div className="border-l border-gray-200 pl-4">
          <FunnelSelector />
        </div>
        <div className="border-l border-gray-200 pl-4">
          <UtmCampaignFilter
            onCampaignChange={setSelectedUtmCampaignId}
            selectedCampaignId={selectedUtmCampaignId}
            placeholder="Filter by UTM campaign..."
          />
        </div>
      </div>

      {/* Sync status */}
      {syncStatus && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{syncStatus}</pre>
            <button onClick={() => setSyncStatus(null)} className="text-gray-400 hover:text-gray-600 shrink-0">✕</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Empty state */}
          {siteData.length === 0 && adsKpis.length === 0 && budgetItems.length === 0 && (
            <div className="mb-6 flex flex-col items-center justify-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
              <RefreshCw size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">Nenhum dado encontrado para este site</p>
              <p className="text-xs text-gray-400 mb-4 max-w-xs">Configure a planilha em <strong>Configurações</strong> e clique em <strong>Sincronizar</strong>.</p>
              <button onClick={handleSyncAll} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                Sincronizar agora
              </button>
            </div>
          )}

          {/* ── MODE: NORMAL VIEW ────────────────────────────────────────────────────── */}
          {dashboardMode === 'normal' && (
            <>
          {/* ── 1. Executive Summary ───────────────────────────────────────────── */}
          {executiveSummary && (
            <div className={`mb-5 rounded-xl border border-l-4 p-4 flex items-start gap-4 ${bottleneckBg}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Resumo Executivo
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{executiveSummary}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={overallStatus} />
              </div>
            </div>
          )}

          {/* ── 2. Objective cards (Dynamic from Funnel Model) ─────────────────────── */}
          <div className={`grid gap-4 mb-5 ${
            buildObjectiveCards.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            buildObjectiveCards.length >= 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 md:grid-cols-3'
          }`}>
            {buildObjectiveCards.map((card, idx) => (
              <ObjectiveCard
                key={idx}
                title={card.title}
                stageId={card.stage}
                stageMeta={STAGE_META[card.stage as keyof typeof STAGE_META] || null}
                status={card.status}
                hero={card.hero}
                metrics={card.metrics}
                budgetBar={card.budgetBar}
              />
            ))}
          </div>

          {/* ── 2.5. UTM CAC Widget ───────────────────────────────────────────────── */}
          {selectedUtmCampaignId && (
            <div className="mb-5">
              <CacWidget campaignId={selectedUtmCampaignId} title="Customer Acquisition Cost (Selected Campaign)" />
            </div>
          )}

          {/* ── 3. Bottleneck + Alerts ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

            {/* Bottleneck — 2/3 */}
            <div className={`md:col-span-2 rounded-xl border border-l-4 p-5 ${bottleneckBg}`}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Gargalo Principal
              </p>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${bottleneckIconBg} flex items-center justify-center text-2xl shrink-0`}>
                  {bottleneck.icon}
                </div>
                <div>
                  <p className={`text-xl font-bold ${bottleneckText}`}>{bottleneck.type}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-md">{bottleneck.desc}</p>
                  {/* Key evidence */}
                  {bottleneck.type !== 'Saudável' && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {acqPct !== null && Math.abs(acqPct) > 3 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold tabular-nums ${
                          acqPct < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          Sessões {acqPct > 0 ? '+' : ''}{acqPct.toFixed(0)}%
                        </span>
                      )}
                      {leadsPct !== null && Math.abs(leadsPct) > 3 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold tabular-nums ${
                          leadsPct < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          Leads {leadsPct > 0 ? '+' : ''}{leadsPct.toFixed(0)}%
                        </span>
                      )}
                      {cpl != null && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold tabular-nums">
                          CPL {fmtMoney(cpl)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts — 1/3 */}
            <Card>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Alertas</p>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 py-2">
                  <CheckCircle2 size={16} />
                  <span className="text-sm">Sem alertas ativos</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 6).map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-2 ${
                      a.severity === 'critical' ? 'bg-red-50 text-red-700' :
                      a.severity === 'warning'  ? 'bg-amber-50 text-amber-700' :
                                                  'bg-emerald-50 text-emerald-700'
                    }`}>
                      {a.severity === 'critical' ? <XCircle size={12} className="mt-0.5 shrink-0" /> :
                       a.severity === 'warning'  ? <AlertTriangle size={12} className="mt-0.5 shrink-0" /> :
                                                   <CheckCircle2 size={12} className="mt-0.5 shrink-0" />}
                      <span className="leading-tight">{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── 3.5. What to Do Next (Execution Priority) ───────────────────────────── */}
          {selectedSite && (
            <div className="mb-5">
              <ExecutionPriority siteId={selectedSite.id} />
            </div>
          )}

          {/* ── 3.6. Unit Economics Summary ────────────────────────────────────────── */}
          <div className="mb-5">
            <UnitEconomicsWidget />
          </div>

          {/* ── 3.7. Growth Loops Summary ──────────────────────────────────────── */}
          {selectedSite && (
            <div className="mb-5">
              <GrowthLoopWidget siteId={selectedSite.id} />
            </div>
          )}

          {/* ── 4. Key movements + Budget ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

            {/* Key movements */}
            <Card>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Principais Variações
              </p>
              {keyMovements.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  Sem dados históricos suficientes para comparar.
                </p>
              ) : (
                <div className="space-y-3">
                  {keyMovements.map((m, i) => {
                    const absPct = Math.abs(m.pct);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          m.isPositive ? 'bg-emerald-100' : 'bg-red-50'
                        }`}>
                          {m.isPositive
                            ? <TrendingUp size={14} className="text-emerald-600" />
                            : <TrendingDown size={14} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{m.label}</p>
                          <p className="text-[10px] text-gray-400 tabular-nums">{fmtV(m.cur, m.fmt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${m.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {m.pct > 0 ? '+' : ''}{absPct.toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-gray-300 tabular-nums">
                            antes: {fmtV(m.prev, m.fmt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Budget summary */}
            <Card>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Orçamento
              </p>

              {budgetPlanned === 0 && totalMktgSpend === 0 ? (
                <p className="text-sm text-gray-400 py-2">Sem dados de orçamento no período.</p>
              ) : (
                <>
                  {/* Numbers row */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-gray-400">Planejado</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">{fmtMoney(budgetPlanned)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Realizado</p>
                      <p className={`text-lg font-bold tabular-nums ${totalMktgSpend > budgetPlanned ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmtMoney(totalMktgSpend)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {budgetPlanned > 0 && (
                    <div className="mb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            totalMktgSpend > budgetPlanned       ? 'bg-red-500' :
                            totalMktgSpend > budgetPlanned * 0.9 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (totalMktgSpend / budgetPlanned) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {Math.round((totalMktgSpend / budgetPlanned) * 100)}% utilizado
                      </p>
                    </div>
                  )}

                  {/* Savings pill */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${
                    totalSavings > 0 ? 'bg-emerald-50' : totalSavings < 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <span className="text-xs text-gray-600">Savings</span>
                    <span className={`text-sm font-bold tabular-nums ${
                      totalSavings > 0 ? 'text-emerald-700' : totalSavings < 0 ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {totalSavings > 0 ? '+' : ''}{fmtMoney(totalSavings)}
                    </span>
                  </div>

                  {/* Top channels */}
                  {topChannels.length > 0 && (
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      {topChannels.slice(0, 4).map((ch, i) => {
                        const isSensitive = /head|designer\s*sr/i.test(ch.name);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 flex-1 truncate">{ch.name}</span>
                            {isSensitive && !showChannelNames ? (
                              <span className="text-[10px] text-gray-300 select-none" style={{ filter: 'blur(4px)' }}>
                                R$ ••••
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-gray-700 tabular-nums shrink-0">
                                {fmtMoney(ch.spend)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* ── 5. Recommended actions ─────────────────────────────────────────── */}
          {recommendedActions.length > 0 && (
            <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={15} className="text-indigo-500 shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                  Foco Recomendado
                </p>
              </div>
              <div className="space-y-3">
                {recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-indigo-900 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. Historical charts (collapsible) ─────────────────────────────── */}
          <CollapsibleCard title="Série Histórica" className="mb-4" defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnnotatedChart title="Sessões & Leads" data={siteChartData} xKey="week"
                lines={[{ dataKey: 'Sessões', color: '#3b82f6', name: 'Sessões' }, { dataKey: 'Leads', color: '#10b981', name: 'Leads' }]}
                page="dashboard" chartKey="site-sessions-leads" height={150} />
              <AnnotatedChart title="Google Ads — Cliques & Conversões" data={adsChartData} xKey="week"
                lines={[{ dataKey: 'Cliques', color: '#f59e0b', name: 'Cliques' }, { dataKey: 'Conversões', color: '#ef4444', name: 'Conversões' }]}
                page="dashboard" chartKey="ads-clicks-conv" height={150} />
              <AnnotatedChart title="LinkedIn Page — Impressões" data={liPageChartData} xKey="week"
                lines={[{ dataKey: 'Impressões', color: '#0077b5', name: 'Impressões' }]}
                page="dashboard" chartKey="li-impressions" height={150} />
              <AnnotatedChart title="Orçamento — Gasto vs Budget" data={budgetChartData} xKey="month"
                lines={[{ dataKey: 'Budget', color: '#6366f1', name: 'Budget' }, { dataKey: 'Gasto', color: '#ef4444', name: 'Gasto' }]}
                page="dashboard" chartKey="budget-vs-spend" height={150} />
            </div>
          </CollapsibleCard>

            </>
          )}

          {/* ── MODE: ABM VIEW ────────────────────────────────────────────────────── */}
          {dashboardMode === 'abm' && (
            <>
              {/* ABM Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Account-Based Marketing Intelligence</h2>
                <p className="text-sm text-gray-600">Monitore contas estratégicas e intenção de compra em tempo real</p>
              </div>

          {/* ── 7. ABM Intelligence ────────────────────────────────────────────── */}
          <CollapsibleCard title="ABM Intelligence" className="mb-4" defaultOpen={true}
            actions={abmData?.abmUrl ? (
              <a href={abmData.abmUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors">
                <ExternalLink size={12} /> Abrir ABM Control Center
              </a>
            ) : undefined}>
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Total Visitas',      value: abmData.stats.totalVisits,        color: 'indigo' },
                    { label: 'Logos Identificados',value: abmData.stats.totalLogoReach,      color: 'green'  },
                    { label: 'Contas Warm',        value: abmData.intelligence.warm,         color: 'orange' },
                    { label: 'Contas Hot',         value: abmData.intelligence.hot + abmData.intelligence.onFire, color: 'red' },
                    { label: 'Contas Alvo',        value: abmData.targets.total,             color: 'purple' },
                    { label: 'ICP Inferido',       value: abmData.stats.icpInferredLogos,    color: 'blue'   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`bg-gradient-to-br from-${color}-50 to-white rounded-lg border border-${color}-100 p-3`}>
                      <p className={`text-[10px] font-semibold text-${color}-400 uppercase tracking-wider`}>{label}</p>
                      <p className={`text-xl font-bold text-${color}-700 mt-0.5`}>{value.toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
                {abmData.linhaDeChegada?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Linha de Chegada</h4>
                    <div className="relative h-5 ml-[140px] mr-12 mb-1">
                      {[{ pct: 28, label: '📞 Contatar', color: 'text-blue-500' }, { pct: 58, label: '🤝 Nutrir', color: 'text-amber-500' }, { pct: 83, label: '🏁 Fechar', color: 'text-emerald-600' }]
                        .map(m => (
                          <div key={m.label} className="absolute flex flex-col items-center" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
                            <span className={`text-[10px] font-semibold whitespace-nowrap ${m.color}`}>{m.label}</span>
                          </div>
                        ))}
                    </div>
                    <div className="space-y-1">
                      {abmData.linhaDeChegada.map((t, i) => {
                        const pct = Math.max(1, Math.min(99, t.heatScore));
                        const fill = pct >= 70 ? 'from-red-300 to-red-500' : pct >= 45 ? 'from-orange-200 to-orange-400' : pct >= 20 ? 'from-yellow-200 to-yellow-400' : 'from-gray-100 to-gray-300';
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-[132px] shrink-0 flex items-center gap-1.5">
                              {t.domain ? <img src={`https://www.google.com/s2/favicons?domain=${t.domain}&sz=20`} alt="" className="w-5 h-5 rounded-full shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">{t.name?.[0] || '?'}</div>}
                              <span className="text-[11px] font-medium text-gray-700 truncate">{t.name}</span>
                            </div>
                            <div className="flex-1 relative h-6 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                              {[28, 58, 83].map(mp => <div key={mp} className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-200 opacity-40" style={{ left: `${mp}%` }} />)}
                              <div className={`absolute top-1 bottom-1 left-1 rounded bg-gradient-to-r ${fill}`} style={{ width: `calc(${pct}% - 8px)` }} />
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${pct}%` }}>
                                <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600 shadow-sm">{t.name?.[0] || '?'}</div>
                              </div>
                            </div>
                            <span className="text-xs tabular-nums font-bold text-gray-500 w-7 text-right shrink-0">{t.heatScore}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {abmData.topAccounts?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Contas por Visitas</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-200">
                          {['Empresa','Visitas','Sessões','Páginas','Intenção','Última Visita'].map(h => <th key={h} className="text-left py-2 px-2 font-medium text-gray-500 text-xs">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {abmData.topAccounts.map((a, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800 text-xs">
                                <span className="flex items-center gap-1.5">
                                  {a.domain ? <img src={`https://www.google.com/s2/favicons?domain=${a.domain}&sz=16`} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center text-[8px] text-gray-400 font-bold shrink-0">{(a.name || '?')[0]}</span>}
                                  {a.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-center text-gray-900 text-xs">{a.visits}</td>
                              <td className="py-1.5 px-2 text-center text-gray-600 text-xs">{a.sessions}</td>
                              <td className="py-1.5 px-2 text-center text-gray-600 text-xs">{a.pages}</td>
                              <td className="py-1.5 px-2 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.intent === 'hot' || a.intent === 'on_fire' ? 'bg-red-100 text-red-700' : a.intent === 'warm' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{a.intent || 'cold'}</span>
                              </td>
                              <td className="py-1.5 px-2 text-gray-500 text-xs">{a.lastSeen ? new Date(a.lastSeen).toLocaleDateString('pt-BR') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {abmData.recentVisits?.length > 0 && (
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

          {/* ── 8. Channel detail (collapsible) ────────────────────────────────── */}
          <CollapsibleCard title="Detalhamento por Canal" className="mb-4" defaultOpen={false}
            actions={
              <button onClick={() => setShowChannelNames(!showChannelNames)}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-600 rounded border border-gray-200 hover:border-gray-300 transition-colors">
                {showChannelNames ? <EyeOff size={10} /> : <Eye size={10} />}
                {showChannelNames ? 'Ocultar' : 'Revelar'}
              </button>
            }>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top spend */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Canais por Gasto</p>
                {topChannels.length === 0 ? <p className="text-sm text-gray-400">Sem dados</p> : (
                  <div className="space-y-2">
                    {topChannels.map((ch, i) => {
                      const isSensitive = /head|designer\s*sr/i.test(ch.name);
                      const show = !isSensitive || showChannelNames;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-gray-700 truncate mr-2">{ch.name}</span>
                            {show ? <span className="text-gray-900 font-medium whitespace-nowrap">{fmtMoneyFull(ch.spend)}</span>
                              : <span className="text-gray-400 select-none" style={{ filter: 'blur(5px)' }}>R$ ••••••</span>}
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${ch.pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LI campaigns */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">LinkedIn Ads — Campanhas</p>
                {liAdsLatest.length === 0 ? <p className="text-sm text-gray-400">Sem dados</p> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 font-medium text-gray-500">Campanha</th>
                      <th className="text-right py-1.5 font-medium text-gray-500">Impr.</th>
                      <th className="text-right py-1.5 font-medium text-gray-500">Custo</th>
                    </tr></thead>
                    <tbody>
                      {liAdsLatest.slice(0, 8).map((c, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-700 truncate max-w-[120px]" title={c.campaignName}>{c.campaignName}</td>
                          <td className="py-1.5 text-right text-gray-900">{fmtNum(c.impressions)}</td>
                          <td className="py-1.5 text-right text-gray-900">{fmtMoneyFull(c.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Savings table */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Savings por Mês</p>
                {savingsTable.length === 0 ? <p className="text-sm text-gray-400">Sem dados</p> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 font-medium text-gray-500">Mês</th>
                      <th className="text-right py-1.5 font-medium text-gray-500">Budget</th>
                      <th className="text-right py-1.5 font-medium text-gray-500">Savings</th>
                    </tr></thead>
                    <tbody>
                      {savingsTable.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-700">{r.label}</td>
                          <td className="py-1.5 text-right text-gray-900">{fmtMoney(r.planned)}</td>
                          <td className={`py-1.5 text-right font-semibold ${r.savings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmtMoney(r.savings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            </CollapsibleCard>
            </>
          )}

          {/* ── 9. AI Analysis (Shared) ─────────────────────────────────────────────────── */}
          <div ref={aiCardRef}>
            <CollapsibleCard title="Análise IA" defaultOpen={!!aiAnalysis || aiLoading}
              actions={aiTimestamp ? (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{new Date(aiTimestamp).toLocaleString('pt-BR')}</span>
                </div>
              ) : undefined}>
              {aiLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 size={24} className="animate-spin text-purple-600" />
                  <span className="text-sm text-gray-500">Analisando dados com IA...</span>
                </div>
              ) : aiError ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-red-600 mb-2">Erro ao gerar análise</p>
                  <p className="text-xs text-gray-400">{aiError}</p>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }} />
              ) : (
                <div className="py-8 text-center">
                  <Brain size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">
                    Clique em &quot;Análise IA&quot; para gerar uma análise completa dos dados do painel.
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
