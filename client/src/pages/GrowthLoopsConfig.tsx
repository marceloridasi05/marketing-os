/**
 * Growth Loops Configuration
 * Page for creating and editing growth loops with detailed settings
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Save, X } from 'lucide-react';
import { useSite } from '../context/SiteContext';

interface Loop {
  id?: number;
  name: string;
  description: string;
  type: 'paid' | 'viral' | 'content' | 'sales' | 'abm' | 'event' | 'product';
  inputType: 'traffic' | 'leads' | 'users' | 'accounts';
  actionType: string;
  outputMetricKey: string;
  targetCac?: number;
  targetLtv?: number;
  targetPaybackMonths?: number;
  targetCycleHours?: number;
  isActive: boolean;
  isPriority: boolean;
}

const LOOP_TYPES = [
  { value: 'paid', label: 'Paid Ads Loop', color: 'blue' },
  { value: 'viral', label: 'Viral Loop', color: 'purple' },
  { value: 'content', label: 'Content Loop', color: 'green' },
  { value: 'sales', label: 'Sales Loop', color: 'orange' },
  { value: 'abm', label: 'ABM Loop', color: 'red' },
  { value: 'event', label: 'Event Loop', color: 'indigo' },
  { value: 'product', label: 'Product Loop', color: 'cyan' },
];

const INPUT_TYPES = [
  { value: 'traffic', label: 'Website Traffic' },
  { value: 'leads', label: 'Generated Leads' },
  { value: 'users', label: 'New Users' },
  { value: 'accounts', label: 'New Accounts' },
];

const ACTION_TYPES = [
  { value: 'click', label: 'Click' },
  { value: 'signup', label: 'Signup' },
  { value: 'demo_request', label: 'Demo Request' },
  { value: 'invite', label: 'Invite' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'trial_start', label: 'Trial Start' },
];

const OUTPUT_METRICS = [
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'new_users', label: 'New Users' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'deals', label: 'Deals Closed' },
];

const GrowthLoopsConfigPage: React.FC = () => {
  const { selectedSite } = useSite();
  const siteId = selectedSite?.id || 0;

  const [loops, setLoops] = useState<Loop[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLoop, setEditingLoop] = useState<Loop | null>(null);
  const [formData, setFormData] = useState<Loop>({
    name: '',
    description: '',
    type: 'paid',
    inputType: 'traffic',
    actionType: 'click',
    outputMetricKey: 'conversions',
    targetCac: 50,
    targetLtv: 300,
    targetPaybackMonths: 12,
    targetCycleHours: 24,
    isActive: true,
    isPriority: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (error) {
      console.error('Error fetching loops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (loop?: Loop) => {
    if (loop) {
      setEditingLoop(loop);
      setFormData(loop);
    } else {
      setEditingLoop(null);
      setFormData({
        name: '',
        description: '',
        type: 'paid',
        inputType: 'traffic',
        actionType: 'click',
        outputMetricKey: 'conversions',
        targetCac: 50,
        targetLtv: 300,
        targetPaybackMonths: 12,
        targetCycleHours: 24,
        isActive: true,
        isPriority: false,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Loop name is required');
      return;
    }

    try {
      setSaving(true);

      const endpoint = editingLoop
        ? `/api/growth-loops/${editingLoop.id}`
        : '/api/growth-loops';
      const method = editingLoop ? 'PUT' : 'POST';

      const res = await fetch(`${endpoint}?siteId=${siteId}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        await fetchLoops();
      } else {
        alert('Error saving loop');
      }
    } catch (error) {
      console.error('Error saving loop:', error);
      alert('Error saving loop');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loopId: number) => {
    if (!confirm('Are you sure you want to archive this loop?')) return;

    try {
      const res = await fetch(`/api/growth-loops/${loopId}?siteId=${siteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchLoops();
      } else {
        alert('Error deleting loop');
      }
    } catch (error) {
      console.error('Error deleting loop:', error);
      alert('Error deleting loop');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading loops...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loop Configuration</h1>
          <p className="text-gray-600 mt-1">Create and manage your growth loops</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Loop
        </button>
      </div>

      {/* Loops List */}
      <div className="space-y-4">
        {loops.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No loops created yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Create your first loop
            </button>
          </div>
        ) : (
          loops.map(loop => (
            <div key={loop.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{loop.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{loop.description}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      LOOP_TYPES.find(t => t.value === loop.type)?.color === 'blue'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {LOOP_TYPES.find(t => t.value === loop.type)?.label}
                  </span>
                  {!loop.isActive && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Flow</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {INPUT_TYPES.find(t => t.value === loop.inputType)?.label} →{' '}
                    {ACTION_TYPES.find(a => a.value === loop.actionType)?.label} →{' '}
                    {OUTPUT_METRICS.find(o => o.value === loop.outputMetricKey)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Targets</p>
                  <p className="text-sm text-gray-900 mt-1">
                    CAC: ${loop.targetCac} | LTV: ${loop.targetLtv} | Payback:{' '}
                    {loop.targetPaybackMonths}m
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(loop)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => loop.id && handleDelete(loop.id)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLoop ? 'Edit Loop' : 'Create New Loop'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loop Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Q1 Google Ads Campaign"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe this loop's purpose and strategy"
                    />
                  </div>
                </div>
              </div>

              {/* Loop Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loop Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {LOOP_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, type: type.value as any })}
                      className={`p-3 rounded-lg border-2 text-left transition ${
                        formData.type === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loop Stages */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loop Stages</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Type
                    </label>
                    <select
                      value={formData.inputType}
                      onChange={e => setFormData({ ...formData, inputType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {INPUT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <select
                      value={formData.actionType}
                      onChange={e => setFormData({ ...formData, actionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ACTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Output Metric
                    </label>
                    <select
                      value={formData.outputMetricKey}
                      onChange={e =>
                        setFormData({ ...formData, outputMetricKey: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {OUTPUT_METRICS.map(metric => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Targets */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Metrics</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target CAC ($)
                    </label>
                    <input
                      type="number"
                      value={formData.targetCac}
                      onChange={e =>
                        setFormData({ ...formData, targetCac: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target LTV ($)
                    </label>
                    <input
                      type="number"
                      value={formData.targetLtv}
                      onChange={e =>
                        setFormData({ ...formData, targetLtv: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Payback (months)
                    </label>
                    <input
                      type="number"
                      value={formData.targetPaybackMonths}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          targetPaybackMonths: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Cycle Time (hours)
                    </label>
                    <input
                      type="number"
                      value={formData.targetCycleHours}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          targetCycleHours: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="24"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPriority}
                      onChange={e => setFormData({ ...formData, isPriority: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Priority Loop</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Loop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthLoopsConfigPage;
