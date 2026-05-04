/**
 * Performance Semanal (Weekly Consolidation)
 *
 * Aggregates operational data from multiple DADOS modules into weekly summaries.
 * Shows week-over-week trends and key derived metrics (CPL, conversion rates, etc.).
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface WeeklyConsolidation {
  weekStart: string;
  weekEnd: string;
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
}

const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—';
const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const fmtPct = (n: number | null) => n !== null ? `${n.toFixed(1)}%` : '—';

function TrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null || previous === 0) return <span className="text-gray-400 text-xs">—</span>;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const color = delta >= 0 ? 'text-green-600' : 'text-red-600';
  const icon = delta >= 0 ? '↑' : '↓';
  return <span className={`${color} text-xs font-medium`}>{icon} {Math.abs(delta).toFixed(0)}%</span>;
}

export default function PerformanceSemanal() {
  const { selectedSite } = useSite();
  const { dateRange } = useTimeFilter('all');
  const [weeks, setWeeks] = useState<WeeklyConsolidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSite?.id || !dateRange?.start || !dateRange?.end) return;

    const fetchWeekly = async () => {
      try {
        setLoading(true);
        const response = await api.get<WeeklyConsolidation[]>('/consolidations/weekly', {
          siteId: selectedSite.id,
          dateFrom: dateRange.start,
          dateTo: dateRange.end,
        });
        setWeeks(response || []);
      } catch (err) {
        console.error('Error fetching weekly consolidations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekly();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Semanal</h1>
        <p className="text-gray-600">Agregação semanal de dados operacionais com métricas derivadas</p>
      </div>

      {/* Time Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TimeFilter />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando dados...</div>
      ) : weeks.length === 0 ? (
        <Card className="text-center py-12 text-gray-400">
          Nenhuma semana com dados no período selecionado
        </Card>
      ) : (
        /* Weekly Table */
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Semana</th>

                {/* Traffic */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acessos</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Usuários</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Novos Usuários</th>

                {/* Acquisition */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Leads</th>

                {/* Funnel */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">MQLs</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">SQLs</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Oportunidades</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Receita</th>

                {/* Spend */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Gasto Total</th>

                {/* Metrics */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">CPL</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Custo/MQL</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Custo/SQL</th>

                {/* Conversion Rates */}
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Lead→MQL %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">MQL→SQL %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">SQL→Opp %</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, idx) => {
                const prevWeek = idx > 0 ? weeks[idx - 1] : null;
                const weekLabel = `${new Date(week.weekStart).toLocaleDateString('pt-BR')} - ${new Date(week.weekEnd).toLocaleDateString('pt-BR')}`;

                return (
                  <tr key={week.weekStart} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-left font-medium text-gray-900">{weekLabel}</td>

                    {/* Traffic */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.sessions)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.totalUsers)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.newUsers)}</td>

                    {/* Acquisition */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.leads)}</td>

                    {/* Funnel */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.mqls)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.sqls)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtNum(week.opportunities)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">{fmtMoney(week.revenue)}</td>

                    {/* Spend */}
                    <td className="py-3 px-4 text-right font-semibold text-orange-600">{fmtMoney(week.totalSpend)}</td>

                    {/* Metrics */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(week.cpl)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(week.cpmMql)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtMoney(week.cpmSql)}</td>

                    {/* Conversion Rates */}
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(week.leadToMqlRate)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(week.mqlToSqlRate)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{fmtPct(week.sqlToOppRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Card */}
      {weeks.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Resumo:</strong> {weeks.length} semana(s) com dados.
            Total de receita: <span className="font-semibold text-emerald-600">{fmtMoney(weeks.reduce((sum, w) => sum + (w.revenue || 0), 0))}</span>
            • Total de gasto: <span className="font-semibold text-orange-600">{fmtMoney(weeks.reduce((sum, w) => sum + (w.totalSpend || 0), 0))}</span>
          </p>
        </Card>
      )}
    </div>
  );
}
