import { Router } from 'express';
import { db } from '../db/index.js';
import { sites, customFunnels } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  PRESET_MODELS,
  PRESET_MODEL_IDS,
  getPresetModel,
  type FunnelModel,
} from '../lib/funnelModels.js';

const router = Router();

// ─── GET /api/funnels/models ────────────────────────────────────────────────

/**
 * List all available models (preset + custom) for a site.
 */
router.get('/models', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // Get all preset models
    const presetModels = PRESET_MODEL_IDS.map(id => {
      const model = PRESET_MODELS[id];
      return {
        id: model.id,
        name: model.name,
        description: model.description,
        isPreset: true,
        isCustom: false,
      };
    });

    // Get custom models for this site
    const customModels = await db
      .select()
      .from(customFunnels)
      .where(eq(customFunnels.siteId, siteId));

    const custom = customModels.map(m => ({
      id: String(m.id),
      name: m.name,
      description: 'Custom funnel',
      isPreset: false,
      isCustom: true,
    }));

    res.json({ preset: presetModels, custom });
  } catch (err) {
    console.error('Failed to list funnel models:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /api/funnels/:modelId ──────────────────────────────────────────────

/**
 * Get full config for a model (preset or custom) with custom funnels for the site.
 */
router.get('/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const siteId = req.query.siteId ? +req.query.siteId : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // Check if it's a preset model ID
    if (PRESET_MODEL_IDS.includes(modelId as any)) {
      const model = PRESET_MODELS[modelId as keyof typeof PRESET_MODELS];
      const customList = await db
        .select()
        .from(customFunnels)
        .where(eq(customFunnels.siteId, siteId));
      const customParsed = customList.map(m => ({
        id: m.id,
        name: m.name,
        stages: JSON.parse(m.stages),
        stageToMetrics: JSON.parse(m.stageToMetrics),
      }));
      return res.json({ model, customFunnels: customParsed });
    }

    // Otherwise, try to load as a custom funnel ID
    const customId = +modelId;
    if (isNaN(customId)) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const custom = await db
      .select()
      .from(customFunnels)
      .where(and(
        eq(customFunnels.id, customId),
        eq(customFunnels.siteId, siteId)
      ));

    if (custom.length === 0) {
      return res.status(404).json({ error: 'Custom funnel not found' });
    }

    const m = custom[0];
    const model = {
      id: String(m.id),
      name: m.name,
      description: 'Custom funnel',
      stages: JSON.parse(m.stages),
      stageToMetrics: JSON.parse(m.stageToMetrics),
    };

    const customList = await db
      .select()
      .from(customFunnels)
      .where(eq(customFunnels.siteId, siteId));
    const customParsed = customList.map(c => ({
      id: c.id,
      name: c.name,
      stages: JSON.parse(c.stages),
      stageToMetrics: JSON.parse(c.stageToMetrics),
    }));

    res.json({ model, customFunnels: customParsed });
  } catch (err) {
    console.error('Failed to get funnel config:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/funnels/set ──────────────────────────────────────────────────

/**
 * Set the selected funnel model for a site.
 * Body: { modelId: string }
 */
router.post('/set', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { modelId } = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }
    if (!modelId) {
      return res.status(400).json({ error: 'modelId required' });
    }

    // Update site's funnel model
    await db
      .update(sites)
      .set({ funnelModelId: modelId })
      .where(eq(sites.id, siteId));

    res.json({ success: true, modelId });
  } catch (err) {
    console.error('Failed to set funnel model:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/funnels/custom ───────────────────────────────────────────────

/**
 * Create or update a custom funnel for a site.
 * Body: { name, stages, stageToMetrics }
 */
router.post('/custom', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { name, stages, stageToMetrics, id } = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }
    if (!name || !stages || !stageToMetrics) {
      return res
        .status(400)
        .json({ error: 'name, stages, and stageToMetrics required' });
    }

    if (id) {
      // Update existing custom funnel
      const result = await db
        .update(customFunnels)
        .set({
          name,
          stages: JSON.stringify(stages),
          stageToMetrics: JSON.stringify(stageToMetrics),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(eq(customFunnels.id, id), eq(customFunnels.siteId, siteId))
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Custom funnel not found' });
      }

      const m = result[0];
      return res.json({
        id: m.id,
        name: m.name,
        stages: JSON.parse(m.stages),
        stageToMetrics: JSON.parse(m.stageToMetrics),
      });
    } else {
      // Create new custom funnel
      const result = await db
        .insert(customFunnels)
        .values({
          siteId,
          name,
          stages: JSON.stringify(stages),
          stageToMetrics: JSON.stringify(stageToMetrics),
          isDefault: false,
        })
        .returning();

      const m = result[0];
      return res.json({
        id: m.id,
        name: m.name,
        stages: JSON.parse(m.stages),
        stageToMetrics: JSON.parse(m.stageToMetrics),
      });
    }
  } catch (err) {
    console.error('Failed to create/update custom funnel:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── DELETE /api/funnels/custom/:id ────────────────────────────────────────

/**
 * Delete a custom funnel.
 */
router.delete('/custom/:id', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { id } = req.params;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const result = await db
      .delete(customFunnels)
      .where(
        and(
          eq(customFunnels.id, +id),
          eq(customFunnels.siteId, siteId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Custom funnel not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete custom funnel:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
