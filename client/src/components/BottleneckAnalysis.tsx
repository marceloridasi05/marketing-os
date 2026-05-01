/**
 * Bottleneck Analysis
 * Separates performance bottlenecks from data gaps
 * Shows what's actually broken vs what's missing
 */

import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BottleneckAnalysisProps {
  performance: string | null;
  data: string | null;
}

export function BottleneckAnalysis({ performance, data }: BottleneckAnalysisProps) {
  const hasPerformanceIssue = performance !== null;
  const hasDataGap = data !== null;
  const hasNoIssues = !hasPerformanceIssue && !hasDataGap;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Performance Bottleneck */}
      <div
        className={`rounded-lg p-4 border-l-4 ${
          hasPerformanceIssue
            ? 'bg-red-50 border-red-300'
            : 'bg-emerald-50 border-emerald-300'
        }`}
      >
        <div className="flex items-start gap-2 mb-2">
          {hasPerformanceIssue ? (
            <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          )}
          <h4 className={`font-semibold text-sm ${
            hasPerformanceIssue ? 'text-red-900' : 'text-emerald-900'
          }`}>
            Gargalo de Performance
          </h4>
        </div>
        <p className={`text-xs leading-snug ${
          hasPerformanceIssue
            ? 'text-red-800'
            : 'text-emerald-800'
        }`}>
          {hasPerformanceIssue
            ? performance
            : 'Nenhum gargalo de performance identificado com os dados disponíveis.'}
        </p>
      </div>

      {/* Data Bottleneck */}
      <div
        className={`rounded-lg p-4 border-l-4 ${
          hasDataGap
            ? 'bg-amber-50 border-amber-300'
            : 'bg-emerald-50 border-emerald-300'
        }`}
      >
        <div className="flex items-start gap-2 mb-2">
          {hasDataGap ? (
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          )}
          <h4 className={`font-semibold text-sm ${
            hasDataGap ? 'text-amber-900' : 'text-emerald-900'
          }`}>
            Gargalo de Dados
          </h4>
        </div>
        <p className={`text-xs leading-snug ${
          hasDataGap
            ? 'text-amber-800'
            : 'text-emerald-800'
        }`}>
          {hasDataGap
            ? data
            : 'Modelo completamente configurado. Nenhuma lacuna de dados crítica.'}
        </p>
      </div>
    </div>
  );
}
