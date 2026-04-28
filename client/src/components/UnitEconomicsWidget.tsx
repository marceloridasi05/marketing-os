/**
 * Unit Economics Widget
 *
 * Compact dashboard widget showing:
 * - Average CAC with trend
 * - LTV/CAC ratio health status
 * - Active insights count
 * - Quick link to full analysis
 */

import React, { useState, useEffect } from 'react';
import { useSite } from '../context/SiteContext';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';

interface CACMetrics {
  channel: string;
  cac: number;
  previousCAC?: number;
}

interface LTVCACRatio {
  ratio: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  healthScore: number;
}

interface Insight {
  id: string;
  severity: 'critical' | 'warning' | 'info';
}

const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (n: number, places = 1) => {
  const num = Math.round(n * Math.pow(10, places)) / Math.pow(10, places);
  return `${num > 0 ? '+' : ''}${num}%`;
};

export function UnitEconomicsWidget() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || 1;

  const [cacMetrics, setCacMetrics] = useState<CACMetrics[]>([]);
  const [ratios, setRatios] = useState<LTVCACRatio | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cacRes, ratioRes, insightRes] = await Promise.all([
          fetch(`/api/unit-economics/cac?siteId=${siteId}`),
          fetch(`/api/unit-economics/ratios?siteId=${siteId}`),
          fetch(`/api/unit-economics/insights?siteId=${siteId}`),
        ]);

        if (cacRes.ok) setCacMetrics(await cacRes.json());
        if (ratioRes.ok) setRatios(await ratioRes.json());
        if (insightRes.ok) {
          const data = await insightRes.json();
          setInsights(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load unit economics widget:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [siteId]);

  const avgCAC = cacMetrics.length > 0 ? cacMetrics.reduce((sum, m) => sum + m.cac, 0) / cacMetrics.length : 0;
  const avgPreviousCAC = cacMetrics.length > 0
    ? cacMetrics.reduce((sum, m) => sum + (m.previousCAC || m.cac), 0) / cacMetrics.length
    : 0;
  const cacDelta = avgPreviousCAC > 0 ? ((avgCAC - avgPreviousCAC) / avgPreviousCAC) * 100 : 0;

  const criticalInsights = insights.filter(i => i.severity === 'critical').length;
  const warningInsights = insights.filter(i => i.severity === 'warning').length;

  const healthStatus = ratios?.healthStatus || 'neutral';
  const healthColors = {
    healthy: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
    neutral: 'bg-gray-50 border-gray-200',
  };

  if (loading) {
    return null;
  }

  return (
    <div className={`rounded-lg border p-5 space-y-4 ${healthColors[healthStatus] || healthColors.neutral}`}>
      <h3 className="text-lg font-semibold text-gray-900">Unit Economics</h3>

      {/* CAC Summary */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-600">Average CAC</span>
          <span className="text-2xl font-bold text-gray-900">{fmtMoney(avgCAC)}</span>
        </div>
        {cacDelta !== 0 && (
          <div className="flex items-center gap-1 text-sm">
            {cacDelta > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <span className={cacDelta > 0 ? 'text-red-600' : 'text-green-600'}>
              {fmtPct(cacDelta / 100)} MoM
            </span>
          </div>
        )}
      </div>

      {/* LTV/CAC Ratio */}
      {ratios && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-600">LTV/CAC Ratio</span>
            <span className="text-2xl font-bold text-gray-900">{ratios.ratio.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                healthStatus === 'healthy'
                  ? 'bg-emerald-100 text-emerald-700'
                  : healthStatus === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {healthStatus === 'healthy' && '✓ Healthy'}
              {healthStatus === 'warning' && '⚠ Warning'}
              {healthStatus === 'critical' && '✗ Critical'}
            </div>
            <span className="text-xs text-gray-500">{Math.round(ratios.healthScore)}/100</span>
          </div>
        </div>
      )}

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-600">Active Issues</span>
          </div>
          <div className="flex gap-3">
            {criticalInsights > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                {criticalInsights} Critical
              </span>
            )}
            {warningInsights > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
                {warningInsights} Warning
              </span>
            )}
            {criticalInsights === 0 && warningInsights === 0 && (
              <span className="text-xs text-gray-500">No active issues</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Action Link */}
      <div className="border-t border-gray-200 pt-3">
        <a
          href="/unit-economics"
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View Full Analysis
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
