import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import {
  RefreshCw, Pencil, X, Check, Plus, Trash2,
  LayoutGrid, Table2, Target, TrendingUp, Info,
} from 'lucide-react';
import {
  STAGE_META, STAGE_ORDER, getStage, getMetricLabel,
  METRIC_OPTION_GROUPS,
} from '../lib/metricClassification';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleItem {
  id: number;
  objective: string;
  action: string;
  year: number;
  month: number;
  value: string | null;
  status: string | null;
}

interface InitiativeMeta {
  id: number;
  siteId: number | null;
  objective: string;
  action: string;
  businessObjective: string | null;
  metricKey: string | null;
  expectedOutcome: string | null;
  notes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-green-100 text-green-800 border-green-200',
  ongoing: 'bg-blue-100 text-blue-800 border-blue-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  planned: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

const STATUS_ICONS: Record<string, string> = {
  done: '✅', ongoing: '🔄', failed: '❌', planned: '📋',
};

const STATUS_OPTIONS = [
  { value: '', label: '— Limpar' },
  { value: 'planned', label: '📋 Planejado' },
  { value: 'ongoing', label: '🔄 Em andamento' },
  { value: 'done', label: '✅ Concluido' },
  { value: 'failed', label: '❌ Nao executado' },
];

const OBJECTIVE_COLORS: Record<string, string> = {
  'Autoridade': '#3b82f6',
  'Branding': '#8b5cf6',
  'Confiança e Credibilidade': '#10b981',
  'Interesse/Desejo': '#f59e0b',
};

function objColor(obj: string) { return OBJECTIVE_COLORS[obj] || '#6b7280'; }

interface MonthCol { year: number; month: number; key: string; label: string }

// ─── Initiative Meta Modal ────────────────────────────────────────────────────

function InitiativeMetaModal({
  objective, action, existing, siteId, onClose, onSaved,
}: {
  objective: string;
  action: string;
  existing: InitiativeMeta | null;
  siteId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    businessObjective: existing?.businessObjective ?? '',
    metricKey: existing?.metricKey ?? '',
    expectedOutcome: existing?.expectedOutcome ?? '',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      siteId,
      objective,
      action,
      businessObjective: form.businessObjective || null,
      metricKey: form.metricKey || null,
      expectedOutcome: form.expectedOutcome || null,
      notes: form.notes || null,
    };
    if (existing) {
      await api.put(`/initiative-meta/${existing.id}`, payload);
    } else {
      await api.post('/initiative-meta', payload);
    }
    setSaving(false);
    onSaved();
  };

  const resolvedStage = form.metricKey ? getStage(form.metricKey) : null;
  const stageMeta = resolvedStage ? STAGE_META[resolvedStage] : null;

  const inp = 'border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-400';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{objective}</p>
            <h2 className="text-sm font-semibold text-gray-900">{action}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Business objective */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Target size={13} className="text-indigo-500" />
              Objetivo de negocio
            </label>
            <textarea
              value={form.businessObjective}
              onChange={e => setForm(f => ({ ...f, businessObjective: e.target.value }))}
              placeholder="Ex: Aumentar pipeline qualificado em 30% ate Q3"
              rows={2}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">Por que esta iniciativa existe? Qual impacto estrategico espera?</p>
          </div>

          {/* Metric impacted */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-indigo-500" />
              Metrica impactada
            </label>
            <div className="flex items-center gap-2">
              <select
                value={form.metricKey}
                onChange={e => setForm(f => ({ ...f, metricKey: e.target.value }))}
                className={inp}
              >
                <option value="">— Selecione uma metrica —</option>
                {METRIC_OPTION_GROUPS.map(group => (
                  <optgroup key={group.stage} label={group.label}>
                    {group.options.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {stageMeta && (
                <span className={`shrink-0 px-2 py-1 rounded border text-[11px] font-medium ${stageMeta.color}`}>
                  {stageMeta.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Qual indicador do sistema esta iniciativa vai mover?</p>
          </div>

          {/* Expected outcome */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Check size={13} className="text-indigo-500" />
              Resultado esperado
            </label>
            <textarea
              value={form.expectedOutcome}
              onChange={e => setForm(f => ({ ...f, expectedOutcome: e.target.value }))}
              placeholder="Ex: +20% de leads por mes, reducao de CPL de R$800 para R$600"
              rows={2}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">Resultado quantificado ao concluir esta iniciativa.</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={inp}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar iniciativa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Initiative card (card view) ─────────────────────────────────────────────

function InitiativeCard({
  objective, action, meta, schedule, onEdit,
}: {
  objective: string;
  action: string;
  meta: InitiativeMeta | null;
  schedule: ScheduleItem[];
  onEdit: () => void;
}) {
  const color = objColor(objective);
  const stage = meta?.metricKey ? getStage(meta.metricKey) : null;
  const stageMeta = stage ? STAGE_META[stage] : null;

  const total = schedule.filter(s => s.status && s.status !== 'empty').length;
  const done = schedule.filter(s => s.status === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : null;

  const isComplete = !meta?.businessObjective && !meta?.metricKey && !meta?.expectedOutcome;

  return (
    <Card className="flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-400 truncate">{objective}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 leading-tight">{action}</h3>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Editar iniciativa"
        >
          {isComplete ? <Plus size={14} /> : <Pencil size={14} />}
        </button>
      </div>

      {/* Metadata */}
      {isComplete ? (
        <button
          onClick={onEdit}
          className="text-left text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
        >
          + Adicionar objetivo, metrica e resultado esperado
        </button>
      ) : (
        <div className="space-y-2 text-xs">
          {meta?.businessObjective && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Objetivo de negocio</p>
              <p className="text-gray-700 leading-snug">{meta.businessObjective}</p>
            </div>
          )}
          {meta?.metricKey && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Metrica</p>
              <span className="font-medium text-gray-700">{getMetricLabel(meta.metricKey)}</span>
              {stageMeta && (
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${stageMeta.color}`}>
                  {stageMeta.label}
                </span>
              )}
            </div>
          )}
          {meta?.expectedOutcome && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Resultado esperado</p>
              <p className="text-gray-700 leading-snug">{meta.expectedOutcome}</p>
            </div>
          )}
        </div>
      )}

      {/* Progress footer */}
      {total > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>{done}/{total} meses concluidos</span>
            {pct !== null && <span className="font-semibold text-gray-600">{pct}%</span>}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Inline Edit Cell ────────────────────────────────────────────────────────

function EditableCell({ item, onSaved }: { item: ScheduleItem | null; monthCol: MonthCol; objective: string; action: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item?.value ?? '');
  const [status, setStatus] = useState(item?.status ?? '');

  const handleSave = async () => {
    if (item) await api.put(`/plan-schedule/${item.id}`, { value: val || null, status: status || null });
    setEditing(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item) { await api.del(`/plan-schedule/${item.id}`); setEditing(false); onSaved(); }
  };

  if (!item) return <span className="text-gray-200">—</span>;
  if (item.status === 'empty' && !editing) {
    return <span className="text-gray-300 cursor-pointer" onClick={() => { setVal(''); setStatus(''); setEditing(true); }}>—</span>;
  }
  if (editing) {
    return (
      <div className="space-y-1">
        <input value={val} onChange={e => setVal(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] w-full" autoFocus />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded px-1 py-0.5 text-[10px] w-full">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-0.5 justify-center">
          <button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-800"><Check size={12} /></button>
          <button onClick={() => setEditing(false)} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>
          <button onClick={handleDelete} className="p-0.5 text-red-400 hover:text-red-600"><Trash2 size={10} /></button>
        </div>
      </div>
    );
  }

  const style = item.status ? STATUS_STYLES[item.status] || '' : '';
  const icon = item.status ? STATUS_ICONS[item.status] || '' : '';
  const strike = item.status === 'failed' || (item.value && item.value.includes('❌'));

  return (
    <div
      className={`rounded px-1 py-0.5 text-[10px] leading-tight border cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all ${style || 'bg-gray-50 border-gray-100 text-gray-600'} ${strike ? 'line-through opacity-60' : ''}`}
      onClick={() => { setVal(item.value ?? ''); setStatus(item.status ?? ''); setEditing(true); }}
    >
      {icon && <span className="mr-0.5">{icon}</span>}
      {item.value && <span>{item.value}</span>}
    </div>
  );
}

// ─── Add Cell Modal ──────────────────────────────────────────────────────────

function AddCellModal({ objective, action, monthCols, onClose, onSaved }: {
  objective: string; action: string; monthCols: MonthCol[]; onClose: () => void; onSaved: () => void;
}) {
  const [year, setYear] = useState(monthCols[0]?.year ?? 2026);
  const [month, setMonth] = useState(monthCols[0]?.month ?? 1);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('planned');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api.post('/plan-schedule', { objective, action, year, month, value: value || null, status: status || null });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Adicionar — {action}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Mes</label>
              <select value={month} onChange={e => setMonth(+e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Ano</label>
              <select value={year} onChange={e => setYear(+e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
                <option value={2025}>2025</option><option value={2026}>2026</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Conteudo</label>
            <input value={value} onChange={e => setValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-full">
              {STATUS_OPTIONS.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Rename Modal ────────────────────────────────────────────────────────────

function RenameModal({ label, currentValue, onSave, onClose }: {
  label: string; currentValue: string; onSave: (v: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(currentValue);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
        <h3 className="text-sm font-semibold mb-3">Editar {label}</h3>
        <input value={value} onChange={e => setValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full mb-3" autoFocus />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onSave(value); onClose(); }} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Plan() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id ?? null;

  const [data, setData] = useState<ScheduleItem[]>([]);
  const [metaList, setMetaList] = useState<InitiativeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | '2025' | '2026'>('2026');

  const [addCellTarget, setAddCellTarget] = useState<{ objective: string; action: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'action' | 'objective'; value: string; ids: number[] } | null>(null);
  const [editMetaTarget, setEditMetaTarget] = useState<{ objective: string; action: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = siteId ? `?siteId=${siteId}` : '';
    const [schedule, meta] = await Promise.all([
      api.get<ScheduleItem[]>(`/plan-schedule${qs}`),
      api.get<InitiativeMeta[]>(`/initiative-meta${qs}`),
    ]);
    setData(schedule);
    setMetaList(meta);
    setLoading(false);
  }, [siteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const qs = siteId ? `?siteId=${siteId}` : '';
      const result = await api.post<{ success: boolean; imported: number }>(`/plan-schedule/sync${qs}`, {});
      setLastSync(`${result.imported} celulas sincronizadas`);
      await fetchData();
    } catch { setLastSync('Erro ao sincronizar'); }
    setSyncing(false);
  };

  const handleRename = async (newValue: string) => {
    if (!renameTarget) return;
    for (const id of renameTarget.ids) {
      const update: Record<string, string> = {};
      if (renameTarget.type === 'action') update.action = newValue;
      else update.objective = newValue;
      await api.put(`/plan-schedule/${id}`, update);
    }
    fetchData();
  };

  // Derived data
  const objectives = useMemo(() => {
    const seen = new Set<string>(); const r: string[] = [];
    data.forEach(d => { if (!seen.has(d.objective)) { seen.add(d.objective); r.push(d.objective); } });
    return r;
  }, [data]);

  const actionsByObjective = useMemo(() => {
    const map = new Map<string, string[]>(); const seen = new Set<string>();
    data.forEach(d => {
      const k = `${d.objective}|${d.action}`;
      if (!seen.has(k)) { seen.add(k); const a = map.get(d.objective) || []; a.push(d.action); map.set(d.objective, a); }
    });
    return map;
  }, [data]);

  const metaMap = useMemo(() => {
    const m = new Map<string, InitiativeMeta>();
    metaList.forEach(mt => m.set(`${mt.objective}|${mt.action}`, mt));
    return m;
  }, [metaList]);

  const monthCols: MonthCol[] = useMemo(() => {
    const cols: MonthCol[] = [];
    if (yearFilter === '2025' || yearFilter === 'all') for (let m = 9; m <= 12; m++) cols.push({ year: 2025, month: m, key: `2025-${m}`, label: `${MONTHS[m]}/25` });
    if (yearFilter === '2026' || yearFilter === 'all') for (let m = 1; m <= 12; m++) cols.push({ year: 2026, month: m, key: `2026-${m}`, label: `${MONTHS[m]}/26` });
    return cols;
  }, [yearFilter]);

  const cellMap = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    data.forEach(d => {
      const key = `${d.objective}|${d.action}|${d.year}-${d.month}`;
      const arr = map.get(key) || []; arr.push(d); map.set(key, arr);
    });
    return map;
  }, [data]);

  // All unique (objective, action) pairs with metadata for card/filter view
  const allInitiatives = useMemo(() => {
    const seen = new Set<string>(); const r: { objective: string; action: string }[] = [];
    data.forEach(d => {
      const k = `${d.objective}|${d.action}`;
      if (!seen.has(k)) { seen.add(k); r.push({ objective: d.objective, action: d.action }); }
    });
    return r;
  }, [data]);

  const filteredObjectives = useMemo(() => {
    let objs = objectiveFilter ? [objectiveFilter] : objectives;
    if (stageFilter) {
      objs = objs.filter(obj =>
        (actionsByObjective.get(obj) ?? []).some(action => {
          const meta = metaMap.get(`${obj}|${action}`);
          const stage = meta?.metricKey ? getStage(meta.metricKey) : null;
          return stage === stageFilter;
        })
      );
    }
    return objs;
  }, [objectiveFilter, stageFilter, objectives, actionsByObjective, metaMap]);

  // Stats
  const totalActions = new Set(data.map(d => `${d.objective}|${d.action}`)).size;
  const allCells = data.filter(d => d.status && d.status !== 'empty');
  const doneCells = allCells.filter(d => d.status === 'done').length;
  const ongoingCells = allCells.filter(d => d.status === 'ongoing').length;
  const failedCells = allCells.filter(d => d.status === 'failed').length;
  const plannedCells = allCells.filter(d => d.status === 'planned').length;
  const totalCells = doneCells + ongoingCells + failedCells + plannedCells;
  const completionRate = totalCells > 0 ? ((doneCells / totalCells) * 100).toFixed(0) : '0';
  const withMeta = allInitiatives.filter(i => {
    const m = metaMap.get(`${i.objective}|${i.action}`);
    return m?.businessObjective || m?.metricKey || m?.expectedOutcome;
  }).length;
  const metaCoverage = allInitiatives.length > 0 ? Math.round((withMeta / allInitiatives.length) * 100) : 0;

  const editMeta = editMetaTarget
    ? metaMap.get(`${editMetaTarget.objective}|${editMetaTarget.action}`) ?? null
    : null;

  return (
    <div>
      <PageHeader
        title="Plano de Marketing"
        description="Iniciativas, cronograma e resultados esperados"
        actions={
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        }
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
        <Card className="text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Iniciativas</p><p className="text-xl font-bold text-gray-900">{totalActions}</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-green-400 uppercase">Concluidas</p><p className="text-xl font-bold text-green-600">{doneCells}</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-blue-400 uppercase">Em Andamento</p><p className="text-xl font-bold text-blue-600">{ongoingCells}</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-yellow-400 uppercase">Planejadas</p><p className="text-xl font-bold text-yellow-600">{plannedCells}</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-red-400 uppercase">Nao Exec.</p><p className="text-xl font-bold text-red-600">{failedCells}</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-green-500 uppercase">Conclusao</p><p className="text-xl font-bold text-green-600">{completionRate}%</p></Card>
        <Card className="text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Objetivos</p><p className="text-xl font-bold text-gray-900">{objectives.length}</p></Card>
        <Card className="text-center">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase">c/ Metrica</p>
          <p className={`text-xl font-bold ${metaCoverage >= 80 ? 'text-green-600' : metaCoverage >= 40 ? 'text-yellow-600' : 'text-gray-400'}`}>{metaCoverage}%</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        {/* View toggle */}
        <div className="flex gap-1 rounded-md border border-gray-200 p-0.5">
          <button onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <Table2 size={13} /> Grid
          </button>
          <button onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'cards' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid size={13} /> Iniciativas
          </button>
        </div>

        {/* Objective filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
          <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {objectives.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Stage filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Etapa do funil</label>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todas</option>
            {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
          </select>
        </div>

        {/* Year filter (grid only) */}
        {viewMode === 'grid' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Periodo</label>
            <div className="flex gap-1">
              {(['all', '2025', '2026'] as const).map(y => (
                <button key={y} onClick={() => setYearFilter(y)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearFilter === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {y === 'all' ? 'Tudo' : y}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="ml-auto flex gap-2 text-[10px] text-gray-500">
            <span>✅ Concluido</span><span>🔄 Em andamento</span><span>❌ Nao executado</span><span>📋 Planejado</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : viewMode === 'cards' ? (
        /* ── Card view ── */
        <div className="space-y-6">
          {filteredObjectives.map(obj => {
            const actions = (actionsByObjective.get(obj) ?? []).filter(action => {
              if (!stageFilter) return true;
              const meta = metaMap.get(`${obj}|${action}`);
              const stage = meta?.metricKey ? getStage(meta.metricKey) : null;
              return stage === stageFilter;
            });
            if (actions.length === 0) return null;
            const color = objColor(obj);
            return (
              <div key={obj}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h2 className="text-sm font-semibold text-gray-700">{obj}</h2>
                  <span className="text-xs text-gray-400">{actions.length} iniciativas</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actions.map(action => (
                    <InitiativeCard
                      key={action}
                      objective={obj}
                      action={action}
                      meta={metaMap.get(`${obj}|${action}`) ?? null}
                      schedule={data.filter(d => d.objective === obj && d.action === action)}
                      onEdit={() => setEditMetaTarget({ objective: obj, action })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Grid view ── */
        <>
          {filteredObjectives.map(obj => {
            const actions = actionsByObjective.get(obj) || [];
            const color = objColor(obj);
            const objIds = data.filter(d => d.objective === obj).map(d => d.id);
            return (
              <CollapsibleCard key={obj} className="mb-4" defaultOpen
                title={
                  <span className="flex items-center gap-2">
                    {obj}
                    <button onClick={(e) => { e.stopPropagation(); setRenameTarget({ type: 'objective', value: obj, ids: objIds }); }}
                      className="p-0.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={12} />
                    </button>
                  </span>
                }
                actions={<span className="text-xs text-gray-400">{actions.length} acoes</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500 sticky left-0 bg-white z-10 min-w-[220px]">
                          Acao / Iniciativa
                        </th>
                        {monthCols.map(mc => (
                          <th key={mc.key} className="text-center py-2 px-1 font-medium text-gray-500 whitespace-nowrap min-w-[90px]">{mc.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => {
                        const metaRec = metaMap.get(`${obj}|${action}`);
                        const stage = metaRec?.metricKey ? getStage(metaRec.metricKey) : null;
                        const stageMeta = stage ? STAGE_META[stage] : null;
                        const actionIds = data.filter(d => d.objective === obj && d.action === action).map(d => d.id);

                        const cellsByCol = monthCols.map(mc => cellMap.get(`${obj}|${action}|${mc.year}-${mc.month}`) || []);
                        const fillStatuses: (string | null)[] = [];
                        let lastStatus: string | null = null; let gapCount = 0;
                        for (let ci = 0; ci < cellsByCol.length; ci++) {
                          const cells = cellsByCol[ci];
                          if (cells.length > 0) {
                            const firstStatus = cells[0].status;
                            if (firstStatus === 'empty') { fillStatuses.push(null); lastStatus = null; gapCount = 0; }
                            else { lastStatus = firstStatus; gapCount = 0; fillStatuses.push(null); }
                          } else if (lastStatus && gapCount < 5) {
                            const nextIdx = cellsByCol.findIndex((c, j) => j > ci && c.length > 0);
                            if (nextIdx > -1 || gapCount < 3) { fillStatuses.push(lastStatus); gapCount++; }
                            else { fillStatuses.push(null); lastStatus = null; }
                          } else { fillStatuses.push(null); lastStatus = null; }
                        }

                        return (
                          <tr key={action} className="border-b border-gray-50 hover:bg-gray-50 group">
                            <td className="py-2 px-2 sticky left-0 bg-white z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-medium text-gray-700 truncate max-w-[140px]">{action}</span>
                                {/* Meta indicators */}
                                {stageMeta && (
                                  <span className={`shrink-0 px-1 py-0.5 rounded border text-[9px] font-medium ${stageMeta.color}`}>
                                    {stageMeta.label}
                                  </span>
                                )}
                                {/* Action buttons */}
                                <button onClick={() => setEditMetaTarget({ objective: obj, action })}
                                  className="p-0.5 text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Editar iniciativa">
                                  <Info size={11} />
                                </button>
                                <button onClick={() => setRenameTarget({ type: 'action', value: action, ids: actionIds })}
                                  className="p-0.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Pencil size={10} />
                                </button>
                                <button onClick={() => setAddCellTarget({ objective: obj, action })}
                                  className="p-0.5 text-gray-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Plus size={10} />
                                </button>
                              </div>
                              {/* Inline meta snippet */}
                              {metaRec?.expectedOutcome && (
                                <p className="text-[9px] text-gray-400 mt-0.5 pl-3.5 truncate max-w-[200px]" title={metaRec.expectedOutcome}>
                                  {metaRec.expectedOutcome}
                                </p>
                              )}
                            </td>
                            {monthCols.map((mc, colIdx) => {
                              const items = cellsByCol[colIdx];
                              const fillStatus = fillStatuses[colIdx];
                              if (items.length === 0 && fillStatus) {
                                return (
                                  <td key={mc.key} className="py-1 px-1 text-center align-top">
                                    <div className={`rounded px-1 py-0.5 border opacity-30 h-5 ${STATUS_STYLES[fillStatus] || ''}`} />
                                  </td>
                                );
                              }
                              return (
                                <td key={mc.key} className="py-1 px-1 text-center align-top">
                                  {items.length === 0 ? (
                                    <span className="text-gray-200">—</span>
                                  ) : items.length === 1 ? (
                                    <EditableCell item={items[0]} monthCol={mc} objective={obj} action={action} onSaved={fetchData} />
                                  ) : (
                                    <div className="space-y-0.5">
                                      {items.map(item => <EditableCell key={item.id} item={item} monthCol={mc} objective={obj} action={action} onSaved={fetchData} />)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CollapsibleCard>
            );
          })}

          {/* Status breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {objectives.map(obj => {
              const od = data.filter(d => d.objective === obj && d.status && d.status !== 'empty');
              const d2 = od.filter(d => d.status === 'done').length;
              const o2 = od.filter(d => d.status === 'ongoing').length;
              const f2 = od.filter(d => d.status === 'failed').length;
              const p2 = od.filter(d => d.status === 'planned').length;
              const t2 = d2 + o2 + f2 + p2;
              const clr = objColor(obj);
              return (
                <Card key={obj} className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: clr }} />
                    <h4 className="text-xs font-semibold text-gray-700">{obj}</h4>
                    <span className="text-[10px] text-gray-400 ml-auto">{t2 > 0 ? `${((d2 / t2) * 100).toFixed(0)}% concluido` : '—'}</span>
                  </div>
                  {t2 > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                      {d2 > 0 && <div className="bg-green-500 h-2" style={{ width: `${(d2 / t2) * 100}%` }} />}
                      {o2 > 0 && <div className="bg-blue-500 h-2" style={{ width: `${(o2 / t2) * 100}%` }} />}
                      {f2 > 0 && <div className="bg-red-400 h-2" style={{ width: `${(f2 / t2) * 100}%` }} />}
                      {p2 > 0 && <div className="bg-yellow-300 h-2" style={{ width: `${(p2 / t2) * 100}%` }} />}
                    </div>
                  )}
                  <div className="flex gap-3 mt-1.5 text-[10px]">
                    <span className="text-green-600">✅ {d2}</span><span className="text-blue-600">🔄 {o2}</span>
                    <span className="text-red-500">❌ {f2}</span><span className="text-yellow-600">📋 {p2}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      {addCellTarget && (
        <AddCellModal objective={addCellTarget.objective} action={addCellTarget.action} monthCols={monthCols}
          onClose={() => setAddCellTarget(null)} onSaved={() => { setAddCellTarget(null); fetchData(); }} />
      )}
      {renameTarget && (
        <RenameModal label={renameTarget.type === 'action' ? 'Acao' : 'Objetivo'} currentValue={renameTarget.value}
          onSave={handleRename} onClose={() => setRenameTarget(null)} />
      )}
      {editMetaTarget && (
        <InitiativeMetaModal
          objective={editMetaTarget.objective}
          action={editMetaTarget.action}
          existing={editMeta}
          siteId={siteId}
          onClose={() => setEditMetaTarget(null)}
          onSaved={() => { setEditMetaTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}
