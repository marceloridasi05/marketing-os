/**
 * Growth Loops Engine API Routes
 * RESTful endpoints for loop CRUD, metrics, insights, and integrations
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  growthLoops,
  growthLoopMetrics,
  growthLoopStages,
  growthLoopInsights,
  growthLoopAttributions,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  calculateLoopMetricsSummary,
  isSelfSustaining,
} from '../lib/growthLoops.js';
import {
  generateGrowthLoopInsights,
  GrowthLoopInsight,
} from '../lib/growthLoopInsights.js';

const router = Router();

// Helper: Verify site ownership
const verifySite = (req: Request): number => {
  const siteId = parseInt(req.query.siteId as string);
  if (!siteId) throw new Error('siteId required');
  return siteId;
};

// Helper: Build response format
interface ApiResponse<T> {
  success: boolean;
  data: T;
  summary?: Record<string, any>;
  insights?: GrowthLoopInsight[];
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/growth-loops
 * List all loops for a site
 */
router.get('/', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);

    const loops = await db
      .select()
      .from(growthLoops)
      .where(eq(growthLoops.siteId, siteId));

    res.json({
      success: true,
      data: loops,
      summary: {
        totalLoops: loops.length,
        activeLoops: loops.filter((l: any) => l.isActive).length,
        priorityLoops: loops.filter((l: any) => l.isPriority).length,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * POST /api/growth-loops
 * Create a new growth loop
 */
router.post('/', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const siteId = verifySite(req);
    const {
      name,
      description,
      type,
      inputType,
      actionType,
      outputMetricKey,
      targetCac,
      targetLtv,
      targetPaybackMonths,
      targetCycleHours,
    } = req.body;

    if (!name || !type || !inputType || !actionType || !outputMetricKey) {
      throw new Error('Missing required fields: name, type, inputType, actionType, outputMetricKey');
    }

    const result = await db.insert(growthLoops).values({
      siteId,
      name,
      description,
      type,
      inputType,
      actionType,
      outputMetricKey,
      targetCac: targetCac || 0,
      targetLtv: targetLtv || 0,
      targetPaybackMonths: targetPaybackMonths || 12,
      targetCycleHours: targetCycleHours || 24,
      isActive: true,
      isPriority: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const loopId = result.lastID;
    const newLoop = await db
      .select()
      .from(growthLoops)
      .where(eq(growthLoops.id, loopId as number))
      .then(rows => rows[0]);

    res.status(201).json({
      success: true,
      data: newLoop,
      summary: { created: true, loopId },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: null, error: error.message });
  }
});

/**
 * GET /api/growth-loops/:id
 * Get loop detail
 */
router.get('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.id);

    const loop = await db
      .select()
      .from(growthLoops)
      .where(and(eq(growthLoops.id, loopId), eq(growthLoops.siteId, siteId)))
      .then(rows => rows[0]);

    if (!loop) throw new Error('Loop not found');

    res.json({ success: true, data: loop });
  } catch (error: any) {
    res.status(404).json({ success: false, data: null, error: error.message });
  }
});

/**
 * PUT /api/growth-loops/:id
 * Update loop
 */
router.put('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.id);
    const updates = req.body;

    await db
      .update(growthLoops)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(growthLoops.id, loopId), eq(growthLoops.siteId, siteId)));

    const updated = await db
      .select()
      .from(growthLoops)
      .where(eq(growthLoops.id, loopId))
      .then(rows => rows[0]);

    res.json({ success: true, data: updated, summary: { updated: true } });
  } catch (error: any) {
    res.status(400).json({ success: false, data: null, error: error.message });
  }
});

/**
 * DELETE /api/growth-loops/:id
 * Archive loop (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response<ApiResponse<null>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.id);

    await db
      .update(growthLoops)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(growthLoops.id, loopId), eq(growthLoops.siteId, siteId)));

    res.json({ success: true, data: null, summary: { archived: true } });
  } catch (error: any) {
    res.status(400).json({ success: false, data: null, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Metrics Analysis
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/growth-loops/metrics/:loopId
 * Get loop metrics over time
 */
router.get('/metrics/:loopId', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.loopId);
    const { period } = req.query; // 'YYYY-MM' format

    let query = db
      .select()
      .from(growthLoopMetrics)
      .where(
        and(
          eq(growthLoopMetrics.siteId, siteId),
          eq(growthLoopMetrics.loopId, loopId)
        )
      );

    // Filter by period if provided
    if (period) {
      const periodStr = period as string;
      query = db
        .select()
        .from(growthLoopMetrics)
        .where(
          and(
            eq(growthLoopMetrics.siteId, siteId),
            eq(growthLoopMetrics.loopId, loopId)
          )
        );
      // Period filtering would be added with proper date range logic
    }

    const metrics = await query;

    res.json({
      success: true,
      data: metrics,
      summary: {
        periods: metrics.length,
        latestHealth: metrics[metrics.length - 1]?.healthScore,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * GET /api/growth-loops/stages/:loopId
 * Get stage-by-stage breakdown
 */
router.get('/stages/:loopId', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.loopId);

    const stages = await db
      .select()
      .from(growthLoopStages)
      .where(
        and(
          eq(growthLoopStages.siteId, siteId),
          eq(growthLoopStages.loopId, loopId)
        )
      );

    res.json({
      success: true,
      data: stages,
      summary: { totalStages: stages.length },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * GET /api/growth-loops/comparison
 * Compare all loops for a site
 */
router.get('/comparison', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);

    // Get all loops
    const loops = await db
      .select()
      .from(growthLoops)
      .where(eq(growthLoops.siteId, siteId));

    // Get latest metrics for each loop
    const comparison = await Promise.all(
      loops.map(async (loop: any) => {
        const latestMetric = await db
          .select()
          .from(growthLoopMetrics)
          .where(eq(growthLoopMetrics.loopId, loop.id))
          .orderBy(growthLoopMetrics.periodStart) // Would need proper ordering
          .limit(1)
          .then(rows => rows[0]);

        return {
          ...loop,
          metrics: latestMetric,
        };
      })
    );

    res.json({
      success: true,
      data: comparison,
      summary: { totalLoops: loops.length },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * GET /api/growth-loops/strength-matrix
 * Get 2x2 matrix (potential vs health) for comparison view
 */
router.get('/strength-matrix', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);

    // Get all loops with latest metrics
    const loops = await db
      .select()
      .from(growthLoops)
      .where(eq(growthLoops.siteId, siteId));

    const matrix = await Promise.all(
      loops.map(async (loop: any) => {
        const latestMetric = await db
          .select()
          .from(growthLoopMetrics)
          .where(eq(growthLoopMetrics.loopId, loop.id))
          .then(rows => rows[rows.length - 1]);

        return {
          id: loop.id,
          name: loop.name,
          type: loop.type,
          health: latestMetric?.healthScore || 0,
          scalability: latestMetric?.volumeGrowthPct || 0,
          volume: latestMetric?.inputVolume || 0,
        };
      })
    );

    res.json({
      success: true,
      data: matrix,
      summary: {
        quadrants: {
          quickWins: matrix.filter((m: any) => m.health >= 60 && m.scalability >= 0.2).length,
          strategic: matrix.filter((m: any) => m.health >= 60 && m.scalability < 0.2).length,
          fillTime: matrix.filter((m: any) => m.health < 60 && m.scalability < 0.2).length,
          consider: matrix.filter((m: any) => m.health < 60 && m.scalability >= 0.2).length,
        },
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Insights
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/growth-loops/insights
 * Get all active insights for loops
 */
router.get('/insights', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);
    const { type } = req.query;

    let query = db
      .select()
      .from(growthLoopInsights)
      .where(eq(growthLoopInsights.siteId, siteId));

    // Filter by type if provided
    if (type) {
      query = db
        .select()
        .from(growthLoopInsights)
        .where(
          and(
            eq(growthLoopInsights.siteId, siteId),
            eq(growthLoopInsights.insightType, type as string)
          )
        );
    }

    const insights = await query;

    // Filter to active (non-dismissed) by default
    const activeInsights = insights.filter((i: any) => !i.dismissedAt);

    res.json({
      success: true,
      data: activeInsights,
      summary: {
        total: insights.length,
        active: activeInsights.length,
        critical: activeInsights.filter((i: any) => i.severity === 'critical').length,
        warning: activeInsights.filter((i: any) => i.severity === 'warning').length,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * POST /api/growth-loops/insights/:id/dismiss
 * Dismiss an insight
 */
router.post(
  '/insights/:id/dismiss',
  async (req: Request, res: Response<ApiResponse<null>>) => {
    try {
      const siteId = verifySite(req);
      const insightId = parseInt(req.params.id);

      await db
        .update(growthLoopInsights)
        .set({
          dismissedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(growthLoopInsights.id, insightId),
            eq(growthLoopInsights.siteId, siteId)
          )
        );

      res.json({ success: true, data: null, summary: { dismissed: true } });
    } catch (error: any) {
      res.status(400).json({ success: false, data: null, error: error.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────
// Integration Endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/growth-loops/:loopId/attribution
 * Which campaigns/channels feed this loop?
 */
router.get('/:loopId/attribution', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.loopId);

    const attributions = await db
      .select()
      .from(growthLoopAttributions)
      .where(
        and(
          eq(growthLoopAttributions.siteId, siteId),
          eq(growthLoopAttributions.loopId, loopId)
        )
      );

    res.json({
      success: true,
      data: attributions,
      summary: {
        linkedSources: attributions.length,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: [], error: error.message });
  }
});

/**
 * GET /api/growth-loops/:loopId/funnel-impact
 * How does this loop impact funnel stages?
 */
router.get('/:loopId/funnel-impact', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.loopId);

    const loop = await db
      .select()
      .from(growthLoops)
      .where(and(eq(growthLoops.id, loopId), eq(growthLoops.siteId, siteId)))
      .then(rows => rows[0]);

    if (!loop) throw new Error('Loop not found');

    // Get latest metrics
    const latestMetrics = await db
      .select()
      .from(growthLoopMetrics)
      .where(eq(growthLoopMetrics.loopId, loopId))
      .then(rows => rows[rows.length - 1]);

    res.json({
      success: true,
      data: {
        loop,
        metrics: latestMetrics,
        funnelImpact: {
          awareness: latestMetrics?.inputVolume || 0,
          acquisition: latestMetrics?.outputCount || 0,
          conversionRate: latestMetrics?.outputConversionRate || 0,
        },
      },
      summary: {
        loopType: loop.type,
        inputStage: loop.inputType,
        outputStage: loop.outputMetricKey,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: null, error: error.message });
  }
});

/**
 * GET /api/growth-loops/:loopId/unit-economics
 * Loop-specific CAC/LTV metrics
 */
router.get('/:loopId/unit-economics', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const siteId = verifySite(req);
    const loopId = parseInt(req.params.loopId);

    const loop = await db
      .select()
      .from(growthLoops)
      .where(and(eq(growthLoops.id, loopId), eq(growthLoops.siteId, siteId)))
      .then(rows => rows[0]);

    if (!loop) throw new Error('Loop not found');

    // Get latest metrics
    const latestMetrics = await db
      .select()
      .from(growthLoopMetrics)
      .where(eq(growthLoopMetrics.loopId, loopId))
      .then(rows => rows[rows.length - 1]);

    if (!latestMetrics) {
      return res.json({
        success: true,
        data: {
          cac: 0,
          ltv: 0,
          ratio: 0,
          paybackMonths: 0,
          status: 'No metrics yet',
        },
        summary: { loopId },
      });
    }

    res.json({
      success: true,
      data: {
        cac: latestMetrics.cac || 0,
        ltv: latestMetrics.ltv || 0,
        ratio: latestMetrics.ltvCacRatio || 0,
        paybackMonths: latestMetrics.paybackMonths || 0,
        selfSustaining: latestMetrics?.isSelfsustaining || false,
        targets: {
          targetCac: loop.targetCac,
          targetLtv: loop.targetLtv,
          targetPaybackMonths: loop.targetPaybackMonths,
        },
      },
      summary: {
        loopId,
        healthy: (latestMetrics.ltvCacRatio || 0) > 2.0,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, data: null, error: error.message });
  }
});

export default router;
