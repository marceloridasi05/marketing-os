import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { AnnotatedChart } from '../components/AnnotatedChart';

// --- Types ---
interface AdsRow {
  id: number; week: string; weekStart: string;
  gaImpressions: number | null; gaClicks: number | null; gaCtr: string | null;
  gaCpcAvg: string | null; gaCpmAvg: string | null; gaCostAvg: string | null;
  gaCvr: string | null; gaConversions: number | null; gaCostPerConversion: string | null;
  liImpressions: number | null; liClicks: number | null; liCost: number | null;
}

interface LiCampaignRow {
  id: number; week: string; weekStart: string;
  campaignName: string; accountType: string; funnelStage: string;
  impressions: number | null; clicks: number | null; ctr: string | null;
  frequency: string | null; cpcAvg: string | null; cost: number | null;
}

interface PerfEntry {
  id: number; date: string; periodType: string; channelId: number; channelName: string;
  campaignName: string | null; campaignType: string | null;
  impressions: number | null; clicks: number | null; sessions: number | null;
  users: number | null; newUsers: number | null; leads: number | null;
  conversions: number | null; cost: number | null; notes: string | null;
}
interface Channel { id: number; name: string; }

// --- Helpers ---
const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR') : '—';
const fmtMoney = (n: number | null) => n != null ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtDate = (d: string) => { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : d; };

const FUNNEL_LABELS: Record<string, string> = { awareness: 'Awareness', interest: 'Interest', decision: 'Decision', other: 'Outros' };
const FUNNEL_COLORS: Record<string, string> = { awareness: 'info', interest: 'warning', decision: 'success', other: 'default' };

function useSort<T>(data: T[], defaultKey: string, defaultAsc = true) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortAsc, setSortAsc] = useState(defaultAsc);
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
  const SortHeader = ({ k, label, align = 'left' }: { k: string; label: string; align?: 'left' | 'right' }) => (
    <th className={`${align === 'right' ? 'text-right' : 'text-left'} py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm`}
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
  return { sorted, SortHeader };
}

// --- Manual Entry Form ---
const CAMPAIGN_TYPES = ['brand', 'non_brand', 'awareness', 'ABM', 'institutional', 'event', 'organic'];
const PERIOD_TYPES_MAP: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
const PERIOD_TYPES = Object.keys(PERIOD_TYPES_MAP);

interface FormData {
  date: string; periodType: string; channelId: string; campaignName: string; campaignType: string;
  impressions: string; clicks: string; sessions: string; users: string; newUsers: string;
  leads: string; conversions: string; cost: string; notes: string;
}
const emptyForm: FormData = { date: new Date().toISOString().slice(0, 10), periodType: 'monthly', channelId: '', campaignName: '', campaignType: '', impressions: '', clicks: '', sessions: '', users: '', newUsers: '', leads: '', conversions: '', cost: '', notes: '' };

function entryToForm(e: PerfEntry): FormData {
  return { date: e.date, periodType: e.periodType, channelId: String(e.channelId), campaignName: e.campaignName ?? '', campaignType: e.campaignType ?? '', impressions: e.impressions != null ? String(e.impressions) : '', clicks: e.clicks != null ? String(e.clicks) : '', sessions: e.sessions != null ? String(e.sessions) : '', users: e.users != null ? String(e.users) : '', newUsers: e.newUsers != null ? String(e.newUsers) : '', leads: e.leads != null ? String(e.leads) : '', conversions: e.conversions != null ? String(e.conversions) : '', cost: e.cost != null ? String(e.cost) : '', notes: e.notes ?? '' };
}

const FIELD_LABELS: Record<string, string> = { impressions: 'Impressões', clicks: 'Cliques', sessions: 'Sessões', users: 'Usuários', newUsers: 'Novos Usuários', leads: 'Leads', conversions: 'Conversões', cost: 'Custo' };

function EntryFormModal({ channels, initial, editId, onClose, onSaved }: { channels: Channel[]; initial: FormData; editId: number | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId) return;
    setSaving(true);
    const numOrNull = (v: string) => v === '' ? null : Number(v);
    const payload = { date: form.date, periodType: form.periodType, channelId: Number(form.channelId), campaignName: form.campaignName || null, campaignType: form.campaignType || null, impressions: numOrNull(form.impressions), clicks: numOrNull(form.clicks), sessions: numOrNull(form.sessions), users: numOrNull(form.users), newUsers: numOrNull(form.newUsers), leads: numOrNull(form.leads), conversions: numOrNull(form.conversions), cost: numOrNull(form.cost), notes: form.notes || null };
    if (editId) await api.put(`/performance/${editId}`, payload);
    else await api.post('/performance', payload);
    setSaving(false);
    onSaved();
  };
  const inputCls = "border border-gray-300 rounded px-3 py-1.5 text-sm w-full";
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Editar Registro' : 'Novo Registro Manual'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Data *</label><input type="date" required value={form.date} onChange={set('date')} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Período *</label><select required value={form.periodType} onChange={set('periodType')} className={inputCls}>{PERIOD_TYPES.map(p => <option key={p} value={p}>{PERIOD_TYPES_MAP[p]}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Canal *</label><select required value={form.channelId} onChange={set('channelId')} className={inputCls}><option value="">Selecione...</option>{channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Nome da Campanha</label><input value={form.campaignName} onChange={set('campaignName')} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Campanha</label><select value={form.campaignType} onChange={set('campaignType')} className={inputCls}><option value="">—</option>{CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['impressions', 'clicks', 'sessions', 'users', 'newUsers', 'leads', 'conversions', 'cost'] as const).map(key => (
              <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1">{FIELD_LABELS[key]}</label><input type="number" step={key === 'cost' ? '0.01' : '1'} min="0" value={form[key]} onChange={set(key)} className={inputCls} placeholder="—" /></div>
            ))}
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Observações</label><textarea value={form.notes} onChange={set('notes')} className={inputCls} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50">{saving ? 'Salvando...' : editId ? 'Atualizar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main ---
export function Performance() {
  const [adsData, setAdsData] = useState<AdsRow[]>([]);
  const [liData, setLiData] = useState<LiCampaignRow[]>([]);
  const [manualData, setManualData] = useState<PerfEntry[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<PerfEntry | null>(null);
  const [tab, setTab] = useState<'google' | 'linkedin' | 'manual'>('google');

  // LinkedIn filters
  const [liAccountFilter, setLiAccountFilter] = useState('');
  const [liFunnelFilter, setLiFunnelFilter] = useState('');
  const [liCampaignFilter, setLiCampaignFilter] = useState('');

  useEffect(() => { api.get<Channel[]>('/channels').then(setChannels); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ads, li, manual] = await Promise.all([
      api.get<AdsRow[]>('/ads-kpis'),
      api.get<LiCampaignRow[]>('/ads-kpis/linkedin'),
      api.get<PerfEntry[]>('/performance'),
    ]);
    setAdsData(ads);
    setLiData(li);
    setManualData(manual);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/ads-kpis/sync', {});
      setLastSync(`${result.imported} semanas sincronizadas`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await api.del(`/performance/${id}`);
    fetchData();
  };

  const openEdit = (e: PerfEntry) => { setEditEntry(e); setShowForm(true); };
  const openCreate = () => { setEditEntry(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditEntry(null); fetchData(); };

  // LinkedIn unique values for filters
  const liAccountTypes = useMemo(() => [...new Set(liData.map(r => r.accountType))].sort(), [liData]);
  const liFunnelStages = useMemo(() => [...new Set(liData.map(r => r.funnelStage))].sort(), [liData]);
  const liCampaigns = useMemo(() => [...new Set(liData.map(r => r.campaignName))].sort(), [liData]);

  // Filtered LinkedIn data
  const filteredLi = useMemo(() => {
    return liData.filter(r => {
      if (liAccountFilter && r.accountType !== liAccountFilter) return false;
      if (liFunnelFilter && r.funnelStage !== liFunnelFilter) return false;
      if (liCampaignFilter && r.campaignName !== liCampaignFilter) return false;
      return true;
    });
  }, [liData, liAccountFilter, liFunnelFilter, liCampaignFilter]);

  // Ads KPIs summary
  const withData = adsData.filter(r => r.gaImpressions != null || r.liImpressions != null);
  const totalGaClicks = withData.reduce((s, r) => s + (r.gaClicks ?? 0), 0);
  const totalGaConv = withData.reduce((s, r) => s + (r.gaConversions ?? 0), 0);
  const totalGaImp = withData.reduce((s, r) => s + (r.gaImpressions ?? 0), 0);
  const totalLiImp = withData.reduce((s, r) => s + (r.liImpressions ?? 0), 0);
  const totalLiClicks = withData.reduce((s, r) => s + (r.liClicks ?? 0), 0);

  // Filtered LinkedIn KPIs
  const fLiImp = filteredLi.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const fLiClicks = filteredLi.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const fLiCost = filteredLi.reduce((s, r) => s + (r.cost ?? 0), 0);

  const chartData = withData.slice(-20).map(r => ({
    week: r.week.replace('Semana ', 'S'),
    'Google Cliques': r.gaClicks ?? 0,
    'LinkedIn Cliques': r.liClicks ?? 0,
    'Conversões': r.gaConversions ?? 0,
  }));

  const gaSort = useSort(adsData, 'weekStart', true);
  const liSort = useSort(filteredLi, 'weekStart', true);
  const manualSort = useSort(manualData, 'date', true);

  const inputCls = "border border-gray-300 rounded px-3 py-1.5 text-sm";
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-t-md ${tab === t ? 'bg-white text-gray-900 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <div>
      <PageHeader title="KPIs Ads" description="Métricas de anúncios Google Ads e LinkedIn Ads"
        actions={
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
              <Plus size={16} /> Registro Manual
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Google Impressões</p><p className="text-xl font-semibold text-gray-900 mt-1">{fmtNum(totalGaImp)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Google Cliques</p><p className="text-xl font-semibold text-gray-900 mt-1">{fmtNum(totalGaClicks)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">Google Conversões</p><p className="text-xl font-semibold text-gray-900 mt-1">{fmtNum(totalGaConv)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">LinkedIn Impressões</p><p className="text-xl font-semibold text-gray-900 mt-1">{fmtNum(totalLiImp)}</p></Card>
            <Card className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase">LinkedIn Cliques</p><p className="text-xl font-semibold text-gray-900 mt-1">{fmtNum(totalLiClicks)}</p></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <AnnotatedChart
              title="Cliques por Semana"
              data={chartData}
              xKey="week"
              lines={[
                { dataKey: 'Google Cliques', color: '#10b981', name: 'Google Cliques' },
                { dataKey: 'LinkedIn Cliques', color: '#0a66c2', name: 'LinkedIn Cliques' },
              ]}
              page="ads_kpis"
              chartKey="clicks"
            />
            <AnnotatedChart
              title="Conversões Google Ads"
              data={chartData}
              xKey="week"
              lines={[{ dataKey: 'Conversões', color: '#10b981', name: 'Conversões' }]}
              page="ads_kpis"
              chartKey="conversions"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-0">
            <button className={tabCls('google')} onClick={() => setTab('google')}>Google Ads</button>
            <button className={tabCls('linkedin')} onClick={() => setTab('linkedin')}>LinkedIn Ads</button>
            <button className={tabCls('manual')} onClick={() => setTab('manual')}>Registros Manuais ({manualData.length})</button>
          </div>

          {/* Google Ads Tab */}
          {tab === 'google' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <gaSort.SortHeader k="week" label="Semana" />
                      <gaSort.SortHeader k="weekStart" label="Início" />
                      <gaSort.SortHeader k="gaImpressions" label="Impressões" align="right" />
                      <gaSort.SortHeader k="gaClicks" label="Cliques" align="right" />
                      <gaSort.SortHeader k="gaCtr" label="CTR" align="right" />
                      <gaSort.SortHeader k="gaCpcAvg" label="CPC Médio" align="right" />
                      <gaSort.SortHeader k="gaCostAvg" label="Custo" align="right" />
                      <gaSort.SortHeader k="gaCvr" label="CVR" align="right" />
                      <gaSort.SortHeader k="gaConversions" label="Conv." align="right" />
                      <gaSort.SortHeader k="gaCostPerConversion" label="Custo/Conv." align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {gaSort.sorted.map(r => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.gaImpressions)}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.gaClicks)}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{r.gaCtr ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{r.gaCpcAvg ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{r.gaCostAvg ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-green-600">{r.gaCvr ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-green-600 font-medium">{fmtNum(r.gaConversions)}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{r.gaCostPerConversion ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* LinkedIn Ads Tab */}
          {tab === 'linkedin' && (
            <Card>
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Conta</label>
                  <select value={liAccountFilter} onChange={e => setLiAccountFilter(e.target.value)} className={inputCls}>
                    <option value="">Todas</option>
                    {liAccountTypes.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estágio do Funil</label>
                  <select value={liFunnelFilter} onChange={e => setLiFunnelFilter(e.target.value)} className={inputCls}>
                    <option value="">Todos</option>
                    {liFunnelStages.map(s => <option key={s} value={s}>{FUNNEL_LABELS[s] ?? s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Campanha</label>
                  <select value={liCampaignFilter} onChange={e => setLiCampaignFilter(e.target.value)} className={inputCls}>
                    <option value="">Todas</option>
                    {liCampaigns.map(c => <option key={c} value={c}>{c.replace('Linkedin Ads - ', '')}</option>)}
                  </select>
                </div>
                <div className="ml-auto flex gap-3 text-sm">
                  <span className="text-gray-500">Impr: <strong>{fmtNum(fLiImp)}</strong></span>
                  <span className="text-gray-500">Cliques: <strong>{fmtNum(fLiClicks)}</strong></span>
                  <span className="text-gray-500">Custo: <strong>{fmtMoney(fLiCost)}</strong></span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <liSort.SortHeader k="week" label="Semana" />
                      <liSort.SortHeader k="weekStart" label="Início" />
                      <liSort.SortHeader k="campaignName" label="Campanha" />
                      <liSort.SortHeader k="accountType" label="Tipo Conta" />
                      <liSort.SortHeader k="funnelStage" label="Funil" />
                      <liSort.SortHeader k="impressions" label="Impressões" align="right" />
                      <liSort.SortHeader k="clicks" label="Cliques" align="right" />
                      <liSort.SortHeader k="ctr" label="CTR" align="right" />
                      <liSort.SortHeader k="cpcAvg" label="CPC" align="right" />
                      <liSort.SortHeader k="cost" label="Custo" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {liSort.sorted.length === 0 ? (
                      <tr><td colSpan={10} className="py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
                    ) : liSort.sorted.map(r => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{r.week}</td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.weekStart)}</td>
                        <td className="py-2 px-2 text-gray-700 text-xs max-w-[200px] truncate" title={r.campaignName}>{r.campaignName.replace('Linkedin Ads - ', '')}</td>
                        <td className="py-2 px-2"><Badge>{r.accountType}</Badge></td>
                        <td className="py-2 px-2"><Badge variant={(FUNNEL_COLORS[r.funnelStage] ?? 'default') as 'info' | 'warning' | 'success' | 'default'}>{FUNNEL_LABELS[r.funnelStage] ?? r.funnelStage}</Badge></td>
                        <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.impressions)}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{fmtNum(r.clicks)}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{r.ctr ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{r.cpcAvg ?? '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-900">{fmtMoney(r.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Manual Tab */}
          {tab === 'manual' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <manualSort.SortHeader k="date" label="Data" />
                      <manualSort.SortHeader k="channelName" label="Canal" />
                      <manualSort.SortHeader k="campaignName" label="Campanha" />
                      <th className="text-left py-2.5 px-2 font-medium text-gray-500">Tipo</th>
                      <manualSort.SortHeader k="impressions" label="Impr." align="right" />
                      <manualSort.SortHeader k="clicks" label="Cliques" align="right" />
                      <manualSort.SortHeader k="leads" label="Leads" align="right" />
                      <manualSort.SortHeader k="conversions" label="Conv." align="right" />
                      <manualSort.SortHeader k="cost" label="Custo" align="right" />
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualSort.sorted.length === 0 ? (
                      <tr><td colSpan={10} className="py-8 text-center text-gray-400">Nenhum registro manual</td></tr>
                    ) : manualSort.sorted.map(row => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                        <td className="py-2 px-2 text-gray-700">{row.channelName}</td>
                        <td className="py-2 px-2 text-gray-700">{row.campaignName || '—'}</td>
                        <td className="py-2 px-2">{row.campaignType ? <Badge>{row.campaignType}</Badge> : '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{fmtNum(row.impressions)}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{fmtNum(row.clicks)}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{fmtNum(row.leads)}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{fmtNum(row.conversions)}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{fmtMoney(row.cost)}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(row)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(row.id)} className="p-1 text-gray-400 hover:text-red-600" title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {showForm && (
        <EntryFormModal channels={channels} initial={editEntry ? entryToForm(editEntry) : emptyForm}
          editId={editEntry?.id ?? null}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
          onSaved={handleSaved} />
      )}
    </div>
  );
}
