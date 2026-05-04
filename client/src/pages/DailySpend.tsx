import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { DataReadinessBadge } from '../components/DataReadinessBadge';
import { useFieldConfiguration } from '../hooks/useFieldConfiguration';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';

interface DailySpendRow {
  id: number;
  date: string;
  channel: string | null;
  campaign: string | null;
  source: string | null;
  medium: string | null;
  spend: number | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
}

const fmtNum = (n: number | null) => n != null ? n.toLocaleString('pt-BR') : '—';
const fmtDate = (d: string) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

const CHANNELS = ['google_ads', 'linkedin', 'meta', 'direct', 'organic', 'referral', 'email', 'other'];

function heatBg(value: number | null, min: number, max: number): string {
  if (value == null || max === min) return '';
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const alpha = (ratio * 0.28).toFixed(2);
  return `rgba(34, 197, 94, ${alpha})`;
}

function useColumnRange<T>(data: T[], key: keyof T): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (const row of data) {
    const v = row[key];
    if (typeof v === 'number' && v > 0) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
}

function HeatTd({ value, min, max, className = '' }: { value: number | null; min: number; max: number; className?: string }) {
  const bg = heatBg(value, min, max);
  return (
    <td className={`py-2 px-2 text-center text-gray-900 ${className}`} style={bg ? { backgroundColor: bg } : undefined}>
      {fmtNum(value)}
    </td>
  );
}

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
    <th className={`${align === 'right' ? 'text-center' : 'text-left'} py-2.5 px-2 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-sm`}
      onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
  return { sorted, SortHeader };
}

export default function DailySpend() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || 0;

  const {
    completeness,
    loading: configLoading,
    filterField,
    isFieldRequired,
    getGuidanceMessage,
  } = useFieldConfiguration(siteId, 'daily-spend');

  const [rawData, setRawData] = useState<DailySpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRow, setEditingRow] = useState<Partial<DailySpendRow> | null>(null);
  const { timePeriod, dateRange, filterProps } = useTimeFilter('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<DailySpendRow[]>('/daily-spend');
      setRawData(rows);
    } catch (err) {
      console.error('Error fetching daily spend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/daily-spend/sync', {});
      setLastSync(`${result.imported} dias sincronizados`);
      await fetchData();
    } catch (err) { setLastSync(`Erro: ${err}`); }
    setSyncing(false);
  };

  const handleAddRow = () => {
    setEditingRow({
      date: new Date().toISOString().split('T')[0],
      channel: null,
      campaign: null,
      source: null,
      medium: null,
      spend: null,
      clicks: null,
      impressions: null,
      conversions: null,
    });
    setManualMode(true);
  };

  const handleSaveRow = async () => {
    if (!editingRow) return;
    setIsSubmitting(true);
    try {
      if (editingRow.id) {
        // Update existing
        await api.put(`/daily-spend/${editingRow.id}`, editingRow);
      } else {
        // Create new
        await api.post('/daily-spend/manual', editingRow);
      }
      setLastSync(`Dados ${editingRow.id ? 'atualizados' : 'adicionados'}`);
      setEditingRow(null);
      setManualMode(false);
      await fetchData();
    } catch (err) {
      setLastSync(`Erro ao salvar: ${err}`);
    }
    setIsSubmitting(false);
  };

  const handleDeleteRow = async (id: number) => {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/daily-spend/${id}`);
      setLastSync('Linha deletada');
      await fetchData();
    } catch (err) {
      setLastSync(`Erro ao deletar: ${err}`);
    }
  };

  const data = useMemo(() => {
    if (!dateRange) return rawData;
    return rawData.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
  }, [rawData, dateRange]);

  const withData = data.filter(r => r.spend != null && r.spend > 0);
  const totalSpend = withData.reduce((s, r) => s + (r.spend ?? 0), 0);
  const totalClicks = withData.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = withData.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalConversions = withData.reduce((s, r) => s + (r.conversions ?? 0), 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const sort = useSort(data, 'date', false);
  const rSpend = useColumnRange(data, 'spend');
  const rClicks = useColumnRange(data, 'clicks');
  const rImpressions = useColumnRange(data, 'impressions');

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    const agg: Record<string, { spend: number; clicks: number; impressions: number; conversions: number }> = {};
    for (const r of withData) {
      const ch = r.channel || 'unknown';
      if (!agg[ch]) agg[ch] = { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      agg[ch].spend += r.spend ?? 0;
      agg[ch].clicks += r.clicks ?? 0;
      agg[ch].impressions += r.impressions ?? 0;
      agg[ch].conversions += r.conversions ?? 0;
    }
    return Object.entries(agg).map(([channel, metrics]) => ({
      channel,
      ...metrics,
      cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0,
      cpm: metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : 0,
    }));
  }, [withData]);

  return (
    <div>
      <PageHeader
        title="Ads & Spend"
        description="Rastreamento diário de gastos com anúncios"
        actions={
          <div className="flex items-center gap-3">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
          </div>
        }
      />

      {/* Time filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TimeFilter {...filterProps} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : data.length === 0 && !manualMode ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Nenhum dado de gasto ainda.</p>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Adicionar Primeiro Dia
          </button>
        </Card>
      ) : manualMode && editingRow ? (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRow.id ? 'Editar' : 'Adicionar'} Gasto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filterField('date') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Data {isFieldRequired('date') && '*'}
                </label>
                <input
                  type="date"
                  value={editingRow.date || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, date: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {filterField('channel') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Canal {isFieldRequired('channel') && '*'}
                </label>
                <select
                  value={editingRow.channel || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, channel: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Selecione um canal</option>
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
            )}
            {filterField('campaign') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Campanha {isFieldRequired('campaign') && '*'}
                </label>
                <input
                  type="text"
                  placeholder="Nome da campanha"
                  value={editingRow.campaign || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, campaign: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {filterField('spend') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Gasto {isFieldRequired('spend') && '*'}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={editingRow.spend || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, spend: parseFloat(e.target.value) || null })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {filterField('clicks') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cliques {isFieldRequired('clicks') && '*'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={editingRow.clicks || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, clicks: parseInt(e.target.value) || null })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {filterField('impressions') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Impressões {isFieldRequired('impressions') && '*'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={editingRow.impressions || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, impressions: parseInt(e.target.value) || null })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {filterField('conversions') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Conversões {isFieldRequired('conversions') && '*'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={editingRow.conversions || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, conversions: parseInt(e.target.value) || null })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveRow}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setEditingRow(null); setManualMode(false); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Gasto Total</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">R$ {fmtNum(totalSpend)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Cliques Totais</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalClicks)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">CPC Médio</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">R$ {avgCpc.toFixed(2)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">CPM Médio</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">R$ {avgCpm.toFixed(2)}</p>
            </Card>
            <Card className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase">Conversões</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtNum(totalConversions)}</p>
            </Card>
          </div>

          {/* Data Readiness Badge & Guidance */}
          <div className="mb-6 space-y-3">
            {completeness.totalRequired > 0 && (
              <DataReadinessBadge
                completeness={completeness.completeness}
                totalRequired={completeness.totalRequired}
                filledRequired={completeness.filledRequired}
                showDetails={true}
                size="md"
              />
            )}
            {getGuidanceMessage() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">{getGuidanceMessage()}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddRow}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Adicionar Linha Manual
            </button>
          </div>

          {/* Channel Breakdown */}
          {channelBreakdown.length > 0 && (
            <CollapsibleCard title="Breakdown por Canal" className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2.5 px-2 font-medium text-gray-500">Canal</th>
                      {filterField('spend') && <th className="text-center py-2.5 px-2 font-medium text-gray-500">Gasto</th>}
                      {filterField('clicks') && <th className="text-center py-2.5 px-2 font-medium text-gray-500">Cliques</th>}
                      {filterField('impressions') && <th className="text-center py-2.5 px-2 font-medium text-gray-500">Impressões</th>}
                      {filterField('conversions') && <th className="text-center py-2.5 px-2 font-medium text-gray-500">Conversões</th>}
                      <th className="text-center py-2.5 px-2 font-medium text-gray-500">CPC</th>
                      <th className="text-center py-2.5 px-2 font-medium text-gray-500">CPM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelBreakdown.map((ch) => (
                      <tr key={ch.channel} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-700">{ch.channel}</td>
                        {filterField('spend') && <HeatTd value={ch.spend} min={rSpend.min} max={rSpend.max} />}
                        {filterField('clicks') && <HeatTd value={ch.clicks} min={rClicks.min} max={rClicks.max} />}
                        {filterField('impressions') && <HeatTd value={ch.impressions} min={rImpressions.min} max={rImpressions.max} />}
                        {filterField('conversions') && <td className="py-2 px-2 text-center">{fmtNum(ch.conversions)}</td>}
                        <td className="py-2 px-2 text-center text-gray-600">R$ {ch.cpc.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center text-gray-600">R$ {ch.cpm.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>
          )}

          {/* Daily Spend Table */}
          <CollapsibleCard title="Gastos Diários" className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <sort.SortHeader k="date" label="Data" />
                    {filterField('channel') && <sort.SortHeader k="channel" label={`Canal${isFieldRequired('channel') ? ' *' : ''}`} />}
                    {filterField('campaign') && <sort.SortHeader k="campaign" label={`Campanha${isFieldRequired('campaign') ? ' *' : ''}`} />}
                    {filterField('spend') && <sort.SortHeader k="spend" label={`Gasto${isFieldRequired('spend') ? ' *' : ''}`} align="right" />}
                    {filterField('clicks') && <sort.SortHeader k="clicks" label={`Cliques${isFieldRequired('clicks') ? ' *' : ''}`} align="right" />}
                    {filterField('impressions') && <sort.SortHeader k="impressions" label={`Impressões${isFieldRequired('impressions') ? ' *' : ''}`} align="right" />}
                    {filterField('conversions') && <sort.SortHeader k="conversions" label={`Conversões${isFieldRequired('conversions') ? ' *' : ''}`} align="right" />}
                    <th className="text-center py-2.5 px-2 font-medium text-gray-500 text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sort.sorted.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      {filterField('channel') && <td className="py-2 px-2 text-gray-700">{r.channel || '—'}</td>}
                      {filterField('campaign') && <td className="py-2 px-2 text-gray-700">{r.campaign || '—'}</td>}
                      {filterField('spend') && <HeatTd value={r.spend} min={rSpend.min} max={rSpend.max} />}
                      {filterField('clicks') && <HeatTd value={r.clicks} min={rClicks.min} max={rClicks.max} />}
                      {filterField('impressions') && <HeatTd value={r.impressions} min={rImpressions.min} max={rImpressions.max} />}
                      {filterField('conversions') && <td className="py-2 px-2 text-center">{fmtNum(r.conversions)}</td>}
                      <td className="py-2 px-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              setEditingRow(r);
                              setManualMode(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteRow(r.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>
        </>
      )}
    </div>
  );
}
