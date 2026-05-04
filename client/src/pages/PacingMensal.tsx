/**
 * Pacing Mensal (Monthly Pacing & Forecast)
 *
 * Shows current month: MTD (month-to-date) actuals, daily run rate, and forecasts to month-end.
 * Compares forecast vs. budget to track spending pace and detect under/over-budget scenarios.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { Card } from '../components/Card';
import { api } from '../lib/api';

interface PacingData {
  month: string;
  daysElapsed: number;
  daysInMonth: number;
  mtdSessions: number | null;
  mtdLeads: number | null;
  mtdMqls: number | null;
  mtdSqls: number | null;
  mtdOpportunities: number | null;
  mtdRevenue: number | null;
  mtdSpend: number | null;
  forecastSessions: number | null;
  forecastLeads: number | null;
  forecastMqls: number | null;
  forecastSqls: number | null;
  forecastOpportunities: number | null;
  forecastRevenue: number | null;
  forecastSpend: number | null;
  budgetSpend: number | null;
  budgetForecast: number | null;
  budgetStatus: 'on-track' | 'over' | 'under' | 'unknown';
  mtdCpl: number | null;
  forecastCpl: number | null;
}

const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—';
const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const fmtPct = (n: number | null) => n !== null ? `${n.toFixed(1)}%` : '—';

function ProgressBar({ completed, total, label }: { completed: number; total: number; label: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const color = pct > 100 ? 'bg-red-500' : pct > 90 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{fmtPct(pct)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{fmtMoney(completed)}</span>
        <span>{fmtMoney(total)}</span>
      </div>
    </div>
  );
}

function BudgetStatusBadge({ status }: { status: 'on-track' | 'over' | 'under' | 'unknown' }) {
  const styles = {
    'on-track': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'over': 'bg-red-100 text-red-800 border-red-200',
    'under': 'bg-blue-100 text-blue-800 border-blue-200',
    'unknown': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    'on-track': '✓ No Ritmo',
    'over': '⚠ Acima do Orçamento',
    'under': '→ Abaixo do Orçamento',
    'unknown': '? Status Desconhecido',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function PacingMensal() {
  const { selectedSite } = useSite();
  const [pacing, setPacing] = useState<PacingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>('');

  useEffect(() => {
    // Default to current month (YYYY-MM format)
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setMonth(currentMonth);
  }, []);

  useEffect(() => {
    if (!selectedSite?.id || !month) return;

    const fetchPacing = async () => {
      try {
        setLoading(true);
        const response = await api.get<PacingData>('/consolidations/pacing', {
          siteId: selectedSite.id,
          month: month,
        });
        setPacing(response || null);
      } catch (err) {
        console.error('Error fetching pacing data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacing();
  }, [selectedSite?.id, month]);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pacing Mensal</h1>
        <p className="text-gray-600">Acompanhamento do mês em andamento com previsão de pacing até o final</p>
      </div>

      {/* Month Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando dados...</div>
      ) : !pacing ? (
        <Card className="text-center py-12 text-gray-400">
          Sem dados para este mês
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Progress Header */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Progresso do Mês</h2>
                <p className="text-sm text-gray-600">
                  {pacing.daysElapsed} de {pacing.daysInMonth} dias ({fmtPct((pacing.daysElapsed / pacing.daysInMonth) * 100)})
                </p>
              </div>
              <BudgetStatusBadge status={pacing.budgetStatus} />
            </div>

            {/* Budget Pacing Progress */}
            {pacing.budgetSpend !== null && pacing.budgetForecast !== null && (
              <ProgressBar
                completed={pacing.budgetSpend}
                total={pacing.budgetForecast || pacing.budgetSpend}
                label="Gasto vs. Orçamento"
              />
            )}
          </Card>

          {/* MTD vs Forecast Comparison */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas: MTD vs. Previsão</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Sessions */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Acessos</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNum(pacing.mtdSessions)}</p>
                <p className="text-xs text-gray-500 mt-1">MTD</p>
                <p className="text-lg font-semibold text-gray-700 mt-2">{fmtNum(pacing.forecastSessions)}</p>
                <p className="text-xs text-gray-500">Previsão</p>
              </div>

              {/* Leads */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Leads</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNum(pacing.mtdLeads)}</p>
                <p className="text-xs text-gray-500 mt-1">MTD</p>
                <p className="text-lg font-semibold text-gray-700 mt-2">{fmtNum(pacing.forecastLeads)}</p>
                <p className="text-xs text-gray-500">Previsão</p>
              </div>

              {/* MQLs */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">MQLs</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNum(pacing.mtdMqls)}</p>
                <p className="text-xs text-gray-500 mt-1">MTD</p>
                <p className="text-lg font-semibold text-gray-700 mt-2">{fmtNum(pacing.forecastMqls)}</p>
                <p className="text-xs text-gray-500">Previsão</p>
              </div>

              {/* Revenue */}
              <div className="border border-gray-200 rounded-lg p-4 bg-emerald-50">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Receita</p>
                <p className="text-2xl font-bold text-emerald-700">{fmtMoney(pacing.mtdRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">MTD</p>
                <p className="text-lg font-semibold text-emerald-700 mt-2">{fmtMoney(pacing.forecastRevenue)}</p>
                <p className="text-xs text-gray-500">Previsão</p>
              </div>
            </div>
          </Card>

          {/* Spend Tracking */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gasto Mensal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spend Progress */}
              <div>
                <div className="space-y-4">
                  {pacing.mtdSpend !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Gasto Realizado (MTD)</span>
                        <span className="text-gray-600">{fmtMoney(pacing.mtdSpend)}</span>
                      </div>
                    </div>
                  )}

                  {pacing.budgetSpend !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Orçamento Disponível</span>
                        <span className="text-gray-600">{fmtMoney(pacing.budgetSpend)}</span>
                      </div>
                    </div>
                  )}

                  {pacing.forecastSpend !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Previsão ao Final do Mês</span>
                        <span className="text-gray-600">{fmtMoney(pacing.forecastSpend)}</span>
                      </div>
                    </div>
                  )}

                  {pacing.budgetSpend !== null && pacing.forecastSpend !== null && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Diferença (Forecast vs Budget)</span>
                        <span className={`font-semibold ${pacing.forecastSpend > pacing.budgetSpend ? 'text-red-600' : 'text-emerald-600'}`}>
                          {fmtMoney(pacing.forecastSpend - pacing.budgetSpend)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {pacing.forecastSpend > pacing.budgetSpend ? '⚠️ Sobre orçamento' : '✓ Dentro do orçamento'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cost Metrics */}
              <div>
                <div className="space-y-4">
                  {pacing.mtdCpl !== null && (
                    <div className="border-l-4 border-orange-300 bg-orange-50 p-3 rounded">
                      <p className="text-xs font-semibold text-orange-900 uppercase">CPL (MTD)</p>
                      <p className="text-2xl font-bold text-orange-700 mt-1">{fmtMoney(pacing.mtdCpl)}</p>
                    </div>
                  )}

                  {pacing.forecastCpl !== null && (
                    <div className="border-l-4 border-orange-400 bg-orange-50 p-3 rounded">
                      <p className="text-xs font-semibold text-orange-900 uppercase">CPL (Previsão)</p>
                      <p className="text-2xl font-bold text-orange-700 mt-1">{fmtMoney(pacing.forecastCpl)}</p>
                    </div>
                  )}

                  {pacing.mtdSessions && pacing.mtdSpend && (
                    <div className="border-l-4 border-blue-300 bg-blue-50 p-3 rounded">
                      <p className="text-xs font-semibold text-blue-900 uppercase">Custo por Sessão (MTD)</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1">
                        {fmtMoney(pacing.mtdSpend / pacing.mtdSessions)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Funnel Pacing */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Funil: MTD vs. Previsão</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Leads</p>
                  <p className="text-gray-600">{fmtNum(pacing.mtdLeads)} / {fmtNum(pacing.forecastLeads)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">MQLs</p>
                  <p className="text-gray-600">{fmtNum(pacing.mtdMqls)} / {fmtNum(pacing.forecastMqls)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">SQLs</p>
                  <p className="text-gray-600">{fmtNum(pacing.mtdSqls)} / {fmtNum(pacing.forecastSqls)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Opportunities</p>
                  <p className="text-gray-600">{fmtNum(pacing.mtdOpportunities)} / {fmtNum(pacing.forecastOpportunities)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Receita</p>
                  <p className="font-semibold text-emerald-700">{fmtMoney(pacing.mtdRevenue)} / {fmtMoney(pacing.forecastRevenue)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Insights & Alerts */}
          {pacing.budgetStatus === 'over' && (
            <Card className="bg-red-50 border-red-200 p-4 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Alerta: Previsão Acima do Orçamento</p>
                <p className="text-sm text-red-700 mt-1">
                  Se o ritmo atual continuar, você excederá o orçamento em {fmtMoney((pacing.forecastSpend || 0) - (pacing.budgetSpend || 0))}.
                  Considere otimizar gastos ou pausar canais de baixa eficiência.
                </p>
              </div>
            </Card>
          )}

          {pacing.budgetStatus === 'under' && (
            <Card className="bg-blue-50 border-blue-200 p-4 flex gap-3">
              <TrendingDown className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-blue-900">Informação: Previsão Abaixo do Orçamento</p>
                <p className="text-sm text-blue-700 mt-1">
                  Se o ritmo atual continuar, você economizará {fmtMoney((pacing.budgetSpend || 0) - (pacing.forecastSpend || 0))}.
                  Você pode acelerar gastos se houver oportunidades de crescimento.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
