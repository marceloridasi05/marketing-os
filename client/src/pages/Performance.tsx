import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

// --- Types ---
interface PerfEntry {
  id: number;
  date: string;
  periodType: string;
  channelId: number;
  channelName: string;
  campaignName: string | null;
  campaignType: string | null;
  impressions: number | null;
  clicks: number | null;
  sessions: number | null;
  users: number | null;
  newUsers: number | null;
  leads: number | null;
  conversions: number | null;
  cost: number | null;
  notes: string | null;
}
interface KPIs {
  totalImpressions: number;
  totalClicks: number;
  totalSessions: number;
  totalLeads: number;
  totalConversions: number;
  totalSpend: number;
}
interface TrendRow {
  date: string;
  clicks: number;
  sessions: number;
  leads: number;
  spend: number;
}
interface Channel { id: number; name: string; }

// --- Helpers ---
const safeDivide = (a: number, b: number) => (b > 0 ? a / b : null);
const fmtMoney = (n: number | null) => n != null ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR') : '—';
const fmtPct = (n: number | null) => n != null ? `${(n * 100).toFixed(2)}%` : '—';

function buildQS(params: Record<string, string>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : '';
}

const CAMPAIGN_TYPES = ['brand', 'non_brand', 'awareness', 'ABM', 'institutional', 'event', 'organic'];
const PERIOD_TYPES_MAP: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
const PERIOD_TYPES = Object.keys(PERIOD_TYPES_MAP);

// --- Form Modal ---
interface FormData {
  date: string;
  periodType: string;
  channelId: string;
  campaignName: string;
  campaignType: string;
  impressions: string;
  clicks: string;
  sessions: string;
  users: string;
  newUsers: string;
  leads: string;
  conversions: string;
  cost: string;
  notes: string;
}

const emptyForm: FormData = {
  date: new Date().toISOString().slice(0, 10),
  periodType: 'monthly',
  channelId: '',
  campaignName: '',
  campaignType: '',
  impressions: '',
  clicks: '',
  sessions: '',
  users: '',
  newUsers: '',
  leads: '',
  conversions: '',
  cost: '',
  notes: '',
};

function entryToForm(e: PerfEntry): FormData {
  return {
    date: e.date,
    periodType: e.periodType,
    channelId: String(e.channelId),
    campaignName: e.campaignName ?? '',
    campaignType: e.campaignType ?? '',
    impressions: e.impressions != null ? String(e.impressions) : '',
    clicks: e.clicks != null ? String(e.clicks) : '',
    sessions: e.sessions != null ? String(e.sessions) : '',
    users: e.users != null ? String(e.users) : '',
    newUsers: e.newUsers != null ? String(e.newUsers) : '',
    leads: e.leads != null ? String(e.leads) : '',
    conversions: e.conversions != null ? String(e.conversions) : '',
    cost: e.cost != null ? String(e.cost) : '',
    notes: e.notes ?? '',
  };
}

function formToPayload(f: FormData) {
  const numOrNull = (v: string) => v === '' ? null : Number(v);
  return {
    date: f.date,
    periodType: f.periodType,
    channelId: Number(f.channelId),
    campaignName: f.campaignName || null,
    campaignType: f.campaignType || null,
    impressions: numOrNull(f.impressions),
    clicks: numOrNull(f.clicks),
    sessions: numOrNull(f.sessions),
    users: numOrNull(f.users),
    newUsers: numOrNull(f.newUsers),
    leads: numOrNull(f.leads),
    conversions: numOrNull(f.conversions),
    cost: numOrNull(f.cost),
    notes: f.notes || null,
  };
}

const FIELD_LABELS: Record<string, string> = {
  impressions: 'Impressões',
  clicks: 'Cliques',
  sessions: 'Sessões',
  users: 'Usuários',
  newUsers: 'Novos Usuários',
  leads: 'Leads',
  conversions: 'Conversões',
  cost: 'Custo',
};

function EntryFormModal({ channels, initial, editId, onClose, onSaved }: {
  channels: Channel[];
  initial: FormData;
  editId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId) return;
    setSaving(true);
    const payload = formToPayload(form);
    if (editId) {
      await api.put(`/performance/${editId}`, payload);
    } else {
      await api.post('/performance', payload);
    }
    setSaving(false);
    onSaved();
  };

  const inputCls = "border border-gray-300 rounded px-3 py-1.5 text-sm w-full";

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editId ? 'Editar Registro' : 'Novo Registro de Desempenho'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data *</label>
              <input type="date" required value={form.date} onChange={set('date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Período *</label>
              <select required value={form.periodType} onChange={set('periodType')} className={inputCls}>
                {PERIOD_TYPES.map(p => <option key={p} value={p}>{PERIOD_TYPES_MAP[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Canal *</label>
              <select required value={form.channelId} onChange={set('channelId')} className={inputCls}>
                <option value="">Selecione...</option>
                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Campanha</label>
              <input value={form.campaignName} onChange={set('campaignName')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Campanha</label>
              <select value={form.campaignType} onChange={set('campaignType')} className={inputCls}>
                <option value="">—</option>
                {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['impressions', 'clicks', 'sessions', 'users', 'newUsers', 'leads', 'conversions', 'cost'] as const).map(key => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {FIELD_LABELS[key]}
                </label>
                <input type="number" step={key === 'cost' ? '0.01' : '1'} min="0"
                  value={form[key]} onChange={set(key)} className={inputCls} placeholder="—" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Mini Chart ---
function MiniChart({ data, dataKey, color, label }: {
  data: TrendRow[]; dataKey: string; color: string; label: string;
}) {
  return (
    <Card title={label} className="min-h-48">
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={50} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes para o gráfico</p>
      )}
    </Card>
  );
}

// --- Main ---
export function Performance() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [channelId, setChannelId] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [periodType, setPeriodType] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [data, setData] = useState<PerfEntry[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<PerfEntry | null>(null);

  useEffect(() => {
    api.get<Channel[]>('/channels').then(setChannels);
  }, []);

  const qs = useMemo(() => buildQS({ startDate, endDate, channelId, campaignType, periodType }), [startDate, endDate, channelId, campaignType, periodType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [entries, k, t] = await Promise.all([
      api.get<PerfEntry[]>(`/performance${qs}`),
      api.get<KPIs>(`/performance/kpis${qs}`),
      api.get<TrendRow[]>(`/performance/trends${qs}`),
    ]);
    setData(entries);
    setKpis(k);
    setTrends(t);
    setLoading(false);
  }, [qs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const an = av == null ? -Infinity : typeof av === 'number' ? av : String(av);
      const bn = bv == null ? -Infinity : typeof bv === 'number' ? bv : String(bv);
      if (an < bn) return sortAsc ? -1 : 1;
      if (an > bn) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortAsc]);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.del(`/performance/${id}`);
    fetchData();
  };

  const openEdit = (e: PerfEntry) => { setEditEntry(e); setShowForm(true); };
  const openCreate = () => { setEditEntry(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditEntry(null); fetchData(); };

  // Computed KPIs
  const ctr = kpis ? safeDivide(kpis.totalClicks, kpis.totalImpressions) : null;
  const cpc = kpis ? safeDivide(kpis.totalSpend, kpis.totalClicks) : null;
  const cpl = kpis ? safeDivide(kpis.totalSpend, kpis.totalLeads) : null;
  const convRate = kpis ? safeDivide(kpis.totalConversions, kpis.totalClicks) : null;

  const SortHeader = ({ k, label }: { k: string; label: string }) => (
    <th className="text-left py-3 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <PageHeader title="Desempenho" description="Análise de desempenho por canal e campanha"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
            <Plus size={16} /> Novo Registro
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicial</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Final</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Canal</label>
          <select value={channelId} onChange={e => setChannelId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Campanha</label>
          <select value={campaignType} onChange={e => setCampaignType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {PERIOD_TYPES.map(p => <option key={p} value={p}>{PERIOD_TYPES_MAP[p]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : kpis && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-6">
            {[
              { l: 'Impressões', v: fmtNum(kpis.totalImpressions) },
              { l: 'Cliques', v: fmtNum(kpis.totalClicks) },
              { l: 'Sessões', v: fmtNum(kpis.totalSessions) },
              { l: 'Leads', v: fmtNum(kpis.totalLeads) },
              { l: 'Conversões', v: fmtNum(kpis.totalConversions) },
              { l: 'Investimento', v: fmtMoney(kpis.totalSpend) },
              { l: 'CTR', v: fmtPct(ctr) },
              { l: 'CPC', v: fmtMoney(cpc) },
              { l: 'CPL', v: fmtMoney(cpl) },
              { l: 'Taxa Conv.', v: fmtPct(convRate) },
            ].map(({ l, v }) => (
              <Card key={l} className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{l}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{v}</p>
              </Card>
            ))}
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MiniChart data={trends} dataKey="clicks" color="#3b82f6" label="Cliques" />
            <MiniChart data={trends} dataKey="sessions" color="#8b5cf6" label="Sessões" />
            <MiniChart data={trends} dataKey="leads" color="#10b981" label="Leads" />
            <MiniChart data={trends} dataKey="spend" color="#f59e0b" label="Investimento" />
          </div>

          {/* Data Table */}
          <Card title={`Registros de Desempenho (${sorted.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <SortHeader k="date" label="Data" />
                    <SortHeader k="channelName" label="Canal" />
                    <SortHeader k="campaignName" label="Campanha" />
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Tipo</th>
                    <SortHeader k="impressions" label="Impr." />
                    <SortHeader k="clicks" label="Cliques" />
                    <SortHeader k="sessions" label="Sessões" />
                    <SortHeader k="leads" label="Leads" />
                    <SortHeader k="conversions" label="Conv." />
                    <SortHeader k="cost" label="Custo" />
                    <th className="text-left py-3 px-2 font-medium text-gray-500">CTR</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">CPC</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">CPL</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={14} className="py-8 text-center text-gray-400">Nenhum registro encontrado</td></tr>
                  ) : sorted.map((row) => {
                    const rowCtr = safeDivide(row.clicks ?? 0, row.impressions ?? 0);
                    const rowCpc = safeDivide(row.cost ?? 0, row.clicks ?? 0);
                    const rowCpl = safeDivide(row.cost ?? 0, row.leads ?? 0);
                    return (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                        <td className="py-2.5 px-2 text-gray-700">{row.channelName}</td>
                        <td className="py-2.5 px-2 text-gray-700">{row.campaignName || '—'}</td>
                        <td className="py-2.5 px-2">{row.campaignType ? <Badge>{row.campaignType}</Badge> : '—'}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtNum(row.impressions)}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtNum(row.clicks)}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtNum(row.sessions)}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtNum(row.leads)}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtNum(row.conversions)}</td>
                        <td className="py-2.5 px-2 text-gray-700 text-right">{fmtMoney(row.cost)}</td>
                        <td className="py-2.5 px-2 text-gray-500 text-right">{fmtPct(rowCtr)}</td>
                        <td className="py-2.5 px-2 text-gray-500 text-right">{fmtMoney(rowCpc)}</td>
                        <td className="py-2.5 px-2 text-gray-500 text-right">{fmtMoney(rowCpl)}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(row)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(row.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <EntryFormModal
          channels={channels}
          initial={editEntry ? entryToForm(editEntry) : emptyForm}
          editId={editEntry?.id ?? null}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
