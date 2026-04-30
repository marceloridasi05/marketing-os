import { useState, useMemo } from 'react';
import { Card } from './Card';
import { Trash2, Save, X, Plus } from 'lucide-react';

interface ManualInputRow {
  week?: string;
  weekStart: string;
  sessions: string;
  totalUsers: string;
  paidClicks: string;
  unpaidSessions: string;
  newUsers: string;
  newUsersPct: string;
  leadsGenerated: string;
  weeklyGains: string;
  blogSessions: string;
  blogTotalUsers: string;
  blogNewUsers: string;
  blogNewUsersPct: string;
  aiSessions: string;
  aiTotalUsers: string;
  sitePageViews?: string;
  siteSessions?: string;
  siteActiveUsers?: string;
}

interface ManualInputTableProps {
  onSubmit: (rows: ManualInputRow[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const COLUMNS = [
  { key: 'weekStart', label: 'Início da Semana', required: true, type: 'date', width: '100px' },
  { key: 'sessions', label: 'Sessões', required: true, type: 'number', width: '80px' },
  { key: 'totalUsers', label: 'Total de Usuários', required: true, type: 'number', width: '100px' },
  { key: 'paidClicks', label: 'Cliques Pagos', required: false, type: 'number', width: '80px' },
  { key: 'unpaidSessions', label: 'Sessões sem Pago', required: false, type: 'number', width: '100px' },
  { key: 'newUsers', label: 'Novos Usuários', required: true, type: 'number', width: '90px' },
  { key: 'newUsersPct', label: '% de Novos', required: false, type: 'percentage', width: '80px' },
  { key: 'leadsGenerated', label: 'Leads Gerados', required: true, type: 'number', width: '90px' },
  { key: 'weeklyGains', label: 'Ganhos na Semana', required: false, type: 'number', width: '100px' },
  { key: 'blogSessions', label: 'Blog Sessões', required: false, type: 'number', width: '90px' },
  { key: 'blogTotalUsers', label: 'Blog Usuários', required: false, type: 'number', width: '90px' },
  { key: 'blogNewUsers', label: 'Blog Novos', required: false, type: 'number', width: '80px' },
  { key: 'blogNewUsersPct', label: 'Blog % Novos', required: false, type: 'percentage', width: '90px' },
  { key: 'aiSessions', label: 'IA Sessões', required: false, type: 'number', width: '80px' },
  { key: 'aiTotalUsers', label: 'IA Usuários', required: false, type: 'number', width: '90px' },
  { key: 'sitePageViews', label: 'Site Visualizações', required: false, type: 'number', width: '100px' },
  { key: 'siteSessions', label: 'Site Sessions', required: false, type: 'number', width: '80px' },
  { key: 'siteActiveUsers', label: 'Site Usuários Ativos', required: false, type: 'number', width: '100px' },
];

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  return day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900;
}

function isValidNumber(value: string): boolean {
  if (!value) return true; // empty is ok for optional fields
  return /^\d+([.,]\d+)?$/.test(value);
}

function isValidPercentage(value: string): boolean {
  if (!value) return true;
  const num = parseFloat(value.replace(',', '.'));
  return !isNaN(num) && num >= 0 && num <= 100;
}

function getErrorMessage(row: ManualInputRow, rowIndex: number): string[] {
  const errors: string[] = [];

  if (!row.weekStart) {
    errors.push(`Linha ${rowIndex + 1}: Início da Semana é obrigatório`);
  } else if (!isValidDate(row.weekStart)) {
    errors.push(`Linha ${rowIndex + 1}: Data inválida (use dd/mm/yyyy)`);
  }

  if (!row.sessions) {
    errors.push(`Linha ${rowIndex + 1}: Sessões é obrigatório`);
  } else if (!isValidNumber(row.sessions)) {
    errors.push(`Linha ${rowIndex + 1}: Sessões deve ser numérico`);
  }

  if (!row.totalUsers) {
    errors.push(`Linha ${rowIndex + 1}: Total de Usuários é obrigatório`);
  } else if (!isValidNumber(row.totalUsers)) {
    errors.push(`Linha ${rowIndex + 1}: Total de Usuários deve ser numérico`);
  }

  if (!row.newUsers) {
    errors.push(`Linha ${rowIndex + 1}: Novos Usuários é obrigatório`);
  } else if (!isValidNumber(row.newUsers)) {
    errors.push(`Linha ${rowIndex + 1}: Novos Usuários deve ser numérico`);
  }

  if (!row.leadsGenerated) {
    errors.push(`Linha ${rowIndex + 1}: Leads Gerados é obrigatório`);
  } else if (!isValidNumber(row.leadsGenerated)) {
    errors.push(`Linha ${rowIndex + 1}: Leads Gerados deve ser numérico`);
  }

  // Optional field validation
  if (row.newUsersPct && !isValidPercentage(row.newUsersPct)) {
    errors.push(`Linha ${rowIndex + 1}: % de Novos deve ser 0-100`);
  }
  if (row.blogNewUsersPct && !isValidPercentage(row.blogNewUsersPct)) {
    errors.push(`Linha ${rowIndex + 1}: Blog % Novos deve ser 0-100`);
  }

  return errors;
}

function getInputClass(value: string, required: boolean, isInvalid: boolean): string {
  let classes = 'w-full px-2 py-1 text-xs border rounded text-gray-900';
  if (isInvalid) {
    classes += ' border-red-500 bg-red-50';
  } else if (required && !value) {
    classes += ' border-yellow-500 bg-yellow-50';
  } else {
    classes += ' border-gray-300';
  }
  return classes;
}

export function ManualInputTable({ onSubmit, onCancel, isSubmitting }: ManualInputTableProps) {
  const [rows, setRows] = useState<ManualInputRow[]>([
    {
      weekStart: '',
      sessions: '',
      totalUsers: '',
      paidClicks: '',
      unpaidSessions: '',
      newUsers: '',
      newUsersPct: '',
      leadsGenerated: '',
      weeklyGains: '',
      blogSessions: '',
      blogTotalUsers: '',
      blogNewUsers: '',
      blogNewUsersPct: '',
      aiSessions: '',
      aiTotalUsers: '',
      sitePageViews: '',
      siteSessions: '',
      siteActiveUsers: '',
    },
  ]);

  const errors = useMemo(() => {
    const allErrors: string[] = [];
    rows.forEach((row, idx) => {
      allErrors.push(...getErrorMessage(row, idx));
    });
    return allErrors;
  }, [rows]);

  const handleChange = (index: number, key: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [key]: value };
    setRows(newRows);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        weekStart: '',
        sessions: '',
        totalUsers: '',
        paidClicks: '',
        unpaidSessions: '',
        newUsers: '',
        newUsersPct: '',
        leadsGenerated: '',
        weeklyGains: '',
        blogSessions: '',
        blogTotalUsers: '',
        blogNewUsers: '',
        blogNewUsersPct: '',
        aiSessions: '',
        aiTotalUsers: '',
        sitePageViews: '',
        siteSessions: '',
        siteActiveUsers: '',
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (errors.length > 0) {
      alert(`Corrija os erros antes de salvar:\n\n${errors.join('\n')}`);
      return;
    }
    onSubmit(rows);
  };

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Inserir Dados Manualmente</h3>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm font-medium text-red-900 mb-2">
                {errors.length} erro(s) encontrado(s):
              </p>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-xs text-red-800">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto mb-4 rounded border border-gray-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-8 border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">#</th>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                      style={{ width: col.width }}
                    >
                      <div>
                        <div>{col.label}</div>
                        {col.required && <span className="text-red-600 text-[10px] font-normal">obrigatório</span>}
                      </div>
                    </th>
                  ))}
                  <th className="w-12 border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => {
                  const rowErrors = getErrorMessage(row, rowIdx);
                  return (
                    <tr
                      key={rowIdx}
                      className={rowErrors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}
                    >
                      <td className="border border-gray-200 px-2 py-2 text-gray-600 font-medium">{rowIdx + 1}</td>

                      {COLUMNS.map(col => {
                        const value = row[col.key as keyof ManualInputRow] || '';
                        const isInvalid = rowErrors.some(e => e.includes(col.label));

                        return (
                          <td key={col.key} className="border border-gray-200 px-1 py-1">
                            <input
                              type="text"
                              value={value}
                              onChange={e => handleChange(rowIdx, col.key, e.target.value)}
                              placeholder={col.required ? '(obr.)' : '(opt.)'}
                              className={getInputClass(String(value), col.required, isInvalid)}
                            />
                          </td>
                        );
                      })}

                      <td className="border border-gray-200 px-2 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIdx)}
                          disabled={isSubmitting}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          title="Deletar linha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            disabled={isSubmitting}
            className="mb-4 px-3 py-2 text-xs bg-gray-100 text-gray-900 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus size={14} />
            Adicionar Semana
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rows.length === 0 || errors.length > 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              {isSubmitting ? 'Salvando...' : 'Salvar Dados'}
            </button>

            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-900 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
