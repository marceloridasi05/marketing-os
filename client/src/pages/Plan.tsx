import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, List, Grid3X3, CheckCircle2 } from 'lucide-react';

// --- Types ---
interface Initiative {
  id: number;
  name: string;
  objective: string;
  actionType: string;
  channel: string;
  year: number;
  month: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  priority: string;
  notes: string | null;
}
interface RefItem { id: number; type: string; value: string; }
interface Channel { id: number; name: string; }

// --- Helpers ---
const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const STATUSES = ['planned', 'ongoing', 'done', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { planned: 'Planejado', ongoing: 'Em andamento', done: 'Concluído', cancelled: 'Cancelado' };
const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

const statusVariant = (s: string) => {
  switch (s) {
    case 'done': return 'success';
    case 'ongoing': return 'info';
    case 'cancelled': return 'danger';
    default: return 'default';
  }
};
const priorityVariant = (p: string) => {
  switch (p) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    default: return 'default';
  }
};

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

function buildQS(params: Record<string, string>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
}

// --- Form ---
interface FormData {
  name: string; objective: string; actionType: string; channel: string;
  year: string; month: string; startDate: string; endDate: string;
  status: string; priority: string; notes: string; engineType: string;
}

const emptyForm: FormData = {
  name: '', objective: '', actionType: '', channel: '',
  year: '2026', month: String(new Date().getMonth() + 1),
  startDate: '', endDate: '', status: 'planned', priority: 'medium', notes: '', engineType: '',
};

function initToForm(i: Initiative): FormData {
  return {
    name: i.name, objective: i.objective, actionType: i.actionType, channel: i.channel,
    year: String(i.year), month: String(i.month),
    startDate: i.startDate ?? '', endDate: i.endDate ?? '',
    status: i.status, priority: i.priority, notes: i.notes ?? '', engineType: (i as unknown as Record<string, string>).engineType ?? '',
  };
}

function InitiativeFormModal({ channels, objectives, actionTypes, initial, editId, onClose, onSaved }: {
  channels: Channel[]; objectives: string[]; actionTypes: string[];
  initial: FormData; editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.objective || !form.actionType || !form.channel) return;
    setSaving(true);
    const payload = {
      name: form.name, objective: form.objective, actionType: form.actionType,
      channel: form.channel, year: +form.year, month: +form.month,
      startDate: form.startDate || null, endDate: form.endDate || null,
      status: form.status, priority: form.priority, notes: form.notes || null, engineType: form.engineType || null,
    };
    if (editId) await api.put(`/initiatives/${editId}`, payload);
    else await api.post('/initiatives', payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Editar Iniciativa' : 'Nova Iniciativa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo *</label>
              <select required value={form.objective} onChange={set('objective')} className={inputCls}>
                <option value="">Selecione...</option>
                {objectives.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Ação *</label>
              <select required value={form.actionType} onChange={set('actionType')} className={inputCls}>
                <option value="">Selecione...</option>
                {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Canal *</label>
              <select required value={form.channel} onChange={set('channel')} className={inputCls}>
                <option value="">Selecione...</option>
                {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
              <select value={form.priority} onChange={set('priority')} className={inputCls}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Engine</label>
              <select value={form.engineType} onChange={set('engineType')} className={inputCls}>
                <option value="">— (Nenhum)</option>
                <option value="SMB">SMB</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
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

// --- Monthly Grid View ---
function MonthlyGrid({ data, year, onEdit }: {
  data: Initiative[]; year: number; onEdit: (i: Initiative) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<number, Initiative[]> = {};
    for (let m = 1; m <= 12; m++) map[m] = [];
    data.filter(i => i.year === year).forEach(i => {
      if (map[i.month]) map[i.month].push(i);
    });
    return map;
  }, [data, year]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {MONTHS.slice(1).map((mName, idx) => {
        const m = idx + 1;
        const items = grouped[m];
        return (
          <div key={m} className="bg-white rounded-lg border border-gray-200 p-3 min-h-[120px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">{mName} {year}</span>
              <span className="text-xs text-gray-400">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 ? (
                <p className="text-xs text-gray-300 italic">Sem iniciativas</p>
              ) : items.map(i => (
                <button key={i.id} onClick={() => onEdit(i)}
                  className="w-full text-left p-2 rounded border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-medium text-gray-800 leading-tight">{i.name}</span>
                    <Badge variant={priorityVariant(i.priority)}>{PRIORITY_LABELS[i.priority][0].toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant={statusVariant(i.status)}>{STATUS_LABELS[i.status]}</Badge>
                    <span className="text-[10px] text-gray-400">{i.channel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main ---
export function Plan() {
  const [data, setData] = useState<Initiative[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'grid'>('table');

  // Filters
  const [fYear, setFYear] = useState('2026');
  const [fMonth, setFMonth] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fObjective, setFObjective] = useState('');
  const [fActionType, setFActionType] = useState('');
  const [engineFilter, setEngineFilter] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState('month');
  const [sortAsc, setSortAsc] = useState(true);

  // CRUD
  const [showForm, setShowForm] = useState(false);
  const [editInit, setEditInit] = useState<Initiative | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Channel[]>('/channels'),
      api.get<RefItem[]>('/reference-items?type=objective'),
      api.get<RefItem[]>('/reference-items?type=action_type'),
    ]).then(([chs, objs, acts]) => {
      setChannels(chs);
      setObjectives(objs.map(o => o.value));
      setActionTypes(acts.map(a => a.value));
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = buildQS({ year: fYear, month: fMonth, status: fStatus, objective: fObjective, actionType: fActionType, engineType: engineFilter });
    const rows = await api.get<Initiative[]>(`/initiatives${qs}`);
    setData(rows);
    setLoading(false);
  }, [fYear, fMonth, fStatus, fObjective, fActionType, engineFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = av == null ? '' : typeof av === 'number' ? av : String(av);
      const bn = bv == null ? '' : typeof bv === 'number' ? bv : String(bv);
      if (an < bn) return sortAsc ? -1 : 1;
      if (an > bn) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortAsc]);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta iniciativa?')) return;
    await api.del(`/initiatives/${id}`);
    fetchData();
  };

  const handleMarkDone = async (i: Initiative) => {
    await api.put(`/initiatives/${i.id}`, { ...i, status: 'done' });
    fetchData();
  };

  const openEdit = (i: Initiative) => { setEditInit(i); setShowForm(true); };
  const openCreate = () => { setEditInit(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditInit(null); fetchData(); };

  const SortHeader = ({ k, label }: { k: string; label: string }) => (
    <th className="text-left py-2.5 px-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  // Stats
  const planned = data.filter(i => i.status === 'planned').length;
  const ongoing = data.filter(i => i.status === 'ongoing').length;
  const done = data.filter(i => i.status === 'done').length;
  const cancelled = data.filter(i => i.status === 'cancelled').length;
  const completionRate = data.length > 0 ? ((done / data.length) * 100).toFixed(0) : '0';
  const executionRate = data.length > 0 ? (((done + ongoing) / data.length) * 100).toFixed(0) : '0';

  // By channel breakdown
  const byChannel = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(i => map.set(i.channel, (map.get(i.channel) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  // By objective breakdown
  const byObjective = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(i => map.set(i.objective, (map.get(i.objective) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div>
      <PageHeader title="Plano de Marketing" description="Planejamento e controle de iniciativas"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
            <Plus size={16} /> Nova Iniciativa
          </button>
        }
      />

      {/* Filtros + View toggle */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
          <select value={fYear} onChange={e => setFYear(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Mês</label>
          <select value={fMonth} onChange={e => setFMonth(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
          <select value={fObjective} onChange={e => setFObjective(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {objectives.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Ação</label>
          <select value={fActionType} onChange={e => setFActionType(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Engine</label>
          <select value={engineFilter} onChange={e => setEngineFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            <option value="SMB">SMB</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView('table')}
            className={`p-1.5 rounded ${view === 'table' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            title="Visualização em tabela"><List size={18} /></button>
          <button onClick={() => setView('grid')}
            className={`p-1.5 rounded ${view === 'grid' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            title="Visualização em grade"><Grid3X3 size={18} /></button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Total</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Planejadas</p>
          <p className="text-lg font-bold text-gray-500">{planned}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-blue-400 uppercase">Em Andamento</p>
          <p className="text-lg font-bold text-blue-600">{ongoing}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-green-400 uppercase">Concluídas</p>
          <p className="text-lg font-bold text-green-600">{done}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-red-400 uppercase">Canceladas</p>
          <p className="text-lg font-bold text-red-600">{cancelled}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-green-400 uppercase">Conclusão</p>
          <p className="text-lg font-bold text-green-600">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-2.5 text-center">
          <p className="text-[10px] font-semibold text-blue-400 uppercase">Execução</p>
          <p className="text-lg font-bold text-blue-600">{executionRate}%</p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Por Canal</p>
          <div className="space-y-1">
            {byChannel.slice(0, 6).map(([ch, count]) => (
              <div key={ch} className="flex items-center gap-2 text-xs">
                <span className="text-gray-700 w-28 truncate">{ch}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${(count / (byChannel[0]?.[1] || 1)) * 100}%` }} />
                </div>
                <span className="text-gray-500 font-medium w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Por Objetivo</p>
          <div className="space-y-1">
            {byObjective.slice(0, 6).map(([obj, count]) => (
              <div key={obj} className="flex items-center gap-2 text-xs">
                <span className="text-gray-700 w-36 truncate">{obj}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 rounded-full h-1.5" style={{ width: `${(count / (byObjective[0]?.[1] || 1)) * 100}%` }} />
                </div>
                <span className="text-gray-500 font-medium w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : view === 'grid' ? (
        <MonthlyGrid data={data} year={+fYear || 2026} onEdit={openEdit} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <SortHeader k="name" label="Iniciativa" />
                  <SortHeader k="objective" label="Objetivo" />
                  <SortHeader k="actionType" label="Tipo" />
                  <SortHeader k="channel" label="Canal" />
                  <SortHeader k="month" label="Período" />
                  <SortHeader k="status" label="Status" />
                  <SortHeader k="priority" label="Prioridade" />
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-sm">Obs.</th>
                  <th className="py-2.5 px-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhuma iniciativa encontrada</td></tr>
                ) : sorted.map(i => (
                  <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{i.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{i.objective}</td>
                    <td className="py-2.5 px-3 text-gray-600">{i.actionType}</td>
                    <td className="py-2.5 px-3 text-gray-600">{i.channel}</td>
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{MONTHS[i.month]} {i.year}</td>
                    <td className="py-2.5 px-3"><Badge variant={statusVariant(i.status)}>{STATUS_LABELS[i.status]}</Badge></td>
                    <td className="py-2.5 px-3"><Badge variant={priorityVariant(i.priority)}>{PRIORITY_LABELS[i.priority]}</Badge></td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[150px] truncate">{i.notes || '—'}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-0.5">
                        {i.status !== 'done' && (
                          <button onClick={() => handleMarkDone(i)} className="p-1 text-gray-400 hover:text-green-600" title="Marcar como concluído">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(i)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(i.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <InitiativeFormModal
          channels={channels} objectives={objectives} actionTypes={actionTypes}
          initial={editInit ? initToForm(editInit) : emptyForm}
          editId={editInit?.id ?? null}
          onClose={() => { setShowForm(false); setEditInit(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
