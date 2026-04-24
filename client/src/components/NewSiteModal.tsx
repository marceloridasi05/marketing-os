import { useState } from 'react';
import {
  X, Loader2, Link2, AlertCircle, Table2, Sparkles,
} from 'lucide-react';
import type { Site, SheetMeta } from '../context/SiteContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InspectResult {
  config: {
    spreadsheetId: string;
    gids: Record<string, number>;
    tabs: string[];
    sheets: SheetMeta[];
    columns: Record<string, string[]>;
  };
  sheets: SheetMeta[];
}

const KNOWN_TYPE_LABELS: Record<string, string> = {
  siteData:     'Desempenho do Site',
  adsKpis:      'KPIs Ads',
  linkedinPage: 'LinkedIn Page',
  planSchedule: 'Plano de Marketing',
  budgetItems:  'Orçamento',
  adsBudgets:   'Verbas Ads',
};

const TYPE_COLORS: Record<string, string> = {
  siteData:     'text-blue-400 bg-blue-900/30 border-blue-700/40',
  adsKpis:      'text-orange-400 bg-orange-900/30 border-orange-700/40',
  linkedinPage: 'text-sky-400 bg-sky-900/30 border-sky-700/40',
  planSchedule: 'text-purple-400 bg-purple-900/30 border-purple-700/40',
  budgetItems:  'text-green-400 bg-green-900/30 border-green-700/40',
  adsBudgets:   'text-yellow-400 bg-yellow-900/30 border-yellow-700/40',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCreated: (site: Site) => void;
}

export function NewSiteModal({ onClose, onCreated }: Props) {
  const [name, setName]           = useState('');
  const [sheetUrl, setSheetUrl]   = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);
  const [inspectError, setInspectError]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // ── Inspect ────────────────────────────────────────────────────────────────
  const handleInspect = async () => {
    const url = sheetUrl.trim();
    if (!url) return;
    setInspecting(true);
    setInspectError('');
    setInspectResult(null);
    try {
      const res = await fetch('/api/sheet-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setInspectResult(data);
    } catch (e) {
      setInspectError(e instanceof Error ? e.message : String(e));
    } finally {
      setInspecting(false);
    }
  };

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const trimName = name.trim();
    if (!trimName) { setError('Informe o nome do site'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: trimName,
        sheetConfig: inspectResult?.config ? JSON.stringify(inspectResult.config) : null,
      };
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      onCreated(data as Site);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const sheets = inspectResult?.sheets ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold">Novo Site</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome da empresa *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !saving && handleCreate()}
              placeholder="Ex: Acme Corp"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Sheet URL */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Planilha Google Sheets <span className="text-gray-600">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={sheetUrl}
                onChange={e => { setSheetUrl(e.target.value); setInspectResult(null); setInspectError(''); }}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleInspect}
                disabled={!sheetUrl.trim() || inspecting}
                className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                {inspecting ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                {inspecting ? 'Analisando…' : 'Inspecionar'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              A planilha deve ser pública (qualquer pessoa com o link pode ver).
            </p>
          </div>

          {/* Inspect error */}
          {inspectError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{inspectError}</span>
            </div>
          )}

          {/* Discovered sheets */}
          {sheets.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700">
                <Sparkles size={13} className="text-indigo-400" />
                <p className="text-xs font-semibold text-gray-300">
                  {sheets.length} aba{sheets.length !== 1 ? 's' : ''} descoberta{sheets.length !== 1 ? 's' : ''} — o app vai se adaptar a esta estrutura
                </p>
              </div>
              <ul className="divide-y divide-gray-700/50">
                {sheets.map(sheet => (
                  <li key={sheet.gid} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Table2 size={13} className="text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-200 truncate">{sheet.name}</span>
                      {sheet.type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[sheet.type] ?? 'text-gray-400 bg-gray-700/40 border-gray-600/40'}`}>
                          {KNOWN_TYPE_LABELS[sheet.type] ?? sheet.type}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {sheet.columns.length} cols
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No sheets found after inspection */}
          {inspectResult && sheets.length === 0 && (
            <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2.5">
              Nenhuma aba com dados foi encontrada. Verifique se a planilha está pública e tem conteúdo.
            </div>
          )}

          {/* Form error */}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Criar Site
          </button>
        </div>

      </div>
    </div>
  );
}
