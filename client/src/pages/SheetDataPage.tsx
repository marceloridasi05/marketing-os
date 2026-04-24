import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Loader2, Table2 } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import type { SheetMeta, ColumnMeta } from '../context/SiteContext';
import { api } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SheetRow {
  id: number;
  rowIndex: number;
  rowData: Record<string, string>;
}

// ── Cell formatting ───────────────────────────────────────────────────────────

function formatCell(value: string, type: ColumnMeta['type']): string {
  if (!value) return '—';
  if (type === 'percentage' && !value.endsWith('%')) return value + '%';
  return value;
}

function cellAlign(type: ColumnMeta['type']): string {
  return type === 'number' || type === 'currency' || type === 'percentage'
    ? 'text-right tabular-nums'
    : 'text-left';
}

// ── Column header ─────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<ColumnMeta['type'], string> = {
  number:     'text-blue-400',
  currency:   'text-green-400',
  percentage: 'text-purple-400',
  date:       'text-yellow-400',
  text:       'text-gray-500',
};

// ── Main component ────────────────────────────────────────────────────────────

export function SheetDataPage() {
  const { gid: gidParam } = useParams<{ gid: string }>();
  const gid = Number(gidParam);

  const { siteSchema } = useSite();
  const sheet: SheetMeta | undefined = siteSchema.sheets?.find(s => s.gid === gid);

  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<SheetRow[]>(`/sheet-data?gid=${gid}`);
      setRows(data);
      if (data.length > 0) setLastSync(data[0]?.syncedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [gid]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      await api.post(`/sheet-data/sync?gid=${gid}`, {});
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // Columns to display: use schema if available, else derive from first row
  const displayColumns: ColumnMeta[] = sheet?.columns.length
    ? sheet.columns
    : rows.length > 0
      ? Object.keys(rows[0].rowData).map((name, i) => ({ index: i, name, type: 'text' as const }))
      : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <Table2 size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{sheet?.name ?? `Aba ${gid}`}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {displayColumns.length} colunas
              {rows.length > 0 && ` · ${rows.length} linhas`}
              {lastSync && ` · sincronizado em ${new Date(lastSync).toLocaleString('pt-BR')}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty state — no data yet */}
      {!loading && rows.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-16 text-gray-400">
          <Table2 size={40} className="mb-4 opacity-30" />
          <p className="text-sm font-medium">Nenhum dado carregado ainda</p>
          <p className="text-xs mt-1">Clique em <strong>Sincronizar</strong> para importar os dados da planilha.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Table */}
      {!loading && rows.length > 0 && displayColumns.length > 0 && (
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {displayColumns.map(col => (
                  <th
                    key={col.index}
                    className={`px-3 py-2 font-semibold text-gray-700 whitespace-nowrap ${cellAlign(col.type)}`}
                  >
                    <span>{col.name}</span>
                    <span className={`ml-1 text-xs font-normal ${TYPE_BADGE[col.type]}`}>
                      {col.type === 'text' ? '' : col.type}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${ri % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  {displayColumns.map(col => (
                    <td
                      key={col.index}
                      className={`px-3 py-2 text-gray-700 ${cellAlign(col.type)}`}
                    >
                      {formatCell(row.rowData[col.name] ?? '', col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
