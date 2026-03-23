import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';

// --- Types ---
interface LiPageRow {
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

// --- Helpers ---
const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR') : '—';
const fmtDate = (d: string) => { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : d; };
const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function delta(curr: number | null, prev: number | null): string {
  if (curr == null || prev == null || prev === 0) return '';
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(curr: number | null, prev: number | null): string {
  if (curr == null || prev == null || prev === 0) return 'text-gray-400';
  return curr >= prev ? 'text-green-600' : 'text-red-600';
}

function condColor(val: number | null, min: number, max: number): string {
  if (val == null) return '';
  if (max === min) return 'bg-green-50';
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
  const alpha = Math.round(ratio * 40 + 5);
  return `bg-green-${Math.min(alpha, 50) < 20 ? '50' : alpha < 35 ? '100' : '200'}`;
}

function condStyle(val: number | null, min: number, max: number): React.CSSProperties {
  if (val == null || max === min) return {};
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return { backgroundColor: `rgba(34, 197, 94, ${0.05 + ratio * 0.25})` };
}

// --- Time period ---
type TimePeriod = 'all' | 'last_30' | 'this_month' | 'last_month' | 'this_year';
const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: 'Todo o período' },
  { value: 'last_30', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
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

// --- Sort hook ---
function useSort<T>(data: T[], defaultKey: string) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortAsc, setSortAsc] = useState(true);
  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const an = av == null ? '' : typeof av === 'number' ? av : String(av);
      const bn = bv == null ? '' : typeof bv === 'number' ? bv : String(bv);
      if (an < bn) return sortAsc ? -1 : 1;
      if (an > bn) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortAsc]);
  const SH = ({ k, label }: { k: string; label: string }) => (
    <th className="text-center py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
  return { sorted, SH };
}

// --- Monthly aggregation ---
interface MonthRow {
  label: string; sortKey: string;
  followers: number; followersGained: number;
  impressions: number; reactions: number; comments: number; shares: number;
  pageViews: number; uniqueVisitors: number;
}

function aggregateMonthly(data: LiPageRow[]): MonthRow[] {
  const map = new Map<string, MonthRow>();
  data.forEach(r => {
    const m = r.weekStart.match(/^(\d{4})-(\d{2})/);
    if (!m) return;
    const key = `${m[1]}-${m[2]}`;
    const label = `${MONTHS[parseInt(m[2])]} ${m[1]}`;
    if (!map.has(key)) map.set(key, { label, sortKey: key, followers: 0, followersGained: 0, impressions: 0, reactions: 0, comments: 0, shares: 0, pageViews: 0, uniqueVisitors: 0 });
    const row = map.get(key)!;
    if (r.followers != null) row.followers = Math.max(row.followers, r.followers);
    row.followersGained += r.followersGained ?? 0;
    row.impressions += r.impressions ?? 0;
    row.reactions += r.reactions ?? 0;
    row.comments += r.comments ?? 0;
    row.shares += r.shares ?? 0;
    row.pageViews += r.pageViews ?? 0;
    row.uniqueVisitors += r.uniqueVisitors ?? 0;
  });
  return [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

// --- Main ---
export function LinkedinPage() {
  const [data, setData] = useState<LiPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<LiPageRow[]>('/linkedin-page');
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/linkedin-page/sync', {});
      setLastSync(`${result.imported} registros sincronizados`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);
  const filtered = useMemo(() => {
    if (!dateRange) return data;
    return data.filter(r => r.weekStart >= dateRange.start && r.weekStart <= dateRange.end);
  }, [data, dateRange]);

  const withData = filtered.filter(r => r.impressions != null);
  const totalImpressions = withData.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalReactions = withData.reduce((s, r) => s + (r.reactions ?? 0), 0);
  const totalPageViews = withData.reduce((s, r) => s + (r.pageViews ?? 0), 0);
  const totalVisitors = withData.reduce((s, r) => s + (r.uniqueVisitors ?? 0), 0);
  const currentFollowers = data.length > 0 ? data[data.length - 1].followers ?? 0 : 0;
  const totalFollowersGained = withData.reduce((s, r) => s + (r.followersGained ?? 0), 0);

  const chartData = filtered.map(r => ({
    week: fmtDate(r.weekStart),
    Impressões: r.impressions ?? 0,
    Reações: r.reactions ?? 0,
    'Vis. Página': r.pageViews ?? 0,
    'Visitantes': r.uniqueVisitors ?? 0,
    Seguidores: r.followers ?? 0,
  }));

  const { sorted, SH } = useSort(filtered, 'weekStart');
  const monthly = useMemo(() => aggregateMonthly(filtered), [filtered]);

  // Column min/max for conditional formatting
  const colMinMax = useMemo(() => {
    const cols = ['impressions', 'reactions', 'comments', 'shares', 'pageViews', 'uniqueVisitors'] as const;
    const result: Record<string, { min: number; max: number }> = {};
    cols.forEach(col => {
      const vals = sorted.map(r => r[col]).filter((v): v is number => v != null);
      result[col] = { min: Math.min(...vals, 0), max: Math.max(...vals, 0) };
    });
    return result;
  }, [sorted]);

  const monthMinMax = useMemo(() => {
    const cols = ['impressions', 'reactions', 'comments', 'shares', 'pageViews', 'uniqueVisitors'] as const;
    const result: Record<string, { min: number; max: number }> = {};
    cols.forEach(col => {
      const vals = monthly.map(r => r[col]).filter(v => v > 0);
      result[col] = { min: Math.min(...vals, 0), max: Math.max(...vals, 0) };
    });
    return result;
  }, [monthly]);

  return (
    <div>
      <PageHeader title="LinkedIn Page" description="Métricas da página LinkedIn Brick"
        actions={
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
          </div>
        }
      />

      {/* Time Filter */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-white rounded-lg border border-gray-200">
        {PERIOD_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setTimePeriod(o.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timePeriod === o.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Seguidores</p><p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(currentFollowers)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Novos Seguidores</p><p className="text-2xl font-semibold text-green-600 mt-1">+{fmtNum(totalFollowersGained)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Impressões</p><p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalImpressions)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Reações</p><p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalReactions)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Vis. na Página</p><p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalPageViews)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Visitantes Únicos</p><p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalVisitors)}</p></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart title="Impressões por Semana" data={chartData} xKey="week"
              lines={[{ dataKey: 'Impressões', color: '#0a66c2', name: 'Impressões' }]}
              page="linkedin-page" chartKey="impressions" height={200} />
            <AnnotatedChart title="Engajamento por Semana" data={chartData} xKey="week"
              lines={[
                { dataKey: 'Reações', color: '#10b981', name: 'Reações' },
                { dataKey: 'Vis. Página', color: '#8b5cf6', name: 'Vis. Página' },
                { dataKey: 'Visitantes', color: '#f59e0b', name: 'Visitantes' },
              ]}
              page="linkedin-page" chartKey="engagement" height={200} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart title="Seguidores — Evolução" data={chartData} xKey="week"
              lines={[{ dataKey: 'Seguidores', color: '#3b82f6', name: 'Seguidores' }]}
              page="linkedin-page" chartKey="followers" height={200} />
          </div>

          {/* Weekly Table */}
          <CollapsibleCard title="Detalhamento Semanal" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <SH k="weekStart" label="Semana" />
                    <SH k="followers" label="Seguidores" />
                    <SH k="followersGained" label="Novos" />
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <SH k="impressions" label="Impressões" />
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <SH k="reactions" label="Reações" />
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <SH k="comments" label="Comentários" />
                    <SH k="shares" label="Compartilh." />
                    <SH k="pageViews" label="Vis. Página" />
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <SH k="uniqueVisitors" label="Visitantes" />
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={14} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : sorted.map((r, i) => {
                    const prev = i > 0 ? sorted[i - 1] : null;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                        <td className="py-2 px-2 text-center text-gray-900">{fmtNum(r.followers)}</td>
                        <td className="py-2 px-2 text-center text-green-600 font-medium">{r.followersGained != null ? `+${r.followersGained}` : '—'}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.followersGained, prev?.followersGained ?? null)}`}>{delta(r.followersGained, prev?.followersGained ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.impressions, colMinMax.impressions.min, colMinMax.impressions.max)}>{fmtNum(r.impressions)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.impressions, prev?.impressions ?? null)}`}>{delta(r.impressions, prev?.impressions ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.reactions, colMinMax.reactions.min, colMinMax.reactions.max)}>{fmtNum(r.reactions)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.reactions, prev?.reactions ?? null)}`}>{delta(r.reactions, prev?.reactions ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.comments, colMinMax.comments.min, colMinMax.comments.max)}>{fmtNum(r.comments)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.shares, colMinMax.shares.min, colMinMax.shares.max)}>{fmtNum(r.shares)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.pageViews, colMinMax.pageViews.min, colMinMax.pageViews.max)}>{fmtNum(r.pageViews)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.pageViews, prev?.pageViews ?? null)}`}>{delta(r.pageViews, prev?.pageViews ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.uniqueVisitors, colMinMax.uniqueVisitors.min, colMinMax.uniqueVisitors.max)}>{fmtNum(r.uniqueVisitors)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.uniqueVisitors, prev?.uniqueVisitors ?? null)}`}>{delta(r.uniqueVisitors, prev?.uniqueVisitors ?? null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Monthly Comparison */}
          <CollapsibleCard title="Comparativo Mensal" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Mês</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Seguidores</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Novos Seg.</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Impressões</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Reações</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Vis. Página</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Visitantes</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r, i) => {
                    const prev = i > 0 ? monthly[i - 1] : null;
                    return (
                      <tr key={r.sortKey} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">{r.label}</td>
                        <td className="py-2 px-2 text-center text-gray-900">{fmtNum(r.followers)}</td>
                        <td className="py-2 px-2 text-center text-green-600 font-medium" style={condStyle(r.followersGained, monthMinMax.impressions?.min ?? 0, monthMinMax.impressions?.max ?? 0)}>+{fmtNum(r.followersGained)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.followersGained, prev?.followersGained ?? null)}`}>{delta(r.followersGained, prev?.followersGained ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.impressions, monthMinMax.impressions?.min ?? 0, monthMinMax.impressions?.max ?? 0)}>{fmtNum(r.impressions)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.impressions, prev?.impressions ?? null)}`}>{delta(r.impressions, prev?.impressions ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.reactions, monthMinMax.reactions?.min ?? 0, monthMinMax.reactions?.max ?? 0)}>{fmtNum(r.reactions)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.reactions, prev?.reactions ?? null)}`}>{delta(r.reactions, prev?.reactions ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.pageViews, monthMinMax.pageViews?.min ?? 0, monthMinMax.pageViews?.max ?? 0)}>{fmtNum(r.pageViews)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.pageViews, prev?.pageViews ?? null)}`}>{delta(r.pageViews, prev?.pageViews ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.uniqueVisitors, monthMinMax.uniqueVisitors?.min ?? 0, monthMinMax.uniqueVisitors?.max ?? 0)}>{fmtNum(r.uniqueVisitors)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.uniqueVisitors, prev?.uniqueVisitors ?? null)}`}>{delta(r.uniqueVisitors, prev?.uniqueVisitors ?? null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>
        </>
      )}
    </div>
  );
}
