import { Card } from './Card';
import { Badge } from './Badge';
import { TrendingUp, TrendingDown, Target, Users, DollarSign } from 'lucide-react';

interface CampaignMetrics {
  id: number;
  name: string;
  source: string;
  medium: string;
  status: 'active' | 'archived';
  sessions: number;
  leads: number;
  cac: number;
  roi: number;
  trendUp?: boolean;
  trendPercent?: number;
}

interface CampaignPerformanceCardProps {
  campaign: CampaignMetrics;
  onClick?: () => void;
}

export function CampaignPerformanceCard({
  campaign,
  onClick,
}: CampaignPerformanceCardProps) {
  const cacStatus = campaign.cac > 100 ? 'high' : campaign.cac > 50 ? 'medium' : 'good';
  const roiStatus = campaign.roi > 2 ? 'excellent' : campaign.roi > 1 ? 'good' : 'poor';

  return (
    <Card
      className={`p-4 cursor-pointer transition-shadow hover:shadow-md ${onClick ? 'hover:border-blue-300' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {campaign.source} • {campaign.medium}
          </p>
        </div>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded">
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1 flex items-center justify-center gap-1">
            <Target size={14} /> Sessions
          </p>
          <p className="text-lg font-bold text-gray-900">{campaign.sessions.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1 flex items-center justify-center gap-1">
            <Users size={14} /> Leads
          </p>
          <p className="text-lg font-bold text-gray-900">{campaign.leads.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1 flex items-center justify-center gap-1">
            <DollarSign size={14} /> CAC
          </p>
          <p className={`text-lg font-bold ${cacStatus === 'good' ? 'text-green-600' : 'text-orange-600'}`}>
            ${campaign.cac.toFixed(0)}
          </p>
        </div>
      </div>

      {/* ROI and Trend */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-100">
        <div>
          <p className="text-xs font-medium text-blue-900">ROI</p>
          <p className={`text-xl font-bold ${campaign.roi > 1 ? 'text-green-600' : 'text-red-600'}`}>
            {(campaign.roi * 100).toFixed(0)}%
          </p>
        </div>
        {campaign.trendPercent !== undefined && (
          <div className={`flex items-center gap-1 ${campaign.trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {campaign.trendUp ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )}
            <span className="text-sm font-semibold">{campaign.trendPercent}%</span>
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
        <Badge variant={cacStatus === 'good' ? 'default' : 'secondary'} className="text-xs">
          CAC: {cacStatus}
        </Badge>
        <Badge variant={roiStatus === 'good' ? 'default' : 'secondary'} className="text-xs">
          ROI: {roiStatus}
        </Badge>
      </div>
    </Card>
  );
}
