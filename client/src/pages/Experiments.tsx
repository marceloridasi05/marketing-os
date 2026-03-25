import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, FlaskConical } from 'lucide-react';

interface Experiment {
  id: number;
  hypothesis: string;
  expectedResult: string | null;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  channel: string | null;
  metric: string | null;
  baselineValue: string | null;
  resultValue: string | null;
  learning: string | null;
  status: string;
  successful: string | null;
  category: string | null;
  createdAt: string;
}

const STATUSES = ['planned', 'running', 'completed'];
const STATUS_LABELS: Record<string, string> = { planned: 'Planejado', running: 'Em execução', completed: 'Concluído' };
const STATUS_COLORS: Record<string, string> = { planned: 'bg-gray-100 text-gray-600', running: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
const RESULTS = ['yes', 'no', 'inconclusive'];
const RESULT_LABELS: Record<string, string> = { yes: 'Sucesso', no: 'Fracasso', inconclusive: 'Inconclusivo' };
const RESULT_COLORS: Record<string, string> = { yes: 'bg-green-100 text-green-700', no: 'bg-red-100 text-red-700', inconclusive: 'bg-yellow-100 text-yellow-700' };
const CHANNELS = ['Google Ads', 'LinkedIn Ads', 'LinkedIn Page', 'Site', 'Blog', 'Email', 'Evento', 'PR', 'Outro'];
const METRICS = ['CPL', 'CTR', 'Conversão', 'Sessões', 'Leads', 'Impressões', 'Engajamento', 'Outro'];
const CATEGORIES = ['Aquisição', 'Conversão', 'Retenção', 'Branding', 'ABM', 'Outro'];

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

interface FormData {
  hypothesis: string; expectedResult: string; duration: string; startDate: string; endDate: string;
  channel: string; metric: string; baselineValue: string; resultValue: string;
  learning: string; status: string; successful: string; category: string;
}
const emptyForm: FormData = { hypothesis: '', expectedResult: '', duration: '', startDate: '', endDate: '', channel: '', metric: '', baselineValue: '', resultValue: '', learning: '', status: 'planned', successful: '', category: '' };

function ExperimentFormModal({ initial, editId, onClose, onSaved }: { initial: FormData; editId: number | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hypothesis) return;
    setSaving(true);
    if (editId) await api.put(`/experiments/${editId}`, form);
    else await api.post('/experiments', form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Editar Experimento' : 'Novo Experimento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hipótese *</label>
            <textarea required value={form.hypothesis} onChange={set('hypothesis')} className={inputCls} rows={2} placeholder="Se fizermos X, então Y acontecerá..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resultado esperado</label>
            <input value={form.expectedResult} onChange={set('expectedResult')} className={inputCls} placeholder="Ex: Reduzir CPL em 20%" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select value={form.category} onChange={set('category')} className={inputCls}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Canal</label>
              <select value={form.channel} onChange={set('channel')} className={inputCls}>
                <option value="">—</option>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Métrica</label>
              <select value={form.metric} onChange={set('metric')} className={inputCls}>
                <option value="">—</option>
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duração</label>
              <input value={form.duration} onChange={set('duration')} className={inputCls} placeholder="Ex: 2 semanas" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Início</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fim</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor baseline</label>
              <input value={form.baselineValue} onChange={set('baselineValue')} className={inputCls} placeholder="Ex: CPL R$ 45" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor resultado</label>
              <input value={form.resultValue} onChange={set('resultValue')} className={inputCls} placeholder="Ex: CPL R$ 32" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Aprendizado</label>
            <textarea value={form.learning} onChange={set('learning')} className={inputCls} rows={2} placeholder="O que aprendemos com este experimento..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Resultado</label>
              <select value={form.successful} onChange={set('successful')} className={inputCls}>
                <option value="">— (Pendente)</option>
                {RESULTS.map(r => <option key={r} value={r}>{RESULT_LABELS[r]}</option>)}
              </select>
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

export function Experiments() {
  const [data, setData] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Experiment | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(await api.get<Experiment[]>('/experiments'));
    setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let rows = data;
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    if (categoryFilter) rows = rows.filter(r => r.category === categoryFilter);
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = av == null ? '' : String(av);
      const bn = bv == null ? '' : String(bv);
      return sortAsc ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }, [data, statusFilter, categoryFilter, sortKey, sortAsc]);

  const handleSort = (k: string) => { if (sortKey === k) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(true); } };
  const handleDelete = async (id: number) => { if (!confirm('Excluir este experimento?')) return; await api.del(`/experiments/${id}`); fetchData(); };
  const openEdit = (e: Experiment) => { setEditItem(e); setShowForm(true); };
  const openCreate = () => { setEditItem(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditItem(null); fetchData(); };

  const totalExp = data.length;
  const runningCount = data.filter(e => e.status === 'running').length;
  const completedCount = data.filter(e => e.status === 'completed').length;
  const successCount = data.filter(e => e.successful === 'yes').length;
  const failCount = data.filter(e => e.successful === 'no').length;
  const winRate = completedCount > 0 ? ((successCount / completedCount) * 100).toFixed(0) : '—';

  const SH = ({ k, label }: { k: string; label: string }) => (
    <th className="text-center py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <PageHeader title="Experimentos" description="Laboratório de testes e aprendizados"
        actions={
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
            <Plus size={16} /> Novo Experimento
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Total</p><p className="text-xl font-bold text-gray-900">{totalExp}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-blue-400 uppercase">Em Execução</p><p className="text-xl font-bold text-blue-600">{runningCount}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-green-400 uppercase">Concluídos</p><p className="text-xl font-bold text-green-600">{completedCount}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-green-500 uppercase">Sucessos</p><p className="text-xl font-bold text-green-600">{successCount}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-red-400 uppercase">Fracassos</p><p className="text-xl font-bold text-red-600">{failCount}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-purple-400 uppercase">Win Rate</p><p className="text-xl font-bold text-purple-600">{winRate}%</p></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <CollapsibleCard title={`Experimentos (${filtered.length})`} defaultOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <SH k="hypothesis" label="Hipótese" />
                  <SH k="category" label="Categoria" />
                  <SH k="channel" label="Canal" />
                  <SH k="metric" label="Métrica" />
                  <SH k="duration" label="Duração" />
                  <SH k="baselineValue" label="Baseline" />
                  <SH k="resultValue" label="Resultado" />
                  <SH k="status" label="Status" />
                  <SH k="successful" label="Resultado" />
                  <th className="py-2.5 px-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400">Nenhum experimento registrado</td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-left font-medium text-gray-800 max-w-[220px]">
                      <div className="flex items-start gap-1.5">
                        <FlaskConical size={14} className="text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs">{e.hypothesis}</span>
                          {e.learning && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">📝 {e.learning}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">{e.category ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">{e.category}</span> : '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{e.channel || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{e.metric || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{e.duration || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{e.baselineValue || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs font-medium">{e.resultValue || '—'}</td>
                    <td className="py-2 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[e.status]}`}>{STATUS_LABELS[e.status]}</span></td>
                    <td className="py-2 px-2 text-center">{e.successful ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${RESULT_COLORS[e.successful]}`}>{RESULT_LABELS[e.successful]}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => openEdit(e)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}

      {showForm && (
        <ExperimentFormModal
          initial={editItem ? {
            hypothesis: editItem.hypothesis, expectedResult: editItem.expectedResult ?? '',
            duration: editItem.duration ?? '', startDate: editItem.startDate ?? '', endDate: editItem.endDate ?? '',
            channel: editItem.channel ?? '', metric: editItem.metric ?? '',
            baselineValue: editItem.baselineValue ?? '', resultValue: editItem.resultValue ?? '',
            learning: editItem.learning ?? '', status: editItem.status, successful: editItem.successful ?? '',
            category: editItem.category ?? '',
          } : emptyForm}
          editId={editItem?.id ?? null}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
