import { useState, useMemo } from 'react';
import { Card } from './Card';
import { Save, X, Copy } from 'lucide-react';
import { api } from '../lib/api';

interface MonthlyAllocation {
  [month: number]: {
    googleBudget: number | null;
    metaBudget: number | null;
    linkedinBudget: number | null;
  };
}

interface MonthlyBudgetAllocationEditorProps {
  siteId: number;
  year: number;
  onSave?: () => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CHANNELS = [
  { key: 'googleBudget', label: 'Google', color: 'bg-blue-50' },
  { key: 'metaBudget', label: 'Meta', color: 'bg-blue-100' },
  { key: 'linkedinBudget', label: 'LinkedIn', color: 'bg-blue-200' },
] as const;

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseCurrency(value: string): number | null {
  if (!value) return null;
  const clean = value.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = Number(clean);
  return isNaN(num) ? null : num;
}

export function MonthlyBudgetAllocationEditor({ siteId, year, onSave }: MonthlyBudgetAllocationEditorProps) {
  const [allocations, setAllocations] = useState<MonthlyAllocation>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedMonths, setEditedMonths] = useState<Set<number>>(new Set());
  const [copySourceMonth, setCopySourceMonth] = useState<number | null>(null);

  // Load allocations on mount
  useMemo(() => {
    (async () => {
      try {
        const data = await api.get(`/ads-budgets/monthly-allocation?siteId=${siteId}&year=${year}`);
        const allocs: MonthlyAllocation = {};
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
            allocs[row.month] = {
              googleBudget: row.googleBudget,
              metaBudget: row.metaBudget,
              linkedinBudget: row.linkedinBudget,
            };
          });
        }
        setAllocations(allocs);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar alocações: ' + String(err));
        setLoading(false);
      }
    })();
  }, [siteId, year]);

  const handleChange = (month: number, channel: keyof typeof CHANNELS[number], value: string) => {
    const numValue = parseCurrency(value);
    setAllocations(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || { googleBudget: null, metaBudget: null, linkedinBudget: null }),
        [channel]: numValue,
      },
    }));
    setEditedMonths(prev => new Set(prev).add(month));
  };

  const handleCopyToAll = () => {
    if (copySourceMonth === null) {
      alert('Selecione um mês para copiar');
      return;
    }
    const source = allocations[copySourceMonth];
    if (!source || (!source.googleBudget && !source.metaBudget && !source.linkedinBudget)) {
      alert('Mês selecionado não tem dados para copiar');
      return;
    }

    const newAllocs: MonthlyAllocation = { ...allocations };
    for (let month = 1; month <= 12; month++) {
      newAllocs[month] = { ...source };
    }
    setAllocations(newAllocs);
    setEditedMonths(new Set(Array.from({ length: 12 }, (_, i) => i + 1)));
  };

  const handleSave = async () => {
    if (editedMonths.size === 0) {
      alert('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const allocationsToSend = Array.from(editedMonths).map(month => ({
        month,
        googleBudget: allocations[month]?.googleBudget || null,
        metaBudget: allocations[month]?.metaBudget || null,
        linkedinBudget: allocations[month]?.linkedinBudget || null,
      }));

      await api.post('/ads-budgets/monthly-allocation/batch', {
        siteId,
        year,
        allocations: allocationsToSend,
      });

      setEditedMonths(new Set());
      onSave?.();
    } catch (err) {
      setError('Erro ao salvar: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMonths(new Set());
  };

  // Calculate totals for each month
  const monthTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      const alloc = allocations[month];
      totals[month] = (alloc?.googleBudget || 0) + (alloc?.metaBudget || 0) + (alloc?.linkedinBudget || 0);
    }
    return totals;
  }, [allocations]);

  if (loading) {
    return <Card className="mb-6"><div className="text-center py-4 text-gray-500">Carregando alocações...</div></Card>;
  }

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Alocação Mensal de Verbas - {year}</h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Copy to All Feature */}
          <div className="mb-4 flex gap-2 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Copiar de mês:</label>
              <select
                value={copySourceMonth || ''}
                onChange={(e) => setCopySourceMonth(e.target.value ? Number(e.target.value) : null)}
                disabled={saving}
                className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
              >
                <option value="">— Selecione —</option>
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCopyToAll}
              disabled={saving || copySourceMonth === null}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Copy size={14} /> Copiar para Todos
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-4 rounded border border-gray-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-24">
                    Mês
                  </th>
                  {CHANNELS.map(ch => (
                    <th
                      key={ch.key}
                      className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700"
                    >
                      {ch.label}
                    </th>
                  ))}
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-28">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((month, monthIdx) => {
                  const monthNum = monthIdx + 1;
                  const alloc = allocations[monthNum] || { googleBudget: null, metaBudget: null, linkedinBudget: null };
                  const isEdited = editedMonths.has(monthNum);

                  return (
                    <tr key={monthNum} className={isEdited ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700 font-medium">
                        {month}
                      </td>

                      {CHANNELS.map(ch => (
                        <td
                          key={ch.key}
                          className={`border border-gray-200 px-2 py-1 ${ch.color}`}
                        >
                          <input
                            type="text"
                            value={alloc[ch.key as keyof typeof alloc] ? formatCurrency(alloc[ch.key as keyof typeof alloc]) : ''}
                            onChange={(e) => handleChange(monthNum, ch.key, e.target.value)}
                            placeholder="—"
                            disabled={saving}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 text-right"
                          />
                        </td>
                      ))}

                      <td className="border border-gray-200 px-3 py-2 bg-gray-50 text-right font-medium text-gray-900">
                        {monthTotals[monthNum] > 0 ? formatCurrency(monthTotals[monthNum]) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              disabled={saving || editedMonths.size === 0}
              className="px-4 py-2 text-xs bg-gray-300 text-gray-900 rounded hover:bg-gray-400 disabled:opacity-50 flex items-center gap-2"
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || editedMonths.size === 0}
              className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          {editedMonths.size > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              {editedMonths.size} mês(es) alterado(s)
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
