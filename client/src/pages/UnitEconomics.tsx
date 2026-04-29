/**
 * Unit Economics Analysis Dashboard
 *
 * Three-tab dashboard for analyzing CAC, LTV, and unit economics health:
 * - Overview: Summary cards and channel breakdown
 * - Detailed Analysis: Charts for CAC, LTV, payback, and churn trends
 * - Insights: Detected anomalies and actionable recommendations
 */

import React, { useState, useEffect } from 'react';
import { useSite } from '../context/SiteContext';
import { TimeFilter, useTimeFilter } from '../components/TimeFilter';
import { Card } from '../components/Card';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle,
  LineChart, BarChart3, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
} from 'lucide-react';

interface CACMetrics {
  channel: string;
  spend: number;
  customersAcquired: number;
  cac: number;
  previousCAC?: number;
  cacTrend?: number; // % change
}

interface LTVMetrics {
  simple: number;
  churnBased: number;
  crmDriven: number;
  recommended: number;
  healthScore: number;
}

interface LTVCACRatio {
  ltv: number;
  cac: number;
  ratio: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  healthScore: number;
}

interface PaybackMetric {
  month: number;
  cumulativeRevenue: number;
  breakEven: boolean;
}

interface UnitEconomicsConfig {
  ltvCalculationMethod: 'simple' | 'churn_based' | 'crmdriven';
  ltvSimpleMultiplier: number;
  cacAttributionModel: 'first_touch' | 'last_touch' | 'linear';
  targetPaybackMonths: number;
  segmentBy: 'channel' | 'campaign' | 'source';
}

interface UnitEconomicsInsight {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  segment?: string;
  metric?: string;
  currentValue?: number;
  previousValue?: number;
  delta?: number;
  suggestedActions?: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtMoneyFull = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const fmtPct = (n: number, places = 1) => {
  const num = Math.round(n * Math.pow(10, places)) / Math.pow(10, places);
  return `${num > 0 ? '+' : ''}${num}%`;
};

function HealthBadge({ status, score }: { status: 'healthy' | 'warning' | 'critical'; score: number }) {
  const colors = {
    healthy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    warning: 'bg-amber-100 text-amber-700 border-amber-300',
    critical: 'bg-red-100 text-red-700 border-red-300',
  };

  const labels = {
    healthy: '✓ Healthy',
    warning: '⚠ Warning',
    critical: '✗ Critical',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${colors[status]} text-sm font-medium`}>
      {labels[status]}
      <span className="text-xs opacity-75">{Math.round(score)}/100</span>
    </div>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
  if (!previous || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const isPositive = delta > 0;

  return (
    <div className="flex items-center gap-1">
      {isPositive ? (
        <TrendingUp className="w-4 h-4 text-red-500" />
      ) : (
        <TrendingDown className="w-4 h-4 text-green-500" />
      )}
      <span className={isPositive ? 'text-red-600' : 'text-green-600'} style={{ fontSize: '0.875rem' }}>
        {fmtPct(delta / 100)}
      </span>
    </div>
  );
}

export default function UnitEconomicsPage() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || 1;
  const { dateFrom, dateTo } = useTimeFilter();

  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'insights'>('overview');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<UnitEconomicsConfig | null>(null);
  const [cacMetrics, setCacMetrics] = useState<CACMetrics[]>([]);
  const [ltvMetrics, setLtvMetrics] = useState<LTVMetrics | null>(null);
  const [ratios, setRatios] = useState<LTVCACRatio | null>(null);
  const [paybackData, setPaybackData] = useState<PaybackMetric[]>([]);
  const [insights, setInsights] = useState<UnitEconomicsInsight[]>([]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load configuration and metrics
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [configRes, cacRes, ltvRes, ratioRes, paybackRes, insightRes] = await Promise.all([
          fetch(`/api/unit-economics/config?siteId=${siteId}`),
          fetch(`/api/unit-economics/cac?siteId=${siteId}&period=${dateFrom}`),
          fetch(`/api/unit-economics/ltv?siteId=${siteId}&period=${dateFrom}`),
          fetch(`/api/unit-economics/ratios?siteId=${siteId}&period=${dateFrom}`),
          fetch(`/api/unit-economics/payback?siteId=${siteId}`),
          fetch(`/api/unit-economics/insights?siteId=${siteId}`),
        ]);

        if (configRes.ok) setConfig(await configRes.json());
        if (cacRes.ok) {
          const cacData = await cacRes.json();
          setCacMetrics(Array.isArray(cacData) ? cacData : cacData.data || []);
        }
        if (ltvRes.ok) {
          const ltvData = await ltvRes.json();
          setLtvMetrics(ltvData.recommended ? ltvData : null);
        }
        if (ratioRes.ok) {
          const ratioData = await ratioRes.json();
          setRatios(ratioData.ratio ? ratioData : null);
        }
        if (paybackRes.ok) {
          const paybackData = await paybackRes.json();
          setPaybackData(Array.isArray(paybackData) ? paybackData : paybackData.data || []);
        }
        if (insightRes.ok) {
          const insightData = await insightRes.json();
          setInsights(Array.isArray(insightData) ? insightData : (insightData.data || []));
        }
      } catch (err) {
        console.error('Failed to load unit economics data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [siteId, dateFrom]);

  const dismissInsight = async (insightId: string) => {
    try {
      const res = await fetch(`/api/unit-economics/insights/${insightId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setDismissedInsights(prev => new Set(prev).add(insightId));
      }
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
    }
  };

  const toggleInsightExpanded = (insightId: string) => {
    setExpandedInsights(prev => {
      const next = new Set(prev);
      if (next.has(insightId)) {
        next.delete(insightId);
      } else {
        next.add(insightId);
      }
      return next;
    });
  };

  const activeInsights = insights.filter(i => !dismissedInsights.has(i.id));
  const avgCAC = cacMetrics.length > 0 ? cacMetrics.reduce((sum, m) => sum + m.cac, 0) / cacMetrics.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading unit economics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Unit Economics</h1>
            <p className="text-gray-600">CAC, LTV, and business model health analysis</p>
          </div>
          <a
            href="/unit-economics-config"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Configure
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['overview', 'detailed', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'detailed' && 'Detailed Analysis'}
              {tab === 'insights' && 'Insights'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Average CAC</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtMoney(avgCAC)}</p>
                  <p className="text-xs text-gray-500">{cacMetrics.length} channels</p>
                </div>
              </Card>

              <Card>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">
                    {config?.ltvCalculationMethod === 'simple'
                      ? 'LTV (Simple)'
                      : config?.ltvCalculationMethod === 'churn_based'
                      ? 'LTV (Churn-Based)'
                      : 'LTV (CRM-Driven)'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{fmtMoney(ltvMetrics?.recommended || 0)}</p>
                  <p className="text-xs text-gray-500">Health: {ltvMetrics?.healthScore.toFixed(0)}/100</p>
                </div>
              </Card>

              <Card>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">LTV/CAC Ratio</p>
                  <p className="text-2xl font-bold text-gray-900">{(ratios?.ratio || 0).toFixed(1)}x</p>
                  {ratios && <HealthBadge status={ratios.healthStatus} score={ratios.healthScore} />}
                </div>
              </Card>

              <Card>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Payback Period</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {paybackData.find(p => p.breakEven)?.month || '—'} months
                  </p>
                  <p className="text-xs text-gray-500">Target: {config?.targetPaybackMonths} months</p>
                </div>
              </Card>
            </div>

            {/* Channel Breakdown */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CAC by Channel</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-600 font-medium">Channel</th>
                      <th className="text-right py-2 px-3 text-gray-600 font-medium">Spend</th>
                      <th className="text-right py-2 px-3 text-gray-600 font-medium">Customers</th>
                      <th className="text-right py-2 px-3 text-gray-600 font-medium">CAC</th>
                      <th className="text-center py-2 px-3 text-gray-600 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacMetrics.map(m => (
                      <tr key={m.channel} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{m.channel}</td>
                        <td className="text-right py-3 px-3 text-gray-700">{fmtMoney(m.spend)}</td>
                        <td className="text-right py-3 px-3 text-gray-700">{fmtNum(m.customersAcquired)}</td>
                        <td className="text-right py-3 px-3 font-semibold text-gray-900">{fmtMoney(m.cac)}</td>
                        <td className="text-center py-3 px-3">
                          {m.previousCAC && <TrendIndicator current={m.cac} previous={m.previousCAC} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Detailed Analysis Tab */}
        {activeTab === 'detailed' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CAC Trend</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                <LineChart className="w-8 h-8 mr-2" />
                Chart visualization (line chart of CAC month-over-month)
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Chart shows CAC trend by channel over selected time period
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">LTV by Cohort</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                <BarChart3 className="w-8 h-8 mr-2" />
                Chart visualization (stacked area of LTV by cohort and retention)
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Stacked area chart showing {config?.ltvCalculationMethod === 'simple' ? 'Simple' : config?.ltvCalculationMethod === 'churn_based' ? 'Churn-Based' : 'CRM-Driven'} LTV by acquisition cohort
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payback Progression</h3>
              <div className="space-y-3">
                {paybackData.slice(0, 12).map(metric => (
                  <div key={metric.month} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-12">Month {metric.month}</span>
                    <div className="flex-1 bg-gray-200 h-6 rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition ${metric.breakEven ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (metric.cumulativeRevenue / (avgCAC || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 w-24 text-right">{fmtMoney(metric.cumulativeRevenue)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Cumulative revenue per acquired customer vs. CAC ({fmtMoney(avgCAC)})
              </p>
            </Card>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {activeInsights.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-900">Great Unit Economics!</p>
                  <p className="text-gray-600 mt-1">No critical issues detected</p>
                </div>
              </Card>
            ) : (
              activeInsights
                .sort((a, b) => {
                  const severityOrder = { critical: 0, warning: 1, info: 2 };
                  return severityOrder[a.severity] - severityOrder[b.severity];
                })
                .map(insight => (
                  <Card key={insight.id}>
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleInsightExpanded(insight.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div>
                          {insight.severity === 'critical' && (
                            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                          )}
                          {insight.severity === 'warning' && (
                            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                          )}
                          {insight.severity === 'info' && (
                            <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-900">{insight.title}</h4>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                insight.severity === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : insight.severity === 'warning'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
                            </span>
                          </div>

                          <p className="text-gray-600 mt-1">{insight.description}</p>

                          {insight.currentValue !== undefined && (
                            <div className="text-sm text-gray-500 mt-2">
                              Current: {fmtMoney(insight.currentValue)}
                              {insight.previousValue !== undefined &&
                                ` (vs ${fmtMoney(insight.previousValue)} previously)`}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            dismissInsight(insight.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <EyeOff className="w-5 h-5" />
                        </button>

                        <div className="text-gray-400">
                          {expandedInsights.has(insight.id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedInsights.has(insight.id) && insight.suggestedActions && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <p className="text-sm font-medium text-gray-700">Recommended Actions:</p>
                        {insight.suggestedActions.map((action, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  action.priority === 'high'
                                    ? 'bg-red-500'
                                    : action.priority === 'medium'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                }`}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{action.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
