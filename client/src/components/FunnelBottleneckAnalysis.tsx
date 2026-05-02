import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from './Card';

interface BottleneckInsight {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metrics?: {
    fromStage?: string;
    toStage?: string;
    currentRate?: number;
    previousRate?: number;
    delta?: number;
  };
  suggestedActions?: string[];
}

function getSeverityColor(severity: string): string {
  if (severity === 'critical') return 'bg-red-100 border-red-300 text-red-800';
  if (severity === 'warning') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
  return 'bg-blue-100 border-blue-300 text-blue-800';
}

function getSeverityIcon(severity: string) {
  if (severity === 'critical') return '⚠️';
  if (severity === 'warning') return '⚡';
  return 'ℹ️';
}

export function FunnelBottleneckAnalysis({ siteId }: { siteId: number | null }) {
  const [insights, setInsights] = useState<BottleneckInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;

    async function fetchInsights() {
      setLoading(true);
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const response = await api.get<{ data: BottleneckInsight[] }>(
          `/commercial-funnel/insights?siteId=${siteId}&month=${month}&type=bottleneck`
        );

        // Handle both array and object with data property
        const data = Array.isArray(response) ? response : response.data || [];
        setInsights(data as BottleneckInsight[]);
      } catch (err) {
        console.error('Failed to load bottleneck insights:', err);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [siteId]);

  if (!siteId) return null;

  if (loading) {
    return (
      <Card>
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[1, 2].map(i => (
            <div key={i} className="space-y-2 p-3 bg-gray-100 rounded">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-500 text-sm">
          Nenhum gargalo identificado neste período
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-500" />
          <h3 className="font-semibold text-gray-900">Análise de Gargalos</h3>
        </div>

        <div className="space-y-2">
          {insights.map(insight => (
            <div key={insight.id} className="space-y-2">
              <button
                onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${getSeverityColor(
                  insight.severity
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg">{getSeverityIcon(insight.severity)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm opacity-75 line-clamp-1">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400 flex-shrink-0">
                    {expandedId === insight.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>
              </button>

              {expandedId === insight.id && (
                <div className="px-3 pb-3 space-y-3 text-sm">
                  {/* Metrics Details */}
                  {insight.metrics && (
                    <div className="bg-gray-50 rounded p-2 space-y-1">
                      {insight.metrics.fromStage && insight.metrics.toStage && (
                        <div>
                          <span className="font-medium text-gray-700">
                            {insight.metrics.fromStage} → {insight.metrics.toStage}
                          </span>
                        </div>
                      )}
                      {insight.metrics.currentRate !== undefined && (
                        <div className="text-gray-600">
                          Taxa atual:{' '}
                          <span className="font-semibold">
                            {(insight.metrics.currentRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {insight.metrics.previousRate !== undefined && (
                        <div className="text-gray-600">
                          Taxa anterior:{' '}
                          <span className="font-semibold">
                            {(insight.metrics.previousRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {insight.metrics.delta !== undefined && (
                        <div
                          className={`font-semibold ${
                            insight.metrics.delta < 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          Variação: {insight.metrics.delta > 0 ? '+' : ''}
                          {(insight.metrics.delta * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Ações recomendadas:</div>
                      <ul className="space-y-1 ml-4">
                        {insight.suggestedActions.map((action, idx) => (
                          <li key={idx} className="text-gray-600 list-disc">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
