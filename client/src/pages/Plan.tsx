import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { api } from '../lib/api';
import { RefreshCw, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';

interface ScheduleItem {
  id: number;
  objective: string;
  action: string;
  year: number;
  month: number;
  value: string | null;
  status: string | null;
}

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
  { value: 'done', label: '✅ Concluído' },
  { value: 'failed', label: '❌ Não executado' },
];

const OBJECTIVE_COLORS: Record<string, string> = {
  'Autoridade': '#3b82f6',
  'Branding': '#8b5cf6',
  'Confiança e Credibilidade': '#10b981',
  'Interesse/Desejo': '#f59e0b',
};

interface MonthCol { year: number; month: number; key: string; label: string }

// --- Inline Edit Cell ---
function EditableCell({ item, onSaved }: { item: ScheduleItem | null; monthCol: MonthCol; objective: string; action: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item?.value ?? '');
  const [status, setStatus] = useState(item?.status ?? '');

  const handleSave = async () => {
    if (item) {
      await api.put(`/plan-schedule/${item.id}`, { value: val || null, status: status || null });
    }
    setEditing(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (item) {
      await api.del(`/plan-schedule/${item.id}`);
      setEditing(false);
      onSaved();
    }
  };

  if (!item) {
    return <span className="text-gray-200">—</span>;
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
  const isStrikethrough = item.status === 'failed' || (item.value && item.value.includes('❌'));

  return (
    <div
      className={`rounded px-1 py-0.5 text-[10px] leading-tight border cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all ${style || 'bg-gray-50 border-gray-100 text-gray-600'} ${isStrikethrough ? 'line-through opacity-60' : ''}`}
      onClick={() => { setVal(item.value ?? ''); setStatus(item.status ?? ''); setEditing(true); }}
      title="Clique para editar"
    >
      {icon && <span className="mr-0.5">{icon}</span>}
      {item.value && <span>{item.value}</span>}
    </div>
  );
}

// --- Add Cell Modal ---
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
          <h3 className="text-sm font-semibold">Adicionar célula — {action}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Mês</label>
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
            <label className="block text-xs text-gray-500 mb-0.5">Conteúdo</label>
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

// --- Rename Action/Objective Modal ---
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

export function Plan() {
  const [data, setData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | '2025' | '2026'>('2026');
  const [addCellTarget, setAddCellTarget] = useState<{ objective: string; action: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'action' | 'objective'; value: string; ids: number[] } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(await api.get<ScheduleItem[]>('/plan-schedule'));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.post<{ success: boolean; imported: number }>('/plan-schedule/sync', {});
      setLastSync(`${result.imported} células sincronizadas`);
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

  // Unique objectives and actions
  const objectives = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    data.forEach(d => { if (!seen.has(d.objective)) { seen.add(d.objective); result.push(d.objective); } });
    return result;
  }, [data]);

  const actionsByObjective = useMemo(() => {
    const map = new Map<string, string[]>();
    const seen = new Set<string>();
    data.forEach(d => {
      const key = `${d.objective}|${d.action}`;
      if (!seen.has(key)) {
        seen.add(key);
        const arr = map.get(d.objective) || [];
        arr.push(d.action);
        map.set(d.objective, arr);
      }
    });
    return map;
  }, [data]);

  // Build month columns based on filter
  const monthCols: MonthCol[] = useMemo(() => {
    const cols: MonthCol[] = [];
    if (yearFilter === '2025' || yearFilter === 'all') {
      for (let m = 9; m <= 12; m++) cols.push({ year: 2025, month: m, key: `2025-${m}`, label: `${MONTHS[m]}/25` });
    }
    if (yearFilter === '2026' || yearFilter === 'all') {
      for (let m = 1; m <= 12; m++) cols.push({ year: 2026, month: m, key: `2026-${m}`, label: `${MONTHS[m]}/26` });
    }
    return cols;
  }, [yearFilter]);

  // Cell lookup: objective|action|year-month -> items (can be multiple for merged/continuation rows)
  const cellMap = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    data.forEach(d => {
      const key = `${d.objective}|${d.action}|${d.year}-${d.month}`;
      const arr = map.get(key) || [];
      arr.push(d);
      map.set(key, arr);
    });
    return map;
  }, [data]);

  const filteredObjectives = objectiveFilter ? [objectiveFilter] : objectives;

  // Stats
  const totalActions = new Set(data.map(d => `${d.objective}|${d.action}`)).size;
  const allCellsWithStatus = data.filter(d => d.status);
  const doneCells = allCellsWithStatus.filter(d => d.status === 'done').length;
  const ongoingCells = allCellsWithStatus.filter(d => d.status === 'ongoing').length;
  const failedCells = allCellsWithStatus.filter(d => d.status === 'failed').length;
  const plannedCells = allCellsWithStatus.filter(d => d.status === 'planned').length;
  const totalCells = doneCells + ongoingCells + failedCells + plannedCells;
  const completionRate = totalCells > 0 ? ((doneCells / totalCells) * 100).toFixed(0) : '0';

  return (
    <div>
      <PageHeader title="Plano de Marketing" description="Cronograma de ações e iniciativas"
        actions={
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">{lastSync}</span>}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
            </button>
          </div>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Ações</p><p className="text-xl font-bold text-gray-900">{totalActions}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-green-400 uppercase">Concluídas</p><p className="text-xl font-bold text-green-600">{doneCells}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-blue-400 uppercase">Em Andamento</p><p className="text-xl font-bold text-blue-600">{ongoingCells}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-yellow-400 uppercase">Planejadas</p><p className="text-xl font-bold text-yellow-600">{plannedCells}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-red-400 uppercase">Não Exec.</p><p className="text-xl font-bold text-red-600">{failedCells}</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-green-500 uppercase">Conclusão</p><p className="text-xl font-bold text-green-600">{completionRate}%</p></Card>
        <Card className="min-w-0 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase">Objetivos</p><p className="text-xl font-bold text-gray-900">{objectives.length}</p></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
          <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {objectives.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
          <div className="flex gap-1">
            {(['all', '2025', '2026'] as const).map(y => (
              <button key={y} onClick={() => setYearFilter(y)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearFilter === y ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {y === 'all' ? 'Tudo' : y}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex gap-2 text-[10px] text-gray-500">
          <span>✅ Concluído</span>
          <span>🔄 Em andamento</span>
          <span>❌ Não executado</span>
          <span>📋 Planejado</span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Schedule grid by objective */}
          {filteredObjectives.map(obj => {
            const actions = actionsByObjective.get(obj) || [];
            const color = OBJECTIVE_COLORS[obj] || '#6b7280';
            const objIds = data.filter(d => d.objective === obj).map(d => d.id);
            return (
              <CollapsibleCard key={obj} className="mb-4" defaultOpen
                title={
                  <span className="flex items-center gap-2">
                    {obj}
                    <button onClick={(e) => { e.stopPropagation(); setRenameTarget({ type: 'objective', value: obj, ids: objIds }); }}
                      className="p-0.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Renomear objetivo">
                      <Pencil size={12} />
                    </button>
                  </span>
                }
                actions={<span className="text-xs text-gray-400">{actions.length} ações</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-white z-10 min-w-[180px]">Ação</th>
                        {monthCols.map(mc => (
                          <th key={mc.key} className="text-center py-2 px-1 font-medium text-gray-500 whitespace-nowrap min-w-[90px]">{mc.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => {
                        const actionIds = data.filter(d => d.objective === obj && d.action === action).map(d => d.id);
                        return (
                          <tr key={action} className="border-b border-gray-50 hover:bg-gray-50 group">
                            <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate max-w-[150px]">{action}</span>
                                <button onClick={() => setRenameTarget({ type: 'action', value: action, ids: actionIds })}
                                  className="p-0.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Renomear">
                                  <Pencil size={10} />
                                </button>
                                <button onClick={() => setAddCellTarget({ objective: obj, action })}
                                  className="p-0.5 text-gray-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Adicionar célula">
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>
                            {monthCols.map(mc => {
                              const items = cellMap.get(`${obj}|${action}|${mc.year}-${mc.month}`) || [];
                              return (
                                <td key={mc.key} className="py-1 px-1 text-center align-top">
                                  {items.length === 0 ? (
                                    <span className="text-gray-200">—</span>
                                  ) : items.length === 1 ? (
                                    <EditableCell item={items[0]} monthCol={mc} objective={obj} action={action} onSaved={fetchData} />
                                  ) : (
                                    <div className="space-y-0.5">
                                      {items.map(item => (
                                        <EditableCell key={item.id} item={item} monthCol={mc} objective={obj} action={action} onSaved={fetchData} />
                                      ))}
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

          {/* Status breakdown by objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {objectives.map(obj => {
              const objData = data.filter(d => d.objective === obj && d.status);
              const d = objData.filter(d => d.status === 'done').length;
              const o = objData.filter(d => d.status === 'ongoing').length;
              const f = objData.filter(d => d.status === 'failed').length;
              const p = objData.filter(d => d.status === 'planned').length;
              const t = d + o + f + p;
              const clr = OBJECTIVE_COLORS[obj] || '#6b7280';
              return (
                <Card key={obj} className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: clr }} />
                    <h4 className="text-xs font-semibold text-gray-700">{obj}</h4>
                    <span className="text-[10px] text-gray-400 ml-auto">{t > 0 ? `${((d / t) * 100).toFixed(0)}% concluído` : '—'}</span>
                  </div>
                  {t > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                      {d > 0 && <div className="bg-green-500 h-2" style={{ width: `${(d / t) * 100}%` }} />}
                      {o > 0 && <div className="bg-blue-500 h-2" style={{ width: `${(o / t) * 100}%` }} />}
                      {f > 0 && <div className="bg-red-400 h-2" style={{ width: `${(f / t) * 100}%` }} />}
                      {p > 0 && <div className="bg-yellow-300 h-2" style={{ width: `${(p / t) * 100}%` }} />}
                    </div>
                  )}
                  <div className="flex gap-3 mt-1.5 text-[10px]">
                    <span className="text-green-600">✅ {d}</span>
                    <span className="text-blue-600">🔄 {o}</span>
                    <span className="text-red-500">❌ {f}</span>
                    <span className="text-yellow-600">📋 {p}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add Cell Modal */}
      {addCellTarget && (
        <AddCellModal
          objective={addCellTarget.objective}
          action={addCellTarget.action}
          monthCols={monthCols}
          onClose={() => setAddCellTarget(null)}
          onSaved={() => { setAddCellTarget(null); fetchData(); }}
        />
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <RenameModal
          label={renameTarget.type === 'action' ? 'Ação' : 'Objetivo'}
          currentValue={renameTarget.value}
          onSave={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}
    </div>
  );
}
