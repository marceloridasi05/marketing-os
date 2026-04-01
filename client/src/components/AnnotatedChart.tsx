import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Card } from './Card';
import { api } from '../lib/api';
import { MessageSquarePlus, X, Trash2 } from 'lucide-react';

interface Annotation {
  id: number;
  page: string;
  chartKey: string;
  xValue: string;
  comment: string;
}

interface LineConfig {
  dataKey: string;
  color: string;
  name?: string;
}

interface AnnotatedChartProps {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineConfig[];
  page: string;
  chartKey: string;
  height?: number;
  chartType?: 'line' | 'bar';
  referenceY?: number;
  referenceLabel?: string;
  referenceLines?: { y: number; label: string; color: string }[];
}

export function AnnotatedChart({ title, data, xKey, lines, page, chartKey, height = 200, chartType = 'line', referenceY, referenceLabel, referenceLines }: AnnotatedChartProps) {
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedX, setSelectedX] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [replicateToAll, setReplicateToAll] = useState(true);

  const fetchAnnotations = useCallback(async () => {
    const rows = await api.get<Annotation[]>(`/chart-annotations?page=${page}&chartKey=${chartKey}`);
    setAnnotations(rows);
  }, [page, chartKey]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  const handleXClick = (xValue: string) => {
    setSelectedX(xValue);
    setComment('');
    setReplicateToAll(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!comment.trim() || !selectedX) return;
    setSaving(true);
    await api.post('/chart-annotations', {
      page, chartKey, xValue: selectedX, comment: comment.trim(),
      replicateToAll,
    });
    await fetchAnnotations();
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    await api.del(`/chart-annotations/${id}`);
    await fetchAnnotations();
  };

  const annotatedXValues = new Set(annotations.map(a => a.xValue));

  // X-axis labels available from data
  const xValues = data.map(d => String(d[xKey]));

  // Custom X-axis tick that shows annotation indicator
  const CustomTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const hasAnnotation = annotatedXValues.has(payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fontSize={10} fill="#6b7280"
          style={{ cursor: 'pointer' }}
          onClick={() => handleXClick(payload.value)}>
          {payload.value}
        </text>
        {hasAnnotation && (
          <circle cx={0} cy={4} r={3} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
        )}
      </g>
    );
  };

  // Custom tooltip that shows annotations
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload || !label) return null;
    const ann = annotations.filter(a => a.xValue === label);
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</strong>
          </p>
        ))}
        {ann.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            {ann.map(a => (
              <p key={a.id} className="text-xs text-amber-700 flex items-start gap-1">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                {a.comment}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="min-h-48">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className="flex items-center gap-1">
          {annotations.length > 0 && (
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-1 rounded text-xs ${showAnnotations ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Ver comentários">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {annotations.length}
              </span>
            </button>
          )}
          <button onClick={() => { setSelectedX(xValues[xValues.length - 1] || ''); setComment(''); setReplicateToAll(true); setShowForm(true); }}
            className="p-1 text-gray-400 hover:text-blue-600" title="Adicionar comentário">
            <MessageSquarePlus size={16} />
          </button>
        </div>
      </div>

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={CustomTick as unknown as React.ComponentType} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip content={CustomTooltip as unknown as React.ComponentType} />
              <Legend
                onClick={(e: { dataKey?: string }) => { if (e.dataKey) setHiddenLines(prev => { const n = new Set(prev); if (n.has(e.dataKey!)) n.delete(e.dataKey!); else n.add(e.dataKey!); return n; }); }}
                formatter={(value: string, entry: { dataKey?: string }) => (
                  <span style={{ color: hiddenLines.has(entry.dataKey ?? '') ? '#ccc' : undefined, cursor: 'pointer', fontSize: 11, textDecoration: hiddenLines.has(entry.dataKey ?? '') ? 'line-through' : undefined }}>{value}</span>
                )}
                wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
              />
              {referenceY != null && referenceY > 0 && (
                <ReferenceLine y={referenceY} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: referenceLabel || '', position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 600 }} />
              )}
              {referenceLines?.map((rl, i) => (
                <ReferenceLine key={`ref-${i}`} y={rl.y} stroke={rl.color} strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: rl.label, position: i === 0 ? 'insideTopRight' : 'insideBottomRight', fontSize: 10, fill: rl.color, fontWeight: 600 }} />
              ))}
              {lines.map(l => (
                <Bar key={l.dataKey} dataKey={l.dataKey} name={l.name || l.dataKey}
                  fill={l.color} radius={[2, 2, 0, 0]}
                  hide={hiddenLines.has(l.dataKey)} />
              ))}
              {annotations.map(a => (
                <ReferenceLine key={a.id} x={a.xValue} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={CustomTick as unknown as React.ComponentType} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip content={CustomTooltip as unknown as React.ComponentType} />
              <Legend
                onClick={(e: { dataKey?: string }) => { if (e.dataKey) setHiddenLines(prev => { const n = new Set(prev); if (n.has(e.dataKey!)) n.delete(e.dataKey!); else n.add(e.dataKey!); return n; }); }}
                formatter={(value: string, entry: { dataKey?: string }) => (
                  <span style={{ color: hiddenLines.has(entry.dataKey ?? '') ? '#ccc' : undefined, cursor: 'pointer', fontSize: 11, textDecoration: hiddenLines.has(entry.dataKey ?? '') ? 'line-through' : undefined }}>{value}</span>
                )}
                wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
              />
              {referenceY != null && referenceY > 0 && (
                <ReferenceLine y={referenceY} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: referenceLabel || '', position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 600 }} />
              )}
              {referenceLines?.map((rl, i) => (
                <ReferenceLine key={`ref-${i}`} y={rl.y} stroke={rl.color} strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: rl.label, position: i === 0 ? 'insideTopRight' : 'insideBottomRight', fontSize: 10, fill: rl.color, fontWeight: 600 }} />
              ))}
              {lines.map(l => (
                <Line key={l.dataKey} type="monotone" dataKey={l.dataKey} name={l.name || l.dataKey}
                  stroke={l.color} strokeWidth={2} dot={{ r: 2 }}
                  hide={hiddenLines.has(l.dataKey)} />
              ))}
              {annotations.map(a => (
                <ReferenceLine key={a.id} x={a.xValue} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400 py-8 text-center">Dados insuficientes para o gráfico</p>
      )}

      {/* Annotation list */}
      {showAnnotations && annotations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          {annotations.map(a => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-gray-500 font-medium whitespace-nowrap">{a.xValue}:</span>
              <span className="text-gray-700 flex-1">{a.comment}</span>
              <button onClick={() => handleDelete(a.id)} className="p-0.5 text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add annotation modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Comentário no gráfico</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ponto no eixo X</label>
                <select value={selectedX} onChange={e => setSelectedX(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                  {xValues.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Comentário</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" rows={2}
                  placeholder="Ex: Campanha pausada nesta semana..." autoFocus />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="replicate-all" checked={replicateToAll}
                  onChange={e => setReplicateToAll(e.target.checked)}
                  className="rounded border-gray-300" />
                <label htmlFor="replicate-all" className="text-xs text-gray-600">
                  Replicar para todos os gráficos desta seção
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !comment.trim()}
                  className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
