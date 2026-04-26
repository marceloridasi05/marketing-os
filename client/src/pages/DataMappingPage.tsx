import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import {
  Plus, Pencil, Trash2, X, Search, ChevronDown, ChevronRight,
  Layers, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColumnMapping {
  index: number;
  header: string;
  meaning: string;
  year?: number;
  month?: number;
}

interface DataMapping {
  id: number;
  siteId: number;
  gid: string;
  tabName: string | null;
  dataType: string;
  headerRow: number;
  columnMappings: string; // JSON
  createdAt: string;
  updatedAt: string;
}

interface PreviewColumn { index: number; header: string; }

// ─── Meanings library ────────────────────────────────────────────────────────

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEARS = [2024, 2025, 2026, 2027];

interface MeaningDef { key: string; label: string; needsYM?: boolean; }

const DATA_TYPES: Record<string, { label: string; badge: string; meanings: MeaningDef[] }> = {
  budget: {
    label: 'Orcamento',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    meanings: [
      { key: 'section',       label: 'Secao / Grupo' },
      { key: 'strategy',      label: 'Estrategia' },
      { key: 'expense_type',  label: 'Tipo de Gasto' },
      { key: 'item_name',     label: 'Nome do Item' },
      { key: 'planned_month', label: 'Previsto (mes)', needsYM: true },
      { key: 'actual_month',  label: 'Realizado (mes)', needsYM: true },
      { key: 'planned_total', label: 'Total Previsto' },
      { key: 'actual_total',  label: 'Total Realizado' },
    ],
  },
  metrics: {
    label: 'Metricas de Site',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    meanings: [
      { key: 'date',         label: 'Data / Semana' },
      { key: 'sessions',     label: 'Sessoes' },
      { key: 'users',        label: 'Usuarios' },
      { key: 'new_users',    label: 'Novos Usuarios' },
      { key: 'leads',        label: 'Leads' },
      { key: 'paid_clicks',  label: 'Cliques Pagos' },
      { key: 'blog_sessions',label: 'Sessoes Blog' },
      { key: 'ai_sessions',  label: 'Sessoes IA' },
      { key: 'cost',         label: 'Custo' },
      { key: 'conversions',  label: 'Conversoes' },
      { key: 'impressions',  label: 'Impressoes' },
    ],
  },
  ads: {
    label: 'KPIs Ads',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    meanings: [
      { key: 'date',        label: 'Data / Semana' },
      { key: 'platform',    label: 'Plataforma' },
      { key: 'campaign',    label: 'Campanha' },
      { key: 'impressions', label: 'Impressoes' },
      { key: 'clicks',      label: 'Cliques' },
      { key: 'ctr',         label: 'CTR' },
      { key: 'cpc',         label: 'CPC' },
      { key: 'cost',        label: 'Custo' },
      { key: 'conversions', label: 'Conversoes' },
      { key: 'leads',       label: 'Leads' },
    ],
  },
  linkedin: {
    label: 'LinkedIn Page',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    meanings: [
      { key: 'date',              label: 'Data / Semana' },
      { key: 'followers',         label: 'Seguidores' },
      { key: 'followers_gained',  label: 'Seguidores Ganhos' },
      { key: 'impressions',       label: 'Impressoes' },
      { key: 'reactions',         label: 'Reacoes' },
      { key: 'comments',          label: 'Comentarios' },
      { key: 'shares',            label: 'Compartilhamentos' },
      { key: 'page_views',        label: 'Views de Pagina' },
      { key: 'unique_visitors',   label: 'Visitantes Unicos' },
    ],
  },
  plan: {
    label: 'Plano de Marketing',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    meanings: [
      { key: 'objective',   label: 'Objetivo' },
      { key: 'action',      label: 'Acao' },
      { key: 'channel',     label: 'Canal' },
      { key: 'status',      label: 'Status' },
      { key: 'month_value', label: 'Valor do Mes', needsYM: true },
    ],
  },
  experiments: {
    label: 'Experimentos',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    meanings: [
      { key: 'hypothesis',      label: 'Hipotese' },
      { key: 'expected_result', label: 'Resultado Esperado' },
      { key: 'channel',         label: 'Canal' },
      { key: 'metric',          label: 'Metrica' },
      { key: 'baseline',        label: 'Baseline' },
      { key: 'result',          label: 'Resultado' },
      { key: 'learning',        label: 'Aprendizado' },
      { key: 'status',          label: 'Status' },
      { key: 'start_date',      label: 'Data de Inicio' },
      { key: 'end_date',        label: 'Data de Fim' },
    ],
  },
  custom: {
    label: 'Personalizado',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    meanings: [
      { key: 'label',    label: 'Rotulo / Nome' },
      { key: 'value',    label: 'Valor' },
      { key: 'date',     label: 'Data' },
      { key: 'category', label: 'Categoria' },
      { key: 'text',     label: 'Texto' },
      { key: 'number',   label: 'Numero' },
    ],
  },
};

const ALL_MEANINGS_FLAT = Object.values(DATA_TYPES)
  .flatMap(dt => dt.meanings)
  .reduce<Record<string, string>>((acc, m) => { acc[m.key] = m.label; return acc; }, {});

function meaningLabel(key: string) {
  if (!key || key === 'ignore') return '— Ignorar —';
  return ALL_MEANINGS_FLAT[key] ?? key;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const inputCls = 'border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-400';
const selectCls = inputCls;

function parseColMappings(raw: string): ColumnMapping[] {
  try { return JSON.parse(raw) as ColumnMapping[]; } catch { return []; }
}

function blankForm() {
  return {
    gid: '',
    tabName: '',
    dataType: 'budget',
    headerRow: 0,
    cols: [] as ColumnMapping[],
  };
}

// ─── Column row ──────────────────────────────────────────────────────────────

function ColRow({
  col, dataType, onChange, onRemove,
}: {
  col: ColumnMapping;
  dataType: string;
  onChange: (c: ColumnMapping) => void;
  onRemove: () => void;
}) {
  const meanings = DATA_TYPES[dataType]?.meanings ?? [];
  const def = meanings.find(m => m.key === col.meaning);
  const needsYM = def?.needsYM ?? false;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      {/* Index */}
      <td className="px-3 py-2 w-14">
        <input
          type="number" min={0}
          value={col.index}
          onChange={e => onChange({ ...col, index: +e.target.value })}
          className="border border-gray-300 rounded px-2 py-1 text-xs w-full text-center font-mono"
        />
      </td>

      {/* Header text */}
      <td className="px-3 py-2">
        <input
          value={col.header}
          onChange={e => onChange({ ...col, header: e.target.value })}
          placeholder="Cabecalho da coluna"
          className="border border-gray-300 rounded px-2 py-1 text-xs w-full text-gray-600"
        />
      </td>

      {/* Meaning */}
      <td className="px-3 py-2 w-52">
        <select
          value={col.meaning}
          onChange={e => onChange({ ...col, meaning: e.target.value, year: undefined, month: undefined })}
          className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
        >
          <option value="">— Selecione —</option>
          {meanings.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
          <option value="ignore">— Ignorar —</option>
        </select>
      </td>

      {/* Year / Month (only when needsYM) */}
      <td className="px-3 py-2 w-40">
        {needsYM ? (
          <div className="flex gap-1">
            <select
              value={col.year ?? ''}
              onChange={e => onChange({ ...col, year: e.target.value ? +e.target.value : undefined })}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-20"
            >
              <option value="">Ano</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={col.month ?? ''}
              onChange={e => onChange({ ...col, month: e.target.value ? +e.target.value : undefined })}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-20"
            >
              <option value="">Mes</option>
              {MONTHS_PT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Remove */}
      <td className="px-2 py-2 w-8 text-right">
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Remover linha"
        >
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

// ─── Mapping Form (modal) ─────────────────────────────────────────────────────

function MappingModal({
  siteId, initial, editId, onClose, onSaved,
}: {
  siteId: number;
  initial: ReturnType<typeof blankForm>;
  editId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewErr, setPreviewErr] = useState('');
  const [previewCols, setPreviewCols] = useState<PreviewColumn[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [showSample, setShowSample] = useState(false);

  const loadPreview = async () => {
    if (!form.gid.trim()) { setPreviewErr('Informe o GID da aba primeiro.'); return; }
    setPreviewing(true);
    setPreviewErr('');
    try {
      const data = await api.get<{
        columns: PreviewColumn[];
        sampleRows: string[][];
        totalRows: number;
      }>(`/data-mappings/preview?siteId=${siteId}&gid=${form.gid.trim()}&headerRow=${form.headerRow}`);
      setPreviewCols(data.columns);
      setSampleRows(data.sampleRows);

      // Merge preview columns into existing col mappings:
      // keep user edits for cols already in form, add new ones from preview
      setForm(f => {
        const existing = new Map(f.cols.map(c => [c.index, c]));
        const merged = data.columns.map(pc => {
          const ex = existing.get(pc.index);
          return ex
            ? { ...ex, header: pc.header } // update header text, keep meaning
            : { index: pc.index, header: pc.header, meaning: '' };
        });
        // preserve any manually-added cols not in preview
        f.cols.forEach(c => {
          if (!merged.find(m => m.index === c.index)) merged.push(c);
        });
        merged.sort((a, b) => a.index - b.index);
        return { ...f, cols: merged };
      });
    } catch (e) {
      setPreviewErr(String(e));
    }
    setPreviewing(false);
  };

  const addBlankCol = () => {
    const maxIdx = form.cols.reduce((mx, c) => Math.max(mx, c.index), -1);
    setForm(f => ({
      ...f,
      cols: [...f.cols, { index: maxIdx + 1, header: '', meaning: '' }],
    }));
  };

  const updateCol = (i: number, col: ColumnMapping) => {
    setForm(f => { const c = [...f.cols]; c[i] = col; return { ...f, cols: c }; });
  };

  const removeCol = (i: number) => {
    setForm(f => ({ ...f, cols: f.cols.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.gid.trim()) { setError('GID da aba e obrigatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        siteId,
        gid: form.gid.trim(),
        tabName: form.tabName.trim() || null,
        dataType: form.dataType,
        headerRow: form.headerRow,
        columnMappings: form.cols.filter(c => c.meaning && c.meaning !== 'ignore' || c.meaning === 'ignore'),
      };
      if (editId) {
        await api.put(`/data-mappings/${editId}`, payload);
      } else {
        await api.post('/data-mappings', payload);
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  const dt = DATA_TYPES[form.dataType];
  const mappedCount = form.cols.filter(c => c.meaning && c.meaning !== 'ignore').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Layers size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {editId ? 'Editar mapeamento' : 'Novo mapeamento de aba'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                GID da aba <span className="text-red-500">*</span>
              </label>
              <input
                value={form.gid}
                onChange={e => setForm(f => ({ ...f, gid: e.target.value }))}
                placeholder="ex: 1316516870"
                className={inputCls + ' font-mono'}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Aparece na URL: <code className="bg-gray-100 px-1 rounded">…/edit?gid=<strong>1316516870</strong></code>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome da aba</label>
              <input
                value={form.tabName}
                onChange={e => setForm(f => ({ ...f, tabName: e.target.value }))}
                placeholder="ex: Custos e Ferramentas"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de dados</label>
              <select
                value={form.dataType}
                onChange={e => setForm(f => ({ ...f, dataType: e.target.value }))}
                className={selectCls}
              >
                {Object.entries(DATA_TYPES).map(([key, dt]) => (
                  <option key={key} value={key}>{dt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Linha de cabecalho (indice a partir de 0)
              </label>
              <input
                type="number" min={0}
                value={form.headerRow}
                onChange={e => setForm(f => ({ ...f, headerRow: +e.target.value }))}
                className={inputCls}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Linha que contem os nomes das colunas.
              </p>
            </div>
          </div>

          {/* Load preview */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadPreview}
              disabled={previewing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={previewing ? 'animate-spin' : ''} />
              {previewing ? 'Carregando...' : 'Carregar colunas da planilha'}
            </button>
            {previewCols.length > 0 && (
              <span className="text-xs text-gray-500">
                {previewCols.length} colunas detectadas
              </span>
            )}
            {previewCols.length > 0 && (
              <button
                onClick={() => setShowSample(s => !s)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                {showSample ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {showSample ? 'Ocultar amostras' : 'Ver amostras'}
              </button>
            )}
            {previewErr && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle size={13} /> {previewErr}
              </span>
            )}
          </div>

          {/* Sample data preview */}
          {showSample && sampleRows.length > 0 && (
            <div className="overflow-x-auto rounded border border-gray-200 bg-gray-50 p-2">
              <p className="text-[11px] text-gray-400 mb-1">Amostra de dados (linhas apos o cabecalho):</p>
              <table className="text-[11px] text-gray-600">
                <tbody>
                  {sampleRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.slice(0, 20).map((cell, ci) => (
                        <td key={ci} className="px-2 py-0.5 border border-gray-200 max-w-[120px] truncate">
                          {cell || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      {row.length > 20 && <td className="px-2 text-gray-400">+{row.length - 20}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Column mapping table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Mapeamento de colunas</h3>
                {mappedCount > 0 && (
                  <p className="text-xs text-gray-400">
                    {mappedCount} coluna{mappedCount !== 1 ? 's' : ''} mapeada{mappedCount !== 1 ? 's' : ''}
                    {' '}para dados do tipo <strong>{dt?.label}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={addBlankCol}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Plus size={13} /> Adicionar coluna
              </button>
            </div>

            {form.cols.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
                <Layers size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Carregue as colunas da planilha ou adicione manualmente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-14">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cabecalho na planilha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-52">Significado</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-40">Ano / Mes</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.cols.map((col, i) => (
                      <ColRow
                        key={i}
                        col={col}
                        dataType={form.dataType}
                        onChange={c => updateCol(i, c)}
                        onRemove={() => removeCol(i)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editId ? 'Atualizar mapeamento' : 'Salvar mapeamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mapping card ─────────────────────────────────────────────────────────────

function MappingCard({
  mapping, onEdit, onDelete,
}: {
  mapping: DataMapping;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dt = DATA_TYPES[mapping.dataType];
  const cols = parseColMappings(mapping.columnMappings);
  const mapped = cols.filter(c => c.meaning && c.meaning !== 'ignore');
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${dt?.badge ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {dt?.label ?? mapping.dataType}
            </span>
            {mapped.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={11} /> {mapped.length} coluna{mapped.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-800 truncate">
            {mapping.tabName || <span className="text-gray-400 italic">Sem nome</span>}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">GID {mapping.gid}</p>
          <p className="text-xs text-gray-400">Cabecalho na linha {mapping.headerRow}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Column summary */}
      {cols.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {cols.length} coluna{cols.length !== 1 ? 's' : ''} configurada{cols.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {cols.map((col, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 font-mono w-6 text-right">{col.index}</span>
                  <span className="text-gray-500 truncate flex-1">{col.header || '—'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    col.meaning === 'ignore'
                      ? 'bg-gray-100 text-gray-400'
                      : col.meaning
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {col.meaning
                      ? (col.meaning === 'ignore' ? 'ignorar' : meaningLabel(col.meaning))
                      : 'sem significado'}
                    {col.meaning !== 'ignore' && col.year && col.month
                      ? ` ${MONTHS_PT[col.month - 1]} ${col.year}`
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DataMappingPage() {
  const { selectedSite } = useSite();
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMapping, setEditMapping] = useState<DataMapping | null>(null);
  const [search, setSearch] = useState('');

  const fetchMappings = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    const rows = await api.get<DataMapping[]>(`/data-mappings?siteId=${selectedSite.id}`);
    setMappings(rows);
    setLoading(false);
  }, [selectedSite]);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  const handleDelete = async (m: DataMapping) => {
    if (!confirm(`Excluir mapeamento "${m.tabName || 'GID ' + m.gid}"?`)) return;
    await api.del(`/data-mappings/${m.id}`);
    fetchMappings();
  };

  const openCreate = () => { setEditMapping(null); setShowForm(true); };
  const openEdit = (m: DataMapping) => { setEditMapping(m); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditMapping(null); };
  const afterSave = () => { closeForm(); fetchMappings(); };

  const filtered = mappings.filter(m =>
    !search ||
    (m.tabName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    m.gid.includes(search) ||
    m.dataType.includes(search.toLowerCase())
  );

  const grouped = Object.entries(DATA_TYPES).map(([key, dt]) => ({
    key, dt, items: filtered.filter(m => m.dataType === key),
  })).filter(g => g.items.length > 0);

  const ungrouped = filtered.filter(m => !DATA_TYPES[m.dataType]);

  const hasSheet = selectedSite?.sheetConfig
    ? (() => { try { return !!JSON.parse(selectedSite.sheetConfig).spreadsheetId; } catch { return false; } })()
    : false;

  const initialForm = editMapping
    ? {
        gid: editMapping.gid,
        tabName: editMapping.tabName ?? '',
        dataType: editMapping.dataType,
        headerRow: editMapping.headerRow,
        cols: parseColMappings(editMapping.columnMappings),
      }
    : blankForm();

  return (
    <div>
      <PageHeader
        title="Mapeamento de Dados"
        description="Defina o significado de cada aba e coluna da sua planilha"
      />

      {/* No sheet warning */}
      {!hasSheet && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 text-amber-500" />
          <span>
            Este site nao tem planilha configurada. Configure o Google Sheets em{' '}
            <a href="/settings" className="underline font-medium">Configuracoes</a>{' '}
            para usar o carregamento automatico de colunas.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mapeamentos..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedSite}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <Plus size={15} /> Novo mapeamento
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
      ) : mappings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Layers size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">Nenhum mapeamento configurado</p>
          <p className="text-xs text-gray-400 mb-4">
            Mapeie as abas da planilha para que o sistema saiba interpretar os dados.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            <Plus size={14} /> Criar primeiro mapeamento
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">Nenhum resultado para "{search}".</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ key, dt, items }) => (
            <div key={key}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${dt.badge}`}>{dt.label}</span>
                <span>{items.length} aba{items.length !== 1 ? 's' : ''}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(m => (
                  <MappingCard
                    key={m.id}
                    mapping={m}
                    onEdit={() => openEdit(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Outros</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map(m => (
                  <MappingCard
                    key={m.id}
                    mapping={m}
                    onEdit={() => openEdit(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && selectedSite && (
        <MappingModal
          siteId={selectedSite.id}
          initial={initialForm}
          editId={editMapping?.id ?? null}
          onClose={closeForm}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}
