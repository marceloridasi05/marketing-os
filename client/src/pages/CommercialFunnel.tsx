/**
 * Commercial Funnel Page
 * Central hub for entering and tracking commercial metrics (MQL → SQL → Opportunities → Revenue)
 * Part of Operational Data layer
 */

import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';

interface CommercialMetricsData {
  id?: number;
  month: string; // YYYY-MM format
  mql: number | null;
  sql: number | null;
  opportunities: number | null;
  pipelineValue: number | null;
  revenue: number | null;
  sourceNote?: string;
  updatedAt?: string;
}

interface MetricsRow extends CommercialMetricsData {
  id: number; // Ensure id exists
  mqlToSql: number | null;
  sqlToOpp: number | null;
  oppToRevenue: number | null;
}

export default function CommercialFunnel() {
  const { selectedSite } = useSite();
  const [data, setData] = useState<MetricsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CommercialMetricsData>>({
    month: '',
    mql: null,
    sql: null,
    opportunities: null,
    pipelineValue: null,
    revenue: null,
    sourceNote: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch data on mount and when selectedSite changes
  useEffect(() => {
    if (!selectedSite) return;
    fetchData();
  }, [selectedSite]);

  const fetchData = async () => {
    if (!selectedSite) return;
    try {
      setLoading(true);
      const response = await api.get<CommercialMetricsData[]>(`/commercial-metrics/${selectedSite.id}`);
      const processed = response.map(row => ({
        ...row,
        mqlToSql: row.mql && row.sql ? ((row.sql / row.mql) * 100) : null,
        sqlToOpp: row.sql && row.opportunities ? ((row.opportunities / row.sql) * 100) : null,
        oppToRevenue: row.opportunities && row.revenue ? ((row.revenue / row.opportunities) * 100) : null,
      }));
      setData(processed);
    } catch (error) {
      console.error('Failed to fetch commercial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseMonthInput = (month: string): string => {
    const patterns = [
      /(\d{2})\/(\d{4})/, // MM/YYYY
      /(\d{4})-(\d{2})/, // YYYY-MM
      /(\d{4})-(\d{2})-\d{2}/, // YYYY-MM-DD
    ];

    for (const pattern of patterns) {
      const match = month.match(pattern);
      if (match) {
        const [, part1, part2] = match;
        if (parseInt(part1) > 12) {
          return `${part1}-${part2.padStart(2, '0')}`;
        } else {
          return `${part2}-${part1.padStart(2, '0')}`;
        }
      }
    }
    return month;
  };

  const getMonthDisplayName = (monthStr: string): string => {
    const months: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    };
    const [year, month] = monthStr.split('-');
    return `${months[month]} ${year}`;
  };

  const validateForm = (): boolean => {
    setFormError(null);

    if (!formData.month?.trim()) {
      setFormError('Mês é obrigatório');
      return false;
    }

    if (!formData.mql && !formData.sql && !formData.opportunities && !formData.revenue) {
      setFormError('Preencha pelo menos uma métrica');
      return false;
    }

    const fields = [
      { name: 'MQL', value: formData.mql },
      { name: 'SQL', value: formData.sql },
      { name: 'Opportunities', value: formData.opportunities },
      { name: 'Pipeline Value', value: formData.pipelineValue },
      { name: 'Revenue', value: formData.revenue },
    ];

    for (const field of fields) {
      if (field.value != null && (typeof field.value !== 'number' || field.value < 0)) {
        setFormError(`${field.name}: valor inválido`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedSite) return;

    try {
      const parsedMonth = parseMonthInput(formData.month || '');
      const payload: CommercialMetricsData = {
        month: parsedMonth,
        mql: formData.mql ?? null,
        sql: formData.sql ?? null,
        opportunities: formData.opportunities ?? null,
        pipelineValue: formData.pipelineValue ?? null,
        revenue: formData.revenue ?? null,
        sourceNote: formData.sourceNote || undefined,
      };

      if (editingId) {
        payload.id = editingId;
      }

      await api.post(`/commercial-metrics/${selectedSite.id}`, payload);
      await fetchData();
      handleCloseForm();
    } catch (error) {
      setFormError(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (!selectedSite || !window.confirm('Tem certeza que deseja deletar?')) return;
    try {
      const row = data.find(r => r.id === id);
      if (!row) return;
      await api.del(`/commercial-metrics/${selectedSite.id}/${row.month}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEdit = (row: MetricsRow) => {
    setEditingId(row.id);
    setFormData({
      month: row.month,
      mql: row.mql,
      sql: row.sql,
      opportunities: row.opportunities,
      pipelineValue: row.pipelineValue,
      revenue: row.revenue,
      sourceNote: row.sourceNote,
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormData({
      month: '',
      mql: null,
      sql: null,
      opportunities: null,
      pipelineValue: null,
      revenue: null,
      sourceNote: '',
    });
    setFormError(null);
  };

  const getTrendIcon = (current: number | null | undefined, previous: number | null | undefined) => {
    if (!current || !previous) return null;
    const delta = ((current - previous) / previous) * 100;
    if (Math.abs(delta) < 1) return null;
    return delta > 0 ? (
      <TrendingUp size={12} className="text-green-500" />
    ) : (
      <TrendingDown size={12} className="text-red-500" />
    );
  };

  const formatNumber = (value: number | null): string => {
    if (value === null) return '—';
    return value.toLocaleString('pt-BR');
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return '—';
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Funil Comercial</h1>
          <p className="text-gray-400">MQL → SQL → Opportunities → Revenue</p>
        </div>

        {!selectedSite ? (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-200">
            Selecione um site no painel lateral para começar
          </div>
        ) : (
          <>
            {/* Quick Input Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {formOpen ? (editingId ? 'Editar' : 'Adicionar') : 'Adicionar'} Dados Mensais
                </h2>
                {!formOpen && (
                  <button
                    onClick={() => setFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <Plus size={16} /> Novo Mês
                  </button>
                )}
              </div>

              {formOpen && (
                <div className="space-y-4">
                  {/* Month Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mês *</label>
                    <input
                      type="text"
                      value={formData.month || ''}
                      onChange={e => setFormData({ ...formData, month: e.target.value })}
                      placeholder="MM/YYYY ou YYYY-MM"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {formData.month && (
                      <p className="text-xs text-gray-400 mt-1">
                        {getMonthDisplayName(parseMonthInput(formData.month))}
                      </p>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { key: 'mql', label: 'MQL' },
                      { key: 'sql', label: 'SQL' },
                      { key: 'opportunities', label: 'Opportunities' },
                      { key: 'pipelineValue', label: 'Pipeline (R$)' },
                      { key: 'revenue', label: 'Revenue (R$)' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-gray-400 mb-1">{field.label}</label>
                        <input
                          type="number"
                          value={formData[field.key as keyof CommercialMetricsData] ?? ''}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              [field.key]: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          min="0"
                          step="1"
                          placeholder="—"
                          className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Source Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fonte/Observação (opcional)</label>
                    <input
                      type="text"
                      value={formData.sourceNote || ''}
                      onChange={e => setFormData({ ...formData, sourceNote: e.target.value })}
                      placeholder="Ex: Manual, CRM, Google Sheets"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Error */}
                  {formError && (
                    <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-200">{formError}</div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                    >
                      {editingId ? 'Salvar Alterações' : 'Adicionar'}
                    </button>
                    <button
                      onClick={handleCloseForm}
                      className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Data Table */}
            {loading ? (
              <div className="text-center py-12 text-gray-400">Carregando dados...</div>
            ) : data.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center text-gray-400">
                <p className="text-lg mb-2">Nenhum dado registrado</p>
                <p className="text-sm">Adicione métricas mensais para começar a analisar o funil comercial</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">Período</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">MQL</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">SQL</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">% Conv.</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">Opportunities</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">% Conv.</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">Revenue</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(row => (
                        <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-300 font-medium">
                            {getMonthDisplayName(row.month)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.mql)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.sql)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{formatPercent(row.mqlToSql)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.opportunities)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{formatPercent(row.sqlToOpp)}</td>
                          <td className="px-4 py-3 text-right text-gray-300 font-medium">{formatNumber(row.revenue)}</td>
                          <td className="px-4 py-3 text-right flex gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(row)}
                              className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              title="Deletar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                {data.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400">
                      Total de {data.length} mês(es) registrado(s). Conversão de {data[0].mqlToSql ? `${data[0].mqlToSql.toFixed(1)}%` : '—'} de MQL para SQL no período mais recente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
