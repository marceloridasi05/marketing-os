import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
    } catch (err) {
      setLastSync(`Erro: ${err}`);
    }
    setSyncing(false);
  };

  // KPIs from latest row with data
  const latest = [...data].reverse().find(r => r.sessions != null && r.sessions > 0);
  const totalSessions = data.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const totalLeads = data.reduce((s, r) => s + (r.leadsGenerated ?? 0), 0);
  const totalNewUsers = data.reduce((s, r) => s + (r.newUsers ?? 0), 0);

  // Chart data (last 20 weeks)
  const chartData = data.slice(-20).map(r => ({
    week: r.week.replace('Semana ', 'S'),
    Sessões: r.sessions ?? 0,
    Leads: r.leadsGenerated ?? 0,
    'Novos Usuários': r.newUsers ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Dados do Site" description="Métricas semanais do Site Brick + Blog"
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
              <p className="text-xs text-gray-400 mt-0.5">{latest?.weekStart ?? ''}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card title="Sessões por Semana" className="min-h-48">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Sessões" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Leads por Semana" className="min-h-48">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Leads" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Site Brick + Blog table */}
          <Card title="Site Brick + Blog" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Semana</th>
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Início</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Sessões</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Usuários</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Cliq. Pagos</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Novos Usr.</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">% Novos</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Leads</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Ganhos</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{r.weekStart}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.sessions)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.totalUsers)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{fmtNum(r.paidClicks)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.newUsers)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{r.newUsersPct ?? '—'}</td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">{fmtNum(r.leadsGenerated)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{fmtNum(r.weeklyGains)}</td>
                    </tr>
                  ))}
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
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Semana</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Sessões</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Usuários</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Novos Usr.</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">% Novos</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogSessions)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogTotalUsers)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.blogNewUsers)}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{r.blogNewUsersPct ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Origem IA table */}
          <Card title="Origem IA">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Semana</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Sessões</th>
                    <th className="text-right py-2.5 px-2 font-medium text-gray-500">Usuários</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.aiSessions)}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.aiTotalUsers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
