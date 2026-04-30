import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { MonthlyBudgetAllocationEditor } from '../components/MonthlyBudgetAllocationEditor';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
// recharts imports kept for potential future use
import {} from 'recharts';

// --- Types ---
interface AdsBudgetRow {
  id: number;
  year: number;
  month: number; // 0 = disponível
  dailyGoogle: number | null;
  monthlyGoogle: number | null;
  dailyLinkedin: number | null;
  monthlyLinkedin: number | null;
  dailyMeta: number | null;
  monthlyMeta: number | null;
  dailyTotal: number | null;
  monthlyTotalUsed: number | null;
  monthlyAvailable: number | null;
}

interface MonthlyAllocationRow {
  id: number;
  siteId: number;
  year: number;
  month: number; // 1-12
  googleBudget: number | null;
  metaBudget: number | null;
  linkedinBudget: number | null;
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


// --- Main ---
export function AdsBudgets() {
  const [data, setData] = useState<AdsBudgetRow[]>([]);
  const [allocations, setAllocations] = useState<MonthlyAllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  // hiddenBars now managed by AnnotatedChart internally
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { dateRange, filterProps } = useTimeFilter('all');
  const [siteId, setSiteId] = useState<number | null>(null);

  // Get siteId from localStorage on mount
  useEffect(() => {
    const siteIdStr = localStorage.getItem('selected_site');
    if (siteIdStr) {
      setSiteId(Number(siteIdStr));
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<AdsBudgetRow[]>('/ads-budgets');
    setData(rows);

    // Load allocations for current year
    const currentYear = new Date().getFullYear();
    try {
      const allocs = await api.get<MonthlyAllocationRow[]>(
        `/ads-budgets/monthly-allocation?siteId=undefined&year=${currentYear}`
      );
      setAllocations(allocs || []);
    } catch (err) {
      console.error('Error loading allocations:', err);
    }

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

  // Get disponível (allocated - consumed) for a specific month
  const getDisponivel = (row: AdsBudgetRow): number | null => {
    const alloc = allocations.find(a => a.year === row.year && a.month === row.month);
    if (!alloc || (!alloc.googleBudget && !alloc.metaBudget && !alloc.linkedinBudget)) {
      return null; // No allocation for this month
    }

    const allocated = (alloc.googleBudget ?? 0) + (alloc.metaBudget ?? 0) + (alloc.linkedinBudget ?? 0);
    const consumed = (row.monthlyGoogle ?? 0) + (row.monthlyLinkedin ?? 0) + (row.monthlyMeta ?? 0);
    return allocated - consumed;
  };

  // Filter by period
  const filtered = useMemo(() => {
    return data.filter(r => {
      if (r.month === 0) return false; // exclude disponível rows from main display
      if (!dateRange) return true;
      const startYM = parseInt(dateRange.start.slice(0, 4)) * 100 + parseInt(dateRange.start.slice(5, 7));
      const endYM = parseInt(dateRange.end.slice(0, 4)) * 100 + parseInt(dateRange.end.slice(5, 7));
      const ym = r.year * 100 + r.month;
      return ym >= startYM && ym <= endYM;
    });
  }, [data, dateRange]);

  // Budget limits (disponível rows)
  const budgetLimits = useMemo(() => {
    return data.filter(r => r.month === 0);
  }, [data]);

  // Current budget limits (must be before KPIs that reference it)
  const currentLimit = budgetLimits.find(b => b.year === 2026) ?? budgetLimits[budgetLimits.length - 1];

  // KPIs
  const totalGoogle = filtered.reduce((s, r) => s + (r.monthlyGoogle ?? 0), 0);
  const totalLinkedin = filtered.reduce((s, r) => s + (r.monthlyLinkedin ?? 0), 0);
  const totalMeta = filtered.reduce((s, r) => s + (r.monthlyMeta ?? 0), 0);
  const totalUsed = totalGoogle + totalLinkedin + totalMeta;
  const monthsWithData = filtered.length;
  const monthlyGoogleLimit = currentLimit?.monthlyGoogle ?? 0;
  const monthlyLinkedinLimit = currentLimit?.monthlyLinkedin ?? 0;
  const monthlyMetaLimit = currentLimit?.monthlyMeta ?? 0;
  const totalBudgetForPeriod = monthsWithData * (monthlyGoogleLimit + monthlyLinkedinLimit + monthlyMetaLimit);
  const totalAvailable = totalBudgetForPeriod - totalUsed;

  // Chart data: monthly breakdown
  const chartData = useMemo(() => {
    return filtered.map(r => ({
      label: `${MONTHS[r.month]} ${r.year}`,
      Google: r.monthlyGoogle ?? 0,
      LinkedIn: r.monthlyLinkedin ?? 0,
      Meta: r.monthlyMeta ?? 0,
      Total: (r.monthlyGoogle ?? 0) + (r.monthlyLinkedin ?? 0) + (r.monthlyMeta ?? 0),
      Disponível: r.monthlyAvailable ?? 0,
    }));
  }, [filtered]);

  // Monthly budget limits for reference lines
  const googleBudgetLimit = currentLimit?.monthlyGoogle ?? 0;
  const linkedinBudgetLimit = currentLimit?.monthlyLinkedin ?? 0;
  const metaBudgetLimit = currentLimit?.monthlyMeta ?? 0;

  // Trend chart for AnnotatedChart
  const trendData = useMemo(() => {
    return filtered.map(r => ({
      week: `${MONTHS[r.month]} ${r.year}`,
      'Google Ads': r.monthlyGoogle ?? 0,
      'LinkedIn Ads': r.monthlyLinkedin ?? 0,
      'Meta Ads': r.monthlyMeta ?? 0,
      Total: r.monthlyTotalUsed ?? 0,
    }));
  }, [filtered]);

  // Table min/max for conditional formatting
  const colMinMax = useMemo(() => {
    const cols = ['monthlyGoogle', 'monthlyLinkedin', 'monthlyMeta', 'monthlyTotalUsed'] as const;
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
        <TimeFilter {...filterProps} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* KPI Tiles — First line: Google, Meta, LinkedIn (daily + monthly) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {/* Google */}
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Diária Google</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.dailyGoogle ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Mensal Google</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.monthlyGoogle ?? null)}</p>
            </Card>

            {/* Meta */}
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Diária Meta</p>
              <p className={`text-lg font-semibold mt-1 ${currentLimit?.dailyMeta ? 'text-gray-900' : 'text-gray-300'}`}>
                {fmtMoney(currentLimit?.dailyMeta ?? 0)}
              </p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Mensal Meta</p>
              <p className={`text-lg font-semibold mt-1 ${currentLimit?.monthlyMeta ? 'text-gray-900' : 'text-gray-300'}`}>
                {fmtMoney(currentLimit?.monthlyMeta ?? 0)}
              </p>
            </Card>

            {/* LinkedIn */}
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Diária LinkedIn</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.dailyLinkedin ?? null)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Mensal LinkedIn</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{fmtMoney(currentLimit?.monthlyLinkedin ?? null)}</p>
            </Card>
          </div>

          {/* Second line: Aggregated totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Google</p>
              <p className="text-lg font-semibold text-green-600 mt-1">{fmtMoney(totalGoogle)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Meta</p>
              <p className={`text-lg font-semibold mt-1 ${totalMeta > 0 ? 'text-blue-400' : 'text-gray-300'}`}>
                {fmtMoney(totalMeta)}
              </p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total LinkedIn</p>
              <p className="text-lg font-semibold text-blue-600 mt-1">{fmtMoney(totalLinkedin)}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart title="Consumo Mensal por Canal" data={chartData} xKey="label"
              chartType="bar"
              lines={[
                { dataKey: 'Google',   color: '#22c55e', name: 'Google' },
                { dataKey: 'LinkedIn', color: '#2563eb', name: 'LinkedIn' },
                { dataKey: 'Meta',     color: '#60a5fa', name: 'Meta' },
              ]}
              referenceLines={[
                ...(googleBudgetLimit  > 0 ? [{ y: googleBudgetLimit,  label: `Google: ${fmtMoney(googleBudgetLimit)}`,   color: '#22c55e' }] : []),
                ...(linkedinBudgetLimit > 0 ? [{ y: linkedinBudgetLimit, label: `LinkedIn: ${fmtMoney(linkedinBudgetLimit)}`, color: '#2563eb' }] : []),
                ...(metaBudgetLimit    > 0 ? [{ y: metaBudgetLimit,    label: `Meta: ${fmtMoney(metaBudgetLimit)}`,         color: '#60a5fa' }] : []),
              ]}
              page="ads-budgets" chartKey="consumo-mensal" height={240} />
            <AnnotatedChart title="Tendência de Consumo" data={trendData} xKey="week"
              lines={[
                { dataKey: 'Google Ads',  color: '#22c55e', name: 'Google Ads' },
                { dataKey: 'LinkedIn Ads', color: '#2563eb', name: 'LinkedIn Ads' },
                { dataKey: 'Meta Ads',    color: '#60a5fa', name: 'Meta Ads' },
                { dataKey: 'Total',       color: '#f59e0b', name: 'Total' },
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
                    <th className="text-center py-2.5 px-2 font-medium text-green-600 text-xs">Google Diária</th>
                    <th className="text-center py-2.5 px-2 font-medium text-green-600 text-xs">Google Mensal</th>
                    <th className="text-center py-2.5 px-1 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-blue-600 text-xs">LinkedIn Diária</th>
                    <th className="text-center py-2.5 px-2 font-medium text-blue-600 text-xs">LinkedIn Mensal</th>
                    <th className="text-center py-2.5 px-1 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-blue-400 text-xs">Meta Diária</th>
                    <th className="text-center py-2.5 px-2 font-medium text-blue-400 text-xs">Meta Mensal</th>
                    <th className="text-center py-2.5 px-1 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 text-xs">Total Diária</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 text-xs">Total Mensal</th>
                    <th className="text-center py-2.5 px-1 font-medium text-gray-400 text-xs">Δ%</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 text-xs">Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={14} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : filtered.map((r, i) => {
                    const prev = i > 0 ? filtered[i - 1] : null;
                    const noMeta = !r.dailyMeta && !r.monthlyMeta;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">{MONTHS[r.month]} {r.year}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyGoogle)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.monthlyGoogle, colMinMax.monthlyGoogle?.min ?? 0, colMinMax.monthlyGoogle?.max ?? 0)}>{fmtMoney(r.monthlyGoogle)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyGoogle, prev?.monthlyGoogle ?? null)}`}>{delta(r.monthlyGoogle, prev?.monthlyGoogle ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyLinkedin)}</td>
                        <td className="py-2 px-2 text-center text-gray-900" style={condStyle(r.monthlyLinkedin, colMinMax.monthlyLinkedin?.min ?? 0, colMinMax.monthlyLinkedin?.max ?? 0)}>{fmtMoney(r.monthlyLinkedin)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyLinkedin, prev?.monthlyLinkedin ?? null)}`}>{delta(r.monthlyLinkedin, prev?.monthlyLinkedin ?? null)}</td>
                        <td className={`py-2 px-2 text-center ${noMeta ? 'text-gray-300' : 'text-gray-600'}`}>{noMeta ? '—' : fmtMoney(r.dailyMeta)}</td>
                        <td className={`py-2 px-2 text-center ${noMeta ? 'text-gray-300' : 'text-gray-900'}`} style={noMeta ? {} : condStyle(r.monthlyMeta, colMinMax.monthlyMeta?.min ?? 0, colMinMax.monthlyMeta?.max ?? 0)}>{noMeta ? '—' : fmtMoney(r.monthlyMeta)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${noMeta ? 'text-gray-300' : deltaColor(r.monthlyMeta, prev?.monthlyMeta ?? null)}`}>{noMeta ? '—' : delta(r.monthlyMeta, prev?.monthlyMeta ?? null)}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{fmtMoney(r.dailyTotal)}</td>
                        <td className="py-2 px-2 text-center text-gray-900 font-medium" style={condStyle(r.monthlyTotalUsed, colMinMax.monthlyTotalUsed?.min ?? 0, colMinMax.monthlyTotalUsed?.max ?? 0)}>{fmtMoney(r.monthlyTotalUsed)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.monthlyTotalUsed, prev?.monthlyTotalUsed ?? null)}`}>{delta(r.monthlyTotalUsed, prev?.monthlyTotalUsed ?? null)}</td>
                        {/* Disponível: use per-month allocation if available, fallback to monthlyAvailable */}
                        {(() => {
                          const disponivel = getDisponivel(r);
                          return (
                            <td className={`py-2 px-2 text-center font-medium ${disponivel === null ? 'text-gray-400' : (disponivel < 0 ? 'text-red-600' : 'text-green-600')}`}>
                              {disponivel === null ? '—' : fmtMoney(disponivel)}
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {filtered.length > 0 && (
                    <tr className="bg-gray-50 font-medium border-t border-gray-300">
                      <td className="py-2.5 px-2 text-left text-gray-700">Total</td>
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalGoogle)}</td>
                      <td />
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalLinkedin)}</td>
                      <td />
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalMeta > 0 ? totalMeta : null)}</td>
                      <td />
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(totalUsed)}</td>
                      <td />
                      <td className={`py-2.5 px-2 text-center font-medium ${totalAvailable < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(totalAvailable)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Monthly Budget Allocation Editor */}
          {siteId && (
            <MonthlyBudgetAllocationEditor
              siteId={siteId}
              year={new Date().getFullYear()}
              onSave={() => fetchData()}
            />
          )}

          {/* Budget Limits Card */}
          <CollapsibleCard title="Verbas Disponíveis por Ano" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Ano</th>
                    <th className="text-center py-2.5 px-3 font-medium text-green-600 text-xs">Google Diária</th>
                    <th className="text-center py-2.5 px-3 font-medium text-green-600 text-xs">Google Mensal</th>
                    <th className="text-center py-2.5 px-3 font-medium text-blue-600 text-xs">LinkedIn Diária</th>
                    <th className="text-center py-2.5 px-3 font-medium text-blue-600 text-xs">LinkedIn Mensal</th>
                    <th className="text-center py-2.5 px-3 font-medium text-blue-400 text-xs">Meta Diária</th>
                    <th className="text-center py-2.5 px-3 font-medium text-blue-400 text-xs">Meta Mensal</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">Total Diária</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">Total Mensal</th>
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
                      <td className={`py-2.5 px-3 text-center ${b.dailyMeta ? 'text-gray-900' : 'text-gray-300'}`}>{b.dailyMeta ? fmtMoney(b.dailyMeta) : '—'}</td>
                      <td className={`py-2.5 px-3 text-center ${b.monthlyMeta ? 'text-gray-900' : 'text-gray-300'}`}>{b.monthlyMeta ? fmtMoney(b.monthlyMeta) : '—'}</td>
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
