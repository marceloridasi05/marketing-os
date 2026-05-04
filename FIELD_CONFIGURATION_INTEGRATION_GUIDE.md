# Field Configuration Integration Guide (Phase 2.5)

## Overview

Phase 2.5 provides utilities to integrate field configuration into DADOS modules. This enables:
- Hiding disabled fields from data entry forms
- Highlighting required fields
- Showing data readiness progress
- Displaying smart guidance messages

## Components & Hooks Available

### 1. `useFieldConfiguration` Hook

**Purpose:** Load and manage field configuration for a module

**Location:** `client/src/hooks/useFieldConfiguration.ts`

**Usage:**
```typescript
import { useFieldConfiguration } from '../hooks/useFieldConfiguration';

export function MyDADOSModule() {
  const { 
    fields,              // All field configurations
    completeness,        // { completeness, totalRequired, filledRequired }
    loading,             // Loading state
    filterField,         // Function to check if field should display
    isFieldRequired,     // Check if field is required
    getActiveFields,     // Get non-disabled fields
    getGuidanceMessage,  // Get guidance text
  } = useFieldConfiguration(siteId, 'module-id');

  if (loading) return <div>Loading...</div>;

  // Use filterField to conditionally render
  if (filterField('field_key')) {
    // Render the field
  }

  // Get guidance message if there are missing required fields
  const message = getGuidanceMessage();
  if (message) {
    // Show message to user
  }
}
```

### 2. `DataReadinessBadge` Component

**Purpose:** Display data completeness progress bar

**Location:** `client/src/components/DataReadinessBadge.tsx`

**Usage:**
```typescript
import { DataReadinessBadge } from '../components/DataReadinessBadge';

<DataReadinessBadge
  completeness={75}
  totalRequired={10}
  filledRequired={7}
  showDetails={true}
  size="md"  // 'sm' | 'md' | 'lg'
/>
```

### 3. `DataReadinessStatus` Component

**Purpose:** Compact inline status display

**Usage:**
```typescript
import { DataReadinessStatus } from '../components/DataReadinessBadge';

<DataReadinessStatus
  completeness={75}
  totalRequired={10}
/>
```

## Integration Example

### Before Integration

```typescript
export function SiteData() {
  const [data, setData] = useState<Record<string, any>[]>([]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Sessões</th>
            <th>Total de Usuários</th>
            <th>Novos Usuários</th>
            <th>Leads Gerados</th>
            {/* All fields always shown */}
          </tr>
        </thead>
        {/* ... */}
      </table>
    </div>
  );
}
```

### After Integration

```typescript
import { useFieldConfiguration } from '../hooks/useFieldConfiguration';
import { DataReadinessBadge } from '../components/DataReadinessBadge';

export function SiteData() {
  const siteId = useSite().selectedSite?.id || 0;
  const { 
    fields,
    completeness,
    loading,
    filterField,
    isFieldRequired,
    getGuidanceMessage
  } = useFieldConfiguration(siteId, 'site-data');

  const [data, setData] = useState<Record<string, any>[]>([]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Data Readiness Badge */}
      <DataReadinessBadge
        completeness={completeness.completeness}
        totalRequired={completeness.totalRequired}
        filledRequired={completeness.filledRequired}
        showDetails={true}
      />

      {/* Guidance Message */}
      {getGuidanceMessage() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
          {getGuidanceMessage()}
        </div>
      )}

      {/* Data Table - Only show active fields */}
      <table>
        <thead>
          <tr>
            {/* Render only non-disabled fields */}
            {fields
              .filter(f => f.field_status !== 'disabled')
              .sort((a, b) => a.field_order - b.field_order)
              .map(field => (
                <th
                  key={field.field_key}
                  className={isFieldRequired(field.field_key) ? 'font-bold text-red-600' : ''}
                >
                  {field.display_name}
                  {isFieldRequired(field.field_key) && <span className="text-red-600"> *</span>}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {fields
                .filter(f => f.field_status !== 'disabled')
                .sort((a, b) => a.field_order - b.field_order)
                .map(field => (
                  <td key={field.field_key}>
                    <input
                      value={row[field.field_key] || ''}
                      onChange={(e) => {
                        const newData = [...data];
                        newData[idx] = {
                          ...newData[idx],
                          [field.field_key]: e.target.value
                        };
                        setData(newData);
                      }}
                      className={isFieldRequired(field.field_key) ? 'border-2 border-red-300' : ''}
                    />
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Available Hook Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `filterField(fieldKey)` | boolean | Check if field should be displayed |
| `getActiveFields()` | FieldConfig[] | Get all non-disabled fields |
| `getRequiredFields()` | FieldConfig[] | Get all required fields |
| `getOptionalFields()` | FieldConfig[] | Get all optional fields |
| `getDisabledFields()` | FieldConfig[] | Get all disabled fields |
| `isFieldRequired(fieldKey)` | boolean | Check if specific field is required |
| `isFieldDisabled(fieldKey)` | boolean | Check if specific field is disabled |
| `getFieldConfig(fieldKey)` | FieldConfig \| undefined | Get field metadata |
| `getFieldStatus(fieldKey)` | FieldStatus \| undefined | Get field data status |
| `getGuidanceMessage()` | string \| null | Get guidance message |

## Common Patterns

### Conditional Field Display
```typescript
{filterField('field_key') && (
  <input placeholder="Only shown if not disabled" />
)}
```

### Mark Required Fields
```typescript
{isFieldRequired('field_key') && <span className="text-red-500">*</span>}
```

### Sort Fields by Configuration
```typescript
fields
  .filter(f => f.field_status !== 'disabled')
  .sort((a, b) => a.field_order - b.field_order)
  .map(field => /* render field */)
```

### Show Data Completeness
```typescript
<div>
  {completeness.completeness}% complete ({completeness.filledRequired}/{completeness.totalRequired})
</div>
```

## Integration Checklist

For each DADOS module, verify:

- [ ] Import `useFieldConfiguration` hook
- [ ] Call hook with correct moduleId
- [ ] Filter table columns to exclude disabled fields
- [ ] Add DataReadinessBadge at top of page
- [ ] Show guidance message if applicable
- [ ] Mark required fields visually (bold, asterisk, etc.)
- [ ] Sort fields by field_order from configuration
- [ ] Test with different field configurations

## Module IDs

Use these module IDs when calling `useFieldConfiguration()`:

- `'site-data'` - Tráfego & Site
- `'daily-spend'` - Ads & Spend
- `'acquisition-conversions'` - Aquisição & Conversões
- `'commercial-funnel'` - Funil Comercial
- `'ads-budgets'` - Verbas & Orçamento
- `'linkedin-page'` - LinkedIn Analytics
- `'search-console'` - Search Console
- `'unit-economics'` - Unit Economics
- `'business-metrics-monthly'` - Business Metrics

## API Endpoints

The hook internally uses these endpoints:

**GET** `/api/field-config/:moduleId?siteId=X`
- Returns all field configurations for a module

**GET** `/api/field-config/:moduleId/status?siteId=X`
- Returns field status and data completeness

**POST** `/api/field-config`
- Create/update field configuration

**POST** `/api/field-config/:moduleId/update-status`
- Update data status for a field

See `server/src/routes/fieldConfig.ts` for full API documentation.

## Next Steps

1. Apply integration to each DADOS module (SiteData, DailySpend, etc.)
2. Add field configuration UI to Settings page (already done)
3. Test with various field configurations
4. Update module documentation with field requirements

---

**Status:** Phase 2.5 - Integration framework complete. Ready for module-by-module integration.
