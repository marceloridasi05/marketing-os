/**
 * Monthly Spend Input Modal
 * Allow users to manually enter actual spend by channel
 */

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface MonthlySpendData {
  month: string; // YYYY-MM format
  googleAdsSpend: number | null;
  metaAdsSpend: number | null;
  linkedinAdsSpend: number | null;
  otherPaidSpend: number | null;
  totalSpend?: number | null;
  sourceNote?: string;
  updatedAt?: string;
}

interface MonthlySpendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MonthlySpendData) => void;
  initialMonth?: string;
  initialData?: MonthlySpendData;
}

function parseMonthInput(month: string): string {
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
}

function getMonthDisplayName(monthStr: string): string {
  const months: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  };

  const [year, month] = monthStr.split('-');
  return `${months[month]} ${year}`;
}

export function MonthlySpendModal({
  isOpen,
  onClose,
  onSave,
  initialMonth,
  initialData,
}: MonthlySpendModalProps) {
  const [month, setMonth] = useState(initialMonth || '');
  const [googleAdsSpend, setGoogleAdsSpend] = useState(initialData?.googleAdsSpend?.toString() || '');
  const [metaAdsSpend, setMetaAdsSpend] = useState(initialData?.metaAdsSpend?.toString() || '');
  const [linkedinAdsSpend, setLinkedinAdsSpend] = useState(initialData?.linkedinAdsSpend?.toString() || '');
  const [otherPaidSpend, setOtherPaidSpend] = useState(initialData?.otherPaidSpend?.toString() || '');
  const [sourceNote, setSourceNote] = useState(initialData?.sourceNote || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);

    // Validate month
    if (!month.trim()) {
      setError('Mês é obrigatório');
      return;
    }

    // Validate at least one spend field is filled
    if (!googleAdsSpend && !metaAdsSpend && !linkedinAdsSpend && !otherPaidSpend) {
      setError('Preencha pelo menos um canal de gasto');
      return;
    }

    // Validate no negative values
    const spendFields = [
      { name: 'Google Ads', value: googleAdsSpend },
      { name: 'Meta Ads', value: metaAdsSpend },
      { name: 'LinkedIn Ads', value: linkedinAdsSpend },
      { name: 'Outro pago', value: otherPaidSpend },
    ];

    for (const field of spendFields) {
      if (field.value) {
        const num = parseFloat(field.value);
        if (isNaN(num) || num < 0) {
          setError(`${field.name}: valor inválido (deve ser número positivo)`);
          return;
        }
      }
    }

    // Parse month
    const parsedMonth = parseMonthInput(month);

    // Convert to numbers, keep null if empty
    const data: MonthlySpendData = {
      month: parsedMonth,
      googleAdsSpend: googleAdsSpend ? parseFloat(googleAdsSpend) : null,
      metaAdsSpend: metaAdsSpend ? parseFloat(metaAdsSpend) : null,
      linkedinAdsSpend: linkedinAdsSpend ? parseFloat(linkedinAdsSpend) : null,
      otherPaidSpend: otherPaidSpend ? parseFloat(otherPaidSpend) : null,
      sourceNote: sourceNote || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(data);
    handleClose();
  };

  const handleClose = () => {
    setMonth(initialMonth || '');
    setGoogleAdsSpend(initialData?.googleAdsSpend?.toString() || '');
    setMetaAdsSpend(initialData?.metaAdsSpend?.toString() || '');
    setLinkedinAdsSpend(initialData?.linkedinAdsSpend?.toString() || '');
    setOtherPaidSpend(initialData?.otherPaidSpend?.toString() || '');
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
          <h2 className="text-lg font-bold text-gray-900">Adicionar Gasto Mensal</h2>
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

          {/* Google Ads */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Ads (R$)
            </label>
            <input
              type="number"
              value={googleAdsSpend}
              onChange={(e) => setGoogleAdsSpend(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Meta Ads */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta / Facebook (R$)
            </label>
            <input
              type="number"
              value={metaAdsSpend}
              onChange={(e) => setMetaAdsSpend(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* LinkedIn Ads */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Ads (R$)
            </label>
            <input
              type="number"
              value={linkedinAdsSpend}
              onChange={(e) => setLinkedinAdsSpend(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Other Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outros Pagos (R$)
            </label>
            <input
              type="number"
              value={otherPaidSpend}
              onChange={(e) => setOtherPaidSpend(e.target.value)}
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
              placeholder="Google Sheets, Manual, Integrado, etc."
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
            <p>Deixe em branco os canais sem gasto. O sistema vai calcular o total automaticamente.</p>
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
