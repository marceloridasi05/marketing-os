/**
 * Commercial Funnel Page
 * Daily operational tracking hub for commercial metrics (Leads → MQL → SQL → Opportunities → Revenue)
 * Follows same pattern as SiteData: daily data with automatic aggregations to weekly/monthly/custom
 * Part of Operational Data layer
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, Download, Upload, Calendar } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';

interface CommercialFunnelDailyRecord {
  id?: number;
  siteId?: number;
  date: string; // YYYY-MM-DD format
  leads: number | null;
  mql: number | null;
  sql: number | null;
  meetings: number | null;
  opportunities: number | null;
  pipelineCreated: number | null;
  revenueClosed: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AggregatedRecord extends CommercialFunnelDailyRecord {
  period: string;
  dateStart: string;
  dateEnd: string;
  leadToMqlRate: number | null;
  mqlToSqlRate: number | null;
  sqlToMeetingRate: number | null;
  meetingToOppRate: number | null;
}

type ViewPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export default function CommercialFunnel() {
  const { selectedSite } = useSite();
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('daily');
  const [data, setData] = useState<CommercialFunnelDailyRecord[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Custom date range for 'custom' period view
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');

  // Manual entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<CommercialFunnelDailyRecord>>({
    date: new Date().toISOString().split('T')[0],
    leads: null,
    mql: null,
    sql: null,
    meetings: null,
    opportunities: null,
    pipelineCreated: null,
    revenueClosed: null,
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch daily data
  useEffect(() => {
    if (!selectedSite) return;
    fetchData();
  }, [selectedSite]);

  // Fetch aggregated data when period or date range changes
  useEffect(() => {
    if (!selectedSite || data.length === 0) return;
    fetchAggregatedData();
  }, [selectedSite, viewPeriod, customDateFrom, customDateTo, data.length]);

  const fetchData = async () => {
    if (!selectedSite) return;
    try {
      setLoading(true);
      const response = await api.get<CommercialFunnelDailyRecord[]>(
        `/commercial-funnel-daily?siteId=${selectedSite.id}`
      );
      setData(response || []);
    } catch (error) {
      console.error('Failed to fetch daily records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregatedData = async () => {
    if (!selectedSite) return;
    try {
      const params = new URLSearchParams({
        siteId: String(selectedSite.id),
        period: viewPeriod,
      });

      if (viewPeriod === 'custom') {
        if (customDateFrom) params.append('dateFrom', customDateFrom);
        if (customDateTo) params.append('dateTo', customDateTo);
      }

      const response = await api.get<{ records: AggregatedRecord[] }>(
        `/commercial-funnel-daily/aggregated?${params}`
      );
      setAggregatedData(response?.records || []);
    } catch (error) {
      console.error('Failed to fetch aggregated data:', error);
    }
  };

  const handleSync = async () => {
    if (!selectedSite) return;
    try {
      setSyncing(true);
      await api.post(`/commercial-funnel-daily/sync?siteId=${selectedSite.id}`, {});
      await fetchData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddDaily = async () => {
    if (!selectedSite || !formData.date) return;

    // Validate at least one metric
    if (
      formData.leads === null &&
      formData.mql === null &&
      formData.sql === null &&
      formData.meetings === null &&
      formData.opportunities === null
    ) {
      setFormError('Preencha pelo menos uma métrica');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await api.post(`/commercial-funnel-daily/manual?siteId=${selectedSite.id}`, {
        date: formData.date,
        leads: formData.leads,
        mql: formData.mql,
        sql: formData.sql,
        meetings: formData.meetings,
        opportunities: formData.opportunities,
        pipelineCreated: formData.pipelineCreated,
        revenueClosed: formData.revenueClosed,
        notes: formData.notes,
      });

      await fetchData();
      setShowAddForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        leads: null,
        mql: null,
        sql: null,
        meetings: null,
        opportunities: null,
        pipelineCreated: null,
        revenueClosed: null,
        notes: '',
      });
    } catch (error) {
      setFormError(String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!selectedSite || !window.confirm('Tem certeza que deseja deletar?')) return;
    try {
      await api.delete(`/commercial-funnel-daily/${id}?siteId=${selectedSite.id}`);
      await fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDate = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return dateStr;
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '—';
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return '—';
    return `${value.toFixed(1)}%`;
  };

  // Render based on period
  const displayData = useMemo(() => {
    if (viewPeriod === 'daily') {
      return data.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      return aggregatedData;
    }
  }, [viewPeriod, data, aggregatedData]);

  if (!selectedSite) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 p-6">
        <div className="max-w-6xl mx-auto bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-200">
          Selecione um site no painel lateral para começar
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Controle Diário do Funil Comercial</h1>
          <p className="text-gray-400">Rastreamento diário de Leads → MQLs → SQLs → Oportunidades → Receita</p>
        </div>

        {/* Period Selector + Action Buttons */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Period Tabs */}
          <div className="flex gap-2 border-b border-gray-800">
            {(['daily', 'weekly', 'monthly', 'custom'] as ViewPeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setViewPeriod(period)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  viewPeriod === period
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {period === 'daily' && 'Diário'}
                {period === 'weekly' && 'Semanal'}
                {period === 'monthly' && 'Mensal'}
                {period === 'custom' && 'Período Customizado'}
              </button>
            ))}
          </div>

          {/* Custom Date Range (if viewing custom period) */}
          {viewPeriod === 'custom' && (
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-400 mb-1">De</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={e => setCustomDateFrom(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Até</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={e => setCustomDateTo(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-gray-300 font-medium transition-colors"
            >
              <Upload size={16} />
              {syncing ? 'Sincronizando...' : 'Sincronizar de Planilha'}
            </button>

            {viewPeriod === 'daily' && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors"
              >
                <Plus size={16} />
                Adicionar Dia
              </button>
            )}
          </div>
        </div>

        {/* Add Daily Form (only in daily view) */}
        {viewPeriod === 'daily' && showAddForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Adicionar Registro Diário</h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data *</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Leads</label>
                <input
                  type="number"
                  value={formData.leads ?? ''}
                  onChange={e =>
                    setFormData({ ...formData, leads: e.target.value ? Number(e.target.value) : null })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">MQLs</label>
                <input
                  type="number"
                  value={formData.mql ?? ''}
                  onChange={e =>
                    setFormData({ ...formData, mql: e.target.value ? Number(e.target.value) : null })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SQLs</label>
                <input
                  type="number"
                  value={formData.sql ?? ''}
                  onChange={e =>
                    setFormData({ ...formData, sql: e.target.value ? Number(e.target.value) : null })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reuniões</label>
                <input
                  type="number"
                  value={formData.meetings ?? ''}
                  onChange={e =>
                    setFormData({ ...formData, meetings: e.target.value ? Number(e.target.value) : null })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Oportunidades</label>
                <input
                  type="number"
                  value={formData.opportunities ?? ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      opportunities: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pipeline Criado (R$)</label>
                <input
                  type="number"
                  value={formData.pipelineCreated ?? ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      pipelineCreated: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Receita Fechada (R$)</label>
                <input
                  type="number"
                  value={formData.revenueClosed ?? ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      revenueClosed: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Observações</label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="CRM sync, Manual, etc"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
            </div>

            {formError && (
              <div className="mb-4 bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-200">
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddDaily}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando dados...</div>
        ) : displayData.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center text-gray-400">
            <p className="text-lg mb-2">Nenhum dado registrado</p>
            <p className="text-sm">
              {viewPeriod === 'daily'
                ? 'Sincronize de uma planilha ou adicione registros diários para começar'
                : 'Nenhum dado disponível para este período'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">
                    {viewPeriod === 'daily' ? 'Data' : 'Período'}
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Leads</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">MQLs</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">% L→M</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">SQLs</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">% M→S</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Reuniões</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">% S→R</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Oportunidades</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Pipeline</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Receita</th>
                  {viewPeriod === 'daily' && <th className="px-4 py-3 text-right text-gray-400 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, idx) => (
                  <tr key={row.id || idx} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-medium">
                      {viewPeriod === 'daily' ? formatDate(row.date) : row.period}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.leads ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.mql ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatPercent((row as AggregatedRecord).leadToMqlRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.sql ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatPercent((row as AggregatedRecord).mqlToSqlRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.meetings ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatPercent((row as AggregatedRecord).sqlToMeetingRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.opportunities ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(row.pipelineCreated)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(row.revenueClosed)}</td>
                    {viewPeriod === 'daily' && (
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => handleDelete(row.id || 0)}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {displayData.length > 0 && (
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400">
              <strong>📊 Resumo:</strong> Total de {displayData.length} período(s) registrado(s).
              {viewPeriod === 'daily' && displayData[0].leads
                ? ` Conversão de Leads→MQLs: ${((displayData[0].mql || 0) / (displayData[0].leads || 1) * 100).toFixed(1)}% no período mais recente.`
                : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
