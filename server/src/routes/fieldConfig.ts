import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data.db');
const sqlite = new Database(dbPath);

/**
 * PHASE 2: Field Configuration Infrastructure
 *
 * Purpose: Allow per-site per-module configuration of which fields are:
 * - Required (must be filled)
 * - Optional (nice to have)
 * - Disabled (not applicable to this operation)
 *
 * This enables the "Nem toda operação terá todos os campos" requirement
 * (Not all operations use all fields)
 */

/**
 * GET /api/field-config/:moduleId?siteId=X
 * List all field configurations for a specific module
 *
 * Example: GET /api/field-config/site-data?siteId=1
 * Returns: [{ id, moduleId, fieldKey, fieldStatus, displayName, fieldType, order, description }]
 */
router.get('/:moduleId', (req, res) => {
  try {
    const { moduleId } = req.params;
    const { siteId } = req.query;

    if (!siteId || Array.isArray(siteId)) {
      return res.status(400).json({ error: 'siteId query param is required' });
    }

    const siteIdNum = parseInt(siteId, 10);
    if (isNaN(siteIdNum)) {
      return res.status(400).json({ error: 'Invalid siteId' });
    }

    // Query all field configurations for this module
    const configs = sqlite
      .prepare(
        `
      SELECT * FROM field_configuration
      WHERE site_id = ? AND module_id = ?
      ORDER BY field_order ASC
    `
      )
      .all(siteIdNum, moduleId);

    return res.json(configs);
  } catch (error) {
    console.error('Error fetching field configs:', error);
    return res.status(500).json({ error: 'Failed to fetch field configurations' });
  }
});

/**
 * POST /api/field-config
 * Create or update field configuration
 *
 * Body: {
 *   siteId: number,
 *   moduleId: string,      // e.g., 'site-data', 'daily-spend'
 *   fieldKey: string,      // e.g., 'sessions', 'leads_generated'
 *   fieldStatus: string,   // 'required' | 'optional' | 'disabled'
 *   displayName: string,   // e.g., 'Sessões'
 *   fieldType?: string,    // 'string', 'number', 'date', 'percentage', 'currency'
 *   fieldOrder?: number,   // Sort order in UI
 *   description?: string
 * }
 */
router.post('/', (req, res) => {
  try {
    const {
      siteId,
      moduleId,
      fieldKey,
      fieldStatus,
      displayName,
      fieldType = 'string',
      fieldOrder = 0,
      description = null,
    } = req.body;

    // Validation
    if (!siteId || !moduleId || !fieldKey || !fieldStatus || !displayName) {
      return res.status(400).json({
        error: 'Required fields: siteId, moduleId, fieldKey, fieldStatus, displayName',
      });
    }

    const validStatuses = ['required', 'optional', 'disabled'];
    if (!validStatuses.includes(fieldStatus)) {
      return res.status(400).json({
        error: 'fieldStatus must be one of: required, optional, disabled',
      });
    }

    const validTypes = ['string', 'number', 'date', 'percentage', 'currency'];
    if (fieldType && !validTypes.includes(fieldType)) {
      return res.status(400).json({
        error: `fieldType must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Insert or update using raw SQL for UPSERT support
    const stmt = sqlite
      .prepare(
        `
      INSERT INTO field_configuration
        (site_id, module_id, field_key, field_status, display_name, field_type, field_order, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(site_id, module_id, field_key)
      DO UPDATE SET
        field_status = excluded.field_status,
        display_name = excluded.display_name,
        field_type = excluded.field_type,
        field_order = excluded.field_order,
        description = excluded.description,
        updated_at = datetime('now')
      `
      )
      .run(siteId, moduleId, fieldKey, fieldStatus, displayName, fieldType, fieldOrder, description);

    return res.json({
      success: true,
      message: 'Field configuration saved',
      changes: stmt.changes,
    });
  } catch (error) {
    console.error('Error saving field config:', error);
    return res.status(500).json({ error: 'Failed to save field configuration' });
  }
});

/**
 * PUT /api/field-config/:id
 * Update a single field configuration
 *
 * Body: {
 *   fieldStatus?: string,
 *   displayName?: string,
 *   fieldType?: string,
 *   fieldOrder?: number,
 *   description?: string
 * }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    // Only include provided fields
    if (req.body.fieldStatus !== undefined) updates.field_status = req.body.fieldStatus;
    if (req.body.displayName !== undefined) updates.display_name = req.body.displayName;
    if (req.body.fieldType !== undefined) updates.field_type = req.body.fieldType;
    if (req.body.fieldOrder !== undefined) updates.field_order = req.body.fieldOrder;
    if (req.body.description !== undefined) updates.description = req.body.description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    // Build dynamic UPDATE statement
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');

    const stmt = sqlite
      .prepare(`UPDATE field_configuration SET ${setClause} WHERE id = ?`)
      .run(...Object.values(updates), parseInt(id, 10));

    if (stmt.changes === 0) {
      return res.status(404).json({ error: 'Field configuration not found' });
    }

    return res.json({
      success: true,
      message: 'Field configuration updated',
      changes: stmt.changes,
    });
  } catch (error) {
    console.error('Error updating field config:', error);
    return res.status(500).json({ error: 'Failed to update field configuration' });
  }
});

/**
 * DELETE /api/field-config/:id
 * Delete a field configuration (rarely used, but included for completeness)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = sqlite.prepare('DELETE FROM field_configuration WHERE id = ?').run(parseInt(id, 10));

    if (stmt.changes === 0) {
      return res.status(404).json({ error: 'Field configuration not found' });
    }

    return res.json({
      success: true,
      message: 'Field configuration deleted',
      changes: stmt.changes,
    });
  } catch (error) {
    console.error('Error deleting field config:', error);
    return res.status(500).json({ error: 'Failed to delete field configuration' });
  }
});

/**
 * GET /api/field-status/:moduleId?siteId=X
 * Get data completeness status for all fields in a module
 *
 * Returns: {
 *   moduleId: string,
 *   completeness: number,        // Percentage of required fields with data
 *   totalRequired: number,       // Count of required fields
 *   filledRequired: number,      // Count of required fields with data
 *   fields: [
 *     {
 *       fieldKey: string,
 *       fieldStatus: 'required'|'optional'|'disabled',
 *       dataStatus: 'automatic'|'manual'|'missing'|'incomplete'|'stale'|'not_mapped',
 *       sourceOfTruth: string|null,
 *       lastUpdated: string|null,
 *       confidence: 'high'|'medium'|'low',
 *       hasPassed30Days: boolean
 *     }
 *   ]
 * }
 */
router.get('/:moduleId/status', (req, res) => {
  try {
    const { moduleId } = req.params;
    const { siteId } = req.query;

    if (!siteId || Array.isArray(siteId)) {
      return res.status(400).json({ error: 'siteId query param is required' });
    }

    const siteIdNum = parseInt(siteId, 10);
    if (isNaN(siteIdNum)) {
      return res.status(400).json({ error: 'Invalid siteId' });
    }

    // Get field configurations
    const configs = db
      .prepare(
        `
      SELECT * FROM field_configuration
      WHERE site_id = ? AND module_id = ?
      ORDER BY field_order ASC
    `
      )
      .all(siteIdNum, moduleId) as Array<{
      id: number;
      site_id: number;
      module_id: string;
      field_key: string;
      field_status: string;
      display_name: string;
      field_type: string;
      field_order: number;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>;

    if (configs.length === 0) {
      // Return empty status if no configurations exist yet
      return res.json({
        moduleId,
        completeness: 0,
        totalRequired: 0,
        filledRequired: 0,
        fields: [],
      });
    }

    // Get data field statuses
    const statuses = db
      .prepare(
        `
      SELECT * FROM data_field_status
      WHERE site_id = ? AND module_id = ?
    `
      )
      .all(siteIdNum, moduleId) as Array<{
      id: number;
      site_id: number;
      module_id: string;
      field_key: string;
      data_status: string;
      source_of_truth: string | null;
      last_updated: string | null;
      confidence: string;
      has_passed_30_days: number;
      created_at: string;
      updated_at: string;
    }>;

    // Map status by fieldKey for quick lookup
    const statusMap = new Map(statuses.map((s) => [s.field_key, s]));

    // Build fields array with config + status
    const fields = configs.map((config) => {
      const status = statusMap.get(config.field_key);
      return {
        fieldKey: config.field_key,
        fieldStatus: config.field_status,
        displayName: config.display_name,
        dataStatus: status?.data_status ?? 'missing',
        sourceOfTruth: status?.source_of_truth ?? null,
        lastUpdated: status?.last_updated ?? null,
        confidence: status?.confidence ?? 'low',
        hasPassed30Days: status?.has_passed_30_days === 1,
      };
    });

    // Calculate completeness: required fields with non-missing data
    const requiredFields = fields.filter((f) => f.fieldStatus === 'required');
    const filledRequired = requiredFields.filter((f) => f.dataStatus !== 'missing').length;
    const completeness =
      requiredFields.length > 0 ? Math.round((filledRequired / requiredFields.length) * 100) : 100;

    return res.json({
      moduleId,
      completeness,
      totalRequired: requiredFields.length,
      filledRequired,
      fields,
    });
  } catch (error) {
    console.error('Error fetching field status:', error);
    return res.status(500).json({ error: 'Failed to fetch field status' });
  }
});

/**
 * POST /api/field-status/:moduleId/update
 * Update data status for a field
 *
 * Body: {
 *   siteId: number,
 *   fieldKey: string,
 *   dataStatus: string,           // 'automatic', 'manual', 'missing', 'incomplete', 'stale', 'not_mapped'
 *   sourceOfTruth?: string,       // 'GA4', 'Google Sheets', 'CRM', 'manual', etc.
 *   confidence?: string,          // 'high', 'medium', 'low'
 *   lastUpdated?: string          // ISO timestamp
 * }
 */
router.post('/:moduleId/update-status', (req, res) => {
  try {
    const { moduleId } = req.params;
    const {
      siteId,
      fieldKey,
      dataStatus,
      sourceOfTruth = null,
      confidence = 'medium',
      lastUpdated = new Date().toISOString(),
    } = req.body;

    if (!siteId || !fieldKey || !dataStatus) {
      return res.status(400).json({
        error: 'Required fields: siteId, fieldKey, dataStatus',
      });
    }

    const validStatuses = ['automatic', 'manual', 'missing', 'incomplete', 'stale', 'not_mapped'];
    if (!validStatuses.includes(dataStatus)) {
      return res.status(400).json({
        error: `dataStatus must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if field is stale (older than 30 days)
    const hasPassed30Days = lastUpdated
      ? new Date().getTime() - new Date(lastUpdated).getTime() > 30 * 24 * 60 * 60 * 1000
      : 0;

    // Upsert data_field_status record
    const stmt = db
      .prepare(
        `
      INSERT INTO data_field_status
        (site_id, module_id, field_key, data_status, source_of_truth, last_updated, confidence, has_passed_30_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(site_id, module_id, field_key)
      DO UPDATE SET
        data_status = excluded.data_status,
        source_of_truth = excluded.source_of_truth,
        last_updated = excluded.last_updated,
        confidence = excluded.confidence,
        has_passed_30_days = excluded.has_passed_30_days,
        updated_at = datetime('now')
      `
      )
      .run(siteId, moduleId, fieldKey, dataStatus, sourceOfTruth, lastUpdated, confidence, hasPassed30Days ? 1 : 0);

    return res.json({
      success: true,
      message: 'Field status updated',
      changes: stmt.changes,
    });
  } catch (error) {
    console.error('Error updating field status:', error);
    return res.status(500).json({ error: 'Failed to update field status' });
  }
});

/**
 * GET /api/field-status/batch?siteId=X
 * Get data status for ALL modules (for dashboard readiness widget)
 *
 * Returns: {
 *   overallCompleteness: number,  // Weighted average across all modules
 *   modules: [
 *     {
 *       moduleId: string,
 *       completeness: number,
 *       totalRequired: number,
 *       filledRequired: number
 *     }
 *   ]
 * }
 */
router.get('/', (req, res) => {
  try {
    const { siteId } = req.query;

    if (!siteId || Array.isArray(siteId)) {
      return res.status(400).json({ error: 'siteId query param is required' });
    }

    const siteIdNum = parseInt(siteId, 10);
    if (isNaN(siteIdNum)) {
      return res.status(400).json({ error: 'Invalid siteId' });
    }

    // Get all modules with their field configurations
    const modules = db
      .prepare(
        `
      SELECT DISTINCT module_id FROM field_configuration WHERE site_id = ?
    `
      )
      .all(siteIdNum) as Array<{ module_id: string }>;

    const moduleStatuses = [];
    let totalCompleteness = 0;

    for (const { module_id } of modules) {
      const configs = db
        .prepare(
          `
        SELECT * FROM field_configuration
        WHERE site_id = ? AND module_id = ?
      `
        )
        .all(siteIdNum, module_id) as Array<{
        field_status: string;
      }>;

      const statuses = db
        .prepare(
          `
        SELECT * FROM data_field_status
        WHERE site_id = ? AND module_id = ?
      `
        )
        .all(siteIdNum, module_id) as Array<{ data_status: string }>;

      const statusMap = new Map(statuses.map((s) => [s.field_key, s]));
      const requiredFields = configs.filter((c) => c.field_status === 'required');
      const filledRequired = requiredFields.filter((f) => {
        const status = statusMap.get(f.field_key);
        return status?.data_status !== 'missing';
      }).length;

      const completeness = requiredFields.length > 0 ? (filledRequired / requiredFields.length) * 100 : 100;

      moduleStatuses.push({
        moduleId: module_id,
        completeness: Math.round(completeness),
        totalRequired: requiredFields.length,
        filledRequired,
      });

      totalCompleteness += completeness;
    }

    const overallCompleteness =
      moduleStatuses.length > 0 ? Math.round(totalCompleteness / moduleStatuses.length) : 0;

    return res.json({
      overallCompleteness,
      modules: moduleStatuses,
    });
  } catch (error) {
    console.error('Error fetching batch field status:', error);
    return res.status(500).json({ error: 'Failed to fetch field status' });
  }
});

export default router;
