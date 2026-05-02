/**
 * Commercial Metrics Input Modal
 * Allow users to manually enter MQL, SQL, Opportunities, Pipeline, Revenue
 */

import React, { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { parseMonthInput, getMonthDisplayName } from '../lib/commercialMetrics';

interface CommercialMetricsData {
  month: string; // YYYY-MM format
  mql: number | null;
  sql: number | null;
  opportunities: number | null;
  pipelineValue: number | null; // currency
  revenue: number | null; // currency
  sourceNote?: string;
  updatedAt?: string;
}

interface CommercialMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CommercialMetricsData) => void;
  initialMonth?: string;
  initialData?: CommercialMetricsData;
}

export function CommercialMetricsModal({
  isOpen,
  onClose,
  onSave,
  initialMonth,
  initialData,
}: CommercialMetricsModalProps) {
  const [month, setMonth] = useState(initialMonth || '');
  const [mql, setMql] = useState(initialData?.mql?.toString() || '');
  const [sql, setSql] = useState(initialData?.sql?.toString() || '');
  const [opportunities, setOpportunities] = useState(initialData?.opportunities?.toString() || '');
  const [pipelineValue, setPipelineValue] = useState(initialData?.pipelineValue?.toString() || '');
  const [revenue, setRevenue] = useState(initialData?.revenue?.toString() || '');
  const [sourceNote, setSourceNote] = useState(initialData?.sourceNote || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    // Validate month
    if (!month.trim()) {
      setError('Mês é obrigatório');
      return;
    }

    // Validate at least one field is filled
    if (!mql && !sql && !opportunities && !pipelineValue && !revenue) {
      setError('Preencha pelo menos um campo de métrica');
      return;
    }

    // Parse month
    const parsedMonth = parseMonthInput(month);

    // Convert to numbers, keep null if empty
    const data: CommercialMetricsData = {
      month: parsedMonth,
      mql: mql ? parseInt(mql) : null,
      sql: sql ? parseInt(sql) : null,
      opportunities: opportunities ? parseInt(opportunities) : null,
      pipelineValue: pipelineValue ? parseFloat(pipelineValue) : null,
      revenue: revenue ? parseFloat(revenue) : null,
      sourceNote: sourceNote || undefined,
      updatedAt: new Date().toISOString(),
    };

    // Validate values are positive
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 0) {
        setError(`${key} não pode ser negativo`);
        return;
      }
    });

    onSave(data);
    handleClose();
  };

  const handleClose = () => {
    setMonth(initialMonth || '');
    setMql(initialData?.mql?.toString() || '');
    setSql(initialData?.sql?.toString() || '');
    setOpportunities(initialData?.opportunities?.toString() || '');
    setPipelineValue(initialData?.pipelineValue?.toString() || '');
    setRevenue(initialData?.revenue?.toString() || '');
    setSourceNote(initialData?.sourceNote || '');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Adicionar Dados Comerciais</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês *
            </label>
            <input
              type="text"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="MM/YYYY (ex: 05/2026)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {month && (
              <p className="text-xs text-gray-500 mt-1">
                {getMonthDisplayName(parseMonthInput(month))}
              </p>
            )}
          </div>

          {/* MQL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MQLs
            </label>
            <input
              type="number"
              value={mql}
              onChange={(e) => setMql(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SQL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SQLs
            </label>
            <input
              type="number"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Opportunities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Oportunidades
            </label>
            <input
              type="number"
              value={opportunities}
              onChange={(e) => setOpportunities(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pipeline Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline (R$)
            </label>
            <input
              type="number"
              value={pipelineValue}
              onChange={(e) => setPipelineValue(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Revenue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receita (R$)
            </label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fonte / Observação (opcional)
            </label>
            <input
              type="text"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              placeholder="CRM, HubSpot, Manual, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">💡 Dica:</p>
            <p>Deixe em branco os campos que não têm dados. Isso é diferente de zero.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
