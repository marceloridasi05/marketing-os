/**
 * Unit Economics Configuration Page
 *
 * Allows users to:
 * - Configure CAC cost components and attribution model
 * - Choose LTV calculation method (simple, churn-based, CRM-driven)
 * - Set business assumptions (target payback, gross margin, etc)
 * - Configure segmentation preference
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface Config {
  siteId?: number;
  ltvCalculationMethod: 'simple' | 'churn_based' | 'crmdriven';
  ltvSimpleMultiplier: number;
  ltvAssumedMonthlyChurnRate: number;
  ltvGrossMarginPercent: number;
  cacAttributionModel: 'first_touch' | 'last_touch' | 'linear';
  cacCostComponents: string[];
  targetPaybackMonths: number;
  segmentBy: 'channel' | 'campaign' | 'source';
}

const costComponentOptions = [
  { id: 'media_spend', label: 'Media Spend', description: 'Ad platform costs (Google, LinkedIn, Meta)' },
  { id: 'team_salary', label: 'Team Salary', description: 'Marketing team salaries (allocated)' },
  { id: 'tools', label: 'Tools & Software', description: 'Marketing software subscriptions' },
  { id: 'fixed_costs', label: 'Fixed Costs', description: 'Office, infrastructure, overhead' },
];

export default function UnitEconomicsConfig() {
  const [config, setConfig] = useState<Config>({
    ltvCalculationMethod: 'simple',
    ltvSimpleMultiplier: 3.0,
    ltvAssumedMonthlyChurnRate: 0.05,
    ltvGrossMarginPercent: 0.7,
    cacAttributionModel: 'last_touch',
    cacCostComponents: ['media_spend'],
    targetPaybackMonths: 12,
    segmentBy: 'channel',
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get siteId from URL or props
  const siteId = new URLSearchParams(window.location.search).get('siteId') || '1';

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, [siteId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/unit-economics/config?siteId=${siteId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);

      const response = await fetch(`/api/unit-economics/config?siteId=${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleCostComponentChange = (component: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      cacCostComponents: checked
        ? [...prev.cacCostComponents, component]
        : prev.cacCostComponents.filter(c => c !== component),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Unit Economics Configuration</h1>
          </div>
          <p className="text-gray-600">Configure CAC and LTV calculation methods for your business model</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">✓ Configuration saved successfully</p>
          </div>
        )}

        {loading && !saved ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* CAC Configuration Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Acquisition Cost (CAC)</h2>

              {/* Cost Components */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">What costs should be included in CAC?</h3>
                <div className="space-y-3">
                  {costComponentOptions.map(option => (
                    <label key={option.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.cacCostComponents.includes(option.id)}
                        onChange={e => handleCostComponentChange(option.id, e.target.checked)}
                        className="mt-1 w-4 h-4 text-indigo-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Attribution Model */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attribution Model</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'first_touch' as const, label: 'First Touch', desc: 'Credit first interaction' },
                    { value: 'last_touch' as const, label: 'Last Touch', desc: 'Credit final interaction' },
                    { value: 'linear' as const, label: 'Linear', desc: 'Equal credit all touchpoints' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setConfig(prev => ({ ...prev, cacAttributionModel: option.value }))}
                      className={`p-3 rounded-lg border text-left transition ${
                        config.cacAttributionModel === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* LTV Configuration Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Lifetime Value (LTV)</h2>

              {/* Calculation Method */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">How should we calculate LTV?</h3>
                <div className="space-y-4">
                  {[
                    {
                      value: 'simple' as const,
                      label: 'Simple',
                      desc: 'Initial Order × Multiplier (good for e-commerce)',
                    },
                    {
                      value: 'churn_based' as const,
                      label: 'Churn-Based',
                      desc: '(Monthly ARPU × Margin) / Churn Rate (good for SaaS)',
                    },
                    {
                      value: 'crmdriven' as const,
                      label: 'CRM-Driven',
                      desc: 'Observed average lifetime revenue (requires CRM data)',
                    },
                  ].map(method => (
                    <label key={method.value} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                      <input
                        type="radio"
                        name="ltvMethod"
                        value={method.value}
                        checked={config.ltvCalculationMethod === method.value}
                        onChange={e => setConfig(prev => ({ ...prev, ltvCalculationMethod: e.target.value as any }))}
                        className="mt-1 w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{method.label}</div>
                        <div className="text-sm text-gray-500">{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Method-Specific Parameters */}
              {config.ltvCalculationMethod === 'simple' && (
                <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-gray-700">Multiplier</span>
                    <p className="text-xs text-gray-500 mb-2">How many times the initial order value is the customer worth?</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={config.ltvSimpleMultiplier}
                        onChange={e => setConfig(prev => ({ ...prev, ltvSimpleMultiplier: parseFloat(e.target.value) }))}
                        step="0.5"
                        min="1"
                        max="10"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <span className="text-sm text-gray-600">× Initial Order Value</span>
                    </div>
                  </label>
                </div>
              )}

              {(config.ltvCalculationMethod === 'churn_based' || config.ltvCalculationMethod === 'crmdriven') && (
                <div className="mb-8 space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">Monthly Churn Rate</span>
                      <p className="text-xs text-gray-500 mb-2">Percentage of customers lost each month (0.05 = 5%)</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={config.ltvAssumedMonthlyChurnRate * 100}
                          onChange={e => setConfig(prev => ({ ...prev, ltvAssumedMonthlyChurnRate: parseFloat(e.target.value) / 100 }))}
                          step="0.5"
                          min="0.1"
                          max="50"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                    </label>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700">Gross Margin %</span>
                      <p className="text-xs text-gray-500 mb-2">Percentage of revenue retained after COGS (0.7 = 70%)</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={config.ltvGrossMarginPercent * 100}
                          onChange={e => setConfig(prev => ({ ...prev, ltvGrossMarginPercent: parseFloat(e.target.value) / 100 }))}
                          step="5"
                          min="10"
                          max="95"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Business Assumptions Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Assumptions</h2>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Target Payback Period</span>
                    <p className="text-xs text-gray-500 mb-2">Months to recover customer acquisition cost</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={config.targetPaybackMonths}
                        onChange={e => setConfig(prev => ({ ...prev, targetPaybackMonths: parseInt(e.target.value) }))}
                        min="3"
                        max="36"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <span className="text-sm text-gray-600">months</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Segment Analysis By</span>
                    <p className="text-xs text-gray-500 mb-2">Primary dimension for unit economics breakdown</p>
                    <select
                      value={config.segmentBy}
                      onChange={e => setConfig(prev => ({ ...prev, segmentBy: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="channel">Channel</option>
                      <option value="campaign">Campaign</option>
                      <option value="source">Source</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={fetchConfig}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
