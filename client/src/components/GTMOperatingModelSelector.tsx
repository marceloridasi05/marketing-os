import React, { useState, useEffect } from 'react';
import { ChevronDown, Target, TrendingUp, Zap, BookOpen, AlertCircle } from 'lucide-react';

interface GTMModel {
  id: string;
  name: string;
  businessContext: string;
  stageCount: number;
  primarySuccessMetric: string;
}

interface GTMStatus {
  gtmModelId: string;
  overallReadinessPct: number;
  stages: Array<{
    stageId: string;
    label: string;
    readinessPct: number;
    isReady: boolean;
  }>;
}

interface GTMOperatingModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  siteId: number;
  status?: GTMStatus;
  isLoading?: boolean;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  b2b_sales_led: <TrendingUp className="w-5 h-5" />,
  b2b_abm: <Target className="w-5 h-5" />,
  plg: <Zap className="w-5 h-5" />,
  smb_inbound: <BookOpen className="w-5 h-5" />,
};

const MODEL_COLORS: Record<string, string> = {
  b2b_sales_led: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
  b2b_abm: 'bg-amber-50 border-amber-200 hover:border-amber-300',
  plg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
  smb_inbound: 'bg-blue-50 border-blue-200 hover:border-blue-300',
};

const TEXT_COLORS: Record<string, string> = {
  b2b_sales_led: 'text-indigo-700',
  b2b_abm: 'text-amber-700',
  plg: 'text-emerald-700',
  smb_inbound: 'text-blue-700',
};

const BADGE_COLORS: Record<string, string> = {
  b2b_sales_led: 'bg-indigo-100 text-indigo-700',
  b2b_abm: 'bg-amber-100 text-amber-700',
  plg: 'bg-emerald-100 text-emerald-700',
  smb_inbound: 'bg-blue-100 text-blue-700',
};

export function GTMOperatingModelSelector({
  selectedModelId,
  onModelChange,
  siteId,
  status,
  isLoading = false,
}: GTMOperatingModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<GTMModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const response = await fetch('/api/gtm/models');
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        console.error('Error fetching GTM models:', err);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId);

  if (loadingModels || !selectedModel) {
    return (
      <div className="animate-pulse h-16 bg-gray-100 rounded-lg" />
    );
  }

  const readinessPct = status?.overallReadinessPct ?? 0;
  const readinessColor =
    readinessPct === 100
      ? 'bg-emerald-100 text-emerald-700'
      : readinessPct >= 50
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
          MODEL_COLORS[selectedModelId]
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={TEXT_COLORS[selectedModelId]}>
              {MODEL_ICONS[selectedModelId]}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${TEXT_COLORS[selectedModelId]}`}>
                {selectedModel.name}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {selectedModel.businessContext}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Data Readiness Badge */}
            {status && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${readinessColor}`}>
                {readinessPct}% ready
              </div>
            )}

            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {/* Stage Readiness Preview */}
      {status && (
        <div className="mt-2 px-4 py-2 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {status.stages.map(stage => (
              <div
                key={stage.stageId}
                className="text-sm"
              >
                <div className="flex items-center gap-1">
                  <span className={stage.isReady ? 'text-emerald-600' : 'text-gray-400'}>
                    {stage.isReady ? '✓' : '○'}
                  </span>
                  <span className="text-gray-700">{stage.label}</span>
                </div>
                <div className="text-xs text-gray-500 ml-5">
                  {stage.readinessPct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="max-h-96 overflow-y-auto">
            {models.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  selectedModelId === model.id ? `${BADGE_COLORS[model.id]} rounded-lg mx-2 my-1 border` : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={TEXT_COLORS[model.id]}>
                    {MODEL_ICONS[model.id]}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${TEXT_COLORS[model.id]}`}>
                      {model.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {model.businessContext}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      {model.stageCount} stages • Primary: {model.primarySuccessMetric}
                    </div>
                  </div>
                  {selectedModelId === model.id && (
                    <div className="text-emerald-600 font-bold">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Info Section */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Switching models will reinterpret your data with different stage definitions. Data
                remains unchanged.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
