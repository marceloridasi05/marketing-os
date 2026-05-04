import React, { useState } from 'react';
import { Settings, ChevronRight } from 'lucide-react';
import { FieldConfigurationUI } from '../components/FieldConfigurationUI';
import { useSite } from '../context/SiteContext';

/**
 * Field Configuration Page (Phase 2.4)
 *
 * Purpose: Central location for configuring which fields are active for each DADOS module.
 * Allows users to mark fields as required, optional, or disabled per operation.
 */

interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  category: 'dados' | 'consolidacoes' | 'analises';
}

const MODULES: ModuleConfig[] = [
  // DADOS OPERACIONAIS
  {
    id: 'site-data',
    name: 'Tráfego & Site',
    description:
      'Website traffic, sessions, users, and lead generation metrics',
    category: 'dados',
  },
  {
    id: 'daily-spend',
    name: 'Ads & Spend',
    description:
      'Daily ad spend tracking by channel, campaign, and platform',
    category: 'dados',
  },
  {
    id: 'acquisition-conversions',
    name: 'Aquisição & Conversões',
    description: 'Channel-level acquisition data and conversion metrics',
    category: 'dados',
  },
  {
    id: 'commercial-funnel',
    name: 'Funil Comercial',
    description:
      'Sales funnel metrics: leads, MQLs, SQLs, opportunities, revenue',
    category: 'dados',
  },
  {
    id: 'ads-budgets',
    name: 'Verbas & Orçamento',
    description: 'Monthly budget allocation and spend tracking',
    category: 'dados',
  },
  {
    id: 'linkedin-page',
    name: 'LinkedIn Analytics',
    description: 'LinkedIn-specific performance metrics',
    category: 'dados',
  },
  {
    id: 'search-console',
    name: 'Search Console',
    description: 'Google Search Console organic search metrics',
    category: 'dados',
  },
  {
    id: 'unit-economics',
    name: 'Unit Economics',
    description: 'CAC, LTV, and payback period tracking',
    category: 'dados',
  },
  {
    id: 'business-metrics-monthly',
    name: 'Business Metrics',
    description: 'Monthly strategic KPIs and business metrics',
    category: 'dados',
  },
];

export default function FieldConfiguration() {
  const { selectedSite } = useSite();
  const [selectedModule, setSelectedModule] = useState<string>('site-data');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!selectedSite) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please select a site first</p>
      </div>
    );
  }

  const selectedModuleConfig = MODULES.find((m) => m.id === selectedModule);

  const handleConfigUpdate = () => {
    // Increment refresh key to trigger re-fetch in FieldConfigurationUI
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Field Configuration
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure which fields are active for each operational module
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20">
              {/* Category: DADOS */}
              <div>
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Dados Operacionais
                  </h3>
                </div>
                <div className="space-y-1 p-2">
                  {MODULES.filter((m) => m.category === 'dados').map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModule(module.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                        selectedModule === module.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{module.name}</span>
                        {selectedModule === module.id && (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2">
                ℹ️ About Field Configuration
              </h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                Set each field as Required (must fill), Optional (nice to have),
                or Disabled (not applicable). This helps keep your data entry
                focused and prevents false "missing data" warnings.
              </p>
            </div>
          </div>

          {/* Main Configuration Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {selectedModuleConfig && (
                <FieldConfigurationUI
                  key={`${selectedModule}-${refreshKey}`}
                  siteId={selectedSite.id}
                  moduleId={selectedModuleConfig.id}
                  moduleName={selectedModuleConfig.name}
                  moduleDescription={selectedModuleConfig.description}
                  onConfigUpdate={handleConfigUpdate}
                />
              )}
            </div>

            {/* Tips Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-red-900 mb-2">
                  🔴 Required
                </h4>
                <p className="text-xs text-red-800">
                  Fields marked as required must be filled. They're tracked in
                  data readiness scoring.
                </p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-yellow-900 mb-2">
                  🟡 Optional
                </h4>
                <p className="text-xs text-yellow-800">
                  Optional fields appear in forms but don't affect readiness
                  scoring if left empty.
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-300 rounded-lg p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  ⚪ Disabled
                </h4>
                <p className="text-xs text-gray-700">
                  Disabled fields don't appear in forms and aren't tracked.
                  Use this for non-applicable fields.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
