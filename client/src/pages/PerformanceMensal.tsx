/**
 * Performance Mensal (Monthly Consolidation with MoM Comparison)
 *
 * Aggregates weekly data into monthly summaries with month-over-month (MoM)
 * comparisons showing delta % for key metrics.
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface MonthlyConsolidation {
  month: string;
  monthStart: string;
  monthEnd: string;
  sessions: number | null;
  totalUsers: number | null;
  newUsers: number | null;
  leads: number | null;
  paidClicks: number | null;
  mqls: number | null;
  sqls: number | null;
  meetings: number | null;
  opportunities: number | null;
  revenue: number | null;
  totalSpend: number | null;
  googleSpend: number | null;
  metaSpend: number | null;
  linkedinSpend: number | null;
  cpl: number | null;
  cpmMql: number | null;
  cpmSql: number | null;
  leadToMqlRate: number | null;
  mqlToSqlRate: number | null;
  sqlToOppRate: number | null;
  previousMonth?: {
    revenue?: number;
    leads?: number;
    mqls?: number;
    totalSpend?: number;
  };
  deltaRevenue?: number;
  deltaLeads?: number;
  deltaMqls?: number;
  deltaCpl?: number;
}

const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—';
const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const fmtPct = (n: number | null) => n !== null ? `${n.toFixed(1)}%` : '—';
const fmtDelta = (delta: number | null) => {
  if (delta === null) return '—';
  const sign = delta >= 0 ? '↑' : '↓';
  const color = delta >= 0 ? 'text-green-600' : 'text-red-600';
  return <span className={`${color} text-xs font-medium`}>{sign} {Math.abs(delta).toFixed(1)}%</span>;
};

export default function PerformanceMensal() {
  const { selectedSite } = useSite();
  const { dateRange } = useTimeFilter('all');
  const [months, setMonths] = useState<MonthlyConsolidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSite?.id || !dateRange?.start || !dateRange?.end) return;

    const fetchMonthly = async () => {
      try {
        setLoading(true);

        // Extract YYYY-MM from date range
        const startMonth = dateRange.start.substring(0, 7);
        const endMonth = dateRange.end.substring(0, 7);

        const response = await api.get<MonthlyConsolidation[]>('/consolidations/monthly', {
          siteId: selectedSite.id,
          monthFrom: startMonth,
          monthTo: endMonth,
        });
        setMonths(response || []);
      } catch (err) {
        console.error('Error fetching monthly consolidations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthly();
  }, [selectedSite?.id, dateRange]);

  if (!selectedSite) {
    return (
      <div className="p-6 text-center text-gray-400">
        Selecione um site no painel lateral
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Mensal</h1>
        <p className="text-gray-600">Agregação mensal de dados operacionais com comparação MoM (mês a mês)</p>
      </div>

      {/* Time Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TimeFilter />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando dados...</div>
      ) : months.length === 0 ? (
        <Card className="text-center py-12 text-gray-400">
          Nenhum mês com dados no período selecionado
        </Card>
      ) : (
        /* Monthly Table */
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Mês</th>

                {/* Traffic */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acessos</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Usuários</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Novos Usuários</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>

                {/* Acquisition */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Leads</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>

                {/* Funnel */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">MQLs</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">SQLs</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Oportunidades</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Receita</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>

                {/* Spend */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Gasto Total</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>

                {/* Metrics */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">CPL</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">MoM %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Custo/MQL</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Custo/SQL</th>

                {/* Conversion Rates */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Lead→MQL %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">MQL→SQL %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">SQL→Opp %</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => {
                const monthLabel = month.month || `${month.monthStart} a ${month.monthEnd}`;

                return (
                  <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-left font-medium text-gray-900">{monthLabel}</td>

                    {/* Traffic - Sessions */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.sessions)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.sessions && month.previousMonth?.leads ? ((month.sessions - (month.previousMonth?.leads || 0)) / (month.previousMonth?.leads || 1)) * 100 : null)}</td>

                    {/* Traffic - Total Users */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.totalUsers)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(null)}</td>

                    {/* Traffic - New Users */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.newUsers)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(null)}</td>

                    {/* Acquisition - Leads */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.leads)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.deltaLeads)}</td>

                    {/* Funnel - MQLs */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.mqls)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.deltaMqls)}</td>

                    {/* Funnel - SQLs */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.sqls)}</td>

                    {/* Funnel - Opportunities */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(month.opportunities)}</td>

                    {/* Funnel - Revenue */}
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">{fmtMoney(month.revenue)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.deltaRevenue)}</td>

                    {/* Spend - Total */}
                    <td className="py-3 px-4 text-right font-semibold text-orange-600">{fmtMoney(month.totalSpend)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.totalSpend && month.previousMonth?.totalSpend ? ((month.totalSpend - (month.previousMonth?.totalSpend || 0)) / (month.previousMonth?.totalSpend || 1)) * 100 : null)}</td>

                    {/* Metrics - CPL */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(month.cpl)}</td>
                    <td className="py-3 px-4 text-right text-sm">{fmtDelta(month.deltaCpl)}</td>

                    {/* Metrics - Cost per MQL */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(month.cpmMql)}</td>

                    {/* Metrics - Cost per SQL */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(month.cpmSql)}</td>

                    {/* Conversion Rates */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(month.leadToMqlRate)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(month.mqlToSqlRate)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(month.sqlToOppRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Card */}
      {months.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Resumo:</strong> {months.length} mês(es) com dados.
            Total de receita: <span className="font-semibold text-emerald-600">{fmtMoney(months.reduce((sum, m) => sum + (m.revenue || 0), 0))}</span>
            • Total de gasto: <span className="font-semibold text-orange-600">{fmtMoney(months.reduce((sum, m) => sum + (m.totalSpend || 0), 0))}</span>
          </p>
        </Card>
      )}
    </div>
  );
}
