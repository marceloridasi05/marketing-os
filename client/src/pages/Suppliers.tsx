import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, ExternalLink, Phone, Search } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  category: string;
  website: string | null;
  whatsapp: string | null;
  notes: string | null;
  active: boolean;
}

const CATEGORIES = [
  'Eventos', 'Dados', 'Mídia', 'Audiovisual', 'Design', 'PR & Comunicação',
  'Tecnologia', 'Consultoria', 'Produção de Conteúdo', 'Brindes', 'Logística', 'Outros',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Eventos': '#ef4444',
  'Dados': '#3b82f6',
  'Mídia': '#f59e0b',
  'Audiovisual': '#8b5cf6',
  'Design': '#ec4899',
  'PR & Comunicação': '#14b8a6',
  'Tecnologia': '#6366f1',
  'Consultoria': '#f97316',
  'Produção de Conteúdo': '#10b981',
  'Brindes': '#a855f7',
  'Logística': '#64748b',
  'Outros': '#9ca3af',
};

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

interface FormData {
  name: string;
  category: string;
  website: string;
  whatsapp: string;
  notes: string;
  active: boolean;
}

const emptyForm: FormData = { name: '', category: '', website: '', whatsapp: '', notes: '', active: true };

function SupplierFormModal({ initial, editId, onClose, onSaved }: {
  initial: FormData; editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;
    setSaving(true);
    if (editId) await api.put(`/suppliers/${editId}`, form);
    else await api.post('/suppliers', form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} placeholder="Nome do fornecedor ou ferramenta" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
            <select required value={form.category} onChange={set('category')} className={inputCls}>
              <option value="">Selecione...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
            <input value={form.website} onChange={set('website')} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp</label>
            <input value={form.whatsapp} onChange={set('whatsapp')} className={inputCls} placeholder="+55 11 99999-9999" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={3} placeholder="Detalhes, contato, condições..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sup-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300" />
            <label htmlFor="sup-active" className="text-sm text-gray-700">Ativo</label>
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

export function Suppliers() {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const rows = await api.get<Supplier[]>('/suppliers');
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este fornecedor?')) return;
    await api.del(`/suppliers/${id}`);
    fetchData();
  };

  const openEdit = (s: Supplier) => { setEditItem(s); setShowForm(true); };
  const openCreate = () => { setEditItem(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditItem(null); fetchData(); };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let rows = data;
    if (categoryFilter) rows = rows.filter(r => r.category === categoryFilter);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.notes?.toLowerCase().includes(s)) ||
        (r.website?.toLowerCase().includes(s))
      );
    }
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = av == null ? '' : String(av);
      const bn = bv == null ? '' : String(bv);
      if (an < bn) return sortAsc ? -1 : 1;
      if (an > bn) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, categoryFilter, search, sortKey, sortAsc]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => map.set(r.category, (map.get(r.category) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const SH = ({ k, label }: { k: string; label: string }) => (
    <th className="text-left py-2.5 px-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <PageHeader title="Fornecedores e Tools" description="Cadastro de fornecedores, ferramentas e parceiros"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
            <Plus size={16} /> Novo Fornecedor
          </button>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        <button onClick={() => setCategoryFilter('')}
          className={`bg-white rounded-lg border p-2.5 text-center transition-all ${!categoryFilter ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'}`}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Todos</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </button>
        {categoryCounts.map(([cat, count]) => (
          <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            className={`bg-white rounded-lg border p-2.5 text-center transition-all ${categoryFilter === cat ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'}`}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: CATEGORY_COLORS[cat] || '#999' }}>{cat}</p>
            <p className="text-lg font-bold text-gray-900">{count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="border-none outline-none text-sm w-full bg-transparent"
            placeholder="Buscar por nome, site ou observações..." />
        </div>
        <div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <SH k="name" label="Nome" />
                  <SH k="category" label="Categoria" />
                  <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-sm">Site</th>
                  <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-sm">WhatsApp</th>
                  <SH k="notes" label="Observações" />
                  <SH k="active" label="Status" />
                  <th className="py-2.5 px-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Nenhum fornecedor encontrado</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!s.active ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{s.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[s.category] || '#999' }}>
                        {s.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.website ? (
                        <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs">
                          <ExternalLink size={12} /> Abrir
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.whatsapp ? (
                        <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-xs">
                          <Phone size={12} /> Chat
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[250px]">
                      {s.notes ? <span className="line-clamp-2">{s.notes}</span> : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={s.active ? 'success' : 'default'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
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
        <SupplierFormModal
          initial={editItem ? {
            name: editItem.name, category: editItem.category,
            website: editItem.website ?? '', whatsapp: editItem.whatsapp ?? '',
            notes: editItem.notes ?? '', active: editItem.active,
          } : emptyForm}
          editId={editItem?.id ?? null}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
