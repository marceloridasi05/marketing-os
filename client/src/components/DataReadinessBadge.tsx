import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface DataReadinessBadgeProps {
  completeness: number; // 0-100
  totalRequired: number;
  filledRequired: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Data Readiness Badge Component (Phase 2.5)
 *
 * Purpose: Display data completeness progress for a module
 *
 * Shows:
 * - Progress bar with percentage
 * - Filled/Required count
 * - Color-coded status (red < 50%, yellow 50-75%, green >= 75%)
 *
 * Usage:
 * ```tsx
 * <DataReadinessBadge
 *   completeness={75}
 *   totalRequired={10}
 *   filledRequired={7}
 *   showDetails={true}
 * />
 * ```
 */
export const DataReadinessBadge: React.FC<DataReadinessBadgeProps> = ({
  completeness,
  totalRequired,
  filledRequired,
  showDetails = true,
  size = 'md',
}) => {
  // Determine status and colors
  const getStatus = (): { label: string; color: string; bgColor: string } => {
    if (completeness === 100) {
      return {
        label: 'Ready',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
      };
    }
    if (completeness >= 75) {
      return {
        label: 'Nearly Complete',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
      };
    }
    if (completeness >= 50) {
      return {
        label: 'In Progress',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
      };
    }
    return {
      label: 'Needs Attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
    };
  };

  const status = getStatus();

  // Size mapping
  const sizeConfig = {
    sm: {
      container: 'p-2',
      text: 'text-xs',
      bar: 'h-1.5',
      icon: 'w-3 h-3',
    },
    md: {
      container: 'p-3',
      text: 'text-sm',
      bar: 'h-2',
      icon: 'w-4 h-4',
    },
    lg: {
      container: 'p-4',
      text: 'text-base',
      bar: 'h-3',
      icon: 'w-5 h-5',
    },
  };

  const config = sizeConfig[size];

  // Progress bar color based on completeness
  const getProgressColor = (): string => {
    if (completeness === 100) return 'from-green-500 to-emerald-500';
    if (completeness >= 75) return 'from-blue-500 to-cyan-500';
    if (completeness >= 50) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-rose-500';
  };

  if (totalRequired === 0) {
    return (
      <div className={`${config.container} border border-gray-200 rounded-lg ${status.bgColor}`}>
        <p className={`${config.text} font-medium ${status.color}`}>
          ✓ No required fields configured
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${config.container} ${status.bgColor}`}>
      {/* Header with status label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {completeness === 100 ? (
            <CheckCircle className={`${config.icon} ${status.color}`} />
          ) : (
            <AlertCircle className={`${config.icon} ${status.color}`} />
          )}
          <span className={`${config.text} font-semibold ${status.color}`}>
            {status.label}
          </span>
        </div>
        <span className={`${config.text} font-bold ${status.color}`}>
          {completeness}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`bg-gradient-to-r ${getProgressColor()} ${config.bar} rounded-full transition-all duration-300`}
          style={{ width: `${completeness}%` }}
        ></div>
      </div>

      {/* Details */}
      {showDetails && (
        <p className={`${config.text} text-gray-600`}>
          {filledRequired} of {totalRequired} required fields completed
        </p>
      )}
    </div>
  );
};

/**
 * Inline Data Readiness Status
 *
 * A compact version that can be displayed inline with other content
 */
export const DataReadinessStatus: React.FC<{
  completeness: number;
  totalRequired: number;
}> = ({ completeness, totalRequired }) => {
  const getStatusColor = (): string => {
    if (completeness === 100) return 'text-green-600';
    if (completeness >= 75) return 'text-blue-600';
    if (completeness >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (totalRequired === 0) {
    return <span className="text-xs font-semibold text-gray-600">Ready</span>;
  }

  return (
    <span className={`text-xs font-semibold ${getStatusColor()}`}>
      {completeness}% • {totalRequired} fields
    </span>
  );
};

export default DataReadinessBadge;
