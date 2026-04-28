import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import { Filter, X } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  status: 'active' | 'archived';
}

interface UtmCampaignFilterProps {
  onCampaignChange: (campaignId: number | null) => void;
  selectedCampaignId?: number | null;
  multiSelect?: boolean;
  placeholder?: string;
}

export function UtmCampaignFilter({
  onCampaignChange,
  selectedCampaignId,
  multiSelect = false,
  placeholder = 'Filter by campaign...',
}: UtmCampaignFilterProps) {
  const { selectedSite } = useSite();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCampaigns = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const data = await api.get<Campaign[]>('/utms/campaigns');
      setCampaigns(data.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
    setLoading(false);
  }, [selectedSite]);

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen, fetchCampaigns]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.medium.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (campaignId: number) => {
    onCampaignChange(campaignId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCampaignChange(null);
  };

  return (
    <div className="relative inline-block w-full max-w-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Filter size={16} className="text-gray-600 flex-shrink-0" />
          <span className="truncate text-left">
            {selectedCampaign ? selectedCampaign.name : placeholder}
          </span>
        </div>
        {selectedCampaignId && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
            title="Clear filter"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading campaigns...</div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No campaigns found</div>
            ) : (
              filteredCampaigns.map(campaign => (
                <button
                  key={campaign.id}
                  onClick={() => handleSelect(campaign.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedCampaignId === campaign.id
                      ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{campaign.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {campaign.source} • {campaign.medium}
                  </div>
                </button>
              ))
            )}
          </div>

          {campaigns.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  onCampaignChange(null);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
