import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { AnnotatedChart } from '../components/AnnotatedChart';
import { api } from '../lib/api';
import { RefreshCw, Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

// --- Types ---
interface BudgetItem {
  id: number;
  section: string;
  strategy: string | null;
  expenseType: string | null;
  name: string;
  year: number;
  month: number;
  planned: number;
  actual: number;
}

// --- Helpers ---
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString('pt-BR');
const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

const SECTIONS = ['Headcount', 'Ferramentas', 'Eventos', 'Mídia', 'Viagens', 'Brindes & Promo', 'Terceiros'];
const isSensitiveRow = (name: string, section: string) =>
  section === 'Headcount' || /head|salário/i.test(name);
const SAVINGS_START = '2025-09'; // Savings only count from Sep 2025 onwards
const SECTION_COLORS: Record<string, string> = {
  'Headcount': '#3b82f6',
  'Ferramentas': '#10b981',
  'Eventos': '#f59e0b',
  'Mídia': '#8b5cf6',
  'Viagens': '#ef4444',
  'Brindes & Promo': '#ec4899',
  'Terceiros': '#06b6d4',
};

// Color badges for tags
const TAG_PALETTES = {
  section: SECTION_COLORS,
  strategy: {} as Record<string, string>,
  type: {} as Record<string, string>,
};
const STRAT_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
const TYPE_PALETTE = ['#0ea5e9', '#14b8a6', '#eab308', '#a855f7', '#f43f5e', '#d946ef', '#22d3ee', '#65a30d', '#fb923c', '#818cf8'];

function getTagColor(value: string, kind: 'section' | 'strategy' | 'type', allValues: string[]): string {
  if (kind === 'section') return SECTION_COLORS[value] || '#9ca3af';
  const palette = kind === 'strategy' ? STRAT_PALETTE : TYPE_PALETTE;
  const idx = allValues.indexOf(value);
  return idx >= 0 ? palette[idx % palette.length] : '#9ca3af';
}

function TagBadge({ value, color }: { value: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>
      {value}
    </span>
  );
}

function delta(curr: number, prev: number): string {
  if (prev === 0) return '';
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(curr: number, prev: number): string {
  if (prev === 0) return 'text-gray-400';
  return curr >= prev ? 'text-green-600' : 'text-red-600';
}

function condStyle(val: number, min: number, max: number): React.CSSProperties {
  if (max === min || val === 0) return {};
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return { backgroundColor: `rgba(34, 197, 94, ${0.05 + ratio * 0.25})` };
}

// --- Time period ---
type TimePeriod = 'all' | 'last_30' | 'this_month' | 'last_month' | 'this_year';
const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: 'Todo o período' },
  { value: 'last_30', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'this_year', label: 'Este ano' },
];

function getMonthRange(period: TimePeriod): { startYear: number; startMonth: number; endYear: number; endMonth: number } | null {
  if (period === 'all') return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  switch (period) {
    case 'last_30':
    case 'this_month':
      return { startYear: y, startMonth: m, endYear: y, endMonth: m };
    case 'last_month': {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      return { startYear: py, startMonth: pm, endYear: py, endMonth: pm };
    }
    case 'this_year':
      return { startYear: y, startMonth: 1, endYear: y, endMonth: 12 };
    default: return null;
  }
}

// --- Sort hook ---
function useSort<T>(data: T[], defaultKey: string) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortAsc, setSortAsc] = useState(true);
  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const an = av == null ? '' : typeof av === 'number' ? av : String(av);
      const bn = bv == null ? '' : typeof bv === 'number' ? bv : String(bv);
      if (an < bn) return sortAsc ? -1 : 1;
      if (an > bn) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortAsc]);
  const SH = ({ k, label }: { k: string; label: string }) => (
    <th className="text-center py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
  return { sorted, SH };
}

// --- Form Modal ---
interface FormData {
  section: string;
  strategy: string;
  expenseType: string;
  name: string;
  year: string;
  month: string;
  planned: string;
  actual: string;
}

const emptyForm: FormData = {
  section: '', strategy: '', expenseType: '', name: '',
  year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1),
  planned: '', actual: '',
};

function ComboInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  const [showList, setShowList] = useState(false);
  const filtered = options.filter(o => !value || o.toLowerCase().includes(value.toLowerCase()));
  return (
    <div className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 200)}
        className={inputCls} placeholder={placeholder || 'Digite ou selecione...'} />
      {showList && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button" onMouseDown={() => { onChange(o); setShowList(false); }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetItemFormModal({ initial, editId, onClose, onSaved, strategies, expenseTypes, itemNames }: {
  initial: FormData; editId: number | null;
  onClose: () => void; onSaved: () => void;
  strategies: string[]; expenseTypes: string[]; itemNames: string[];
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.section || !form.name) return;
    setSaving(true);
    const payload = {
      section: form.section,
      strategy: form.strategy || null,
      expenseType: form.expenseType || null,
      name: form.name,
      year: +form.year,
      month: +form.month,
      planned: +form.planned || 0,
      actual: +form.actual || 0,
    };
    if (editId) await api.put(`/budget-items/${editId}`, payload);
    else await api.post('/budget-items', payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editId ? 'Editar Item' : 'Novo Item de Custo'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Seção *</label>
            <select required value={form.section} onChange={set('section')} className={inputCls}>
              <option value="">Selecione...</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Custo com (Item) *</label>
            <ComboInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} options={itemNames} placeholder="Digite ou selecione item..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estratégia</label>
              <ComboInput value={form.strategy} onChange={v => setForm(f => ({ ...f, strategy: v }))} options={strategies} placeholder="Digite ou selecione..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Gasto</label>
              <ComboInput value={form.expenseType} onChange={v => setForm(f => ({ ...f, expenseType: v }))} options={expenseTypes} placeholder="Digite ou selecione..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
              <select value={form.year} onChange={set('year')} className={inputCls}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mês</label>
              <select value={form.month} onChange={set('month')} className={inputCls}>
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Previsto (R$)</label>
              <input type="number" step="0.01" min="0" value={form.planned} onChange={set('planned')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Realizado (R$)</label>
              <input type="number" step="0.01" min="0" value={form.actual} onChange={set('actual')} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Editable Cell ---
function EditableCell({ value, options, onSave, align = 'center', bold = false, tagColor }: {
  value: string; options: string[]; onSave: (v: string) => void; align?: 'left' | 'center'; bold?: boolean; tagColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <td className={`py-1 px-1 ${align === 'left' ? 'text-left' : 'text-center'}`}>
        <ComboInput value={draft} onChange={setDraft} options={options} placeholder="Digite..." />
        <div className="flex gap-1 mt-1 justify-center">
          <button onClick={() => { onSave(draft); setEditing(false); }}
            className="text-[10px] px-1.5 py-0.5 bg-gray-900 text-white rounded">OK</button>
          <button onClick={() => { setDraft(value); setEditing(false); }}
            className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded text-gray-600">✕</button>
        </div>
      </td>
    );
  }

  return (
    <td className={`py-2 px-2 ${align === 'left' ? 'text-left' : 'text-center'} whitespace-nowrap cursor-pointer hover:bg-blue-50 group`}
      onClick={() => { setDraft(value); setEditing(true); }}>
      {tagColor && value ? (
        <TagBadge value={value} color={tagColor} />
      ) : (
        <span className={`group-hover:underline group-hover:decoration-dotted ${bold ? 'font-medium text-gray-700' : 'text-gray-600'}`}>{value || '—'}</span>
      )}
    </td>
  );
}

// Inline editable money cell — click to edit the value
function EditableMoneyCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || ''));

  if (editing) {
    return (
      <td className="py-1 px-1 text-center">
        <input type="number" step="0.01" min="0" value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(Number(draft) || 0); setEditing(false); }
            if (e.key === 'Escape') { setDraft(String(value || '')); setEditing(false); }
          }}
          autoFocus
          className="w-24 border border-blue-400 rounded px-1.5 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </td>
    );
  }

  return (
    <td className="py-2 px-2 text-center text-gray-900 whitespace-nowrap cursor-pointer hover:bg-blue-50"
      onClick={() => { setDraft(String(value || '')); setEditing(true); }}>
      {value > 0 ? fmtMoney(value) : '—'}
    </td>
  );
}

// --- Main Page ---
export function Budget() {
  const [allData, setAllData] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [filterSection, setFilterSection] = useState<string>('Todos');
  const [filterStrategy, setFilterStrategy] = useState<string>('Todos');
  const [filterExpenseType, setFilterExpenseType] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<string>('Todos');
  const [showHC, setShowHC] = useState(true);
  const [tableView, setTableView] = useState<'monthly' | 'quarterly'>('monthly');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({});
  const [showPrevYears, setShowPrevYears] = useState(false);
  const [hiddenBars, setHiddenBars] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<BudgetItem[]>('/budget-items');
    setAllData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/budget-items/sync', {});
      setLastSync(`${result.imported} registros sincronizados`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  // Unique values for filters
  const strategies = useMemo(() => {
    const set = new Set<string>();
    allData.forEach(d => { if (d.strategy) set.add(d.strategy); });
    return [...set].sort();
  }, [allData]);

  const expenseTypes = useMemo(() => {
    const set = new Set<string>();
    allData.forEach(d => { if (d.expenseType) set.add(d.expenseType); });
    return [...set].sort();
  }, [allData]);

  const itemNames = useMemo(() => {
    const set = new Set<string>();
    allData.forEach(d => { if (d.name) set.add(d.name); });
    return [...set].sort();
  }, [allData]);

  const [filterName, setFilterName] = useState<string>('Todos');

  // Filter data
  const monthRange = useMemo(() => getMonthRange(timePeriod), [timePeriod]);

  // Exclude "Total X" summary rows to avoid double-counting
  const isNotTotalRow = (d: BudgetItem) => !d.name.startsWith('Total ') && d.name !== 'Grand Total Mkt';
  const costItems = useMemo(() => allData.filter(d => d.section !== 'Budget' && isNotTotalRow(d)), [allData]);
  const costItemsExclHC = useMemo(() => allData.filter(d => d.section !== 'Budget' && d.section !== 'Headcount' && isNotTotalRow(d)), [allData]);
  const budgetLineItems = useMemo(() => allData.filter(d => d.section === 'Budget'), [allData]);

  const filtered = useMemo(() => {
    let items = costItems;
    if (monthRange) {
      items = items.filter(d => {
        const ym = d.year * 100 + d.month;
        const start = monthRange.startYear * 100 + monthRange.startMonth;
        const end = monthRange.endYear * 100 + monthRange.endMonth;
        return ym >= start && ym <= end;
      });
    }
    if (filterSection !== 'Todos') items = items.filter(d => d.section === filterSection);
    if (filterStrategy !== 'Todos') items = items.filter(d => d.strategy === filterStrategy);
    if (filterExpenseType !== 'Todos') items = items.filter(d => d.expenseType === filterExpenseType);
    if (filterName !== 'Todos') items = items.filter(d => d.name === filterName);
    if (activeTab !== 'Todos') items = items.filter(d => d.section === activeTab);
    return items;
  }, [costItems, monthRange, filterSection, filterStrategy, filterExpenseType, filterName, activeTab]);

  const filteredBudget = useMemo(() => {
    let items = budgetLineItems;
    if (monthRange) {
      items = items.filter(d => {
        const ym = d.year * 100 + d.month;
        const start = monthRange.startYear * 100 + monthRange.startMonth;
        const end = monthRange.endYear * 100 + monthRange.endMonth;
        return ym >= start && ym <= end;
      });
    }
    return items;
  }, [budgetLineItems, monthRange]);

  // KPIs
  const totalGasto = filtered.reduce((s, d) => s + d.actual, 0);
  // Only count budget from SAVINGS_START onwards
  const totalOrcamento = filteredBudget.filter(d => `${d.year}-${String(d.month).padStart(2, '0')}` >= SAVINGS_START).reduce((s, d) => s + d.planned, 0);
  // Savings: only sum cost from months >= SAVINGS_START, excluding Headcount (matches spreadsheet Grand Total Mkt)
  const gastoFromSavingsStart = costItemsExclHC.filter(d => {
    const ym = `${d.year}-${String(d.month).padStart(2, '0')}`;
    return ym >= SAVINGS_START && (!monthRange || (d.year * 100 + d.month >= monthRange.startYear * 100 + monthRange.startMonth && d.year * 100 + d.month <= monthRange.endYear * 100 + monthRange.endMonth));
  }).reduce((s, d) => s + d.actual, 0);
  const savings = totalOrcamento - gastoFromSavingsStart;
  const activeItems = new Set(filtered.map(d => d.name)).size;

  // Detail table: year selector (must be before savingsAcumulado which depends on it)
  const currentYear = new Date().getFullYear();
  const [detailYear, setDetailYear] = useState(currentYear);
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    filtered.forEach(d => set.add(d.year));
    return [...set].sort();
  }, [filtered]);

  // Savings acumulado: resets each year — shows accumulated for detailYear only
  const savingsAcumulado = useMemo(() => {
    const allMonths = new Set<string>();
    costItemsExclHC.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    budgetLineItems.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    const yearStart = `${detailYear}-01`;
    const savingsStart = detailYear <= 2025 ? SAVINGS_START : yearStart;
    const sortedMonths = [...allMonths].sort().filter(ym => ym >= savingsStart && ym.startsWith(String(detailYear)));

    let cumSavings = 0;
    for (const ym of sortedMonths) {
      const [y, m] = ym.split('-').map(Number);
      const monthCost = costItemsExclHC.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.actual, 0);
      const monthBudget = budgetLineItems.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.planned, 0);
      cumSavings += (monthBudget - monthCost);
    }
    return cumSavings;
  }, [costItemsExclHC, budgetLineItems, detailYear]);

  // Detail filtered by year (used by charts, tables, breakdowns)
  const detailFiltered = useMemo(() => filtered.filter(d => d.year === detailYear), [filtered, detailYear]);

  // Budget & savings per month for detailYear (excl Headcount, from SAVINGS_START)
  // Savings acumulado zera a cada virada de ano
  const monthBudgetSavings = useMemo(() => {
    const result: Record<string, { budget: number; gasto: number; savings: number; savingsAcum: number }> = {};
    let cumSavings = 0;
    const allMonths = new Set<string>();
    costItemsExclHC.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    budgetLineItems.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    const sorted = [...allMonths].sort().filter(ym => ym >= SAVINGS_START);
    for (const ym of sorted) {
      const [y, m] = ym.split('-').map(Number);
      // Reset cumulative at start of each year (or start of savings period)
      if (m === 1 || (y === 2025 && m === 9)) cumSavings = 0;
      const mc = costItemsExclHC.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.actual, 0);
      const mb = budgetLineItems.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.planned, 0);
      const ms = mb - mc;
      cumSavings += ms;
      if (y === detailYear) {
        result[ym] = { budget: mb, gasto: mc, savings: ms, savingsAcum: cumSavings };
      }
    }
    return result;
  }, [costItemsExclHC, budgetLineItems, detailYear]);

  // Month and quarter keys (must be before chart data that uses them)
  const monthKeys = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${detailYear}-${String(i + 1).padStart(2, '0')}`);
  }, [detailYear]);

  const quarterKeys = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterMonths: Record<string, string[]> = {
    Q1: monthKeys.filter(mk => ['01', '02', '03'].includes(mk.slice(5))),
    Q2: monthKeys.filter(mk => ['04', '05', '06'].includes(mk.slice(5))),
    Q3: monthKeys.filter(mk => ['07', '08', '09'].includes(mk.slice(5))),
    Q4: monthKeys.filter(mk => ['10', '11', '12'].includes(mk.slice(5))),
  };
  const sumQuarter = (months: Record<string, number>, qk: string) =>
    (quarterMonths[qk] || []).reduce((s, mk) => s + (months[mk] || 0), 0);

  // Chart data: stacked bar by section/month
  const stackedBarData = useMemo(() => {
    if (tableView === 'quarterly') {
      // Aggregate by quarter
      return quarterKeys.map(qk => {
        const row: Record<string, unknown> = { name: `${qk} ${detailYear}` };
        SECTIONS.forEach(s => {
          const qMonths = quarterMonths[qk] || [];
          (row as Record<string, number>)[s] = detailFiltered
            .filter(d => { const mk = `${d.year}-${String(d.month).padStart(2, '0')}`; return qMonths.includes(mk) && d.section === s; })
            .reduce((sum, d) => sum + d.actual, 0);
        });
        return row;
      });
    }
    const map = new Map<string, Record<string, number>>();
    detailFiltered.forEach(d => {
      const key = `${MONTHS[d.month]} ${d.year}`;
      const sortKey = `${d.year}-${String(d.month).padStart(2, '0')}`;
      if (!map.has(sortKey)) {
        const row: Record<string, number> = { sortKey: 0 };
        (row as Record<string, unknown>)['name'] = key;
        (row as Record<string, unknown>)['_sort'] = sortKey;
        SECTIONS.forEach(s => row[s] = 0);
        map.set(sortKey, row);
      }
      const row = map.get(sortKey)!;
      row[d.section] = (row[d.section] || 0) + d.actual;
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [detailFiltered, tableView, detailYear, quarterKeys, quarterMonths]);

  // Breakdown tiles: by section, strategy, expense type — uses detailYear
  const bySection = useMemo(() => {
    const map = new Map<string, number>();
    detailFiltered.forEach(d => map.set(d.section, (map.get(d.section) || 0) + d.actual));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [detailFiltered]);

  const byStrategy = useMemo(() => {
    const map = new Map<string, number>();
    detailFiltered.forEach(d => { const k = d.strategy || 'Sem estratégia'; map.set(k, (map.get(k) || 0) + d.actual); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [detailFiltered]);

  const byExpenseType = useMemo(() => {
    const map = new Map<string, number>();
    detailFiltered.forEach(d => { const k = d.expenseType || 'Sem tipo'; map.set(k, (map.get(k) || 0) + d.actual); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const STRATEGY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
  const TYPE_COLORS = ['#0ea5e9', '#14b8a6', '#eab308', '#a855f7', '#f43f5e', '#d946ef', '#22d3ee', '#65a30d', '#fb923c', '#818cf8'];

  // Savings line chart data (only from SAVINGS_START, excl Headcount, filtered by detailYear)
  // Savings chart: cumulative resets each year — supports monthly/quarterly view
  const savingsChartData = useMemo(() => {
    const allMonths = new Set<string>();
    costItemsExclHC.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    budgetLineItems.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    const sortedMonths = [...allMonths].sort().filter(ym => ym >= SAVINGS_START && ym.startsWith(String(detailYear)));

    // Build monthly first
    let cumSavings = 0;
    const monthlyPoints = sortedMonths.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const monthCost = costItemsExclHC.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.actual, 0);
      const monthBudget = budgetLineItems.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.planned, 0);
      const monthSavings = monthBudget - monthCost;
      cumSavings += monthSavings;
      return { ym, name: `${MONTHS[m]} ${y}`, Gasto: monthCost, Savings: monthSavings, Orçamento: monthBudget, 'Savings Acum.': cumSavings };
    });

    if (tableView === 'quarterly') {
      return quarterKeys.map(qk => {
        const qms = quarterMonths[qk] || [];
        const points = monthlyPoints.filter(p => qms.includes(p.ym));
        const gasto = points.reduce((s, p) => s + p.Gasto, 0);
        const orc = points.reduce((s, p) => s + p.Orçamento, 0);
        const savings = orc - gasto;
        const lastPoint = points[points.length - 1];
        return { name: `${qk} ${detailYear}`, Gasto: gasto, Savings: savings, Orçamento: orc, 'Savings Acum.': lastPoint?.['Savings Acum.'] ?? 0 };
      });
    }

    return monthlyPoints;
  }, [costItemsExclHC, budgetLineItems, detailYear, tableView, quarterKeys, quarterMonths]);

  // Aggregated: by item across months (for detail table) — filtered by detailYear
  interface ItemRow {
    name: string;
    section: string;
    strategy: string;
    expenseType: string;
    total: number;
    months: Record<string, number>;
  }

  const itemRows = useMemo(() => {
    const map = new Map<string, ItemRow>();
    detailFiltered.forEach(d => {
      const key = `${d.section}|${d.name}`;
      if (!map.has(key)) {
        map.set(key, {
          name: d.name,
          section: d.section,
          strategy: d.strategy || '',
          expenseType: d.expenseType || '',
          total: 0,
          months: {},
        });
      }
      const row = map.get(key)!;
      const mKey = `${d.year}-${String(d.month).padStart(2, '0')}`;
      row.months[mKey] = (row.months[mKey] || 0) + d.actual;
      row.total += d.actual;
    });
    return [...map.values()].sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
  }, [detailFiltered]);

  // Section summary — uses detailYear
  interface SectionRow {
    section: string;
    total: number;
    months: Record<string, number>;
  }
  const sectionRows = useMemo(() => {
    const map = new Map<string, SectionRow>();
    detailFiltered.forEach(d => {
      if (!map.has(d.section)) {
        map.set(d.section, { section: d.section, total: 0, months: {} });
      }
      const row = map.get(d.section)!;
      const mKey = `${d.year}-${String(d.month).padStart(2, '0')}`;
      row.months[mKey] = (row.months[mKey] || 0) + d.actual;
      row.total += d.actual;
    });
    return [...map.values()].sort((a, b) => a.section.localeCompare(b.section));
  }, [detailFiltered]);

  // Savings table data
  interface SavingsRow {
    label: string;
    sortKey: string;
    budget: number;
    gasto: number;
    savings: number;
    savingsAcum: number;
  }
  // Savings acumulado zera a cada ano
  const savingsTableData = useMemo(() => {
    const allMonths = new Set<string>();
    costItemsExclHC.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    budgetLineItems.forEach(d => allMonths.add(`${d.year}-${String(d.month).padStart(2, '0')}`));
    const sortedMonths = [...allMonths].sort().filter(ym => ym >= SAVINGS_START && ym.startsWith(String(detailYear)));

    // Cumulative resets each year — no carry-over from previous years
    let cumSavings = 0;

    return sortedMonths.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const monthCost = costItemsExclHC.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.actual, 0);
      const monthBudget = budgetLineItems.filter(d => d.year === y && d.month === m).reduce((s, d) => s + d.planned, 0);
      const monthSavings = monthBudget - monthCost;
      cumSavings += monthSavings;
      return {
        label: `${MONTHS[m]} ${y}`,
        sortKey: ym,
        budget: monthBudget,
        gasto: monthCost,
        savings: monthSavings,
        savingsAcum: cumSavings,
      };
    });
  }, [costItemsExclHC, budgetLineItems, detailYear]);

  const { sorted: sortedSavings, SH: SavSH } = useSort<SavingsRow>(savingsTableData, 'sortKey');

  // Col min/max for conditional formatting on detail table
  const detailColMinMax = useMemo(() => {
    const vals = itemRows.map(r => r.total).filter(v => v > 0);
    return { min: Math.min(...vals, 0), max: Math.max(...vals, 0) };
  }, [itemRows]);

  // CRUD
  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este item?')) return;
    await api.del(`/budget-items/${id}`);
    fetchData();
  };

  const openEdit = (item: BudgetItem) => { setEditItem(item); setShowForm(true); };
  const openCreate = () => { setEditItem(null); setShowForm(true); };
  const onSaved = () => { setShowForm(false); setEditItem(null); fetchData(); };

  // Inline edit: update all entries for a given item name+section
  const updateItemMeta = async (oldName: string, oldSection: string, field: 'name' | 'section' | 'strategy' | 'expenseType', newValue: string) => {
    const itemsToUpdate = allData.filter(d => d.name === oldName && d.section === oldSection);
    for (const item of itemsToUpdate) {
      await api.put(`/budget-items/${item.id}`, { ...item, [field]: newValue || null });
    }
    fetchData();
  };

  // Update a specific month's actual value for an item
  const updateItemMonthValue = async (itemName: string, itemSection: string, yearMonth: string, newValue: number) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const existing = allData.find(d => d.name === itemName && d.section === itemSection && d.year === y && d.month === m);
    if (existing) {
      await api.put(`/budget-items/${existing.id}`, { ...existing, actual: newValue });
    } else {
      // Create new entry for this month
      const template = allData.find(d => d.name === itemName && d.section === itemSection);
      if (template) {
        await api.post('/budget-items', {
          section: template.section, strategy: template.strategy, expenseType: template.expenseType,
          name: template.name, year: y, month: m, planned: 0, actual: newValue,
        });
      }
    }
    fetchData();
  };

  // Budget months for editor: generate Jan-Dec for 2025 and 2026
  const budgetMonthsForEditor = useMemo(() => {
    const months: { year: number; month: number; key: string; label: string; item: BudgetItem | null }[] = [];
    for (const y of [2025, 2026]) {
      for (let m = 1; m <= 12; m++) {
        const item = budgetLineItems.find(d => d.year === y && d.month === m) || null;
        months.push({ year: y, month: m, key: `${y}-${m}`, label: `${MONTHS[m]} ${y}`, item });
      }
    }
    return months;
  }, [budgetLineItems]);

  const openBudgetEditor = () => {
    const edits: Record<string, string> = {};
    budgetMonthsForEditor.forEach(bm => {
      edits[bm.key] = bm.item ? String(bm.item.planned) : '';
    });
    setBudgetEdits(edits);
    setShowBudgetEditor(true);
  };

  const saveBudgetEdits = async () => {
    for (const bm of budgetMonthsForEditor) {
      const val = parseFloat(budgetEdits[bm.key] || '0') || 0;
      if (bm.item) {
        if (bm.item.planned !== val) {
          await api.put(`/budget-items/${bm.item.id}`, { ...bm.item, planned: val });
        }
      } else if (val > 0) {
        await api.post('/budget-items', {
          section: 'Budget', strategy: null, expenseType: null,
          name: 'Total Budget', year: bm.year, month: bm.month,
          planned: val, actual: 0,
        });
      }
    }
    setShowBudgetEditor(false);
    fetchData();
  };

  // Tab labels
  const tabLabels = ['Todos', ...SECTIONS];

  return (
    <div>
      <PageHeader title="Orçamento" description="Controle de custos, investimentos e savings"
        actions={
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
          </div>
        }
      />

      {/* Time Filter */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-white rounded-lg border border-gray-200">
        {PERIOD_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setTimePeriod(o.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timePeriod === o.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className={`grid grid-cols-2 md:grid-cols-3 ${activeTab === 'Todos' ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-3 mb-6`}>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Gasto</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalGasto)}</p>
            </Card>
            {activeTab === 'Todos' && (
              <>
                <Card className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Orçamento</p>
                  <p className="text-xs text-gray-400 mt-0.5">a partir de Set/2025</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalOrcamento)}</p>
                </Card>
                <Card className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase">Savings</p>
                  <p className="text-xs text-gray-400 mt-0.5">a partir de Set/2025</p>
                  <p className={`text-2xl font-semibold mt-1 ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(savings)}</p>
                </Card>
                <Card className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase">Savings Acumulado</p>
                  <p className="text-xs text-gray-400 mt-0.5">ano {detailYear}</p>
                  <p className={`text-2xl font-semibold mt-1 ${savingsAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(savingsAcumulado)}</p>
                </Card>
              </>
            )}
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase"># Items ativos</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(activeItems)}</p>
            </Card>
          </div>

          {/* Monthly Budget Editor */}
          <CollapsibleCard title="Orçamento Mensal" subtitle="Defina o orçamento disponível mês a mês" className="mb-6"
            actions={
              !showBudgetEditor ? (
                <button onClick={openBudgetEditor}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
                  <Pencil size={14} /> Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowBudgetEditor(false)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button onClick={saveBudgetEdits}
                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">Salvar</button>
                </div>
              )
            }>
            <div className="overflow-x-auto">
              {/* Current year */}
              {(() => {
                const currentYear = new Date().getFullYear();
                const renderYear = (yr: number) => (
                  <div key={yr} className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{yr}</h4>
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                      {budgetMonthsForEditor.filter(bm => bm.year === yr).map(bm => (
                        <div key={bm.key} className="text-center">
                          <p className="text-[10px] font-medium text-gray-400 mb-1">{MONTHS[bm.month]}</p>
                          {showBudgetEditor ? (
                            <input type="number" step="1000" min="0"
                              value={budgetEdits[bm.key] || ''}
                              onChange={e => setBudgetEdits(prev => ({ ...prev, [bm.key]: e.target.value }))}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs text-center" />
                          ) : (
                            <p className={`text-sm font-semibold ${bm.item && bm.item.planned > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                              {bm.item && bm.item.planned > 0 ? fmtMoney(bm.item.planned) : '—'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-xs text-gray-500">Total {yr}: </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {fmtMoney(budgetMonthsForEditor.filter(bm => bm.year === yr).reduce((s, bm) => {
                          if (showBudgetEditor) return s + (parseFloat(budgetEdits[bm.key] || '0') || 0);
                          return s + (bm.item?.planned ?? 0);
                        }, 0))}
                      </span>
                    </div>
                  </div>
                );
                const prevYears = [2025].filter(y => y < currentYear);
                return (
                  <>
                    {renderYear(currentYear)}
                    {prevYears.length > 0 && (
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <button onClick={() => setShowPrevYears(!showPrevYears)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1">
                          {showPrevYears ? '▾' : '▸'} Anos anteriores ({prevYears.join(', ')})
                        </button>
                        {showPrevYears && prevYears.map(yr => renderYear(yr))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CollapsibleCard>

          {/* Filters */}
          <div className="flex items-end gap-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seção</label>
              <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estratégia</label>
              <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Gasto</label>
              <select value={filterExpenseType} onChange={e => setFilterExpenseType(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {expenseTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Custo com</label>
              <select value={filterName} onChange={e => setFilterName(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {itemNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-1 mb-6 p-2 bg-white rounded-lg border border-gray-200 overflow-x-auto">
            {tabLabels.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${activeTab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t === 'Brindes & Promo' ? 'Brindes' : t}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">Gráficos — {detailYear}</h3>
            <div className="flex gap-1">
              {availableYears.map(y => (
                <button key={y} onClick={() => setDetailYear(y)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${detailYear === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Stacked bar */}
            <Card className="min-h-48">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Gasto por Seção/Mês</h3>
              {stackedBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stackedBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(value) => fmtMoney(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
                      onClick={(e: { dataKey?: string }) => {
                        if (!e.dataKey) return;
                        setHiddenBars(prev => { const n = new Set(prev); if (n.has(e.dataKey!)) n.delete(e.dataKey!); else n.add(e.dataKey!); return n; });
                      }}
                      formatter={(value: string, entry: { dataKey?: string }) => (
                        <span style={{ color: hiddenBars.has(entry.dataKey ?? '') ? '#ccc' : undefined, cursor: 'pointer', fontSize: 11, textDecoration: hiddenBars.has(entry.dataKey ?? '') ? 'line-through' : undefined }}>{value}</span>
                      )}
                    />
                    {SECTIONS.map(s => (
                      <Bar key={s} dataKey={s} stackId="a" fill={SECTION_COLORS[s]} hide={hiddenBars.has(s)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes para o gráfico</p>
              )}
            </Card>

            {/* Savings line chart - only when Todos */}
            {activeTab === 'Todos' && (
              <AnnotatedChart
                title="Savings Mensal (a partir de Set/2025)"
                data={savingsChartData}
                xKey="name"
                lines={[
                  { dataKey: 'Gasto', color: '#ef4444', name: 'Gasto' },
                  { dataKey: 'Orçamento', color: '#3b82f6', name: 'Orçamento' },
                  { dataKey: 'Savings', color: '#10b981', name: 'Savings' },
                  { dataKey: 'Savings Acum.', color: '#f59e0b', name: 'Savings Acum.' },
                ]}
                page="budget"
                chartKey="savings"
                height={250}
              />
            )}
          </div>

          {/* Charts row 2: by strategy and by type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="min-h-48">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Gasto por Estratégia</h3>
              {byStrategy.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byStrategy} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtMoney(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(value) => fmtMoney(Number(value))} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {byStrategy.map((_, i) => (
                        <Cell key={i} fill={STRATEGY_COLORS[i % STRATEGY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes</p>}
            </Card>
            <Card className="min-h-48">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Gasto por Tipo de Gasto</h3>
              {byExpenseType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byExpenseType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtMoney(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                    <Tooltip formatter={(value) => fmtMoney(Number(value))} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {byExpenseType.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes</p>}
            </Card>
          </div>

          {/* Breakdown Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="min-w-0">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Gasto por Seção</h3>
              <div className="space-y-2">
                {bySection.map(item => {
                  const hcBlur = item.name === 'Headcount' && !showHC;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTION_COLORS[item.name] || '#999' }} />
                        <span className="text-xs text-gray-700 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900" style={hcBlur ? { filter: 'blur(6px)', userSelect: 'none' } : {}}>{fmtMoney(item.value)}</span>
                    </div>
                  );
                })}
                {bySection.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
              </div>
            </Card>
            <Card className="min-w-0">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Gasto por Estratégia</h3>
              <div className="space-y-2">
                {byStrategy.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STRATEGY_COLORS[i % STRATEGY_COLORS.length] }} />
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{fmtMoney(item.value)}</span>
                  </div>
                ))}
                {byStrategy.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
              </div>
            </Card>
            <Card className="min-w-0">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Gasto por Tipo</h3>
              <div className="space-y-2">
                {byExpenseType.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{fmtMoney(item.value)}</span>
                  </div>
                ))}
                {byExpenseType.length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
              </div>
            </Card>
          </div>

          {/* Filters before detail table */}
          <div className="flex items-end gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seção</label>
              <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estratégia</label>
              <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Gasto</label>
              <select value={filterExpenseType} onChange={e => setFilterExpenseType(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {expenseTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Custo com</label>
              <select value={filterName} onChange={e => setFilterName(e.target.value)} className={inputCls}>
                <option value="Todos">Todos</option>
                {itemNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Detail Table */}
          <CollapsibleCard title="Detalhamento por Item" className="mb-6"
            actions={
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                  <button onClick={() => setTableView('monthly')}
                    className={`px-2 py-1 text-[10px] font-medium rounded ${tableView === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    Mensal
                  </button>
                  <button onClick={() => setTableView('quarterly')}
                    className={`px-2 py-1 text-[10px] font-medium rounded ${tableView === 'quarterly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    Trimestral
                  </button>
                </div>
                <div className="flex gap-1">
                  {availableYears.map(y => (
                    <button key={y} onClick={() => setDetailYear(y)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${detailYear === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {y}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowHC(!showHC)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                  title={showHC ? 'Ocultar Headcount/Salários' : 'Revelar Headcount/Salários'}>
                  {showHC ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showHC ? 'Ocultar HC' : 'Revelar HC'}
                </button>
                <button onClick={openCreate}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Item</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Seção</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Estratégia</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Tipo</th>
                    {tableView === 'monthly' ? monthKeys.map(mk => {
                      const [y, m] = mk.split('-').map(Number);
                      return (
                        <th key={mk} className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">
                          {MONTHS[m]} {y}
                        </th>
                      );
                    }) : quarterKeys.map(qk => (
                      <th key={qk} className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">
                        {qk} {detailYear}
                      </th>
                    ))}
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Total</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs whitespace-nowrap">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.length === 0 ? (
                    <tr><td colSpan={4 + (tableView === 'monthly' ? monthKeys.length : 4) + 2} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : itemRows.map((r, ri) => {
                    const colVals = tableView === 'monthly'
                      ? monthKeys.map(mk => r.months[mk] || 0)
                      : quarterKeys.map(qk => sumQuarter(r.months, qk));
                    const colKeys = tableView === 'monthly' ? monthKeys : quarterKeys;
                    const prevTotal = ri > 0 ? itemRows[ri - 1].total : 0;
                    const sensitive = isSensitiveRow(r.name, r.section);
                    const blurStyle = sensitive && !showHC ? { filter: 'blur(6px)', userSelect: 'none' as const } : {};
                    return (
                      <tr key={`${r.section}-${r.name}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <EditableCell value={r.name} options={itemNames} onSave={v => updateItemMeta(r.name, r.section, 'name', v)} align="left" bold />
                        <EditableCell value={r.section} options={SECTIONS} onSave={v => updateItemMeta(r.name, r.section, 'section', v)} tagColor={getTagColor(r.section, 'section', SECTIONS)} />
                        <EditableCell value={r.strategy} options={strategies} onSave={v => updateItemMeta(r.name, r.section, 'strategy', v)} tagColor={r.strategy ? getTagColor(r.strategy, 'strategy', strategies) : undefined} />
                        <EditableCell value={r.expenseType} options={expenseTypes} onSave={v => updateItemMeta(r.name, r.section, 'expenseType', v)} tagColor={r.expenseType ? getTagColor(r.expenseType, 'type', expenseTypes) : undefined} />
                        {tableView === 'monthly' ? colVals.map((v, mi) => (
                          sensitive && !showHC ? (
                            <td key={colKeys[mi]} className="py-2 px-2 text-center text-gray-400 whitespace-nowrap" style={blurStyle}>
                              {v > 0 ? fmtMoney(v) : '—'}
                            </td>
                          ) : (
                            <EditableMoneyCell key={colKeys[mi]} value={v}
                              onSave={newVal => updateItemMonthValue(r.name, r.section, colKeys[mi], newVal)} />
                          )
                        )) : colVals.map((v, qi) => (
                          <td key={colKeys[qi]} className="py-2 px-2 text-center text-gray-900 whitespace-nowrap" style={blurStyle}>
                            {v > 0 ? fmtMoney(v) : '—'}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-center text-gray-900 font-medium whitespace-nowrap" style={blurStyle}>
                          {fmtMoney(r.total)}
                        </td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.total, prevTotal)}`} style={blurStyle}>
                          {delta(r.total, prevTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Footer rows: Grand Total, Budget, Savings, Savings Acum */}
                  {itemRows.length > 0 && (() => {
                    const budgetTotal = monthKeys.reduce((s, mk) => s + (monthBudgetSavings[mk]?.budget ?? 0), 0);
                    const savingsTotal = monthKeys.reduce((s, mk) => s + (monthBudgetSavings[mk]?.savings ?? 0), 0);
                    const lastMk = monthKeys.filter(mk => monthBudgetSavings[mk]).pop();
                    const savingsAcumTotal = lastMk ? (monthBudgetSavings[lastMk]?.savingsAcum ?? 0) : 0;
                    const excHC = itemRows.filter(r => r.section !== 'Headcount');
                    const footerCols = tableView === 'monthly' ? monthKeys : quarterKeys;

                    const gtVals = footerCols.map(ck => tableView === 'monthly'
                      ? excHC.reduce((s, r) => s + (r.months[ck] || 0), 0)
                      : excHC.reduce((s, r) => s + sumQuarter(r.months, ck), 0));
                    const budgetVals = footerCols.map(ck => tableView === 'monthly'
                      ? (monthBudgetSavings[ck]?.budget ?? 0)
                      : (quarterMonths[ck] || []).reduce((s, mk) => s + (monthBudgetSavings[mk]?.budget ?? 0), 0));
                    const savingsVals = footerCols.map(ck => tableView === 'monthly'
                      ? (monthBudgetSavings[ck]?.savings ?? null)
                      : (quarterMonths[ck] || []).reduce((s, mk) => s + (monthBudgetSavings[mk]?.savings ?? 0), 0));
                    const savAcumVals = footerCols.map(ck => {
                      if (tableView === 'monthly') return monthBudgetSavings[ck]?.savingsAcum ?? null;
                      const lastM = (quarterMonths[ck] || []).filter(mk => monthBudgetSavings[mk]).pop();
                      return lastM ? (monthBudgetSavings[lastM]?.savingsAcum ?? null) : null;
                    });

                    const footerRow = (label: string, vals: (number | null)[], totalVal: number, bgCls: string, textCls: string, colorFn?: (v: number | null) => string) => (
                      <tr className={`${bgCls} font-medium`}>
                        <td className={`py-2 px-2 text-left ${textCls}`}>{label}</td>
                        <td className="py-2 px-2" colSpan={3}></td>
                        {vals.map((v, i) => {
                          const cls = colorFn ? colorFn(v) : textCls;
                          return <td key={i} className={`py-2 px-2 text-center whitespace-nowrap ${cls}`}>{v != null && v !== 0 ? fmtMoney(v) : '—'}</td>;
                        })}
                        <td className={`py-2 px-2 text-center whitespace-nowrap ${colorFn ? colorFn(totalVal) : textCls}`}>{fmtMoney(totalVal)}</td>
                        <td className="py-2 px-2"></td>
                      </tr>
                    );
                    const signColor = (v: number | null) => v == null ? 'text-gray-400' : v >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';

                    return (
                      <>
                        {footerRow('Grand Total Mkt', gtVals, excHC.reduce((s, r) => s + r.total, 0), 'bg-gray-100 font-semibold border-t-2 border-gray-300', 'text-gray-800')}
                        {footerRow('Budget', budgetVals, budgetTotal, 'bg-blue-50', 'text-blue-800')}
                        {footerRow('Budget Savings', savingsVals, savingsTotal, 'bg-green-50', 'text-green-800', signColor)}
                        {footerRow('Savings Acumulado', savAcumVals, savingsAcumTotal, 'bg-yellow-50', 'text-yellow-800', signColor)}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Section Summary */}
          <CollapsibleCard title="Resumo por Seção" className="mb-6"
            actions={
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                  <button onClick={() => setTableView('monthly')}
                    className={`px-2 py-1 text-[10px] font-medium rounded ${tableView === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    Mensal
                  </button>
                  <button onClick={() => setTableView('quarterly')}
                    className={`px-2 py-1 text-[10px] font-medium rounded ${tableView === 'quarterly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    Trimestral
                  </button>
                </div>
                <div className="flex gap-1">
                  {availableYears.map(y => (
                    <button key={y} onClick={() => setDetailYear(y)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${detailYear === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Seção</th>
                    {tableView === 'monthly' ? monthKeys.map(mk => {
                      const [y, m] = mk.split('-').map(Number);
                      return <th key={mk} className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">{MONTHS[m]} {y}</th>;
                    }) : quarterKeys.map(qk => (
                      <th key={qk} className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">{qk} {detailYear}</th>
                    ))}
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 whitespace-nowrap text-sm">Total</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-400 text-xs whitespace-nowrap">Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((r, ri) => {
                    const prevTotal = ri > 0 ? sectionRows[ri - 1].total : 0;
                    const secCols = tableView === 'monthly' ? monthKeys : quarterKeys;
                    const sensitive = r.section === 'Headcount';
                    const blurS = sensitive && !showHC ? { filter: 'blur(6px)', userSelect: 'none' as const } : {};
                    return (
                      <tr key={r.section} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: SECTION_COLORS[r.section] || '#999' }} />
                          {r.section}
                        </td>
                        {secCols.map(ck => {
                          const v = tableView === 'monthly' ? (r.months[ck] || 0) : sumQuarter(r.months, ck);
                          return <td key={ck} className="py-2 px-2 text-center text-gray-900 whitespace-nowrap" style={blurS}>{v > 0 ? fmtMoney(v) : '—'}</td>;
                        })}
                        <td className="py-2 px-2 text-center text-gray-900 font-medium whitespace-nowrap" style={blurS}>{fmtMoney(r.total)}</td>
                        <td className={`py-2 px-1 text-center text-xs ${deltaColor(r.total, prevTotal)}`} style={blurS}>{delta(r.total, prevTotal)}</td>
                      </tr>
                    );
                  })}
                  {/* Grand Total Mkt + Budget + Savings rows */}
                  {sectionRows.length > 0 && (() => {
                    const excHC = sectionRows.filter(r => r.section !== 'Headcount');
                    const budgetTotal = monthKeys.reduce((s, mk) => s + (monthBudgetSavings[mk]?.budget ?? 0), 0);
                    const savingsTotal = monthKeys.reduce((s, mk) => s + (monthBudgetSavings[mk]?.savings ?? 0), 0);
                    const lastMk = monthKeys.filter(mk => monthBudgetSavings[mk]).pop();
                    const savingsAcumTotal = lastMk ? (monthBudgetSavings[lastMk]?.savingsAcum ?? 0) : 0;
                    const sCols = tableView === 'monthly' ? monthKeys : quarterKeys;
                    const signColor = (v: number | null) => v == null ? 'text-gray-400' : v >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';

                    const sFooterRow = (label: string, colFn: (ck: string) => number | null, totalVal: number, bgCls: string, textCls: string, colorFn?: (v: number | null) => string) => (
                      <tr className={`${bgCls} font-medium`}>
                        <td className={`py-2 px-2 text-left ${textCls}`}>{label}</td>
                        {sCols.map(ck => {
                          const v = colFn(ck);
                          const cls = colorFn ? colorFn(v) : textCls;
                          return <td key={ck} className={`py-2 px-2 text-center whitespace-nowrap ${cls}`}>{v != null && v !== 0 ? fmtMoney(v) : '—'}</td>;
                        })}
                        <td className={`py-2 px-2 text-center whitespace-nowrap ${colorFn ? colorFn(totalVal) : textCls}`}>{fmtMoney(totalVal)}</td>
                        <td></td>
                      </tr>
                    );

                    return (
                      <>
                        {sFooterRow('Grand Total Mkt', ck => tableView === 'monthly'
                          ? excHC.reduce((s, r) => s + (r.months[ck] || 0), 0)
                          : excHC.reduce((s, r) => s + sumQuarter(r.months, ck), 0),
                          excHC.reduce((s, r) => s + r.total, 0), 'bg-gray-100 font-semibold border-t-2 border-gray-300', 'text-gray-800')}
                        {sFooterRow('Budget', ck => tableView === 'monthly'
                          ? (monthBudgetSavings[ck]?.budget ?? 0)
                          : (quarterMonths[ck] || []).reduce((s, mk) => s + (monthBudgetSavings[mk]?.budget ?? 0), 0),
                          budgetTotal, 'bg-blue-50', 'text-blue-800')}
                        {sFooterRow('Budget Savings', ck => tableView === 'monthly'
                          ? (monthBudgetSavings[ck]?.savings ?? null)
                          : (quarterMonths[ck] || []).reduce((s, mk) => s + (monthBudgetSavings[mk]?.savings ?? 0), 0),
                          savingsTotal, 'bg-green-50', 'text-green-800', signColor)}
                        {sFooterRow('Savings Acumulado', ck => {
                          if (tableView === 'monthly') return monthBudgetSavings[ck]?.savingsAcum ?? null;
                          const lastM = (quarterMonths[ck] || []).filter(mk => monthBudgetSavings[mk]).pop();
                          return lastM ? (monthBudgetSavings[lastM]?.savingsAcum ?? null) : null;
                        }, savingsAcumTotal, 'bg-yellow-50', 'text-yellow-800', signColor)}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Savings Table - only when Todos */}
          {activeTab === 'Todos' && <CollapsibleCard title="Savings por Mês (a partir de Set/2025)" className="mb-6"
            actions={
              <div className="flex gap-1">
                {availableYears.map(y => (
                  <button key={y} onClick={() => setDetailYear(y)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${detailYear === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {y}
                  </button>
                ))}
              </div>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <SavSH k="sortKey" label="Mês" />
                    <SavSH k="budget" label="Orçamento" />
                    <SavSH k="gasto" label="Gasto" />
                    <SavSH k="savings" label="Savings" />
                    <SavSH k="savingsAcum" label="Savings Acumulado" />
                  </tr>
                </thead>
                <tbody>
                  {sortedSavings.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : sortedSavings.map((r, i) => {
                    const prev = i > 0 ? sortedSavings[i - 1] : null;
                    return (
                      <tr key={r.sortKey} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-left font-medium text-gray-700 whitespace-nowrap">{r.label}</td>
                        <td className="py-2 px-2 text-center text-gray-900">{r.budget > 0 ? fmtMoney(r.budget) : '—'}</td>
                        <td className="py-2 px-2 text-center text-gray-900">{r.gasto > 0 ? fmtMoney(r.gasto) : '—'}</td>
                        <td className={`py-2 px-2 text-center font-medium ${r.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtMoney(r.savings)}
                        </td>
                        <td className={`py-2 px-2 text-center font-medium ${r.savingsAcum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtMoney(r.savingsAcum)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {sortedSavings.length > 0 && (
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                      <td className="py-2.5 px-2 text-left text-gray-800">Total</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(sortedSavings.reduce((s, r) => s + r.budget, 0))}</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(sortedSavings.reduce((s, r) => s + r.gasto, 0))}</td>
                      <td className={`py-2.5 px-2 text-center font-semibold ${sortedSavings.reduce((s, r) => s + r.savings, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtMoney(sortedSavings.reduce((s, r) => s + r.savings, 0))}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-400">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>}

          {/* Individual items CRUD table */}
          <CollapsibleCard title="Itens Individuais (CRUD)" className="mb-6" defaultOpen={false}
            actions={
              <button onClick={openCreate}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
                <Plus size={14} /> Adicionar
              </button>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-2 font-medium text-gray-500">Item</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Seção</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Estratégia</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Tipo</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Ano</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Mês</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Previsto</th>
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500">Realizado</th>
                    <th className="py-2.5 px-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">Sem dados</td></tr>
                  ) : filtered.slice(0, 100).map(d => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-left font-medium text-gray-700">{d.name}</td>
                      <td className="py-2 px-2 text-center">{d.section ? <TagBadge value={d.section} color={getTagColor(d.section, 'section', SECTIONS)} /> : '—'}</td>
                      <td className="py-2 px-2 text-center">{d.strategy ? <TagBadge value={d.strategy} color={getTagColor(d.strategy, 'strategy', strategies)} /> : '—'}</td>
                      <td className="py-2 px-2 text-center">{d.expenseType ? <TagBadge value={d.expenseType} color={getTagColor(d.expenseType, 'type', expenseTypes)} /> : '—'}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{d.year}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{MONTHS[d.month]}</td>
                      <td className="py-2 px-2 text-center text-gray-900">{fmtMoney(d.planned)}</td>
                      <td className="py-2 px-2 text-center text-gray-900">{fmtMoney(d.actual)}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(d)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length > 100 && (
                    <tr><td colSpan={9} className="py-2 text-center text-gray-400 text-xs">Mostrando 100 de {filtered.length} itens. Use filtros para refinar.</td></tr>
                  )}
                  {/* Total row */}
                  {filtered.length > 0 && (
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                      <td className="py-2.5 px-2 text-left text-gray-800">Total ({filtered.length} itens)</td>
                      <td className="py-2.5 px-2" colSpan={4}></td>
                      <td className="py-2.5 px-2"></td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(filtered.reduce((s, d) => s + d.planned, 0))}</td>
                      <td className="py-2.5 px-2 text-center text-gray-900">{fmtMoney(filtered.reduce((s, d) => s + d.actual, 0))}</td>
                      <td className="py-2.5 px-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>
        </>
      )}

      {/* Modal */}
      {showForm && (
        <BudgetItemFormModal
          initial={editItem ? {
            section: editItem.section,
            strategy: editItem.strategy || '',
            expenseType: editItem.expenseType || '',
            name: editItem.name,
            year: String(editItem.year),
            month: String(editItem.month),
            planned: String(editItem.planned),
            actual: String(editItem.actual),
          } : emptyForm}
          editId={editItem?.id ?? null}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={onSaved}
          strategies={strategies}
          expenseTypes={expenseTypes}
          itemNames={itemNames}
        />
      )}
    </div>
  );
}
