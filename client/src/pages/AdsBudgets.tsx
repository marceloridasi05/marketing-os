import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

// --- Types ---
interface AdsBudgetRow {
  id: number;
  year: number;
  month: number; // 0 = disponível
  dailyGoogle: number | null;
  monthlyGoogle: number | null;
  dailyLinkedin: number | null;
  monthlyLinkedin: number | null;
  dailyTotal: number | null;
  monthlyTotalUsed: number | null;
  monthlyAvailable: number | null;
}

// --- Helpers ---
const fmtMoney = (n: number | null) => n != null ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—';
const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function delta(cur: number | null, prev: number | null): string {
  if (cur == null || prev == null || prev === 0) return '—';
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
function deltaColor(cur: number | null, prev: number | null): string {
  if (cur == null || prev == null || prev === 0) return 'text-gray-300';
  return cur >= prev ? 'text-green-600' : 'text-red-500';
}

function condStyle(val: number | null, min: number, max: number): React.CSSProperties {
  if (val == null || max === min || val === 0) return {};
  const ratio = Math.min(1, Math.max(0, (val - min) / (max - min)));
  const g = Math.round(180 + ratio * 60);
  return { backgroundColor: `rgba(${220 - ratio * 100}, ${g}, ${200 - ratio * 80}, ${0.08 + ratio * 0.2})` };
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: 'thisYear', label: 'Este ano' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
];

// --- Main ---
export function AdsBudgets() {
  const [data, setData] = useState<AdsBudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<AdsBudgetRow[]>('/ads-budgets');
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/ads-budgets/sync', {});
      setLastSync(`${result.imported} registros sincronizados`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  // Filter by period
  const filtered = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return data.filter(r => {
      if (r.month === 0) return false; // exclude disponível rows from main display
      if (timePeriod === '2025') return r.year === 2025;
      if (timePeriod === '2026') return r.year === 2026;
      if (timePeriod === 'thisYear') return r.year === currentYear;
      return true;
    });
  }, [data, timePeriod]);

  // Budget limits (disponível rows)
  const budgetLimits = useMemo(() => {
    return data.filter(r => r.month === 0);
  }, [data]);

  // KPIs
  const totalGoogle = filtered.reduce((s, r) => s + (r.monthlyGoogle ?? 0), 0);
  const totalLinkedin = filtered.reduce((s, r) => s + (r.monthlyLinkedin ?? 0), 0);
  const totalUsed = filtered.reduce((s, r) => s + (r.monthlyTotalUsed ?? 0), 0);
  const totalAvailable = filtered.reduce((s, r) => s + (r.monthlyAvailable ?? 0), 0);

  // Current budget limits
  const currentLimit = budgetLimits.find(b => b.year === 2026) ?? budgetLimits[budgetLimits.length - 1];

  // Chart data: monthly breakdown
  const chartData = useMemo(() => {
    return filtered.map(r => ({
      label: `${MONTHS[r.month]} ${r.year}`,
      Google: r.monthlyGoogle ?? 0,
      LinkedIn: r.monthlyLinkedin ?? 0,
      Disponível: r.monthlyAvailable ?? 0,
    }));
  }, [filtered]);

  // Trend chart for AnnotatedChart
  const trendData = useMemo(() => {
    return filtered.map(r => ({
      week: `${MONTHS[r.month]} ${r.year}`,
      'Google Ads': r.monthlyGoogle ?? 0,
      'LinkedIn Ads': r.monthlyLinkedin ?? 0,
      Total: r.monthlyTotalUsed ?? 0,
    }));
  }, [filtered]);

  // Table min/max for conditional formatting
  const colMinMax = useMemo(() => {
    const cols = ['monthlyGoogle', 'monthlyLinkedin', 'monthlyTotalUsed'] as const;
    const result: Record<string, { min: number; max: number }> = {};
    cols.forEach(col => {
      const vals = filtered.map(r => r[col]).filter((v): v is number => v != null && v > 0);
      result[col] = { min: Math.min(...vals, 0), max: Math.max(...vals, 0) };
    });
    return result;
  }, [filtered]);

  return (
    <div>
      <PageHeader title="Verbas Ads" description="Controle de verbas e consumo de mídia paga"
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

      {/* Period Filter */}
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
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Verba Diária Google</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.dailyGoogle ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Verba Mensal Google</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.monthlyGoogle ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Verba Diária LinkedIn</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.dailyLinkedin ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Verba Mensal LinkedIn</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.monthlyLinkedin ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Consumido</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalUsed)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Saldo Disponível</p>
              <p className={`text-2xl font-semibold mt-1 ${totalAvailable < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(totalAvailable)}</p>
            </Card>
          </div>

          {/* Summary tiles Google vs LinkedIn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Card className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <p className="text-sm font-medium text-gray-700">Google Ads — Consumo no Período</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{fmtMoney(totalGoogle)}</p>
            </Card>
            <Card className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <p className="text-sm font-medium text-gray-700">LinkedIn Ads — Consumo no Período</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{fmtMoney(totalLinkedin)}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card title="Consumo Mensal por Canal" className="min-h-[280px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(value: number) => fmtMoney(value)} />
                    <Legend />
                    <Bar dataKey="Google" fill="#22c55e" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="LinkedIn" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes</p>}
            </Card>
            <AnnotatedChart title="Tendência de Consumo" data={trendData} xKey="week"
              lines={[
                { dataKey: 'Google Ads', color: '#22c55e', name: 'Google Ads' },
                { dataKey: 'LinkedIn Ads', color: '#2563eb', name: 'LinkedIn Ads' },
                { dataKey: 'Total', color: '#f59e0b', name: 'Total' },
              ]}
              page="ads-budgets" chartKey="trend" height={240} />
          </div>

          {/* Monthly Detail Table */}
          <CollapsibleCard title="Detalhamento Mensal" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Mês</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Diária Google</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Mensal Google</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Diária LinkedIn</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Mensal LinkedIn</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Diária Total</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Mensal Total</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : filtered.map((r, i) => {
                    const prev = i > 0 ? filtered[i - 1] : null;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">{MONTHS[r.month]} {r.year}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyGoogle)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.monthlyGoogle, colMinMax.monthlyGoogle?.min ?? 0, colMinMax.monthlyGoogle?.max ?? 0)}>{fmtMoney(r.monthlyGoogle)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyGoogle, prev?.monthlyGoogle ?? null)}`}>{delta(r.monthlyGoogle, prev?.monthlyGoogle ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyLinkedin)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.monthlyLinkedin, colMinMax.monthlyLinkedin?.min ?? 0, colMinMax.monthlyLinkedin?.max ?? 0)}>{fmtMoney(r.monthlyLinkedin)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyLinkedin, prev?.monthlyLinkedin ?? null)}`}>{delta(r.monthlyLinkedin, prev?.monthlyLinkedin ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyTotal)}</td>
                        <td className="py-2 px-2 text-center text-gray-900 font-medium" style={condStyle(r.monthlyTotalUsed, colMinMax.monthlyTotalUsed?.min ?? 0, colMinMax.monthlyTotalUsed?.max ?? 0)}>{fmtMoney(r.monthlyTotalUsed)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyTotalUsed, prev?.monthlyTotalUsed ?? null)}`}>{delta(r.monthlyTotalUsed, prev?.monthlyTotalUsed ?? null)}</td>
                        <td className={`py-2 px-2 text-center font-medium ${(r.monthlyAvailable ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(r.monthlyAvailable)}</td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {filtered.length > 0 && (
                    <tr className="bg-gray-50 font-medium border-t border-gray-300">
                      <td className="py-2.5 px-2 text-left text-gray-700">Total</td>
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalGoogle)}</td>
                      <td className="py-2.5 px-2"></td>
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalLinkedin)}</td>
                      <td className="py-2.5 px-2"></td>
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalUsed)}</td>
                      <td className="py-2.5 px-2"></td>
                      <td className={`py-2.5 px-2 text-center font-medium ${totalAvailable < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(totalAvailable)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Budget Limits Card */}
          <CollapsibleCard title="Verbas Disponíveis por Ano" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Ano</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Diária Google</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Mensal Google</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Diária LinkedIn</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Mensal LinkedIn</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Diária Total</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Mensal Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLimits.map(b => (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-left font-medium text-gray-700">{b.year}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900">{fmtMoney(b.dailyGoogle)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900">{fmtMoney(b.monthlyGoogle)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900">{fmtMoney(b.dailyLinkedin)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900">{fmtMoney(b.monthlyLinkedin)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900 font-medium">{fmtMoney(b.dailyTotal)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-900 font-medium">{fmtMoney(b.monthlyTotalUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>
        </>
      )}
    </div>
  );
}
