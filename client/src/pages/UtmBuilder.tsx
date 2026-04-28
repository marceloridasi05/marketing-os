import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import { Plus, Copy, CheckCircle, AlertCircle, Trash2, Archive } from 'lucide-react';

interface UtmCampaign {
  id: number;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  utmUrl?: string;
  baseUrl?: string;
  status: 'active' | 'archived';
  expectedBudget?: number;
  expectedSessions?: number;
  expectedLeads?: number;
  createdAt: string;
}

interface UtmLibraryTemplate {
  id: number;
  name: string;
  sourcePreset?: string;
  mediumPreset?: string;
  campaignTemplate?: string;
  usageCount: number;
}

// Governance: Preset values
const PRESET_SOURCES = ['google', 'linkedin', 'facebook', 'twitter', 'direct', 'organic', 'referral', 'email', 'other'];
const PRESET_MEDIUMS = ['cpc', 'cpm', 'cpa', 'organic', 'email', 'social', 'referral', 'direct', 'video', 'display', 'none'];

const inputCls = 'border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500';
const buttonCls = 'px-3 py-2 text-sm font-medium rounded-md transition-colors';
const primaryButtonCls = buttonCls + ' bg-blue-600 text-white hover:bg-blue-700';
const secondaryButtonCls = buttonCls + ' bg-gray-200 text-gray-900 hover:bg-gray-300';

interface FormData {
  name: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  baseUrl: string;
}

const emptyForm: FormData = {
  name: '',
  source: '',
  medium: '',
  campaign: '',
  content: '',
  term: '',
  baseUrl: '',
};

function UtmBuilderForm({
  onSubmit,
  loading,
  duplicateError,
}: {
  onSubmit: (form: FormData) => Promise<void>;
  loading: boolean;
  duplicateError: string | null;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleGenerateUrl = () => {
    if (!form.baseUrl) {
      alert('Please enter a base URL');
      return;
    }
    const separator = form.baseUrl.includes('?') ? '&' : '?';
    const params = [
      `utm_source=${encodeURIComponent(form.source)}`,
      `utm_medium=${encodeURIComponent(form.medium)}`,
      `utm_campaign=${encodeURIComponent(form.campaign)}`,
    ];
    if (form.content) params.push(`utm_content=${encodeURIComponent(form.content)}`);
    if (form.term) params.push(`utm_term=${encodeURIComponent(form.term)}`);
    const url = form.baseUrl + separator + params.join('&');
    setGeneratedUrl(url);
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.source || !form.medium || !form.campaign) {
      alert('Name, Source, Medium, and Campaign are required');
      return;
    }
    await onSubmit(form);
    setForm(emptyForm);
    setGeneratedUrl(null);
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New UTM Campaign</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {duplicateError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{duplicateError}</p>
          </div>
        )}

        {/* Campaign Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={set('name')}
            className={inputCls}
            placeholder="e.g., Q1 2026 SaaS Launch"
          />
          <p className="text-xs text-gray-500 mt-1">Display name for this UTM campaign</p>
        </div>

        {/* Source and Medium (2-column) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
            <select
              required
              value={form.source}
              onChange={set('source')}
              className={inputCls}
            >
              <option value="">Select source...</option>
              {PRESET_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medium *</label>
            <select
              required
              value={form.medium}
              onChange={set('medium')}
              className={inputCls}
            >
              <option value="">Select medium...</option>
              {PRESET_MEDIUMS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaign, Content, Term */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign *</label>
          <input
            required
            type="text"
            value={form.campaign}
            onChange={set('campaign')}
            className={inputCls}
            placeholder="e.g., product_launch_q1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (optional)</label>
            <input
              type="text"
              value={form.content}
              onChange={set('content')}
              className={inputCls}
              placeholder="e.g., variant_a, email_1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term (optional)</label>
            <input
              type="text"
              value={form.term}
              onChange={set('term')}
              className={inputCls}
              placeholder="e.g., saas_management"
            />
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (optional)</label>
          <input
            type="url"
            value={form.baseUrl}
            onChange={set('baseUrl')}
            className={inputCls}
            placeholder="https://example.com/page"
          />
        </div>

        {/* URL Preview */}
        {generatedUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs font-medium text-blue-900 mb-1">Generated URL:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white border border-blue-300 rounded px-2 py-1 flex-1 overflow-auto text-blue-900">
                {generatedUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className={secondaryButtonCls + ' whitespace-nowrap flex items-center gap-1'}
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {form.baseUrl && (
            <button
              type="button"
              onClick={handleGenerateUrl}
              className={secondaryButtonCls}
            >
              Generate URL
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={primaryButtonCls + ' disabled:opacity-50'}
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function CampaignCard({ campaign, onArchive, onDelete }: { campaign: UtmCampaign; onArchive: () => void; onDelete: () => void }) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = () => {
    if (campaign.utmUrl) {
      navigator.clipboard.writeText(campaign.utmUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {campaign.source} • {campaign.medium} • {campaign.campaign}
          </p>
        </div>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </div>

      {campaign.utmUrl && (
        <div className="bg-gray-50 rounded p-2 mb-3 flex items-center gap-2">
          <code className="text-xs text-gray-700 flex-1 overflow-auto">{campaign.utmUrl}</code>
          <button
            onClick={copyUrl}
            className="text-gray-600 hover:text-gray-900 p-1"
            title="Copy URL"
          >
            {copiedUrl ? <CheckCircle size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {campaign.expectedLeads && (
        <p className="text-xs text-gray-600 mb-3">
          Expected: {campaign.expectedSessions?.toLocaleString()} sessions, {campaign.expectedLeads} leads
        </p>
      )}

      <div className="flex gap-2">
        {campaign.status === 'active' && (
          <button
            onClick={onArchive}
            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
          >
            <Archive size={12} /> Archive
          </button>
        )}
      </div>
    </Card>
  );
}

export function UtmBuilder() {
  const { selectedSite } = useSite();
  const [campaigns, setCampaigns] = useState<UtmCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');

  const fetchCampaigns = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const statusQuery = filterStatus === 'all' ? '' : `&status=${filterStatus}`;
      const data = await api.get<UtmCampaign[]>(`/utms/campaigns${statusQuery}`);
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
    setLoading(false);
  }, [selectedSite, filterStatus]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (form: any) => {
    if (!selectedSite) return;
    setDuplicateError(null);
    setLoading(true);
    try {
      await api.post('/utms/campaigns', {
        ...form,
        channels: [],
      });
      await fetchCampaigns();
    } catch (err: any) {
      const message = err.message || String(err);
      if (message.includes('409') || message.includes('already exists')) {
        setDuplicateError('A campaign with these UTM parameters already exists');
      } else {
        console.error('Failed to create campaign:', err);
      }
    }
    setLoading(false);
  };

  const handleArchive = async (id: number) => {
    if (!selectedSite || !confirm('Archive this campaign?')) return;
    try {
      await api.del(`/utms/campaigns/${id}`);
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to archive campaign:', err);
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const archivedCampaigns = campaigns.filter(c => c.status === 'archived');

  return (
    <div className="max-w-4xl">
      <PageHeader title="UTM Builder" subtitle="Create and manage UTM campaigns for tracking" />

      <UtmBuilderForm
        onSubmit={handleCreateCampaign}
        loading={loading}
        duplicateError={duplicateError}
      />

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns ({activeCampaigns.length})</h2>
        {activeCampaigns.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">No active campaigns yet. Create one above.</p>
          </Card>
        ) : (
          activeCampaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onArchive={() => handleArchive(campaign.id)}
              onDelete={() => handleArchive(campaign.id)}
            />
          ))
        )}
      </div>

      {archivedCampaigns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Archived ({archivedCampaigns.length})</h2>
          {archivedCampaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onArchive={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
