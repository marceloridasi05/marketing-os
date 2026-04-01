import { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { api } from '../lib/api';
import { RefreshCw } from 'lucide-react';

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
  done: '✅',
  ongoing: '🔄',
  failed: '❌',
  planned: '📋',
};

const OBJECTIVE_COLORS: Record<string, string> = {
  'Autoridade': '#3b82f6',
  'Branding': '#8b5cf6',
  'Confiança e Credibilidade': '#10b981',
  'Interesse/Desejo': '#f59e0b',
};

interface MonthCol { year: number; month: number; key: string; label: string }

export function Plan() {
  const [data, setData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | '2025' | '2026'>('2026');

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
      setLastSync(`${result.imported} linhas sincronizadas`);
      await fetchData();
    } catch { setLastSync('Erro ao sincronizar'); }
    setSyncing(false);
  };

  // Unique objectives and actions
  const objectives = useMemo(() => [...new Set(data.map(d => d.objective))], [data]);
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

  // Cell lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, ScheduleItem>();
    data.forEach(d => map.set(`${d.objective}|${d.action}|${d.year}-${d.month}`, d));
    return map;
  }, [data]);

  // Filter
  const filteredObjectives = objectiveFilter ? [objectiveFilter] : objectives;

  // Stats
  const totalActions = new Set(data.map(d => `${d.objective}|${d.action}`)).size;
  const doneCells = data.filter(d => d.status === 'done').length;
  const ongoingCells = data.filter(d => d.status === 'ongoing').length;
  const failedCells = data.filter(d => d.status === 'failed').length;
  const plannedCells = data.filter(d => d.status === 'planned').length;
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
          <span className="flex items-center gap-1">✅ Concluído</span>
          <span className="flex items-center gap-1">🔄 Em andamento</span>
          <span className="flex items-center gap-1">❌ Não executado</span>
          <span className="flex items-center gap-1">📋 Planejado</span>
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
            return (
              <CollapsibleCard key={obj} title={obj} className="mb-4" defaultOpen
                actions={
                  <span className="text-xs text-gray-400">{actions.length} ações</span>
                }>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-white z-10 min-w-[160px]">Ação</th>
                        {monthCols.map(mc => (
                          <th key={mc.key} className="text-center py-2 px-1 font-medium text-gray-500 whitespace-nowrap min-w-[80px]">{mc.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map(action => (
                        <tr key={action} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              {action}
                            </div>
                          </td>
                          {monthCols.map(mc => {
                            const cell = cellMap.get(`${obj}|${action}|${mc.year}-${mc.month}`);
                            const val = cell?.value;
                            const status = cell?.status;
                            const isEmpty = !val && !status;
                            const style = status ? STATUS_STYLES[status] || '' : '';
                            const icon = status ? STATUS_ICONS[status] || '' : '';

                            return (
                              <td key={mc.key} className="py-1 px-1 text-center">
                                {isEmpty ? (
                                  <span className="text-gray-200">—</span>
                                ) : (
                                  <div className={`rounded px-1 py-0.5 text-[10px] leading-tight border ${style || 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                    {icon && <span className="mr-0.5">{icon}</span>}
                                    {val && <span>{val}</span>}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleCard>
            );
          })}

          {/* Status breakdown by objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {objectives.map(obj => {
              const objData = data.filter(d => d.objective === obj);
              const d = objData.filter(d => d.status === 'done').length;
              const o = objData.filter(d => d.status === 'ongoing').length;
              const f = objData.filter(d => d.status === 'failed').length;
              const p = objData.filter(d => d.status === 'planned').length;
              const t = d + o + f + p;
              const color = OBJECTIVE_COLORS[obj] || '#6b7280';
              return (
                <Card key={obj} className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
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
    </div>
  );
}
