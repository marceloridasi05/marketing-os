import { useEffect, useState, useCallback } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { api } from '../lib/api';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface CacData {
  campaignId: number;
  model: string;
  spend: number;
  leads: number;
  revenue: number;
  cac: number;
  roi: number;
}

interface CacWidgetProps {
  campaignId?: number | null;
  title?: string;
}

export function CacWidget({
  campaignId,
  title = 'Customer Acquisition Cost',
}: CacWidgetProps) {
  const [cacData, setCacData] = useState<CacData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCacData = useCallback(async () => {
    if (!campaignId) {
      setCacData(null);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<CacData[]>(`/utms/cac?campaignId=${campaignId}`);
      // Get the latest period (last-touch model)
      const lastTouch = data.find(d => d.model === 'last_touch') || data[0];
      if (lastTouch) {
        setCacData(lastTouch);
      }
    } catch (err) {
      console.error('Failed to fetch CAC data:', err);
      setCacData(null);
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchCacData();
  }, [fetchCacData]);

  if (!campaignId) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500 text-sm">Select a campaign to view CAC metrics</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500 text-sm">Loading CAC data...</p>
      </Card>
    );
  }

  if (!cacData) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500 text-sm">No CAC data available for this campaign</p>
      </Card>
    );
  }

  const cacStatus = cacData.cac > 100 ? 'high' : cacData.cac > 50 ? 'medium' : 'good';
  const roiStatus = cacData.roi > 2 ? 'excellent' : cacData.roi > 1 ? 'good' : 'poor';

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <Badge variant={cacStatus === 'good' ? 'default' : 'secondary'}>
          {cacStatus === 'good' ? 'Healthy' : cacStatus === 'medium' ? 'Moderate' : 'High'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">CAC</p>
          <p className="text-3xl font-bold text-gray-900">${cacData.cac.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Cost per lead</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">ROI</p>
          <p className={`text-3xl font-bold ${cacData.roi > 1 ? 'text-green-600' : 'text-red-600'}`}>
            {(cacData.roi * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Return on spend</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-600 mb-1">Spend</p>
          <p className="text-lg font-semibold text-gray-900">${cacData.spend.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Leads</p>
          <p className="text-lg font-semibold text-gray-900">{cacData.leads.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Revenue</p>
          <p className="text-lg font-semibold text-gray-900">${cacData.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-900">
        <strong>Tip:</strong> A healthy CAC is typically 1/3 of the customer's first-year revenue.
      </div>
    </Card>
  );
}
