import { useState } from 'react';
import { X, Loader2, CheckCircle2, CircleDashed, Link2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { Site } from '../context/SiteContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InspectConfig {
  spreadsheetId: string;
  gids: Record<string, number>;
  tabs: string[];
  columns: Record<string, string[]>;
}

interface TabDetail {
  name: string;
  gid: number;
  type: string | null;
}

interface InspectResult {
  config: InspectConfig;
  tabDetails: TabDetail[];
}

// ── Labels ────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  siteData:     'Desempenho do Site',
  adsKpis:      'KPIs de Ads (Google + LinkedIn)',
  linkedinPage: 'LinkedIn Page',
  planSchedule: 'Plano de Marketing',
  budgetItems:  'Orçamento',
  adsBudgets:   'Verbas Ads',
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCreated: (site: Site) => void;
}

export function NewSiteModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);
  const [inspectError, setInspectError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Sheet inspection ────────────────────────────────────────────────────────
  const handleInspect = async () => {
    const url = sheetUrl.trim();
    if (!url) return;
    setInspecting(true);
    setInspectError('');
    setInspectResult(null);
    try {
      // Use raw fetch here so we don't append siteId (not needed for inspection)
      const res = await fetch('/api/sheet-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const data: InspectResult = await res.json();
      setInspectResult(data);
    } catch (e) {
      setInspectError(e instanceof Error ? e.message : String(e));
    } finally {
      setInspecting(false);
    }
  };

  // ── Create site ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const trimName = name.trim();
    if (!trimName) { setError('Informe o nome do site'); return; }
    setSaving(true);
    setError('');
    try {
      const site = await api.post<Site>('/sites', {
        name: trimName,
        sheetConfig: inspectResult?.config ? JSON.stringify(inspectResult.config) : null,
      });
      onCreated(site);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const detected = inspectResult?.config.tabs ?? [];
  const missing = ALL_SECTIONS.filter(s => !detected.includes(s));

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

          {/* Site name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome da empresa *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Ex: Acme Corp"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Sheet URL */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Planilha Google Sheets <span className="text-gray-500">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={sheetUrl}
                onChange={e => {
                  setSheetUrl(e.target.value);
                  setInspectResult(null);
                  setInspectError('');
                }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleInspect}
                disabled={!sheetUrl.trim() || inspecting}
                className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                {inspecting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Link2 size={13} />}
                {inspecting ? 'Analisando…' : 'Inspecionar'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              A planilha deve estar com acesso público (qualquer pessoa com o link pode ver).
            </p>
          </div>

          {/* Inspect error */}
          {inspectError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{inspectError}</span>
            </div>
          )}

          {/* Inspect results */}
          {inspectResult && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-300">
                Resultado da inspeção — {detected.length} seção{detected.length !== 1 ? 'ões' : ''} encontrada{detected.length !== 1 ? 's' : ''}
              </p>

              {detected.length > 0 && (
                <div className="space-y-1.5">
                  {detected.map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>{SECTION_LABELS[s] ?? s}</span>
                      {inspectResult.config.columns[s] && (
                        <span className="text-gray-500">
                          · {inspectResult.config.columns[s].length} colunas detectadas
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {missing.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-gray-700">
                  <p className="text-xs text-gray-500">Não encontrado na planilha:</p>
                  {missing.map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                      <CircleDashed size={12} className="shrink-0" />
                      <span>{SECTION_LABELS[s] ?? s}</span>
                    </div>
                  ))}
                </div>
              )}

              {detected.length === 0 && (
                <p className="text-xs text-yellow-400">
                  Nenhuma aba com formato reconhecido foi encontrada. O site será criado sem vinculação de planilha — você pode configurar depois em Configurações.
                </p>
              )}

              {/* Raw tab list (collapsible detail) */}
              {inspectResult.tabDetails.length > 0 && (
                <details className="text-xs text-gray-500 pt-1">
                  <summary className="cursor-pointer hover:text-gray-400 select-none">
                    Ver todas as abas ({inspectResult.tabDetails.length})
                  </summary>
                  <ul className="mt-2 space-y-0.5 pl-2">
                    {inspectResult.tabDetails.map((t, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-gray-600">{t.gid}</span>
                        <span className="text-gray-400">{t.name}</span>
                        {t.type && <span className="text-indigo-400">→ {t.type}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Form error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
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
