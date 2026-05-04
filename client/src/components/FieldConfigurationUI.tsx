import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FieldConfig {
  id: number;
  field_key: string;
  field_status: 'required' | 'optional' | 'disabled';
  display_name: string;
  field_type: string;
  field_order: number;
  description: string | null;
}

interface FieldStatus {
  fieldKey: string;
  fieldStatus: 'required' | 'optional' | 'disabled';
  displayName: string;
  dataStatus: string;
  sourceOfTruth: string | null;
  lastUpdated: string | null;
  confidence: 'high' | 'medium' | 'low';
  hasPassed30Days: boolean;
}

interface FieldConfigurationUIProps {
  siteId: number;
  moduleId: string;
  moduleName: string;
  moduleDescription?: string;
  onConfigUpdate?: () => void;
}

/**
 * Field Configuration UI Component (Phase 2.4)
 *
 * Purpose: Allow users to configure which fields are:
 * - Required (must be filled)
 * - Optional (nice to have)
 * - Disabled (not applicable to this operation)
 *
 * Shows data readiness progress and smart guidance messages.
 */
export const FieldConfigurationUI: React.FC<FieldConfigurationUIProps> = ({
  siteId,
  moduleId,
  moduleName,
  moduleDescription,
  onConfigUpdate,
}) => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [statuses, setStatuses] = useState<Map<string, FieldStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState(0);
  const [requiredCount, setRequiredCount] = useState(0);
  const [filledCount, setFilledCount] = useState(0);

  // Load field configurations
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/field-config/${moduleId}?siteId=${siteId}`
        );
        if (response.ok) {
          const configs = await response.json();
          setFields(configs);
        }
      } catch (error) {
        console.error('Error fetching field configs:', error);
      }
    };

    fetchConfigs();
  }, [siteId, moduleId]);

  // Load field statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch(
          `/api/field-config/${moduleId}/status?siteId=${siteId}`
        );
        if (response.ok) {
          const data = await response.json();
          setCompleteness(data.completeness);
          setRequiredCount(data.totalRequired);
          setFilledCount(data.filledRequired);

          const statusMap = new Map<string, FieldStatus>();
          data.fields.forEach((field: FieldStatus) => {
            statusMap.set(field.fieldKey, field);
          });
          setStatuses(statusMap);
        }
      } catch (error) {
        console.error('Error fetching field statuses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [siteId, moduleId]);

  // Update field status
  const handleFieldStatusChange = async (
    fieldKey: string,
    newStatus: 'required' | 'optional' | 'disabled'
  ) => {
    try {
      setSaving(true);
      const response = await fetch('/api/field-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          moduleId,
          fieldKey,
          fieldStatus: newStatus,
          displayName:
            fields.find((f) => f.field_key === fieldKey)?.display_name || fieldKey,
          fieldType:
            fields.find((f) => f.field_key === fieldKey)?.field_type || 'string',
          fieldOrder:
            fields.find((f) => f.field_key === fieldKey)?.field_order || 0,
        }),
      });

      if (response.ok) {
        // Update local state
        setFields(
          fields.map((f) =>
            f.field_key === fieldKey ? { ...f, field_status: newStatus } : f
          )
        );

        // Refresh statuses to update completeness
        const statusResponse = await fetch(
          `/api/field-config/${moduleId}/status?siteId=${siteId}`
        );
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setCompleteness(data.completeness);
          setRequiredCount(data.totalRequired);
          setFilledCount(data.filledRequired);
        }

        onConfigUpdate?.();
      }
    } catch (error) {
      console.error('Error updating field status:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get status badge color
  const getStatusColor = (
    status: 'required' | 'optional' | 'disabled'
  ): string => {
    switch (status) {
      case 'required':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'optional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'disabled':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Get data status icon and color
  const getDataStatusIcon = (
    dataStatus: string,
    confidence: string
  ): { icon: React.ReactNode; color: string } => {
    if (dataStatus === 'missing') {
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-500',
      };
    }
    if (dataStatus === 'stale') {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-yellow-500',
      };
    }
    if (dataStatus === 'automatic' || dataStatus === 'manual') {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-500',
      };
    }
    return {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-gray-400',
    };
  };

  // Get smart guidance message
  const getGuidanceMessage = (): string | null => {
    const requiredFields = fields.filter((f) => f.field_status === 'required');
    const missingRequired = requiredFields.filter((f) => {
      const status = statuses.get(f.field_key);
      return !status || status.dataStatus === 'missing';
    });

    if (missingRequired.length > 0) {
      const fieldNames = missingRequired
        .map((f) => `"${f.display_name}"`)
        .slice(0, 3)
        .join(', ');
      return `Required field${missingRequired.length > 1 ? 's' : ''} ${fieldNames}${missingRequired.length > 3 ? ` (+${missingRequired.length - 3} more)` : ''} not filled. Complete these to enable full analysis.`;
    }

    if (completeness === 100 && requiredFields.length > 0) {
      return '✓ All required fields configured and populated. System ready for analysis.';
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin inline-block">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full"></div>
        </div>
        <p className="text-gray-600 mt-2">Loading field configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{moduleName}</h2>
        {moduleDescription && (
          <p className="text-sm text-gray-600 mt-1">{moduleDescription}</p>
        )}
      </div>

      {/* Completeness Progress */}
      {requiredCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              Data Readiness
            </span>
            <span className="text-sm font-bold text-blue-600">
              {completeness}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {filledCount} of {requiredCount} required fields completed
          </p>
        </div>
      )}

      {/* Guidance Message */}
      {getGuidanceMessage() && (
        <div
          className={`border-l-4 p-4 rounded ${
            completeness === 100
              ? 'bg-green-50 border-green-500'
              : 'bg-yellow-50 border-yellow-500'
          }`}
        >
          <p
            className={`text-sm ${
              completeness === 100
                ? 'text-green-800'
                : 'text-yellow-800'
            }`}
          >
            {getGuidanceMessage()}
          </p>
        </div>
      )}

      {/* Field List */}
      <div className="space-y-2">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No fields configured for this module yet.</p>
          </div>
        ) : (
          fields.map((field) => {
            const status = statuses.get(field.field_key);
            const { icon, color } = getDataStatusIcon(
              status?.dataStatus || 'missing',
              status?.confidence || 'low'
            );
            const isExpanded = expandedField === field.field_key;

            return (
              <div
                key={field.field_key}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Field Header */}
                <div
                  onClick={() =>
                    setExpandedField(
                      isExpanded ? null : field.field_key
                    )
                  }
                  className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Data Status Icon */}
                    <div className={`${color}`}>{icon}</div>

                    {/* Field Info */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {field.display_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {field.field_key} • {field.field_type}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        field.field_status
                      )}`}
                    >
                      {field.field_status === 'required'
                        ? 'Required'
                        : field.field_status === 'optional'
                          ? 'Optional'
                          : 'Disabled'}
                    </span>

                    {/* Expand Icon */}
                    <div className="text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Current Data Status */}
                    {status && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Data Status:</span>
                          <p className="font-medium text-gray-900 capitalize">
                            {status.dataStatus}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Source:</span>
                          <p className="font-medium text-gray-900">
                            {status.sourceOfTruth || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Updated:</span>
                          <p className="font-medium text-gray-900">
                            {status.lastUpdated
                              ? new Date(
                                  status.lastUpdated
                                ).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <p className="font-medium text-gray-900 capitalize">
                            {status.confidence}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Field Description */}
                    {field.description && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          {field.description}
                        </p>
                      </div>
                    )}

                    {/* Field Status Toggle */}
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        Field Status
                      </p>
                      <div className="flex gap-2">
                        {(['required', 'optional', 'disabled'] as const).map(
                          (s) => (
                            <button
                              key={s}
                              onClick={() =>
                                handleFieldStatusChange(field.field_key, s)
                              }
                              disabled={saving}
                              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                                field.field_status === s
                                  ? getStatusColor(s)
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {s === 'required'
                                ? 'Required'
                                : s === 'optional'
                                  ? 'Optional'
                                  : 'Disabled'}
                            </button>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-500 pt-2">
                        {field.field_status === 'required' &&
                          'This field is required and will be highlighted in data entry forms.'}
                        {field.field_status === 'optional' &&
                          'This field is optional. Data entry forms will show it, but users can skip it.'}
                        {field.field_status === 'disabled' &&
                          'This field is disabled and will not appear in data entry forms.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        <p>
          💡 Tip: Disable fields that don't apply to your operation. This helps
          keep your data entry focused and prevents false "missing data" warnings.
        </p>
      </div>
    </div>
  );
};

export default FieldConfigurationUI;
