import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, ExternalLink, Save } from 'lucide-react';
import { useSite } from '../context/SiteContext';

// --- Types ---
interface Channel { id: number; name: string; category: string; active: boolean; }
interface RefItem { id: number; type: string; value: string; active: boolean; }

const CHANNEL_CATEGORIES = ['Pago', 'Orgânico', 'Próprio', 'Conquistado', 'Offline', 'Outros'];
const REF_TYPE_LABELS: Record<string, string> = {
  campaign_type: 'Tipos de Campanha',
  objective: 'Objetivos de Iniciativa',
  action_type: 'Tipos de Ação',
};
const REF_TYPES = Object.keys(REF_TYPE_LABELS);

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full';

// --- Client Config ---
interface ClientConfig {
  clientName?: string;
  businessType?: string;
  growthModel?: string;
  mainObjectives?: string;
}

const BUSINESS_TYPES = ['B2B', 'B2C', 'B2B2C', 'B2G', 'D2C', 'Marketplace', 'SaaS', 'E-commerce', 'Outro'];
const GROWTH_MODELS = ['Product-Led (PLG)', 'Sales-Led', 'Marketing-Led', 'Community-Led', 'Channel/Partner-Led', 'Hybrid', 'Outro'];

function ClientConfigCard() {
  const { selectedSite, refreshSites } = useSite();
  const [cfg, setCfg] = useState<ClientConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedSite) return;
    try {
      const parsed: ClientConfig = selectedSite.clientConfig
        ? JSON.parse(selectedSite.clientConfig as unknown as string)
        : {};
      setCfg(parsed);
    } catch {
      setCfg({});
    }
  }, [selectedSite]);

  const handleSave = async () => {
    if (!selectedSite) return;
    setSaving(true);
    await api.put(`/sites/${selectedSite.id}`, { clientConfig: cfg });
    await refreshSites();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = <K extends keyof ClientConfig>(key: K, val: ClientConfig[K]) =>
    setCfg(c => ({ ...c, [key]: val }));

  if (!selectedSite) return null;

  return (
    <Card className="mb-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700">Configuração do Cliente</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Informações do cliente disponíveis em todo o app.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome do cliente</label>
            <input
              value={cfg.clientName ?? ''}
              onChange={e => update('clientName', e.target.value)}
              placeholder="Ex.: Acme Corp"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de negócio</label>
            <select
              value={cfg.businessType ?? ''}
              onChange={e => update('businessType', e.target.value)}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Modelo de crescimento</label>
          <select
            value={cfg.growthModel ?? ''}
            onChange={e => update('growthModel', e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {GROWTH_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Objetivos principais</label>
          <textarea
            value={cfg.mainObjectives ?? ''}
            onChange={e => update('mainObjectives', e.target.value)}
            placeholder="Liste os objetivos principais (um por linha)..."
            rows={4}
            className={inputCls}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configuração'}
          </button>
        </div>
      </div>
    </Card>
  );
}

// --- Sheet Config ---
interface SheetGids {
  siteData?: number; adsKpis?: number; linkedinPage?: number;
  planSchedule?: number; budgetItems?: number; adsBudgets?: number;
}
interface SheetConfig { spreadsheetId: string; gids: SheetGids; }

const GID_LABELS: { key: keyof SheetGids; label: string }[] = [
  { key: 'siteData',     label: 'Desempenho do Site' },
  { key: 'adsKpis',      label: 'KPIs Ads' },
  { key: 'linkedinPage', label: 'LinkedIn Page' },
  { key: 'planSchedule', label: 'Plano de Marketing' },
  { key: 'adsBudgets',   label: 'Verbas Ads' },
  { key: 'budgetItems',  label: 'Itens de Orçamento' },
];

function extractSheetId(input: string): string {
  // Accept full URL or raw ID
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : input.trim();
}

function SheetConfigCard() {
  const { selectedSite, refreshSites } = useSite();
  const [cfg, setCfg] = useState<SheetConfig>({ spreadsheetId: '', gids: {} });
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedSite) return;
    try {
      const raw = selectedSite.sheetConfig
        ? JSON.parse(selectedSite.sheetConfig as unknown as string)
        : {};
      setCfg({ spreadsheetId: raw.spreadsheetId ?? '', gids: raw.gids ?? {} });
      setUrlInput(parsed.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/edit`
        : '');
    } catch {
      setCfg({ spreadsheetId: '', gids: {} });
    }
  }, [selectedSite]);

  const handleSave = async () => {
    if (!selectedSite) return;
    const spreadsheetId = extractSheetId(urlInput);
    const newCfg = { ...cfg, spreadsheetId };
    setSaving(true);
    await api.put(`/sites/${selectedSite.id}`, { sheetConfig: newCfg });
    await refreshSites();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setGid = (key: keyof SheetGids, val: string) => {
    const n = val === '' ? undefined : Number(val);
    setCfg(c => ({ ...c, gids: { ...c.gids, [key]: n } }));
  };

  if (!selectedSite) return null;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Google Sheets — Planilha de Dados</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            A planilha deve ser pública (qualquer pessoa com o link pode ver).
          </p>
        </div>
        {cfg.spreadsheetId && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            <ExternalLink size={13} /> Abrir planilha
          </a>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL da planilha</label>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">Cole a URL completa ou apenas o ID da planilha.</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">IDs das abas (GID)</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {GID_LABELS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                <input
                  type="number"
                  value={cfg.gids[key] ?? ''}
                  onChange={e => setGid(key, e.target.value)}
                  placeholder="ex: 114212584"
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full font-mono"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            O GID de cada aba aparece na URL ao clicar na aba: <code className="bg-gray-100 px-1 rounded">…/edit?gid=<strong>114212584</strong></code>
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configuração'}
          </button>
        </div>
      </div>
    </Card>
  );
}

// --- Channel Form ---
function ChannelFormModal({ initial, editId, onClose, onSaved }: {
  initial: { name: string; category: string; active: boolean };
  editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;
    setSaving(true);
    if (editId) await api.put(`/channels/${editId}`, form);
    else await api.post('/channels', form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editId ? 'Editar Canal' : 'Novo Canal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
            <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
              <option value="">Selecione...</option>
              {CHANNEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ch-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300" />
            <label htmlFor="ch-active" className="text-sm text-gray-700">Ativo</label>
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

// --- Reference Item Form ---
function RefItemFormModal({ refType, initial, editId, onClose, onSaved }: {
  refType: string;
  initial: { value: string; active: boolean };
  editId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const singularLabel = REF_TYPE_LABELS[refType]?.replace(/s$/, '') ?? refType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value) return;
    setSaving(true);
    if (editId) await api.put(`/reference-items/${editId}`, { ...form, type: refType });
    else await api.post('/reference-items', { ...form, type: refType });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} {singularLabel}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Valor *</label>
            <input required value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ref-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300" />
            <label htmlFor="ref-active" className="text-sm text-gray-700">Ativo</label>
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

// --- Ref Item Section ---
function RefItemSection({ type, label }: { type: string; label: string }) {
  const [items, setItems] = useState<RefItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RefItem | null>(null);

  const fetchItems = useCallback(async () => {
    const rows = await api.get<RefItem[]>(`/reference-items?type=${type}`);
    setItems(rows);
  }, [type]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este item?')) return;
    await api.del(`/reference-items/${id}`);
    fetchItems();
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <button onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800">
          <Plus size={14} /> Adicionar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Valor</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Situação</th>
              <th className="py-2 px-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sem itens</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-700">{item.value}</td>
                <td className="py-2 px-3 text-center">
                  <Badge variant={item.active ? 'success' : 'default'}>{item.active ? 'Ativo' : 'Inativo'}</Badge>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditItem(item); setShowForm(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <RefItemFormModal
          refType={type}
          initial={editItem ? { value: editItem.value, active: editItem.active } : { value: '', active: true }}
          editId={editItem?.id ?? null}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); fetchItems(); }}
        />
      )}
    </Card>
  );
}

// --- Main ---
export function SettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showChForm, setShowChForm] = useState(false);
  const [editCh, setEditCh] = useState<Channel | null>(null);

  const fetchChannels = useCallback(async () => {
    const rows = await api.get<Channel[]>('/channels');
    setChannels(rows);
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleDeleteCh = async (id: number) => {
    if (!confirm('Excluir este canal? Isso pode afetar dados relacionados.')) return;
    await api.del(`/channels/${id}`);
    fetchChannels();
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Gerenciar dados de referência e configuração" />

      {/* Configuração do Cliente */}
      <ClientConfigCard />

      {/* Google Sheets */}
      <SheetConfigCard />

      {/* Canais */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500">Canais</h3>
          <button onClick={() => { setEditCh(null); setShowChForm(true); }}
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
                <th className="text-center py-2.5 px-3 font-medium text-gray-500">Situação</th>
                <th className="py-2.5 px-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-700">{ch.name}</td>
                  <td className="py-2.5 px-3 text-gray-600">{ch.category}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant={ch.active ? 'success' : 'default'}>{ch.active ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditCh(ch); setShowChForm(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteCh(ch.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Seções de dados de referência */}
      {REF_TYPES.map(type => (
        <RefItemSection key={type} type={type} label={REF_TYPE_LABELS[type]} />
      ))}

      {showChForm && (
        <ChannelFormModal
          initial={editCh ? { name: editCh.name, category: editCh.category, active: editCh.active } : { name: '', category: '', active: true }}
          editId={editCh?.id ?? null}
          onClose={() => { setShowChForm(false); setEditCh(null); }}
          onSaved={() => { setShowChForm(false); setEditCh(null); fetchChannels(); }}
        />
      )}
    </div>
  );
}
