import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, ArrowRight } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  source: string;
  medium: string;
  campaign: string;
}

interface AttributionComparison {
  campaignId: number;
  campaignName: string;
  source: string;
  medium: string;
  campaign: string;
  firstTouchSessions: number;
  firstTouchLeads: number;
  firstTouchRevenue: number;
  firstTouchCac: number;
  lastTouchSessions: number;
  lastTouchLeads: number;
  lastTouchRevenue: number;
  lastTouchCac: number;
  linearSessions: number;
  linearLeads: number;
  linearRevenue: number;
  linearCac: number;
}

interface CohortData {
  source: string;
  campaignCount: number;
  totalExpectedLeads: number;
  totalExpectedRevenue: number;
}

type ViewType = 'comparison' | 'journey' | 'cac' | 'touchpoints';

const MetricCard = ({ label, value, change, icon: Icon }: {
  label: string;
  value: string | number;
  change?: number;
  icon: typeof TrendingUp;
}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}% from last period
          </p>
        )}
      </div>
      <Icon size={24} className="text-gray-400" />
    </div>
  </Card>
);

function ModelComparisonView({ campaigns }: { campaigns: AttributionComparison[] }) {
  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No campaign data available. Create campaigns and sync GA4 data first.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Campaign</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Model</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Sessions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Leads</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">CAC</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, idx) => (
              <tbody key={campaign.campaignId}>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {campaign.campaignName}
                  </td>
                  <td className="px-4 py-3 text-sm"><Badge variant="default">First-Touch</Badge></td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.firstTouchSessions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.firstTouchLeads.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.firstTouchRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.firstTouchCac.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm"></td>
                  <td className="px-4 py-3 text-sm"><Badge variant="secondary">Last-Touch</Badge></td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.lastTouchSessions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.lastTouchLeads.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.lastTouchRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.lastTouchCac.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 text-sm"></td>
                  <td className="px-4 py-3 text-sm"><Badge>Linear</Badge></td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.linearSessions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.linearLeads.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.linearRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.linearCac.toFixed(2)}</td>
                </tr>
              </tbody>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function JourneyView({ cohorts }: { cohorts: CohortData[] }) {
  if (cohorts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No journey data available yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cohorts.map((cohort, idx) => (
        <Card key={cohort.source} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Source: {cohort.source}</h4>
            <span className="text-sm text-gray-500">{cohort.campaignCount} campaigns</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Expected Leads</p>
              <p className="text-2xl font-bold text-gray-900">{cohort.totalExpectedLeads.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Expected Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${cohort.totalExpectedRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CacView({ campaigns }: { campaigns: AttributionComparison[] }) {
  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No CAC data available. Need conversion data to calculate.</p>
      </Card>
    );
  }

  // Sort by last-touch CAC
  const sorted = [...campaigns].sort((a, b) => a.lastTouchCac - b.lastTouchCac);

  return (
    <Card>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">CAC by Campaign (Last-Touch Model)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Campaign</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Spend</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Leads</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">CAC</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(campaign => (
              <tr key={campaign.campaignId} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{campaign.campaignName}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">$0</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{campaign.lastTouchLeads}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-semibold">${campaign.lastTouchCac.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {campaign.lastTouchCac > 100 ? (
                    <span className="text-red-600 flex items-center justify-end gap-1">
                      <TrendingUp size={14} /> High
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center justify-end gap-1">
                      <TrendingDown size={14} /> Good
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function UtmAttribution() {
  const { selectedSite } = useSite();
  const [view, setView] = useState<ViewType>('comparison');
  const [campaigns, setCampaigns] = useState<AttributionComparison[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const [compareData, cohortData] = await Promise.all([
        api.get<any>('/utms/attribution/compare-models').catch(() => ({ campaigns: [] })),
        api.get<CohortData[]>('/utms/cohort-analysis').catch(() => []),
      ]);

      setCampaigns(compareData.campaigns || []);
      setCohorts(cohortData);
    } catch (err) {
      console.error('Failed to fetch attribution data:', err);
    }
    setLoading(false);
  }, [selectedSite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalFirstTouchLeads = campaigns.reduce((sum, c) => sum + (c.firstTouchLeads || 0), 0);
  const totalLastTouchLeads = campaigns.reduce((sum, c) => sum + (c.lastTouchLeads || 0), 0);
  const avgLastTouchCac = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.lastTouchCac || 0), 0) / campaigns.length
    : 0;

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="UTM Attribution"
        subtitle="Analyze multi-touch attribution models and customer acquisition costs"
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Campaigns" value={campaigns.length} icon={Target} />
        <MetricCard label="First-Touch Leads" value={totalFirstTouchLeads.toLocaleString()} icon={Users} />
        <MetricCard label="Last-Touch Leads" value={totalLastTouchLeads.toLocaleString()} icon={Users} />
        <MetricCard label="Avg CAC (Last-Touch)" value={`$${avgLastTouchCac.toFixed(2)}`} icon={DollarSign} />
      </div>

      {/* View Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setView('comparison')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'comparison'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Model Comparison
        </button>
        <button
          onClick={() => setView('journey')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'journey'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Journey Analysis
        </button>
        <button
          onClick={() => setView('cac')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'cac'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          CAC & ROI
        </button>
      </div>

      {/* View Content */}
      {view === 'comparison' && <ModelComparisonView campaigns={campaigns} />}
      {view === 'journey' && <JourneyView cohorts={cohorts} />}
      {view === 'cac' && <CacView campaigns={campaigns} />}

      {/* Info Box */}
      <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Attribution Models:</strong> First-Touch credits the first campaign a user interacted with.
          Last-Touch credits the final campaign before conversion. Linear divides credit equally.
          These models help determine which campaigns truly drive conversions.
        </p>
      </Card>
    </div>
  );
}
