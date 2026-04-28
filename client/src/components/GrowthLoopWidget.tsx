/**
 * Growth Loops Widget
 * Dashboard summary widget showing top loops and key metrics
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';

interface LoopSummary {
  id: number;
  name: string;
  type: string;
  metrics: {
    inputVolume: number;
    outputCount: number;
    volumeGrowthPct: number;
    healthScore: number;
    cac?: number;
    ltv?: number;
    ltvCacRatio?: number;
  };
}

interface WidgetProps {
  siteId: number;
}

const GrowthLoopWidget: React.FC<WidgetProps> = ({ siteId }) => {
  const [topLoops, setTopLoops] = useState<LoopSummary[]>([]);
  const [insightCount, setInsightCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [siteId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch loops
      const loopsRes = await fetch(`/api/growth-loops?siteId=${siteId}`);
      const loopsData = await loopsRes.json();

      // Fetch metrics for each loop
      if (loopsData.data?.length > 0) {
        const loopsWithMetrics = await Promise.all(
          loopsData.data.slice(0, 3).map(async (loop: any) => {
            const metricsRes = await fetch(
              `/api/growth-loops/metrics/${loop.id}?siteId=${siteId}`
            );
            const metricsData = await metricsRes.json();
            const latestMetric = metricsData.data?.[metricsData.data.length - 1];

            return {
              id: loop.id,
              name: loop.name,
              type: loop.type,
              metrics: latestMetric || {},
            };
          })
        );

        setTopLoops(loopsWithMetrics);
      }

      // Fetch insights
      const insightsRes = await fetch(`/api/growth-loops/insights?siteId=${siteId}`);
      const insightsData = await insightsRes.json();
      setInsightCount(insightsData.summary?.active || 0);
    } catch (error) {
      console.error('Error fetching loop widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Growth Loops
        </h3>
        <a
          href="/growth-loops"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </a>
      </div>

      {topLoops.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No loops created yet</p>
          <a
            href="/growth-loops-config"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
          >
            Create one now
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Loops */}
          {topLoops.map((loop, idx) => {
            const healthScore = loop.metrics.healthScore || 0;
            const healthColor =
              healthScore >= 70
                ? 'bg-green-100 text-green-800'
                : healthScore >= 40
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800';

            return (
              <div key={loop.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{loop.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{loop.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${healthColor}`}>
                    {healthScore.toFixed(0)}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Volume</p>
                    <p className="font-semibold text-gray-900">
                      {loop.metrics.outputCount?.toLocaleString() || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Growth</p>
                    <p className="font-semibold text-gray-900">
                      {loop.metrics.volumeGrowthPct
                        ? `${(loop.metrics.volumeGrowthPct * 100).toFixed(0)}%`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">LTV/CAC</p>
                    <p className="font-semibold text-gray-900">
                      {loop.metrics.ltvCacRatio?.toFixed(1) || '—'}x
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Insights Summary */}
          {insightCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {insightCount} active insight{insightCount !== 1 ? 's' : ''}
                </p>
                <a
                  href="/growth-loops?tab=insights"
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  View recommendations →
                </a>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-4">
            <a
              href="/growth-loops"
              className="text-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition"
            >
              Analyze
            </a>
            <a
              href="/growth-loops-config"
              className="text-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded text-sm font-medium transition"
            >
              Configure
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthLoopWidget;
