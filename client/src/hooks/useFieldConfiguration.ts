import { useState, useEffect, useCallback } from 'react';

export interface FieldConfig {
  id: number;
  field_key: string;
  field_status: 'required' | 'optional' | 'disabled';
  display_name: string;
  field_type: string;
  field_order: number;
  description: string | null;
}

export interface FieldStatus {
  fieldKey: string;
  fieldStatus: 'required' | 'optional' | 'disabled';
  displayName: string;
  dataStatus: string;
  sourceOfTruth: string | null;
  lastUpdated: string | null;
  confidence: 'high' | 'medium' | 'low';
  hasPassed30Days: boolean;
}

export interface FieldCompleteness {
  completeness: number;
  totalRequired: number;
  filledRequired: number;
}

/**
 * useFieldConfiguration Hook (Phase 2.5)
 *
 * Purpose: Integrate field configuration into DADOS modules
 *
 * Usage:
 * ```tsx
 * const {
 *   activeFields,
 *   completeness,
 *   isLoading,
 *   filterField,
 *   getRequiredFields,
 *   getOptionalFields,
 *   getDisabledFields
 * } = useFieldConfiguration(siteId, moduleId);
 * ```
 */
export function useFieldConfiguration(
  siteId: number,
  moduleId: string
) {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [statuses, setStatuses] = useState<Map<string, FieldStatus>>(new Map());
  const [completeness, setCompleteness] = useState<FieldCompleteness>({
    completeness: 0,
    totalRequired: 0,
    filledRequired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch configurations
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch field configurations
        const configRes = await fetch(
          `/api/field-config/${moduleId}?siteId=${siteId}`
        );
        if (!configRes.ok) throw new Error('Failed to fetch field config');
        const configData = await configRes.json();
        setFields(configData);

        // Fetch field statuses
        const statusRes = await fetch(
          `/api/field-config/${moduleId}/status?siteId=${siteId}`
        );
        if (!statusRes.ok) throw new Error('Failed to fetch field status');
        const statusData = await statusRes.json();

        setCompleteness({
          completeness: statusData.completeness,
          totalRequired: statusData.totalRequired,
          filledRequired: statusData.filledRequired,
        });

        const statusMap = new Map<string, FieldStatus>();
        statusData.fields.forEach((field: FieldStatus) => {
          statusMap.set(field.fieldKey, field);
        });
        setStatuses(statusMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [siteId, moduleId]);

  /**
   * Filter field configuration to determine if it should be displayed
   * Returns true if field is not disabled
   */
  const filterField = useCallback(
    (fieldKey: string): boolean => {
      const field = fields.find((f) => f.field_key === fieldKey);
      return field ? field.field_status !== 'disabled' : true;
    },
    [fields]
  );

  /**
   * Get only active (non-disabled) fields
   */
  const getActiveFields = useCallback((): FieldConfig[] => {
    return fields.filter((f) => f.field_status !== 'disabled');
  }, [fields]);

  /**
   * Get only required fields
   */
  const getRequiredFields = useCallback((): FieldConfig[] => {
    return fields.filter((f) => f.field_status === 'required');
  }, [fields]);

  /**
   * Get only optional fields
   */
  const getOptionalFields = useCallback((): FieldConfig[] => {
    return fields.filter((f) => f.field_status === 'optional');
  }, [fields]);

  /**
   * Get only disabled fields
   */
  const getDisabledFields = useCallback((): FieldConfig[] => {
    return fields.filter((f) => f.field_status === 'disabled');
  }, [fields]);

  /**
   * Check if a specific field is required
   */
  const isFieldRequired = useCallback(
    (fieldKey: string): boolean => {
      const field = fields.find((f) => f.field_key === fieldKey);
      return field ? field.field_status === 'required' : false;
    },
    [fields]
  );

  /**
   * Check if a specific field is disabled
   */
  const isFieldDisabled = useCallback(
    (fieldKey: string): boolean => {
      const field = fields.find((f) => f.field_key === fieldKey);
      return field ? field.field_status === 'disabled' : false;
    },
    [fields]
  );

  /**
   * Get field configuration by key
   */
  const getFieldConfig = useCallback(
    (fieldKey: string): FieldConfig | undefined => {
      return fields.find((f) => f.field_key === fieldKey);
    },
    [fields]
  );

  /**
   * Get field status by key
   */
  const getFieldStatus = useCallback(
    (fieldKey: string): FieldStatus | undefined => {
      return statuses.get(fieldKey);
    },
    [statuses]
  );

  /**
   * Get guidance message based on missing required fields
   */
  const getGuidanceMessage = useCallback((): string | null => {
    const requiredFields = getRequiredFields();
    const missingRequired = requiredFields.filter((f) => {
      const status = statuses.get(f.field_key);
      return !status || status.dataStatus === 'missing';
    });

    if (missingRequired.length > 0) {
      const fieldNames = missingRequired
        .map((f) => `"${f.display_name}"`)
        .slice(0, 3)
        .join(', ');
      return `Required field${missingRequired.length > 1 ? 's' : ''} ${fieldNames}${missingRequired.length > 3 ? ` (+${missingRequired.length - 3} more)` : ''} not filled.`;
    }

    if (completeness.completeness === 100 && requiredFields.length > 0) {
      return '✓ All required fields configured and populated.';
    }

    return null;
  }, [getRequiredFields, statuses, completeness.completeness]);

  return {
    // Data
    fields,
    statuses,
    completeness,
    loading,
    error,

    // Filter methods
    filterField,
    getActiveFields,
    getRequiredFields,
    getOptionalFields,
    getDisabledFields,

    // Check methods
    isFieldRequired,
    isFieldDisabled,

    // Getter methods
    getFieldConfig,
    getFieldStatus,

    // Guidance
    getGuidanceMessage,
  };
}
