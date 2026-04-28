import { useEffect, useState } from 'react';
import { useSite } from '../context/SiteContext';
import { UtmCampaignFilter } from '../components/UtmCampaignFilter';
import {
  TrendingDown, AlertTriangle, DollarSign, Target,
  GitBranch, RefreshCw, CheckCircle2, Zap,
} from 'lucide-react';
import { STAGE_META } from '../lib/metricClassification';
import type { FunnelStage } from '../lib/metricClassification';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Insight {
  id: string;
  type: 'drop' | 'inconsistency' | 'spend' | 'goal';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
  metric?: string;
  stage?: string;
  delta?: number;
  period?: string;
}

interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_ICON = {
  drop:          TrendingDown,
  inconsistency: GitBranch,
  spend:         DollarSign,
  goal:          Target,
} as const;

const TYPE_LABEL = {
  drop:          'Queda',
  inconsistency: 'Inconsistência',
  spend:         'Orçamento',
  goal:          'Meta',
} as const;

const SEV_CFG = {
  critical: {
    label:     'Crítico',
    leftBg:    'bg-red-500',
    cardBg:    'bg-red-50',
    border:    'border-red-100',
    iconColor: 'text-red-500',
    badge:     'bg-red-100 text-red-700',
    pill:      'bg-red-100 text-red-700',
    dot:       'bg-red-500',
  },
  warning: {
    label:     'Aviso',
    leftBg:    'bg-amber-500',
    cardBg:    'bg-amber-50',
    border:    'border-amber-100',
    iconColor: 'text-amber-500',
    badge:     'bg-amber-100 text-amber-700',
    pill:      'bg-amber-100 text-amber-700',
    dot:       'bg-amber-500',
  },
  info: {
    label:     'Info',
    leftBg:    'bg-blue-500',
    cardBg:    'bg-blue-50',
    border:    'border-blue-100',
    iconColor: 'text-blue-500',
    badge:     'bg-blue-100 text-blue-700',
    pill:      'bg-blue-100 text-blue-700',
    dot:       'bg-blue-500',
  },
} as const;

type Severity = keyof typeof SEV_CFG;
const SEV_ORDER: Severity[] = ['critical', 'warning', 'info'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { selectedSite } = useSite();
  const [data, setData]       = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [selectedUtmCampaignId, setSelectedUtmCampaignId] = useState<number | null>(null);

  async function load() {
    if (!selectedSite) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/insights?siteId=${selectedSite.id}`);
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar insights');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedSite?.id]);

  const insights   = data?.insights ?? [];
  const bySeverity = SEV_ORDER.reduce((acc, s) => {
    acc[s] = insights.filter(i => i.severity === s);
    return acc;
  }, {} as Record<Severity, Insight[]>);

  const critCount = bySeverity.critical.length;
  const warnCount = bySeverity.warning.length;
  const infoCount = bySeverity.info.length;
  const total     = insights.length;

  // last update time label
  const updatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-indigo-500" />
            <h1 className="text-xl font-bold text-gray-900">Insights</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {!data && !loading
              ? 'Selecione um site para analisar'
              : loading
                ? 'Analisando dados…'
                : total === 0
                  ? 'Nenhum problema detectado'
                  : `${total} insight${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            {updatedAt && !loading && (
              <span className="text-gray-400"> · atualizado às {updatedAt}</span>
            )}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-56">
            <UtmCampaignFilter
              onCampaignChange={setSelectedUtmCampaignId}
              selectedCampaignId={selectedUtmCampaignId}
              placeholder="Filter insights..."
            />
          </div>
          <button
            onClick={load}
            disabled={loading || !selectedSite}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 whitespace-nowrap mt-0.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Summary pills ───────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex gap-2 flex-wrap">
          {critCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-sm font-medium bg-red-100 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {critCount} crítico{critCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-sm font-medium bg-amber-100 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {warnCount} aviso{warnCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-sm font-medium bg-blue-100 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {infoCount} informativo{infoCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700
                        flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && !error && total === 0 && data && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <CheckCircle2 size={44} className="text-emerald-400" />
          <p className="text-gray-700 font-semibold">Tudo parece bem</p>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Nenhuma queda, inconsistência ou problema de orçamento foi detectado
            nos dados do período atual.
          </p>
        </div>
      )}

      {/* ── No site ─────────────────────────────────────────────────────────── */}
      {!selectedSite && !loading && (
        <p className="text-gray-400 text-center py-16 text-sm">
          Selecione um site na barra lateral para ver os insights.
        </p>
      )}

      {/* ── Insights grouped by severity ────────────────────────────────────── */}
      {!loading && SEV_ORDER.map(sev => {
        const group = bySeverity[sev];
        if (!group || group.length === 0) return null;
        const cfg = SEV_CFG[sev];

        return (
          <section key={sev} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              {cfg.label}
            </h2>

            {group.map(insight => {
              const Icon      = TYPE_ICON[insight.type];
              const stageMeta = insight.stage
                ? STAGE_META[insight.stage as FunnelStage]
                : null;

              return (
                <div
                  key={insight.id}
                  className={`flex rounded-xl border ${cfg.border} ${cfg.cardBg} overflow-hidden`}
                >
                  {/* Left accent bar */}
                  <div className={`w-1 shrink-0 ${cfg.leftBg}`} />

                  {/* Content */}
                  <div className="flex-1 px-4 py-3.5 space-y-2 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start gap-2.5">
                      <Icon size={16} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 leading-snug">
                            {insight.title}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${cfg.badge}`}>
                            {TYPE_LABEL[insight.type]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {insight.body}
                        </p>
                      </div>
                    </div>

                    {/* Pills row */}
                    {(insight.delta !== undefined || stageMeta || insight.period) && (
                      <div className="flex gap-1.5 flex-wrap pl-6">
                        {/* Delta pill */}
                        {insight.delta !== undefined && (
                          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                            insight.type === 'goal'
                              ? 'bg-gray-100 text-gray-600'
                              : insight.delta < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {insight.type === 'goal'
                              ? `${insight.delta}% da meta`
                              : `${insight.delta > 0 ? '+' : ''}${insight.delta}%`
                            }
                          </span>
                        )}

                        {/* Stage badge */}
                        {stageMeta && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${stageMeta.color}`}>
                            {stageMeta.label}
                          </span>
                        )}

                        {/* Period label */}
                        {insight.period && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {insight.period}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {/* ── Loading skeleton ────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
