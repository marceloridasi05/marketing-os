import { Card } from './Card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface MetricsChecklistProps {
  requiredCount: number;
  totalRequired: number;
  hasLeads: boolean;
  hasPaidClicks: boolean;
  hasBlogData: boolean;
  hasAiData: boolean;
}

const REQUIRED_FIELDS = [
  { key: 'weekStart', label: 'Início da Semana', description: 'formato: dd/mm/yyyy' },
  { key: 'sessions', label: 'Sessões', description: 'volume de tráfego' },
  { key: 'totalUsers', label: 'Total de Usuários', description: 'contagem única' },
  { key: 'newUsers', label: 'Novos Usuários', description: 'novos usuários na semana' },
  { key: 'leads', label: 'Leads Gerados', description: 'métrica de conversão' },
];

const RECOMMENDED_FIELDS = [
  { key: 'paidClicks', label: 'Cliques Pagos', description: 'para separar pago/orgânico' },
  { key: 'unpaidSessions', label: 'Sessões sem Pago', description: 'tráfego orgânico' },
  { key: 'newUsersPct', label: '% de Novos', description: 'percentual de novos usuários' },
  { key: 'weeklyGains', label: 'Ganhos na Semana', description: 'crescimento semanal' },
  { key: 'blogSessions', label: 'Blog: Sessões', description: 'performance do conteúdo' },
  { key: 'blogUsers', label: 'Blog: Usuários', description: 'engagement de blog' },
  { key: 'aiSessions', label: 'Origem IA: Sessões', description: 'tráfego de IA' },
  { key: 'pageViews', label: 'Visualizações', description: 'total de page views' },
];

export function MetricsChecklist({
  requiredCount,
  totalRequired,
  hasLeads,
  hasPaidClicks,
  hasBlogData,
  hasAiData,
}: MetricsChecklistProps) {
  const [expanded, setExpanded] = useState(false);

  const completeness = Math.round((requiredCount / totalRequired) * 100);
  const isComplete = requiredCount === totalRequired;

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Dados Mínimos para Esta Seção Funcionar</h3>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {requiredCount} de {totalRequired} métricas obrigatórias preenchidas
              </span>
              <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
                {completeness}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>

          {/* Required fields */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase">Obrigatórios</h4>
            {REQUIRED_FIELDS.map(field => (
              <div key={field.key} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-900">{field.label}</p>
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recommended fields (collapsible) */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Campos Recomendados ({RECOMMENDED_FIELDS.length})
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 pl-6">
                {RECOMMENDED_FIELDS.map(field => (
                  <div key={field.key} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-300 mt-0.5">○</span>
                    <div>
                      <p className="font-medium text-gray-700">{field.label}</p>
                      <p className="text-xs text-gray-500">{field.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warning messages for missing data */}
        {!isComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-900">
              <strong>⚠ Dados insuficientes:</strong> Sem todos os campos obrigatórios, o dashboard e funnel terão análise limitada.
            </p>
          </div>
        )}

        {/* Smart guidance for optional fields */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
          {!hasLeads && (
            <p className="text-sm text-blue-900">
              <strong>ℹ Sem Leads:</strong> O app não consegue calcular conversão de site.
            </p>
          )}
          {!hasPaidClicks && (
            <p className="text-sm text-blue-900">
              <strong>ℹ Sem Cliques Pagos:</strong> O app não consegue separar tráfego pago de tráfego orgânico.
            </p>
          )}
          {!hasBlogData && (
            <p className="text-sm text-blue-900">
              <strong>ℹ Sem Dados de Blog:</strong> A análise de conteúdo ficará limitada.
            </p>
          )}
          {!hasAiData && (
            <p className="text-sm text-blue-900">
              <strong>ℹ Sem Origem IA:</strong> O app não consegue analisar tráfego vindo de fontes de IA.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
