import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, CheckCircle2, Lightbulb } from 'lucide-react';

interface Idea {
  id: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  relatedEvent: string | null;
  expectedOutcome: string | null;
  complexity: string;
  category: string | null;
  status: string;
  executed: boolean;
  executedDate: string | null;
  priority: string | null;
  createdAt: string;
}

const COMPLEXITIES = ['low', 'medium', 'high'];
const COMPLEXITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const COMPLEXITY_COLORS: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
const STATUSES = ['idea', 'planned', 'executed', 'discarded'];
const STATUS_LABELS: Record<string, string> = { idea: 'Ideia', planned: 'Planejada', executed: 'Executada', discarded: 'Descartada' };
const STATUS_COLORS: Record<string, string> = { idea: 'bg-blue-100 text-blue-700', planned: 'bg-purple-100 text-purple-700', executed: 'bg-green-100 text-green-700', discarded: 'bg-gray-100 text-gray-500' };
const CATEGORIES = ['Conteúdo', 'Evento', 'Campanha', 'Produto', 'Parceria', 'Mídia', 'ABM', 'Outro'];
const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

interface FormData {
  title: string; description: string; targetDate: string; relatedEvent: string;
  expectedOutcome: string; complexity: string; category: string; status: string;
  executed: boolean; executedDate: string; priority: string;
  impact?: string; effort?: string; confidenceScore?: number;
}
const emptyForm: FormData = { title: '', description: '', targetDate: '', relatedEvent: '', expectedOutcome: '', complexity: 'medium', category: '', status: 'idea', executed: false, executedDate: '', priority: 'medium', impact: 'medium', effort: 'medium', confidenceScore: undefined };

function IdeaFormModal({ initial, editId, onClose, onSaved }: { initial: FormData; editId: number | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    if (editId) await api.put(`/ideas/${editId}`, form);
    else await api.post('/ideas', form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Editar Ideia' : 'Nova Ideia'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ideia *</label>
            <input required value={form.title} onChange={set('title')} className={inputCls} placeholder="Descreva a ideia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
            <textarea value={form.description} onChange={set('description')} className={inputCls} rows={2} placeholder="Detalhes adicionais..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Para quando</label>
              <input type="date" value={form.targetDate} onChange={set('targetDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ligado a qual evento</label>
              <input value={form.relatedEvent} onChange={set('relatedEvent')} className={inputCls} placeholder="Ex: CQCS, evento interno..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Outcome esperado</label>
            <input value={form.expectedOutcome} onChange={set('expectedOutcome')} className={inputCls} placeholder="O que se espera alcançar" />
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Complexidade</label>
              <select value={form.complexity} onChange={set('complexity')} className={inputCls}>
                {COMPLEXITIES.map(c => <option key={c} value={c}>{COMPLEXITY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
              <select value={form.priority} onChange={set('priority')} className={inputCls}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Impacto</label>
              <select value={form.impact || 'medium'} onChange={set('impact')} className={inputCls}>
                <option value="low">Baixo</option>
                <option value="medium">Médio</option>
                <option value="high">Alto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Esforço</label>
              <select value={form.effort || 'medium'} onChange={set('effort')} className={inputCls}>
                <option value="low">Baixo</option>
                <option value="medium">Médio</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input type="checkbox" id="idea-exec" checked={form.executed}
                onChange={e => setForm(f => ({ ...f, executed: e.target.checked, status: e.target.checked ? 'executed' : f.status }))}
                className="rounded border-gray-300" />
              <label htmlFor="idea-exec" className="text-sm text-gray-700">Executada</label>
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

export function Ideas() {
  const [data, setData] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Idea | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(await api.get<Idea[]>('/ideas'));
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
  const handleDelete = async (id: number) => { if (!confirm('Excluir esta ideia?')) return; await api.del(`/ideas/${id}`); fetchData(); };
  const markExecuted = async (idea: Idea) => {
    await api.put(`/ideas/${idea.id}`, { ...idea, executed: true, status: 'executed', executedDate: new Date().toISOString().slice(0, 10) });
    fetchData();
  };
  const openEdit = (i: Idea) => { setEditItem(i); setShowForm(true); };
  const openCreate = () => { setEditItem(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditItem(null); fetchData(); };

  const totalIdeas = data.length;
  const executedCount = data.filter(i => i.executed).length;
  const pendingCount = data.filter(i => !i.executed && i.status !== 'discarded').length;

  const SH = ({ k, label }: { k: string; label: string }) => (
    <th className="text-center py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <PageHeader title="Log de Ideias" description="Repositório de ideias para ações futuras"
        actions={
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
            <Plus size={16} /> Nova Ideia
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Total</p><p className="text-2xl font-bold text-gray-900">{totalIdeas}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-yellow-500 uppercase">Pendentes</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-green-500 uppercase">Executadas</p><p className="text-2xl font-bold text-green-600">{executedCount}</p></Card>
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
        <CollapsibleCard title={`Ideias (${filtered.length})`} defaultOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <SH k="title" label="Ideia" />
                  <SH k="category" label="Categoria" />
                  <SH k="relatedEvent" label="Evento" />
                  <SH k="targetDate" label="Para quando" />
                  <SH k="expectedOutcome" label="Outcome" />
                  <SH k="complexity" label="Complexidade" />
                  <SH k="priorityScore" label="Execução" />
                  <SH k="status" label="Status" />
                  <th className="py-2.5 px-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhuma ideia registrada</td></tr>
                ) : filtered.map(i => (
                  <tr key={i.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i.executed ? 'opacity-60' : ''}`}>
                    <td className="py-2 px-2 text-left font-medium text-gray-800 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <Lightbulb size={14} className={i.executed ? 'text-green-500' : 'text-yellow-500'} />
                        <span className={i.executed ? 'line-through' : ''}>{i.title}</span>
                      </div>
                      {i.description && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{i.description}</p>}
                    </td>
                    <td className="py-2 px-2 text-center">{i.category ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">{i.category}</span> : '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{i.relatedEvent || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs whitespace-nowrap">{i.targetDate || '—'}</td>
                    <td className="py-2 px-2 text-center text-gray-600 text-xs max-w-[120px] truncate">{i.expectedOutcome || '—'}</td>
                    <td className="py-2 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${COMPLEXITY_COLORS[i.complexity]}`}>{COMPLEXITY_LABELS[i.complexity]}</span></td>
                    <td className="py-2 px-2 text-center">
                      {(i as any).priorityScore ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            (i as any).priorityScore >= 2.5 ? 'bg-red-100 text-red-700' :
                            (i as any).priorityScore >= 1.5 ? 'bg-amber-100 text-amber-700' :
                            (i as any).priorityScore >= 1.0 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {(i as any).priorityScore >= 2.5 ? 'A' :
                             (i as any).priorityScore >= 1.5 ? 'B' :
                             (i as any).priorityScore >= 1.0 ? 'C' : 'D'}
                          </span>
                          <span className="text-[9px] text-gray-400">{((i as any).impact || 'M').charAt(0).toUpperCase()}/${((i as any).effort || 'M').charAt(0).toUpperCase()}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-2 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[i.status]}`}>{STATUS_LABELS[i.status]}</span></td>
                    <td className="py-2 px-2">
                      <div className="flex gap-0.5 justify-center">
                        {!i.executed && (
                          <button onClick={() => markExecuted(i)} className="p-1 text-gray-400 hover:text-green-600" title="Marcar como executada"><CheckCircle2 size={14} /></button>
                        )}
                        <button onClick={() => openEdit(i)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(i.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
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
        <IdeaFormModal
          initial={editItem ? {
            title: editItem.title, description: editItem.description ?? '', targetDate: editItem.targetDate ?? '',
            relatedEvent: editItem.relatedEvent ?? '', expectedOutcome: editItem.expectedOutcome ?? '',
            complexity: editItem.complexity, category: editItem.category ?? '', status: editItem.status,
            executed: editItem.executed, executedDate: editItem.executedDate ?? '', priority: editItem.priority ?? 'medium',
            impact: (editItem as any).impact ?? 'medium', effort: (editItem as any).effort ?? 'medium',
          } : emptyForm}
          editId={editItem?.id ?? null}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
