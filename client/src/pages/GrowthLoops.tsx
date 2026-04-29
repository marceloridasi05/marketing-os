/**
 * Growth Loops Engine - Main Dashboard
 * 4-tab interface for analyzing, comparing, and optimizing growth loops
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, Target, Zap } from 'lucide-react';
import { useSite } from '../context/SiteContext';

interface Loop {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  isPriority: boolean;
  targetCac?: number;
  targetLtv?: number;
}

interface LoopMetric {
  id: number;
  loopId: number;
  inputVolume: number;
  actionCount: number;
  outputCount: number;
  outputRevenue?: number;
  cac?: number;
  ltv?: number;
  ltvCacRatio?: number;
  paybackMonths?: number;
  healthScore?: number;
  strengthLevel?: string;
  volumeGrowthPct?: number;
  isBottleneck?: boolean;
  bottleneckStage?: string;
}

interface Insight {
  id: number;
  insightType: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedStage?: string;
  suggestedActions: Array<{
    title: string;
    description: string;
    priority: string;
  }>;
}

interface HealthBadgeProps {
  score: number;
}

const HealthBadge: React.FC<HealthBadgeProps> = ({ score }) => {
  if (score >= 70) {
    return (
      <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
        ✓ Healthy
      </div>
    );
  } else if (score >= 40) {
    return (
      <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
        ⚠ Warning
      </div>
    );
  } else {
    return (
      <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
        ✗ Critical
      </div>
    );
  }
};

const GrowthLoopsPage: React.FC = () => {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || 0;

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'insights' | 'matrix'>(
    'overview'
  );
  const [loops, setLoops] = useState<Loop[]>([]);
  const [metrics, setMetrics] = useState<Record<number, LoopMetric>>({});
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedLoopId, setSelectedLoopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLoopName, setNewLoopName] = useState('');
  const [newLoopType, setNewLoopType] = useState('paid');
  const [creatingLoop, setCreatingLoop] = useState(false);

  useEffect(() => {
    if (siteId) {
      fetchLoops();
    }
  }, [siteId]);

  const fetchLoops = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/growth-loops?siteId=${siteId}`);
      const data = await res.json();
      setLoops(data.data || []);

      // Fetch metrics for each loop
      if (data.data?.length > 0) {
        const loopMetrics: Record<number, LoopMetric> = {};
        for (const loop of data.data) {
          const metricsRes = await fetch(
            `/api/growth-loops/metrics/${loop.id}?siteId=${siteId}`
          );
          const metricsData = await metricsRes.json();
          if (metricsData.data?.length > 0) {
            // Get latest metric
            loopMetrics[loop.id] = metricsData.data[metricsData.data.length - 1];
          }
        }
        setMetrics(loopMetrics);
        setSelectedLoopId(data.data[0].id);

        // Fetch insights
        const insightsRes = await fetch(`/api/growth-loops/insights?siteId=${siteId}`);
        const insightsData = await insightsRes.json();
        setInsights(insightsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching loops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoop = async () => {
    if (!newLoopName.trim()) {
      alert('Por favor, insira um nome para o loop');
      return;
    }

    try {
      setCreatingLoop(true);
      const res = await fetch(`/api/growth-loops?siteId=${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLoopName,
          description: '',
          type: newLoopType,
          inputType: 'traffic',
          actionType: 'click',
          outputMetricKey: 'conversions',
          targetCac: 50,
          targetLtv: 300,
          targetPaybackMonths: 12,
          targetCycleHours: 24,
          isActive: true,
          isPriority: false,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewLoopName('');
        setNewLoopType('paid');
        await fetchLoops();
      } else {
        alert('Erro ao criar o loop');
      }
    } catch (error) {
      console.error('Error creating loop:', error);
      alert('Erro ao criar o loop');
    } finally {
      setCreatingLoop(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading growth loops...</p>
      </div>
    );
  }

  if (loops.length === 0) {
    return (
      <div className="p-6 text-center">
        <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhum Growth Loop criado</h2>
        <p className="text-gray-500 mb-6">Crie seu primeiro growth loop para começar a acompanhar</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto">
          <Plus size={18} />
          Criar Loop
        </button>

        {/* Create Loop Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar novo Growth Loop</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Loop *
                  </label>
                  <input
                    type="text"
                    value={newLoopName}
                    onChange={(e) => setNewLoopName(e.target.value)}
                    placeholder="ex: Google Ads Loop, Viral Referral"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Loop
                  </label>
                  <select
                    value={newLoopType}
                    onChange={(e) => setNewLoopType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="paid">Paid Ads</option>
                    <option value="viral">Viral</option>
                    <option value="content">Content</option>
                    <option value="sales">Sales</option>
                    <option value="abm">ABM</option>
                    <option value="event">Event</option>
                    <option value="product">Product</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateLoop}
                  disabled={creatingLoop}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {creatingLoop ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectedMetric = selectedLoopId ? metrics[selectedLoopId] : null;
  const selectedLoop = loops.find(l => l.id === selectedLoopId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Growth Loops Engine</h1>
        <p className="text-gray-600 mt-1">Analyze and optimize your growth loops</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-1 py-4 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview ({loops.length})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-1 py-4 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Loop Details
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-1 py-4 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Insights ({insights.filter(i => !i.dismissedAt).length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-1 py-4 border-b-2 font-medium text-sm ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Comparison Matrix
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {loops.map(loop => {
              const metric = metrics[loop.id];
              const healthScore = metric?.healthScore || 0;

              return (
                <div
                  key={loop.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 cursor-pointer transition"
                  onClick={() => setSelectedLoopId(loop.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{loop.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{loop.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {loop.type}
                      </span>
                      {loop.isPriority && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          Priority
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">CAC</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${metric?.cac?.toFixed(2) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">LTV</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${metric?.ltv?.toFixed(2) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">LTV/CAC Ratio</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {metric?.ltvCacRatio?.toFixed(1) || '—'}x
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Health</p>
                      <HealthBadge score={healthScore} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Input Volume</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {metric?.inputVolume?.toLocaleString() || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Conversion Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {metric?.outputConversionRate
                          ? (metric.outputConversionRate * 100).toFixed(1)
                          : '—'}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cycle Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {metric?.cycleTimeHours ? `${metric.cycleTimeHours}h` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Growth Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {metric?.volumeGrowthPct
                          ? (metric.volumeGrowthPct * 100).toFixed(0)
                          : '—'}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'details' && selectedLoop && selectedMetric && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedLoop.name}</h2>

            {/* Loop Diagram */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-4">Loop Flow</p>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600">INPUT</p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedMetric.inputVolume?.toLocaleString()}
                  </p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600">ACTION</p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedMetric.actionCount?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedMetric.actionConversionRate
                      ? (selectedMetric.actionConversionRate * 100).toFixed(1)
                      : '—'}
                    %
                  </p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600">OUTPUT</p>
                  <p className="text-lg font-bold text-green-600">
                    {selectedMetric.outputCount?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedMetric.outputConversionRate
                      ? (selectedMetric.outputConversionRate * 100).toFixed(1)
                      : '—'}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">CAC</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${selectedMetric.cac?.toFixed(2) || '—'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">LTV</p>
                <p className="text-2xl font-bold text-green-600">
                  ${selectedMetric.ltv?.toFixed(2) || '—'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">LTV/CAC Ratio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {selectedMetric.ltvCacRatio?.toFixed(2)}x
                </p>
              </div>
            </div>

            {/* Bottleneck Alert */}
            {selectedMetric.isBottleneck && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Bottleneck Detected</p>
                  <p className="text-sm text-red-700 mt-1">
                    The <strong>{selectedMetric.bottleneckStage}</strong> stage has a conversion
                    rate drop. Consider optimizing this stage.
                  </p>
                </div>
              </div>
            )}

            {/* Stage Breakdown */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-4">Strength & Health</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Loop Strength</p>
                  <p className="text-xl font-bold text-gray-900 mt-1 capitalize">
                    {selectedMetric.strengthLevel || '—'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Health Score</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {selectedMetric.healthScore?.toFixed(0) || '—'}/100
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.filter(i => !i.dismissedAt).length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No insights detected. Your loops are performing well!</p>
            </div>
          ) : (
            insights
              .filter(i => !i.dismissedAt)
              .map(insight => (
                <div
                  key={insight.id}
                  className={`bg-white rounded-lg border-l-4 p-4 ${
                    insight.severity === 'critical'
                      ? 'border-l-red-600 bg-red-50'
                      : insight.severity === 'warning'
                        ? 'border-l-yellow-600 bg-yellow-50'
                        : 'border-l-blue-600 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        insight.severity === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : insight.severity === 'warning'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {insight.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{insight.description}</p>

                  {insight.suggestedActions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Suggested Actions:</p>
                      {insight.suggestedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded p-3 text-sm border border-gray-200"
                        >
                          <p className="font-medium text-gray-900">{action.title}</p>
                          <p className="text-gray-700 mt-1">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-center text-gray-500 py-12">
            2x2 comparison matrix visualization (Health vs Scalability) coming soon
          </p>
        </div>
      )}
    </div>
  );
};

export default GrowthLoopsPage;
