import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Brain, Loader2, Clock } from 'lucide-react';
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

// Time period filter
type TimePeriod = 'all' | 'last_30' | 'this_month' | 'last_month' | 'this_year';
const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: 'Todo o periodo' },
  { value: 'last_30', label: 'Ultimos 30 dias' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes passado' },
  { value: 'this_year', label: 'Este ano' },
];

function getDateRange(period: TimePeriod): { start: string; end: string } | null {
  if (period === 'all') return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let start: Date, end: Date;
  switch (period) {
    case 'last_30': start = new Date(today); start.setDate(today.getDate() - 29); end = today; break;
    case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = today; break;
    case 'last_month': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); break;
    case 'this_year': start = new Date(today.getFullYear(), 0, 1); end = today; break;
    default: return null;
  }
  return { start: fmt(start), end: fmt(end) };
}

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [loading, setLoading] = useState(true);

  // Raw data
  const [siteData, setSiteData] = useState<SiteRow[]>([]);
  const [adsKpis, setAdsKpis] = useState<AdsKpiRow[]>([]);
  const [liCampaigns, setLiCampaigns] = useState<LiCampaignRow[]>([]);
  const [linkedinPage, setLinkedinPage] = useState<LinkedinPageRow[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemRow[]>([]);
  const [adsBudgets, setAdsBudgets] = useState<AdsBudgetRow[]>([]);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiCardRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [site, ads, liCamp, liPage, budget, adsB] = await Promise.all([
      api.get<SiteRow[]>('/site-data'),
      api.get<AdsKpiRow[]>('/ads-kpis'),
      api.get<LiCampaignRow[]>('/ads-kpis/linkedin'),
      api.get<LinkedinPageRow[]>('/linkedin-page'),
      api.get<BudgetItemRow[]>('/budget-items'),
      api.get<AdsBudgetRow[]>('/ads-budgets'),
    ]);
    setSiteData(site);
    setAdsKpis(ads);
    setLiCampaigns(liCamp);
    setLinkedinPage(liPage);
    setBudgetItems(budget);
    setAdsBudgets(adsB);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtered data
  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);
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
  const latestFollowers = fLiPage.length > 0 ? (fLiPage[fLiPage.length - 1].followers ?? 0) : 0;
  const totalAdsSpend = fAdsBudgets.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);
  const totalMktgSpend = fBudget.filter(r => r.section !== 'Budget' && r.section !== 'Headcount').reduce((s, r) => s + r.actual, 0);

  // Savings: only from 2025-09 onwards, excluding Headcount (matches spreadsheet Grand Total Mkt)
  const savingsBudget = fBudget.filter(r => {
    const ym = r.year * 100 + r.month;
    return ym >= 202509 && r.section !== 'Budget' && r.section !== 'Headcount';
  });
  // Budget limits from 2025-09 onwards
  const budgetLimits = fBudget.filter(r => {
    const ym = r.year * 100 + r.month;
    return ym >= 202509 && r.section === 'Budget';
  });
  const totalSavings = budgetLimits.reduce((s, r) => s + r.planned, 0) - savingsBudget.reduce((s, r) => s + r.actual, 0);

  // --- Chart data ---
  const siteChartData = useMemo(() => {
    const withData = fSite.filter(r => r.sessions != null && (r.sessions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.week?.replace('Semana ', 'S') ?? r.weekStart,
      'Sessoes': r.sessions ?? 0,
      'Leads': r.leadsGenerated ?? 0,
    }));
  }, [fSite]);

  const adsChartData = useMemo(() => {
    const withData = fAds.filter(r => (r.gaClicks ?? 0) > 0 || (r.gaConversions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.week?.replace('Semana ', 'S') ?? r.weekStart,
      'Cliques': r.gaClicks ?? 0,
      'Conversoes': r.gaConversions ?? 0,
    }));
  }, [fAds]);

  const liPageChartData = useMemo(() => {
    const withData = fLiPage.filter(r => (r.impressions ?? 0) > 0);
    return withData.slice(-20).map(r => ({
      week: r.weekStart,
      'Impressoes': r.impressions ?? 0,
    }));
  }, [fLiPage]);

  const budgetChartData = useMemo(() => {
    // Monthly aggregation from 2025-09
    const allItems = budgetItems.filter(r => {
      const ym = r.year * 100 + r.month;
      return ym >= 202509 && r.section !== 'Budget';
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
      if (r.section === 'Budget') continue;
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
  const liAdsLatest = useMemo(() => {
    if (liCampaigns.length === 0) return [];
    // Find the latest weekStart that has data
    const weeks = [...new Set(liCampaigns.map(r => r.weekStart))].sort();
    const latestWeek = weeks[weeks.length - 1];
    return liCampaigns
      .filter(r => r.weekStart === latestWeek && ((r.impressions ?? 0) > 0 || (r.clicks ?? 0) > 0))
      .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  }, [liCampaigns]);

  // --- Table data: Savings por Mes ---
  const savingsTable = useMemo(() => {
    const allItems = budgetItems.filter(r => {
      const ym = r.year * 100 + r.month;
      return ym >= 202509 && r.section !== 'Budget';
    });
    const items = dateRange ? filterBudgetByRange(allItems, dateRange) : allItems;
    const byMonth = new Map<string, { planned: number; actual: number; year: number; month: number }>();
    for (const r of items) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { planned: 0, actual: 0, year: r.year, month: r.month };
      cur.planned += r.planned;
      cur.actual += r.actual;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: `${MONTH_NAMES[v.month - 1]}/${v.year}`,
        planned: v.planned,
        actual: v.actual,
        savings: v.planned - v.actual,
      }));
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
          <button
            onClick={handleAiAnalysis}
            disabled={aiLoading || loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 shadow-sm"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            Analise IA
          </button>
        }
      />

      {/* Period Filter */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.value} onClick={() => setTimePeriod(p.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              timePeriod === p.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Row 1: KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            <KpiTile label="Sessoes Site" value={fmtNum(totalSessions)}
              icon={<TrendingUp size={14} className="text-blue-500" />} />
            <KpiTile label="Leads Inbound" value={fmtNum(totalLeads)}
              icon={<TrendingUp size={14} className="text-green-500" />} />
            <KpiTile label="GA Conversoes" value={fmtNum(totalGaConversions)}
              icon={<TrendingUp size={14} className="text-orange-500" />} />
            <KpiTile label="LI Impressoes" value={fmtNum(totalLiImpressions)}
              icon={<TrendingUp size={14} className="text-sky-500" />} />
            <KpiTile label="Seguidores LI" value={fmtNum(latestFollowers)}
              icon={<Minus size={14} className="text-sky-500" />} />
            <KpiTile label="Gasto Ads" value={fmtMoney(totalAdsSpend)}
              icon={<TrendingDown size={14} className="text-red-400" />} />
            <KpiTile label="Gasto Total Mktg" value={fmtMoney(totalMktgSpend)}
              icon={<TrendingDown size={14} className="text-red-400" />} />
            <KpiTile label="Savings" value={fmtMoney(totalSavings)}
              icon={totalSavings >= 0 ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />} />
          </div>

          {/* Row 2: Mini sparkline charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart
              title="Sessoes & Leads"
              data={siteChartData}
              xKey="week"
              lines={[
                { dataKey: 'Sessoes', color: '#3b82f6', name: 'Sessoes' },
                { dataKey: 'Leads', color: '#10b981', name: 'Leads' },
              ]}
              page="dashboard" chartKey="site-sessions-leads" height={150}
            />
            <AnnotatedChart
              title="Google Ads — Cliques & Conversoes"
              data={adsChartData}
              xKey="week"
              lines={[
                { dataKey: 'Cliques', color: '#f59e0b', name: 'Cliques' },
                { dataKey: 'Conversoes', color: '#ef4444', name: 'Conversoes' },
              ]}
              page="dashboard" chartKey="ads-clicks-conv" height={150}
            />
            <AnnotatedChart
              title="LinkedIn Page — Impressoes"
              data={liPageChartData}
              xKey="week"
              lines={[
                { dataKey: 'Impressoes', color: '#0077b5', name: 'Impressoes' },
              ]}
              page="dashboard" chartKey="li-impressions" height={150}
            />
            <AnnotatedChart
              title="Orcamento — Gasto vs Budget"
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
            <CollapsibleCard title="Top Canais por Gasto" defaultOpen={true}>
              {topChannels.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {topChannels.map((ch, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700 truncate mr-2">{ch.name}</span>
                        <span className="text-gray-900 font-medium whitespace-nowrap">{fmtMoneyFull(ch.spend)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${ch.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
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

          {/* AI Analysis Section */}
          <div ref={aiCardRef}>
            <CollapsibleCard
              title="Analise IA"
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
                    Clique em &quot;Analise IA&quot; para gerar uma analise completa dos dados do painel
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
