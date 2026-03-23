import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';
import { AnnotatedChart } from '../components/AnnotatedChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR') : '—';
const fmtDate = (d: string) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

// Δ% helpers
function PctCell({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null || previous === 0) return <td className="py-2 px-1 text-right text-[11px] text-gray-300 whitespace-nowrap">—</td>;
  const diff = ((current - previous) / previous) * 100;
  const color = diff >= 0 ? 'text-green-600' : 'text-red-500';
  const label = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  return <td className={`py-2 px-1 text-right text-[11px] font-medium ${color} whitespace-nowrap`}>{label}</td>;
}

function useSort<T>(data: T[], defaultKey: string, defaultAsc = true) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortAsc, setSortAsc] = useState(defaultAsc);
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
  const SortHeader = ({ k, label, align = 'left' }: { k: string; label: string; align?: 'left' | 'right' }) => (
    <th className={`${align === 'right' ? 'text-right' : 'text-left'} py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm`}
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
  return { sorted, SortHeader };
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SiteData() {
  const [data, setData] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<SiteRow[]>('/site-data');
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/site-data/sync', {});
      setLastSync(`${result.imported} registros sincronizados`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  const withData = data.filter(r => r.sessions != null && r.sessions > 0);
  const latest = withData.length > 0 ? withData[withData.length - 1] : null;
  const totalSessions = withData.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const totalLeads = withData.reduce((s, r) => s + (r.leadsGenerated ?? 0), 0);
  const totalNewUsers = withData.reduce((s, r) => s + (r.newUsers ?? 0), 0);

  // Chart data
  const chartData = withData.slice(-20).map(r => ({
    week: r.week.replace('Semana ', 'S'),
    Sessões: r.sessions ?? 0,
    Leads: r.leadsGenerated ?? 0,
  }));

  const siteChartData = withData.slice(-20).map(r => ({
    week: r.week.replace('Semana ', 'S'),
    'Sessões Site': r.sessions ?? 0,
    'Usuários Site': r.totalUsers ?? 0,
  }));

  const blogChartData = withData.slice(-20).map(r => ({
    week: r.week.replace('Semana ', 'S'),
    'Sessões Blog': r.blogSessions ?? 0,
    'Usuários Blog': r.blogTotalUsers ?? 0,
  }));

  // Monthly aggregation
  interface MonthAgg {
    sessions: number; totalUsers: number; newUsers: number; leads: number; gains: number;
    blogSessions: number; blogUsers: number; blogNewUsers: number;
    aiSessions: number; aiUsers: number;
  }
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, MonthAgg> = {};
    for (const r of withData) {
      const key = r.weekStart.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { sessions: 0, totalUsers: 0, newUsers: 0, leads: 0, gains: 0, blogSessions: 0, blogUsers: 0, blogNewUsers: 0, aiSessions: 0, aiUsers: 0 };
      const m = byMonth[key];
      m.sessions += r.sessions ?? 0;
      m.totalUsers += r.totalUsers ?? 0;
      m.newUsers += r.newUsers ?? 0;
      m.leads += r.leadsGenerated ?? 0;
      m.gains += r.weeklyGains ?? 0;
      m.blogSessions += r.blogSessions ?? 0;
      m.blogUsers += r.blogTotalUsers ?? 0;
      m.blogNewUsers += r.blogNewUsers ?? 0;
      m.aiSessions += r.aiSessions ?? 0;
      m.aiUsers += r.aiTotalUsers ?? 0;
    }
    return Object.keys(byMonth).sort().map(key => ({ key, ...byMonth[key] }));
  }, [withData]);

  const monthlyChartData = monthlyData.map(m => {
    const [yr, mo] = m.key.split('-');
    return { name: `${MONTH_NAMES[parseInt(mo) - 1]} ${yr}`, 'Sessões Site': m.sessions, 'Sessões Blog': m.blogSessions, Leads: m.leads };
  });

  // Sort hooks
  const mainSort = useSort(data, 'weekStart', true);
  const blogSort = useSort(data, 'weekStart', true);
  const aiSort = useSort(data, 'weekStart', true);

  return (
    <div>
      <PageHeader title="Desempenho do Site" description="Métricas semanais do Site Brick + Blog"
        actions={
          <div className="flex items-center gap-3">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : data.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500 mb-4">Nenhum dado importado ainda.</p>
            <button onClick={handleSync} disabled={syncing}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={`inline mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Importar da Planilha Google
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Sessões</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalSessions)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Leads</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalLeads)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Novos Usuários</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalNewUsers)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Última Semana</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{latest?.week ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{latest ? fmtDate(latest.weekStart) : ''}</p>
            </Card>
          </div>

          {/* Charts Row 1 - All traffic + Leads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart title="Sessões por Semana — Todas as fontes de tráfego" data={chartData} xKey="week"
              lines={[{ dataKey: 'Sessões', color: '#3b82f6', name: 'Sessões' }]}
              page="site_data" chartKey="sessions" />
            <AnnotatedChart title="Leads por Semana — Inbound" data={chartData} xKey="week"
              lines={[{ dataKey: 'Leads', color: '#10b981', name: 'Leads' }]}
              page="site_data" chartKey="leads" />
          </div>

          {/* Charts Row 2 - Site vs Blog */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart title="Sessões vs Usuários — Site" data={siteChartData} xKey="week"
              lines={[
                { dataKey: 'Sessões Site', color: '#3b82f6', name: 'Sessões' },
                { dataKey: 'Usuários Site', color: '#f59e0b', name: 'Usuários' },
              ]}
              page="site_data" chartKey="site_sessions_users" />
            <AnnotatedChart title="Sessões vs Usuários — Blog" data={blogChartData} xKey="week"
              lines={[
                { dataKey: 'Sessões Blog', color: '#8b5cf6', name: 'Sessões' },
                { dataKey: 'Usuários Blog', color: '#ec4899', name: 'Usuários' },
              ]}
              page="site_data" chartKey="blog_sessions_users" />
          </div>

          {/* Site Brick + Blog table */}
          <Card title="Site Brick + Blog" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <mainSort.SortHeader k="week" label="Semana" />
                    <mainSort.SortHeader k="weekStart" label="Início" />
                    <mainSort.SortHeader k="sessions" label="Sessões" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <mainSort.SortHeader k="totalUsers" label="Usuários" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <mainSort.SortHeader k="newUsers" label="Novos Usr." align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <mainSort.SortHeader k="newUsersPct" label="% Novos" align="right" />
                    <mainSort.SortHeader k="leadsGenerated" label="Leads" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <mainSort.SortHeader k="weeklyGains" label="Ganhos" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {mainSort.sorted.map((r, idx) => {
                    const prev = idx > 0 ? mainSort.sorted[idx - 1] : null;
                    return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.sessions)}</td>
                      <PctCell current={r.sessions} previous={prev?.sessions ?? null} />
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.totalUsers)}</td>
                      <PctCell current={r.totalUsers} previous={prev?.totalUsers ?? null} />
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.newUsers)}</td>
                      <PctCell current={r.newUsers} previous={prev?.newUsers ?? null} />
                      <td className="py-2 px-2 text-right text-gray-600">{r.newUsersPct ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">{fmtNum(r.leadsGenerated)}</td>
                      <PctCell current={r.leadsGenerated} previous={prev?.leadsGenerated ?? null} />
                      <td className="py-2 px-2 text-right text-gray-600">{fmtNum(r.weeklyGains)}</td>
                      <PctCell current={r.weeklyGains} previous={prev?.weeklyGains ?? null} />
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Blog table */}
          <Card title="Blog" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <blogSort.SortHeader k="week" label="Semana" />
                    <blogSort.SortHeader k="weekStart" label="Início" />
                    <blogSort.SortHeader k="blogSessions" label="Sessões" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <blogSort.SortHeader k="blogTotalUsers" label="Usuários" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <blogSort.SortHeader k="blogNewUsers" label="Novos Usr." align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <blogSort.SortHeader k="blogNewUsersPct" label="% Novos" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {blogSort.sorted.map((r, idx) => {
                    const prev = idx > 0 ? blogSort.sorted[idx - 1] : null;
                    return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogSessions)}</td>
                      <PctCell current={r.blogSessions} previous={prev?.blogSessions ?? null} />
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogTotalUsers)}</td>
                      <PctCell current={r.blogTotalUsers} previous={prev?.blogTotalUsers ?? null} />
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogNewUsers)}</td>
                      <PctCell current={r.blogNewUsers} previous={prev?.blogNewUsers ?? null} />
                      <td className="py-2 px-2 text-right text-gray-600">{r.blogNewUsersPct ?? '—'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Origem IA table */}
          <Card title="Origem IA" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <aiSort.SortHeader k="week" label="Semana" />
                    <aiSort.SortHeader k="weekStart" label="Início" />
                    <aiSort.SortHeader k="aiSessions" label="Sessões" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    <aiSort.SortHeader k="aiTotalUsers" label="Usuários" align="right" />
                    <th className="text-right py-2.5 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSort.sorted.map((r, idx) => {
                    const prev = idx > 0 ? aiSort.sorted[idx - 1] : null;
                    return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.aiSessions)}</td>
                      <PctCell current={r.aiSessions} previous={prev?.aiSessions ?? null} />
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.aiTotalUsers)}</td>
                      <PctCell current={r.aiTotalUsers} previous={prev?.aiTotalUsers ?? null} />
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Monthly Chart */}
          {monthlyData.length > 1 && (
            <Card title="Visão Mensal — Sessões e Leads" className="mb-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={55} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Sessões Site" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Sessões Blog" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Leads" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Monthly Table */}
          {monthlyData.length > 1 && (
            <Card title="Comparativo Mensal">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Mês</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Sessões Site</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Usuários Site</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Novos Usr.</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Leads</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Sessões Blog</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Usr. Blog</th>
                      <th className="text-right py-2 px-1 font-medium text-gray-400 text-[11px]">Δ%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, idx) => {
                      const prev = idx > 0 ? monthlyData[idx - 1] : null;
                      const [yr, mo] = m.key.split('-');
                      const label = `${MONTH_NAMES[parseInt(mo) - 1]} ${yr}`;
                      return (
                        <tr key={m.key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 px-2 font-medium text-gray-700 whitespace-nowrap">{label}</td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(m.sessions)}</td>
                          <PctCell current={m.sessions} previous={prev?.sessions ?? null} />
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(m.totalUsers)}</td>
                          <PctCell current={m.totalUsers} previous={prev?.totalUsers ?? null} />
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(m.newUsers)}</td>
                          <PctCell current={m.newUsers} previous={prev?.newUsers ?? null} />
                          <td className="py-2.5 px-2 text-right text-green-600 font-medium">{fmtNum(m.leads)}</td>
                          <PctCell current={m.leads} previous={prev?.leads ?? null} />
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(m.blogSessions)}</td>
                          <PctCell current={m.blogSessions} previous={prev?.blogSessions ?? null} />
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(m.blogUsers)}</td>
                          <PctCell current={m.blogUsers} previous={prev?.blogUsers ?? null} />
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    {(() => {
                      const t = monthlyData.reduce((acc, m) => ({
                        sessions: acc.sessions + m.sessions, totalUsers: acc.totalUsers + m.totalUsers,
                        newUsers: acc.newUsers + m.newUsers, leads: acc.leads + m.leads,
                        blogSessions: acc.blogSessions + m.blogSessions, blogUsers: acc.blogUsers + m.blogUsers,
                      }), { sessions: 0, totalUsers: 0, newUsers: 0, leads: 0, blogSessions: 0, blogUsers: 0 });
                      return (
                        <tr className="bg-gray-50 font-medium">
                          <td className="py-2.5 px-2 text-gray-700">Total</td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(t.sessions)}</td><td></td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(t.totalUsers)}</td><td></td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(t.newUsers)}</td><td></td>
                          <td className="py-2.5 px-2 text-right text-green-600">{fmtNum(t.leads)}</td><td></td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(t.blogSessions)}</td><td></td>
                          <td className="py-2.5 px-2 text-right text-gray-900">{fmtNum(t.blogUsers)}</td><td></td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
