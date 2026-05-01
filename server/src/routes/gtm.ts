import { Router } from 'express';
import { db } from '../db/index.js';
import { sites, gtmMetricConfig, gtmMetricStatus } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { GTM_OPERATING_MODELS, type GTMOperatingModelId } from '../lib/gtmOperatingModels.js';

const router = Router();

/**
 * GET /api/gtm/models
 * List all available GTM Operating Models
 */
router.get('/models', async (req, res) => {
  try {
    const models = Object.values(GTM_OPERATING_MODELS).map(model => ({
      id: model.id,
      name: model.name,
      businessContext: model.businessContext,
      description: model.description,
      stageCount: model.stages.length,
      primarySuccessMetric: model.primarySuccessMetric,
    }));

    res.json({ models });
  } catch (err) {
    console.error('Error fetching GTM models:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/gtm/models/:modelId
 * Get full details of a specific GTM model (stages + metric mappings)
 */
router.get('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = GTM_OPERATING_MODELS[modelId as GTMOperatingModelId];

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      id: model.id,
      name: model.name,
      businessContext: model.businessContext,
      description: model.description,
      stages: model.stages,
      stageToMetrics: model.stageToMetrics,
      primarySuccessMetric: model.primarySuccessMetric,
      keyHealthIndicators: model.keyHealthIndicators,
    });
  } catch (err) {
    console.error('Error fetching GTM model:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * PUT /api/gtm/:siteId/model
 * Switch the GTM Operating Model for a site
 * Body: { gtmOperatingModelId: 'b2b_sales_led' | 'b2b_abm' | 'plg' | 'smb_inbound' }
 */
router.put('/:siteId/model', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { gtmOperatingModelId } = req.body;

    if (!gtmOperatingModelId || !GTM_OPERATING_MODELS[gtmOperatingModelId]) {
      return res.status(400).json({ error: 'Invalid GTM Operating Model ID' });
    }

    // Update site's GTM model
    await db
      .update(sites)
      .set({ gtmOperatingModelId })
      .where(eq(sites.id, parseInt(siteId)));

    res.json({ success: true, gtmOperatingModelId });
  } catch (err) {
    console.error('Error switching GTM model:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/gtm/:siteId/model
 * Get current GTM Operating Model for a site
 */
router.get('/:siteId/model', async (req, res) => {
  try {
    const { siteId } = req.params;

    const site = await db
      .select()
      .from(sites)
      .where(eq(sites.id, parseInt(siteId)))
      .limit(1);

    if (!site || site.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const modelId = site[0].gtmOperatingModelId || 'b2b_sales_led';
    const model = GTM_OPERATING_MODELS[modelId as GTMOperatingModelId];

    res.json({
      siteId: parseInt(siteId),
      gtmOperatingModelId: modelId,
      model: {
        id: model.id,
        name: model.name,
        businessContext: model.businessContext,
        stages: model.stages,
        stageToMetrics: model.stageToMetrics,
      },
    });
  } catch (err) {
    console.error('Error fetching site GTM model:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/gtm/:siteId/status
 * Get data quality status for all metrics in current GTM model
 */
router.get('/:siteId/status', async (req, res) => {
  try {
    const { siteId } = req.params;

    // Get site's current GTM model
    const site = await db
      .select()
      .from(sites)
      .where(eq(sites.id, parseInt(siteId)))
      .limit(1);

    if (!site || site.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const modelId = site[0].gtmOperatingModelId || 'b2b_sales_led';
    const model = GTM_OPERATING_MODELS[modelId as GTMOperatingModelId];

    // Fetch all metric statuses for this site
    const statuses = await db
      .select()
      .from(gtmMetricStatus)
      .where(eq(gtmMetricStatus.siteId, parseInt(siteId)));

    // Build status map by metricKey
    const statusMap = Object.fromEntries(
      statuses.map(s => [
        s.metricKey,
        {
          dataStatus: s.dataStatus,
          sourceOfTruth: s.sourceOfTruth,
          lastUpdated: s.lastUpdated,
          confidence: s.confidence,
          isManual: s.isManual,
          value: s.value,
        },
      ])
    );

    // Enrich with stage context
    const stageStatuses = model.stages.map(stage => {
      const metricsForStage = model.stageToMetrics[stage.id] || [];
      const requiredMetrics = stage.requiredMetrics || [];

      const metricStatuses = metricsForStage.map(metricKey => ({
        key: metricKey,
        isRequired: requiredMetrics.includes(metricKey),
        ...statusMap[metricKey],
      }));

      const filledMetrics = metricStatuses.filter(m => m.dataStatus === 'automatic' || m.dataStatus === 'manual').length;
      const requiredFilled = metricStatuses.filter(m => m.isRequired && (m.dataStatus === 'automatic' || m.dataStatus === 'manual')).length;

      return {
        stageId: stage.id,
        label: stage.label,
        metricCount: metricStatuses.length,
        requiredCount: requiredMetrics.length,
        filledCount: filledMetrics,
        requiredFilled,
        readinessPct: requiredMetrics.length > 0 ? Math.round((requiredFilled / requiredMetrics.length) * 100) : 100,
        isReady: requiredFilled === requiredMetrics.length && requiredMetrics.length > 0,
        metrics: metricStatuses,
      };
    });

    // Calculate overall readiness
    const totalRequired = stageStatuses.reduce((acc, s) => acc + s.requiredCount, 0);
    const totalFilled = stageStatuses.reduce((acc, s) => acc + s.requiredFilled, 0);
    const overallReadinessPct = totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 100;

    res.json({
      siteId: parseInt(siteId),
      gtmModelId: modelId,
      overallReadinessPct,
      stages: stageStatuses,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching GTM status:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/gtm/:siteId/metric-status
 * Record or update the status of a metric
 * Body: { metricKey, dataStatus, sourceOfTruth, confidence, isManual, value }
 */
router.post('/:siteId/metric-status', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { metricKey, dataStatus, sourceOfTruth, confidence, isManual, value } = req.body;

    if (!metricKey || !dataStatus) {
      return res.status(400).json({ error: 'metricKey and dataStatus are required' });
    }

    // Check if status record already exists
    const existing = await db
      .select()
      .from(gtmMetricStatus)
      .where(
        and(
          eq(gtmMetricStatus.siteId, parseInt(siteId)),
          eq(gtmMetricStatus.metricKey, metricKey)
        )
      )
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      await db
        .update(gtmMetricStatus)
        .set({
          dataStatus,
          sourceOfTruth,
          confidence,
          isManual,
          value,
          lastUpdated: new Date().toISOString(),
        })
        .where(
          and(
            eq(gtmMetricStatus.siteId, parseInt(siteId)),
            eq(gtmMetricStatus.metricKey, metricKey)
          )
        );
    } else {
      // Insert new
      await db.insert(gtmMetricStatus).values({
        siteId: parseInt(siteId),
        metricKey,
        dataStatus,
        sourceOfTruth,
        confidence,
        isManual,
        value,
        lastUpdated: new Date().toISOString(),
      });
    }

    res.json({ success: true, metricKey });
  } catch (err) {
    console.error('Error updating GTM metric status:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
