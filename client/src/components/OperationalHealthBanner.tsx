/**
 * Operational Health & Data Readiness Banner
 * Separates operational health from data completeness
 * Removes ambiguity: health of what exists vs % of model configured
 */

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

type HealthStatus = 'healthy' | 'attention' | 'critical';

interface OperationalHealthBannerProps {
  operational: {
    status: HealthStatus;
    mainReason: string;
    recommendedAction: string;
    topPositive?: { label: string; change: number };
    topNegative?: { label: string; change: number };
  };
  data: {
    percentComplete: number;
    stage: string;
    missingCritical: string[];
    missingRecommended: string[];
  };
  executiveSummary: string;
}

export function OperationalHealthBanner({
  operational,
  data,
  executiveSummary,
}: OperationalHealthBannerProps) {
  const operationalConfig: Record<HealthStatus, { bg: string; border: string; icon: React.ReactNode; label: string; labelColor: string }> = {
    healthy: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: <CheckCircle2 size={20} className="text-emerald-600" />,
      label: 'Saudável',
      labelColor: 'bg-emerald-100 text-emerald-700',
    },
    attention: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertTriangle size={20} className="text-amber-600" />,
      label: 'Atenção',
      labelColor: 'bg-amber-100 text-amber-700',
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle size={20} className="text-red-600" />,
      label: 'Crítico',
      labelColor: 'bg-red-100 text-red-700',
    },
  };

  const operationalConfig_ = operationalConfig[operational.status];
  const dataReadinessColor = data.percentComplete >= 80 ? 'emerald' : data.percentComplete >= 50 ? 'amber' : 'red';

  return (
    <div className={`border-l-4 border-gray-300 rounded-lg p-5 mb-6 space-y-4`}>
      {/* Two-Column Health Indicators */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Operational Health */}
        <div className={`${operationalConfig_.bg} border border-gray-200 rounded-lg p-4 space-y-2`}>
          <div className="flex items-center gap-2">
            {operationalConfig_.icon}
            <h3 className="text-sm font-bold text-gray-900">Saúde Operacional</h3>
          </div>
          <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${operationalConfig_.labelColor}`}>
            {operationalConfig_.label}
          </div>
          <p className="text-xs text-gray-600 leading-snug">
            {operational.mainReason}
          </p>
          {operational.topPositive && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2">
              <TrendingUp size={12} />
              {operational.topPositive.label} +{Math.round(operational.topPositive.change)}%
            </div>
          )}
          {operational.topNegative && operational.status !== 'healthy' && (
            <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-2">
              <TrendingDown size={12} />
              {operational.topNegative.label} {Math.round(operational.topNegative.change)}%
            </div>
          )}
        </div>

        {/* Data Readiness */}
        <div className={`bg-${dataReadinessColor}-50 border border-gray-200 rounded-lg p-4 space-y-2`}>
          <h3 className="text-sm font-bold text-gray-900">Prontidão de Dados</h3>
          <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-${dataReadinessColor}-100 text-${dataReadinessColor}-700`}>
            {data.percentComplete}% Configurado
          </div>
          <p className="text-xs text-gray-600 leading-snug">
            {data.stage === 'completo' && 'Modelo totalmente configurado'}
            {data.stage === 'avançado' && 'Modelo bem avançado, poucos campos faltando'}
            {data.stage === 'parcial' && 'Modelo parcialmente configurado'}
            {data.stage === 'iniciando' && 'Modelo ainda em fase inicial'}
          </p>
          {data.missingCritical.length > 0 && (
            <div className="text-xs text-red-700 font-medium mt-2">
              Faltam: {data.missingCritical.slice(0, 2).join(', ')}
              {data.missingCritical.length > 2 && ` +${data.missingCritical.length - 2}`}
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold text-gray-900">Resumo Executivo:</span> {executiveSummary}
        </p>
      </div>

      {/* Recommended Action */}
      {operational.recommendedAction && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">→ Próxima Ação</p>
          <p className="text-xs text-blue-800">{operational.recommendedAction}</p>
        </div>
      )}
    </div>
  );
}
