import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// --- Types ---
interface KPIs {
  totalSpend: number;
  totalLeads: number;
  totalSessions: number;
  totalConversions: number;
  totalUsers: number;
  totalNewUsers: number;
  totalImpressions: number;
  totalClicks: number;
}
interface ChannelRow {
  channelId: number;
  channelName: string;
  spend: number;
  leads: number;
  sessions: number;
  conversions: number;
}
interface TrendRow {
  date: string;
  spend: number;
  leads: number;
  sessions: number;
}
interface Channel {
  id: number;
  name: string;
}

// --- Helpers ---
const safeDivide = (a: number, b: number) => (b > 0 ? a / b : null);
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPct = (n: number | null) => (n != null ? `${(n * 100).toFixed(1)}%` : '—');
const fmtMoneyNull = (n: number | null) => (n != null ? fmtMoney(n) : '—');

function buildQS(params: Record<string, string>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
}

// Compute previous period range given [start, end]
function previousPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime() + 86400000; // inclusive day count in ms
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - diff + 86400000);
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

// --- Components ---
function KpiCard({ label, value, prev, format = 'number' }: {
  label: string; value: number; prev?: number; format?: 'money' | 'number' | 'percent';
}) {
  const formatted = format === 'money' ? fmtMoney(value)
    : format === 'percent' ? fmtPct(value)
    : fmtNum(value);

  let diff: number | null = null;
  let pctDiff: number | null = null;
  if (prev != null) {
    diff = value - prev;
    pctDiff = prev > 0 ? diff / prev : (diff > 0 ? 1 : diff < 0 ? -1 : 0);
  }

  return (
    <Card className="min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{formatted}</p>
      {diff != null && pctDiff != null && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
          diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'
        }`}>
          {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
          <span>{diff > 0 ? '+' : ''}{format === 'money' ? fmtMoney(diff) : fmtNum(diff)}</span>
          <span className="text-gray-400">({pctDiff >= 0 ? '+' : ''}{(pctDiff * 100).toFixed(1)}%)</span>
        </div>
      )}
    </Card>
  );
}

function ComparisonRow({ label, current, previous, format }: {
  label: string; current: number; previous: number; format: 'money' | 'number';
}) {
  const diff = current - previous;
  const pctDiff = previous > 0 ? diff / previous : (diff > 0 ? 1 : diff < 0 ? -1 : 0);
  const fmt = format === 'money' ? fmtMoney : fmtNum;
  const positive = diff >= 0;

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2.5 px-3 text-sm font-medium text-gray-700">{label}</td>
      <td className="py-2.5 px-3 text-sm text-gray-900 text-right">{fmt(current)}</td>
      <td className="py-2.5 px-3 text-sm text-gray-500 text-right">{fmt(previous)}</td>
      <td className={`py-2.5 px-3 text-sm text-right font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{fmt(diff)}
      </td>
      <td className={`py-2.5 px-3 text-sm text-right font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{(pctDiff * 100).toFixed(1)}%
      </td>
    </tr>
  );
}

function MiniChart({ data, dataKey, color, label }: {
  data: TrendRow[]; dataKey: string; color: string; label: string;
}) {
  return (
    <Card title={label} className="min-h-48">
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={50} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes para o gráfico</p>
      )}
    </Card>
  );
}

function generateInsights(kpis: KPIs, prevKpis: KPIs | null, channelData: ChannelRow[]) {
  const insights: string[] = [];
  const withSpend = channelData.filter(c => c.spend > 0);

  if (withSpend.length > 0) {
    const highest = withSpend.reduce((a, b) => a.spend > b.spend ? a : b);
    insights.push(`Maior investimento: ${highest.channelName} com ${fmtMoney(highest.spend)}`);
  }

  const withLeads = withSpend.filter(c => c.leads > 0);
  if (withLeads.length > 0) {
    const bestCPL = withLeads.reduce((a, b) => {
      const cplA = a.spend / a.leads;
      const cplB = b.spend / b.leads;
      return cplA < cplB ? a : b;
    });
    insights.push(`Menor CPL: ${bestCPL.channelName} a ${fmtMoney(bestCPL.spend / bestCPL.leads)}/lead`);
  }

  const zeroLeadSpend = withSpend.filter(c => c.leads === 0);
  zeroLeadSpend.forEach(c => {
    insights.push(`${c.channelName} tem ${fmtMoney(c.spend)} de investimento mas zero leads`);
  });

  if (prevKpis) {
    if (kpis.totalLeads > prevKpis.totalLeads && kpis.totalSpend < prevKpis.totalSpend) {
      insights.push('Leads aumentaram enquanto investimento diminuiu vs período anterior');
    }
    if (kpis.totalSpend > prevKpis.totalSpend && kpis.totalLeads < prevKpis.totalLeads) {
      insights.push('Investimento aumentou enquanto leads diminuíram vs período anterior');
    }
  }

  return insights;
}

// --- Main ---
export function Dashboard() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [prevKpis, setPrevKpis] = useState<KPIs | null>(null);
  const [channelData, setChannelData] = useState<ChannelRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Channel[]>('/channels').then(setChannels);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = buildQS({ startDate, endDate, channelId });
    const prev = previousPeriod(startDate, endDate);
    const prevQs = buildQS({ startDate: prev.startDate, endDate: prev.endDate, channelId });

    const [k, pk, ch, t] = await Promise.all([
      api.get<KPIs>(`/dashboard/kpis${qs}`),
      api.get<KPIs>(`/dashboard/kpis${prevQs}`),
      api.get<ChannelRow[]>(`/dashboard/by-channel${qs}`),
      api.get<TrendRow[]>(`/dashboard/trends${qs}`),
    ]);
    setKpis(k);
    setPrevKpis(pk);
    setChannelData(ch);
    setTrends(t);
    setLoading(false);
  }, [startDate, endDate, channelId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cpl = kpis ? safeDivide(kpis.totalSpend, kpis.totalLeads) : null;
  const pctNewUsers = kpis ? safeDivide(kpis.totalNewUsers, kpis.totalUsers) : null;
  const prevCpl = prevKpis ? safeDivide(prevKpis.totalSpend, prevKpis.totalLeads) : null;

  const insights = kpis && channelData.length > 0
    ? generateInsights(kpis, prevKpis, channelData) : [];

  return (
    <div>
      <PageHeader title="Painel" description="Visão executiva de marketing" />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicial</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Final</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Canal</label>
          <select value={channelId} onChange={e => setChannelId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos os Canais</option>
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : kpis && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <KpiCard label="Investimento" value={kpis.totalSpend} prev={prevKpis?.totalSpend} format="money" />
            <KpiCard label="Leads" value={kpis.totalLeads} prev={prevKpis?.totalLeads} />
            <KpiCard label="CPL" value={cpl ?? 0} prev={prevCpl ?? undefined} format="money" />
            <KpiCard label="Sessões" value={kpis.totalSessions} prev={prevKpis?.totalSessions} />
            <KpiCard label="Conversões" value={kpis.totalConversions} prev={prevKpis?.totalConversions} />
            <KpiCard label="Usuários" value={kpis.totalUsers} prev={prevKpis?.totalUsers} />
            <KpiCard label="% Novos" value={pctNewUsers ?? 0} format="percent" />
          </div>

          {/* Comparison table */}
          <Card title="Comparação de Períodos" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Métrica</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Atual</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Anterior</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Diferença</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">% Variação</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Investimento" current={kpis.totalSpend} previous={prevKpis?.totalSpend ?? 0} format="money" />
                  <ComparisonRow label="Leads" current={kpis.totalLeads} previous={prevKpis?.totalLeads ?? 0} format="number" />
                  <ComparisonRow label="Sessões" current={kpis.totalSessions} previous={prevKpis?.totalSessions ?? 0} format="number" />
                  <ComparisonRow label="Conversões" current={kpis.totalConversions} previous={prevKpis?.totalConversions ?? 0} format="number" />
                </tbody>
              </table>
            </div>
          </Card>

          {/* Channel summary */}
          <Card title="Resumo por Canal" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Canal</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Investimento</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Leads</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Sessões</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map((ch) => (
                    <tr key={ch.channelId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-700">{ch.channelName}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(ch.spend)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtNum(ch.leads)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtNum(ch.sessions)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoneyNull(safeDivide(ch.spend, ch.leads))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Quick Insights */}
          {insights.length > 0 && (
            <Card title="Destaques" className="mb-6">
              <ul className="space-y-1.5">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {ins}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MiniChart data={trends} dataKey="spend" color="#3b82f6" label="Tendência de Investimento" />
            <MiniChart data={trends} dataKey="leads" color="#10b981" label="Tendência de Leads" />
            <MiniChart data={trends} dataKey="sessions" color="#8b5cf6" label="Tendência de Sessões" />
          </div>
        </>
      )}
    </div>
  );
}
