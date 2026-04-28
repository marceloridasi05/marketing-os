import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import { Trash2, Plus, Copy, CheckCircle } from 'lucide-react';

interface UtmCampaign {
  id: number;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  status: 'active' | 'archived';
  expectedBudget?: number;
  expectedSessions?: number;
  expectedLeads?: number;
  expectedRevenue?: number;
  createdAt: string;
}

interface UtmLibraryTemplate {
  id: number;
  name: string;
  description?: string;
  sourcePreset?: string;
  mediumPreset?: string;
  campaignTemplate?: string;
  usageCount: number;
}

const cardCls = 'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow';

interface TemplateFormData {
  name: string;
  description: string;
  sourcePreset: string;
  mediumPreset: string;
  campaignTemplate: string;
}

const emptyTemplate: TemplateFormData = {
  name: '',
  description: '',
  sourcePreset: '',
  mediumPreset: '',
  campaignTemplate: '',
};

function TemplateFormModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState<TemplateFormData>(emptyTemplate);

  const set = (k: keyof TemplateFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await onSubmit(form);
    setForm(emptyTemplate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Template</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={set('name')}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Product Launch Template"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe when to use this template"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Preset</label>
              <input
                type="text"
                value={form.sourcePreset}
                onChange={set('sourcePreset')}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., google"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medium Preset</label>
              <input
                type="text"
                value={form.mediumPreset}
                onChange={set('mediumPreset')}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., cpc"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Template</label>
            <input
              type="text"
              value={form.campaignTemplate}
              onChange={set('campaignTemplate')}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., q{quarter}_2026_launch"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function CampaignRow({
  campaign,
  onCopy,
}: {
  campaign: UtmCampaign;
  onCopy?: (campaign: UtmCampaign) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) onCopy(campaign);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{campaign.name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{campaign.source}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{campaign.medium}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{campaign.campaign}</td>
      <td className="px-4 py-3 text-sm">
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {campaign.expectedLeads ? (
          <span className="text-xs">
            {campaign.expectedSessions?.toLocaleString() || 0} sessions, {campaign.expectedLeads} leads
          </span>
        ) : (
          '-'
        )}
      </td>
      {onCopy && (
        <td className="px-4 py-3 text-sm">
          <button
            onClick={handleCopy}
            className="text-gray-600 hover:text-gray-900 p-1"
            title="Copy campaign"
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          </button>
        </td>
      )}
    </tr>
  );
}

function TemplateRow({
  template,
  onDelete,
}: {
  template: UtmLibraryTemplate;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{template.name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{template.description || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {template.sourcePreset && (
          <Badge variant="secondary" className="text-xs">
            {template.sourcePreset}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {template.mediumPreset && (
          <Badge variant="secondary" className="text-xs">
            {template.mediumPreset}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{template.usageCount}</td>
      <td className="px-4 py-3 text-sm">
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 p-1"
          title="Delete template"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

export function UtmLibrary() {
  const { selectedSite } = useSite();
  const [campaigns, setCampaigns] = useState<UtmCampaign[]>([]);
  const [templates, setTemplates] = useState<UtmLibraryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const [campaignsData, templatesData] = await Promise.all([
        api.get<UtmCampaign[]>('/utms/campaigns'),
        api.get<UtmLibraryTemplate[]>('/utms/library'),
      ]);
      setCampaigns(campaignsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }, [selectedSite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTemplate = async (form: TemplateFormData) => {
    if (!selectedSite) return;
    try {
      await api.post('/utms/library', form);
      await fetchData();
      setShowTemplateForm(false);
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!selectedSite || !confirm('Delete this template?')) return;
    try {
      await api.del(`/utms/library/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalSessions = activeCampaigns.reduce((sum, c) => sum + (c.expectedSessions || 0), 0);
  const totalLeads = activeCampaigns.reduce((sum, c) => sum + (c.expectedLeads || 0), 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="UTM Library" subtitle="Manage campaigns, templates, and performance metrics" />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Active Campaigns</p>
          <p className="text-3xl font-bold text-gray-900">{activeCampaigns.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Expected Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{totalSessions.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Expected Leads</p>
          <p className="text-3xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
        </Card>
      </div>

      {/* Active Campaigns Table */}
      <Card className="mb-6">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
          <span className="text-sm text-gray-600">{activeCampaigns.length} campaigns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Medium</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Expected</th>
              </tr>
            </thead>
            <tbody>
              {activeCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No active campaigns. Create one in the UTM Builder.
                  </td>
                </tr>
              ) : (
                activeCampaigns.map(campaign => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Templates Section */}
      <Card className="mb-6">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
          <button
            onClick={() => setShowTemplateForm(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            New Template
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Medium</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Uses</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No templates yet. Create one to speed up campaign creation.
                  </td>
                </tr>
              ) : (
                templates.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onDelete={() => handleDeleteTemplate(template.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TemplateFormModal
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        onSubmit={handleCreateTemplate}
        loading={loading}
      />
    </div>
  );
}
