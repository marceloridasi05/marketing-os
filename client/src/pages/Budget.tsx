import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

// --- Types ---
interface BudgetRow {
  id: number;
  year: number;
  month: number;
  channelId: number;
  channelName: string;
  plannedBudget: number;
  actualSpent: number;
  notes: string | null;
}

interface FixedCost {
  id: number;
  name: string;
  category: string;
  monthlyCost: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
}

interface AnnualMonth {
  month: number;
  year: number;
  plannedMedia: number;
  actualMedia: number;
  fixedCosts: number;
  totalCost: number;
  remaining: number;
}

interface Channel { id: number; name: string; }

// --- Helpers ---
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtPct = (n: number | null) => n != null ? `${(n * 100).toFixed(0)}%` : '—';
const safeDivide = (a: number, b: number) => b > 0 ? a / b : null;
const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FIXED_CATEGORIES = ['CRM & Automação', 'Geração de Leads', 'Gestão de Projetos', 'Ferramentas de IA', 'Design', 'Redes Sociais', 'Analytics', 'Outros'];

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

// --- Budget Form ---
interface BudgetFormData {
  channelId: string;
  plannedBudget: string;
  actualSpent: string;
  notes: string;
}

function BudgetFormModal({ channels, initial, editId, year, month, onClose, onSaved }: {
  channels: Channel[]; initial: BudgetFormData; editId: number | null;
  year: number; month: number; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof BudgetFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId) return;
    setSaving(true);
    const payload = {
      year, month,
      channelId: +form.channelId,
      plannedBudget: +form.plannedBudget || 0,
      actualSpent: +form.actualSpent || 0,
      notes: form.notes || null,
    };
    if (editId) await api.put(`/budgets/${editId}`, payload);
    else await api.post('/budgets', payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editId ? 'Editar Orçamento' : 'Novo Orçamento'} — {MONTHS[month]} {year}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Canal *</label>
            <select required value={form.channelId} onChange={set('channelId')} className={inputCls}>
              <option value="">Selecione...</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Orçamento Previsto</label>
              <input type="number" step="0.01" min="0" value={form.plannedBudget} onChange={set('plannedBudget')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gasto Real</label>
              <input type="number" step="0.01" min="0" value={form.actualSpent} onChange={set('actualSpent')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={2} />
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

// --- Fixed Cost Form ---
interface FCFormData {
  name: string;
  category: string;
  monthlyCost: string;
  startDate: string;
  endDate: string;
  active: boolean;
  notes: string;
}

const emptyFC: FCFormData = { name: '', category: '', monthlyCost: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', active: true, notes: '' };

function fcToForm(fc: FixedCost): FCFormData {
  return {
    name: fc.name, category: fc.category, monthlyCost: String(fc.monthlyCost),
    startDate: fc.startDate, endDate: fc.endDate ?? '', active: fc.active, notes: fc.notes ?? '',
  };
}

function FixedCostFormModal({ initial, editId, onClose, onSaved }: {
  initial: FCFormData; editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FCFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;
    setSaving(true);
    const payload = {
      name: form.name, category: form.category,
      monthlyCost: +form.monthlyCost || 0,
      startDate: form.startDate, endDate: form.endDate || null,
      active: form.active, notes: form.notes || null,
    };
    if (editId) await api.put(`/fixed-costs/${editId}`, payload);
    else await api.post('/fixed-costs', payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editId ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
              <select required value={form.category} onChange={set('category')} className={inputCls}>
                <option value="">Selecione...</option>
                {FIXED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Custo Mensal</label>
              <input type="number" step="0.01" min="0" value={form.monthlyCost} onChange={set('monthlyCost')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Início *</label>
              <input type="date" required value={form.startDate} onChange={set('startDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fc-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300" />
            <label htmlFor="fc-active" className="text-sm text-gray-700">Ativo</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={2} />
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

// --- Main Page ---
export function Budget() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [annualData, setAnnualData] = useState<AnnualMonth[]>([]);
  const [loading, setLoading] = useState(true);

  // Budget form state
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetRow | null>(null);
  // Fixed cost form state
  const [showFCForm, setShowFCForm] = useState(false);
  const [editFC, setEditFC] = useState<FixedCost | null>(null);

  useEffect(() => { api.get<Channel[]>('/channels').then(setChannels); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [b, fc, annual] = await Promise.all([
      api.get<BudgetRow[]>(`/budgets?year=${year}&month=${month}`),
      api.get<FixedCost[]>('/fixed-costs'),
      api.get<AnnualMonth[]>(`/budgets/annual-summary?year=${year}`),
    ]);
    setBudgetRows(b);
    setFixedCosts(fc);
    setAnnualData(annual);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute summary for selected month
  const totalPlanned = budgetRows.reduce((s, r) => s + r.plannedBudget, 0);
  const totalSpent = budgetRows.reduce((s, r) => s + r.actualSpent, 0);

  // Fixed costs active in the selected month
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;
  const activeFixedCosts = fixedCosts.filter(fc => {
    if (!fc.active) return false;
    if (fc.startDate > monthEnd) return false;
    if (fc.endDate && fc.endDate < monthStart) return false;
    return true;
  });
  const totalFixed = activeFixedCosts.reduce((s, fc) => s + fc.monthlyCost, 0);
  const totalMarketing = totalSpent + totalFixed;
  const remaining = totalPlanned - totalSpent;
  const overBudget = remaining < 0;

  // Budget CRUD handlers
  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Excluir esta linha de orçamento?')) return;
    await api.del(`/budgets/${id}`);
    fetchData();
  };
  const openEditBudget = (r: BudgetRow) => { setEditBudget(r); setShowBudgetForm(true); };
  const openCreateBudget = () => { setEditBudget(null); setShowBudgetForm(true); };
  const budgetSaved = () => { setShowBudgetForm(false); setEditBudget(null); fetchData(); };

  // Fixed cost CRUD handlers
  const handleDeleteFC = async (id: number) => {
    if (!confirm('Excluir este custo fixo?')) return;
    await api.del(`/fixed-costs/${id}`);
    fetchData();
  };
  const openEditFC = (fc: FixedCost) => { setEditFC(fc); setShowFCForm(true); };
  const openCreateFC = () => { setEditFC(null); setShowFCForm(true); };
  const fcSaved = () => { setShowFCForm(false); setEditFC(null); fetchData(); };

  // Chart data
  const chartData = annualData.map(m => ({
    name: MONTHS[m.month],
    Previsto: m.plannedMedia,
    Gasto: m.actualMedia,
    'Custos Fixos': m.fixedCosts,
  }));

  return (
    <div>
      <PageHeader title="Orçamento" description="Controle financeiro mensal de marketing" />

      {/* Filtros */}
      <div className="flex items-end gap-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
          <select value={year} onChange={e => setYear(+e.target.value)} className={inputCls}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Mês</label>
          <select value={month} onChange={e => setMonth(+e.target.value)} className={inputCls}>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Mídia Prevista</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalPlanned)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Gasto Real</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalSpent)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Custos Fixos</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalFixed)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Custo Total Mktg</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(totalMarketing)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Saldo</p>
              <p className={`text-2xl font-semibold mt-1 ${overBudget ? 'text-red-600' : 'text-gray-900'}`}>
                {fmtMoney(remaining)}
              </p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Situação</p>
              <div className="mt-2">
                <Badge variant={overBudget ? 'danger' : 'success'}>
                  {overBudget ? 'Acima do Orçamento' : 'Dentro do Orçamento'}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Media Budget Control */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">Orçamento de Mídia — {MONTHS[month]} {year}</h3>
              <button onClick={openCreateBudget}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Canal</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Previsto</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Realizado</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Variação</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">% Uso</th>
                    <th className="py-2.5 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-gray-400">Nenhum orçamento para este mês</td></tr>
                  ) : budgetRows.map(r => {
                    const variance = r.plannedBudget - r.actualSpent;
                    const usage = safeDivide(r.actualSpent, r.plannedBudget);
                    const over = variance < 0;
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-700">{r.channelName}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(r.plannedBudget)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(r.actualSpent)}</td>
                        <td className={`py-2.5 px-3 text-right font-medium ${over ? 'text-red-600' : 'text-green-600'}`}>
                          {over ? '' : '+'}{fmtMoney(variance)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {usage != null ? (
                            <span className={`text-sm font-medium ${usage > 1 ? 'text-red-600' : usage > 0.9 ? 'text-yellow-600' : 'text-gray-700'}`}>
                              {fmtPct(usage)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => openEditBudget(r)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteBudget(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {budgetRows.length > 0 && (
                    <tr className="bg-gray-50 font-medium">
                      <td className="py-2.5 px-3 text-gray-700">Total</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(totalPlanned)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(totalSpent)}</td>
                      <td className={`py-2.5 px-3 text-right ${overBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {overBudget ? '' : '+'}{fmtMoney(remaining)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700">
                        {fmtPct(safeDivide(totalSpent, totalPlanned))}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fixed Cost Control */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">
                Custos Fixos — {activeFixedCosts.length} ativos em {MONTHS[month]} (Total: {fmtMoney(totalFixed)}/mês)
              </h3>
              <button onClick={openCreateFC}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Nome</th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Categoria</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Custo Mensal</th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Início</th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Fim</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Situação</th>
                    <th className="py-2.5 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {fixedCosts.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-gray-400">Nenhum custo fixo</td></tr>
                  ) : fixedCosts.map(fc => {
                    const isActive = activeFixedCosts.some(a => a.id === fc.id);
                    return (
                      <tr key={fc.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!fc.active ? 'opacity-50' : ''}`}>
                        <td className="py-2.5 px-3 font-medium text-gray-700">{fc.name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{fc.category}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(fc.monthlyCost)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{fc.startDate}</td>
                        <td className="py-2.5 px-3 text-gray-600">{fc.endDate || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={isActive ? 'success' : 'default'}>
                            {isActive ? 'Ativo' : fc.active ? 'Inativo neste mês' : 'Desabilitado'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => openEditFC(fc)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteFC(fc.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Planned vs Actual chart */}
          <Card title={`${year} — Previsto vs Realizado vs Custos Fixos`} className="mb-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(value) => fmtMoney(Number(value))} />
                <Legend />
                <Bar dataKey="Previsto" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Gasto" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Custos Fixos" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Annual Monthly Summary */}
          <Card title={`Resumo Financeiro Mensal ${year}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500">Mês</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Mídia Prevista</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Mídia Realizada</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Custos Fixos</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Custo Total</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Saldo</th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-500">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {annualData.map(m => {
                    const isOver = m.remaining < 0;
                    const hasData = m.plannedMedia > 0 || m.actualMedia > 0;
                    return (
                      <tr key={m.month}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${m.month === month ? 'bg-blue-50' : ''}`}
                        onClick={() => setMonth(m.month)}>
                        <td className="py-2.5 px-3 font-medium text-gray-700">{MONTHS[m.month]} {m.year}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(m.plannedMedia)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(m.actualMedia)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{fmtMoney(m.fixedCosts)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-medium">{fmtMoney(m.totalCost)}</td>
                        <td className={`py-2.5 px-3 text-right font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                          {fmtMoney(m.remaining)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasData ? (
                            <Badge variant={isOver ? 'danger' : 'success'}>
                              {isOver ? 'Acima' : 'OK'}
                            </Badge>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Annual totals */}
                  {(() => {
                    const totP = annualData.reduce((s, m) => s + m.plannedMedia, 0);
                    const totA = annualData.reduce((s, m) => s + m.actualMedia, 0);
                    const totF = annualData.reduce((s, m) => s + m.fixedCosts, 0);
                    const totC = annualData.reduce((s, m) => s + m.totalCost, 0);
                    const totR = annualData.reduce((s, m) => s + m.remaining, 0);
                    return (
                      <tr className="bg-gray-50 font-medium">
                        <td className="py-2.5 px-3 text-gray-700">Total Anual</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(totP)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(totA)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-600">{fmtMoney(totF)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-900">{fmtMoney(totC)}</td>
                        <td className={`py-2.5 px-3 text-right ${totR < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMoney(totR)}</td>
                        <td></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modals */}
      {showBudgetForm && (
        <BudgetFormModal
          channels={channels}
          initial={editBudget ? {
            channelId: String(editBudget.channelId),
            plannedBudget: String(editBudget.plannedBudget),
            actualSpent: String(editBudget.actualSpent),
            notes: editBudget.notes ?? '',
          } : { channelId: '', plannedBudget: '', actualSpent: '', notes: '' }}
          editId={editBudget?.id ?? null}
          year={year} month={month}
          onClose={() => { setShowBudgetForm(false); setEditBudget(null); }}
          onSaved={budgetSaved}
        />
      )}
      {showFCForm && (
        <FixedCostFormModal
          initial={editFC ? fcToForm(editFC) : emptyFC}
          editId={editFC?.id ?? null}
          onClose={() => { setShowFCForm(false); setEditFC(null); }}
          onSaved={fcSaved}
        />
      )}
    </div>
  );
}
