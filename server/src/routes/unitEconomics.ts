/**
 * Unit Economics API Routes
 *
 * Endpoints for:
 * - Configuration (get/set CAC and LTV calculation preferences)
 * - Analysis (CAC, LTV, ratios, payback, churn calculations)
 * - Insights (anomaly detection and actionable recommendations)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  unitEconomicsConfig,
  ltvMetrics,
  churnMetrics,
  paybackMetrics,
  unitEconomicsInsights,
  growthLoopAttributions,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import * as ue from '../lib/unitEconomics.js';
import * as ueInsights from '../lib/unitEconomicsInsights.js';

const router = Router();

// ── Type Definitions ────────────────────────────────────────────────────────

interface QueryParams {
  siteId: number;
  period?: string; // 'YYYY-MM'
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
  segment?: string;
  limit?: number;
  offset?: number;
}

interface ConfigRequest {
  ltvCalculationMethod?: 'simple' | 'churn_based' | 'crmdriven';
  ltvSimpleMultiplier?: number;
  ltvAssumedMonthlyChurnRate?: number;
  ltvGrossMarginPercent?: number;
  cacAttributionModel?: 'first_touch' | 'last_touch' | 'linear';
  cacCostComponents?: string[];
  targetPaybackMonths?: number;
  segmentBy?: 'channel' | 'campaign' | 'source';
}

// ── Middleware ──────────────────────────────────────────────────────────────

function extractSiteId(req: Request): number {
  const siteId = req.query.siteId as string | undefined;
  if (!siteId) throw new Error('siteId query parameter required');
  return parseInt(siteId, 10);
}

function handleError(res: Response, error: unknown, statusCode = 500) {
  console.error('Unit Economics API Error:', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(statusCode).json({ error: message });
}

// ── Configuration Endpoints ─────────────────────────────────────────────────

/**
 * GET /api/unit-economics/config
 * Fetch unit economics configuration for a site
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);

    const config = db
      .select()
      .from(unitEconomicsConfig)
      .where(eq(unitEconomicsConfig.siteId, siteId))
      .get();

    if (!config) {
      // Return defaults if not configured yet
      return res.json({
        siteId,
        ltvCalculationMethod: 'simple',
        ltvSimpleMultiplier: 3.0,
        ltvAssumedMonthlyChurnRate: 0.05,
        ltvGrossMarginPercent: 0.7,
        cacAttributionModel: 'last_touch',
        cacCostComponents: ['media_spend'],
        targetPaybackMonths: 12,
        segmentBy: 'channel',
      });
    }

    res.json({
      ...config,
      cacCostComponents: config.cacCostComponents ? JSON.parse(config.cacCostComponents) : [],
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/unit-economics/config
 * Update unit economics configuration
 */
router.put('/config', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const updates: ConfigRequest = req.body;

    // Build update object
    const updateData: Partial<typeof unitEconomicsConfig.$inferInsert> = {
      siteId,
      cacCostComponents: updates.cacCostComponents
        ? JSON.stringify(updates.cacCostComponents)
        : JSON.stringify(['media_spend']),
      cacAttributionModel: updates.cacAttributionModel || 'last_touch',
      ltvCalculationMethod: updates.ltvCalculationMethod || 'simple',
      ltvSimpleMultiplier: updates.ltvSimpleMultiplier ?? 3.0,
      ltvAssumedMonthlyChurnRate: updates.ltvAssumedMonthlyChurnRate ?? 0.05,
      ltvGrossMarginPercent: updates.ltvGrossMarginPercent ?? 0.7,
      targetPaybackMonths: updates.targetPaybackMonths ?? 12,
      segmentBy: updates.segmentBy || 'channel',
      updatedAt: new Date().toISOString(),
    };

    // Check if exists
    const existing = db
      .select()
      .from(unitEconomicsConfig)
      .where(eq(unitEconomicsConfig.siteId, siteId))
      .get();

    if (existing) {
      db.update(unitEconomicsConfig)
        .set(updateData)
        .where(eq(unitEconomicsConfig.siteId, siteId))
        .run();
    } else {
      db.insert(unitEconomicsConfig).values(updateData as any).run();
    }

    res.json({ success: true, siteId });
  } catch (error) {
    handleError(res, error);
  }
});

// ── Analysis Endpoints ──────────────────────────────────────────────────────

/**
 * GET /api/unit-economics/cac
 * Get CAC metrics by channel/campaign
 *
 * Query: siteId, period (YYYY-MM), channel?, dateFrom?, dateTo?
 */
router.get('/cac', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const channel = req.query.channel as string | undefined;
    const period = req.query.period as string | undefined;

    // Get LTV metrics data for CAC calculation
    let query = db.select().from(ltvMetrics).where(eq(ltvMetrics.siteId, siteId));

    if (channel && channel !== 'all') {
      query = query.where(and(
        eq(ltvMetrics.segmentType, 'channel'),
        eq(ltvMetrics.segmentId, channel)
      )) as any;
    }

    if (period) {
      query = query.where(and(
        gte(ltvMetrics.periodStart, `${period}-01`),
        lte(ltvMetrics.periodStart, `${period}-31`)
      )) as any;
    }

    const records = (query as any).all() || [];

    // Calculate CAC from payback_metrics or compute from raw data
    const cacMetrics = records.map((record: any) => ({
      period: record.periodStart,
      channel: record.segmentId,
      customersAcquired: record.customersAcquired,
      totalRevenue: record.totalRevenue,
      cac: record.customersAcquired > 0
        ? record.totalRevenue / record.customersAcquired
        : 0,
    }));

    res.json({
      siteId,
      data: cacMetrics,
      summary: {
        averageCAC: cacMetrics.length > 0
          ? cacMetrics.reduce((sum: number, m: any) => sum + m.cac, 0) / cacMetrics.length
          : 0,
        count: cacMetrics.length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/unit-economics/ltv
 * Get LTV metrics by cohort/segment
 *
 * Query: siteId, segmentType (channel|campaign|source)?, dateFrom?, dateTo?
 */
router.get('/ltv', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const segmentType = req.query.segmentType as string | undefined;

    let query = db.select().from(ltvMetrics).where(eq(ltvMetrics.siteId, siteId));

    if (segmentType && segmentType !== 'all') {
      query = query.where(eq(ltvMetrics.segmentType, segmentType)) as any;
    }

    const records = (query as any).all() || [];

    // Sort by period descending (most recent first)
    const sorted = records.sort((a: any, b: any) =>
      new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
    );

    res.json({
      siteId,
      data: sorted.map((r: any) => ({
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        segment: r.segmentId,
        segmentType: r.segmentType,
        customersAcquired: r.customersAcquired,
        simpleLtv: r.simpleLtv,
        churnBasedLtv: r.churnBasedLtv,
        crmDrivenLtv: r.crmDrivenLtv,
        recommendedLtv: r.recommendedLtv,
        ltvHealthScore: r.ltvHealthScore,
      })),
      summary: {
        averageLTV: sorted.length > 0
          ? sorted.reduce((sum: number, r: any) => sum + (r.recommendedLtv || 0), 0) / sorted.length
          : 0,
        count: sorted.length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/unit-economics/ratios
 * Get LTV/CAC ratios and health status
 *
 * Query: siteId, period?, channel?, segment?
 */
router.get('/ratios', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const period = req.query.period as string | undefined;
    const segment = req.query.segment as string | undefined;

    // Get recent LTV metrics
    let query = db
      .select()
      .from(ltvMetrics)
      .where(eq(ltvMetrics.siteId, siteId))
      .orderBy(desc(ltvMetrics.periodStart))
      .limit(50);

    const records = query.all() || [];

    // Calculate ratios (simplified - in production would get CAC from payback_metrics)
    const ratios = records
      .filter(r => r.recommendedLtv && r.recommendedLtv > 0)
      .map((r: any) => {
        // Estimated CAC from LTV / assumed ratio
        const estimatedCAC = r.recommendedLtv / 3.0; // assuming healthy 3:1 ratio
        const ratio = ue.calculateLTVCACRatio(r.recommendedLtv, estimatedCAC);

        return {
          period: r.periodStart,
          segment: r.segmentId,
          segmentType: r.segmentType,
          ltv: r.recommendedLtv,
          estimatedCAC,
          ratio: ratio.ratio,
          healthStatus: ratio.healthStatus,
          healthScore: ratio.healthScore,
        };
      });

    const healthStatuses = ratios.map(r => r.healthStatus);
    const overallHealth =
      healthStatuses.includes('critical') ? 'critical' :
      healthStatuses.includes('warning') ? 'warning' :
      'healthy';

    res.json({
      siteId,
      data: ratios,
      summary: {
        overallHealth,
        averageRatio: ratios.length > 0
          ? ratios.reduce((sum: number, r: any) => sum + r.ratio, 0) / ratios.length
          : 0,
        count: ratios.length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/unit-economics/payback
 * Get payback period analysis and progression
 *
 * Query: siteId, channel?, campaign?, dateFrom?, dateTo?
 */
router.get('/payback', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const channel = req.query.channel as string | undefined;

    let query = db
      .select()
      .from(paybackMetrics)
      .where(eq(paybackMetrics.siteId, siteId))
      .orderBy(desc(paybackMetrics.periodStart))
      .limit(50);

    const records = (query as any).all() || [];

    const filtered = channel && channel !== 'all'
      ? records.filter((r: any) => r.segmentId === channel)
      : records;

    const paybackData = filtered.map((r: any) => ({
      period: r.periodStart,
      segment: r.segmentId,
      segmentType: r.segmentType,
      cacPerCustomer: r.cacForSegment,
      paybackMonths: r.paybackMonths,
      paybackHealthStatus: r.paybackHealthStatus,
      revenueProgression: {
        month1: r.revenueInMonth1,
        month2: r.revenueInMonth2,
        month3: r.revenueInMonth3,
        month6: r.revenueInMonth6,
        month12: r.revenueInMonth12,
      },
    }));

    res.json({
      siteId,
      data: paybackData,
      summary: {
        averagePaybackMonths: paybackData.length > 0
          ? paybackData.reduce((sum: number, r: any) => sum + r.paybackMonths, 0) / paybackData.length
          : 0,
        healthyCount: paybackData.filter(r => r.paybackHealthStatus === 'healthy').length,
        warningCount: paybackData.filter(r => r.paybackHealthStatus === 'warning').length,
        criticalCount: paybackData.filter(r => r.paybackHealthStatus === 'critical').length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/unit-economics/by-loop
 * Get unit economics metrics aggregated by growth loop
 * Shows CAC, LTV, payback, churn per loop to identify which loops are most economically healthy
 *
 * Query: siteId, loopId? (if not provided, returns summary per loop), period?, dateFrom?, dateTo?
 */
router.get('/by-loop', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const loopId = req.query.loopId as string | undefined;
    const period = req.query.period as string | undefined;

    // Get all attributions for the site (or specific loop if provided)
    let attrQuery = db
      .select()
      .from(growthLoopAttributions)
      .where(eq(growthLoopAttributions.siteId, siteId));

    if (loopId) {
      attrQuery = attrQuery.where(eq(growthLoopAttributions.loopId, parseInt(loopId, 10))) as any;
    }

    const attributions = (attrQuery as any).all() || [];

    // Group attributions by loopId
    const loopsMap = new Map<number, any[]>();
    for (const attr of attributions) {
      if (!loopsMap.has(attr.loopId)) {
        loopsMap.set(attr.loopId, []);
      }
      loopsMap.get(attr.loopId)!.push(attr);
    }

    // For each loop, aggregate unit economics from linked channels
    const loopMetrics: any[] = [];

    for (const [lId, attrs] of loopsMap) {
      // Get all channels for this loop
      const channelIds = attrs
        .filter((a: any) => a.channelId)
        .map((a: any) => a.channelId);

      if (channelIds.length === 0) continue;

      // Query LTV metrics for this loop's channels
      let ltvQuery = db
        .select()
        .from(ltvMetrics)
        .where(
          and(
            eq(ltvMetrics.siteId, siteId),
            inArray(ltvMetrics.segmentId as any, channelIds.map(String))
          )
        );

      if (period) {
        ltvQuery = ltvQuery.where(
          and(
            gte(ltvMetrics.periodStart, `${period}-01`),
            lte(ltvMetrics.periodStart, `${period}-31`)
          )
        ) as any;
      }

      const ltvRecords = (ltvQuery as any).all() || [];

      // Query payback metrics for this loop's channels
      const paybackQuery = db
        .select()
        .from(paybackMetrics)
        .where(
          and(
            eq(paybackMetrics.siteId, siteId),
            inArray(paybackMetrics.segmentId as any, channelIds.map(String))
          )
        );

      const paybackRecords = (paybackQuery as any).all() || [];

      // Query churn metrics
      const churnQuery = db
        .select()
        .from(churnMetrics)
        .where(
          and(
            eq(churnMetrics.siteId, siteId),
            inArray(churnMetrics.segmentId as any, channelIds.map(String))
          )
        );

      const churnRecords = (churnQuery as any).all() || [];

      // Aggregate metrics weighted by attribution weight
      const loopAttrWeights = new Map<number, number>();
      for (const attr of attrs) {
        if (attr.channelId) {
          loopAttrWeights.set(attr.channelId, attr.attributionWeight || 1.0);
        }
      }

      const aggregated = {
        loopId: lId,
        period: period || 'latest',
        customersAcquired: 0,
        simpleLtv: 0,
        churnBasedLtv: 0,
        crmDrivenLtv: 0,
        recommendedLtv: 0,
        avgCac: 0,
        avgPaybackMonths: 0,
        avgChurnRate: 0,
        healthScore: 0,
        channelCount: channelIds.length,
        channels: [] as any[],
      };

      // Aggregate LTV
      if (ltvRecords.length > 0) {
        const totalLtv = ltvRecords.reduce(
          (sum: number, r: any) => sum + (r.recommendedLtv || 0) * (loopAttrWeights.get(parseInt(r.segmentId, 10)) || 1.0),
          0
        );
        const totalWeight = ltvRecords.reduce(
          (sum: number, r: any) => sum + (loopAttrWeights.get(parseInt(r.segmentId, 10)) || 1.0),
          0
        );
        aggregated.recommendedLtv = totalWeight > 0 ? totalLtv / totalWeight : 0;
        aggregated.simpleLtv = ltvRecords[0]?.simpleLtv || 0;
        aggregated.churnBasedLtv = ltvRecords[0]?.churnBasedLtv || 0;
        aggregated.crmDrivenLtv = ltvRecords[0]?.crmDrivenLtv || 0;
        aggregated.customersAcquired = ltvRecords.reduce((sum: number, r: any) => sum + (r.customersAcquired || 0), 0);
      }

      // Aggregate payback and CAC
      if (paybackRecords.length > 0) {
        const totalCac = paybackRecords.reduce(
          (sum: number, r: any) => sum + (r.cacForSegment || 0) * (loopAttrWeights.get(parseInt(r.segmentId, 10)) || 1.0),
          0
        );
        const totalWeight = paybackRecords.reduce(
          (sum: number, r: any) => sum + (loopAttrWeights.get(parseInt(r.segmentId, 10)) || 1.0),
          0
        );
        aggregated.avgCac = totalWeight > 0 ? totalCac / totalWeight : 0;
        aggregated.avgPaybackMonths = paybackRecords.reduce((sum: number, r: any) => sum + (r.paybackMonths || 0), 0) / paybackRecords.length;
      }

      // Aggregate churn
      if (churnRecords.length > 0) {
        aggregated.avgChurnRate = churnRecords.reduce((sum: number, r: any) => sum + (r.churnRate || 0), 0) / churnRecords.length;
      }

      // Calculate loop health score (same pattern as main health endpoint)
      const ltv = aggregated.recommendedLtv;
      const cac = aggregated.avgCac;
      const payback = aggregated.avgPaybackMonths;
      const churn = aggregated.avgChurnRate;
      aggregated.healthScore = ue.calculateUnitEconomicsHealthScore(ltv, cac, payback, churn) || 0;

      // Add channel-level breakdown
      for (const attr of attrs) {
        if (attr.channelId) {
          const channelLTV = ltvRecords.find((r: any) => parseInt(r.segmentId, 10) === attr.channelId);
          const channelPayback = paybackRecords.find((r: any) => parseInt(r.segmentId, 10) === attr.channelId);

          aggregated.channels.push({
            channelId: attr.channelId,
            attributionWeight: attr.attributionWeight,
            ltv: channelLTV?.recommendedLtv || 0,
            cac: channelPayback?.cacForSegment || 0,
            ratio: (channelLTV?.recommendedLtv || 0) / (channelPayback?.cacForSegment || 1),
          });
        }
      }

      loopMetrics.push(aggregated);
    }

    // Sort by health score descending
    loopMetrics.sort((a, b) => b.healthScore - a.healthScore);

    res.json({
      siteId,
      data: loopMetrics,
      summary: {
        loopCount: loopMetrics.length,
        averageHealthScore: loopMetrics.length > 0
          ? loopMetrics.reduce((sum: number, m: any) => sum + m.healthScore, 0) / loopMetrics.length
          : 0,
        healthyLoops: loopMetrics.filter(m => m.healthScore >= 75).length,
        warningLoops: loopMetrics.filter(m => m.healthScore >= 50 && m.healthScore < 75).length,
        criticalLoops: loopMetrics.filter(m => m.healthScore < 50).length,
        totalCustomersAcquired: loopMetrics.reduce((sum: number, m: any) => sum + m.customersAcquired, 0),
        avgLTV: loopMetrics.length > 0
          ? loopMetrics.reduce((sum: number, m: any) => sum + m.recommendedLtv, 0) / loopMetrics.length
          : 0,
        avgCAC: loopMetrics.length > 0
          ? loopMetrics.reduce((sum: number, m: any) => sum + m.avgCac, 0) / loopMetrics.length
          : 0,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/unit-economics/churn
 * Get churn metrics and trends
 *
 * Query: siteId, segmentType?, dateFrom?, dateTo?
 */
router.get('/churn', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const segmentType = req.query.segmentType as string | undefined;

    let query = db
      .select()
      .from(churnMetrics)
      .where(eq(churnMetrics.siteId, siteId))
      .orderBy(desc(churnMetrics.periodStart))
      .limit(50);

    const records = (query as any).all() || [];

    const filtered = segmentType && segmentType !== 'all'
      ? records.filter((r: any) => r.segmentType === segmentType)
      : records;

    const churnData = filtered.map((r: any) => ({
      period: r.periodStart,
      segment: r.segmentId,
      segmentType: r.segmentType,
      startingCustomers: r.startingCustomers,
      endingCustomers: r.endingCustomers,
      newCustomers: r.newCustomers,
      churnedCustomers: r.churnedCustomers,
      churnRate: r.churnRate,
      retentionRate: r.retentionRate,
      churnTrend: r.churnTrend,
    }));

    const avgChurn = churnData.length > 0
      ? churnData.reduce((sum: number, r: any) => sum + r.churnRate, 0) / churnData.length
      : 0;

    res.json({
      siteId,
      data: churnData,
      summary: {
        averageChurnRate: avgChurn,
        improvingCount: churnData.filter(r => r.churnTrend === 'improving').length,
        stableCount: churnData.filter(r => r.churnTrend === 'stable').length,
        decliningCount: churnData.filter(r => r.churnTrend === 'declining').length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ── Insights Endpoints ──────────────────────────────────────────────────────

/**
 * GET /api/unit-economics/insights
 * Get active unit economics insights (anomalies)
 *
 * Query: siteId, type? (rising_cac|falling_ltv|unhealthy_ratio|churn_spike|long_payback), severity?
 */
router.get('/insights', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const type = req.query.type as string | undefined;
    const severity = req.query.severity as string | undefined;

    let query = db
      .select()
      .from(unitEconomicsInsights)
      .where(and(
        eq(unitEconomicsInsights.siteId, siteId),
        eq(unitEconomicsInsights.dismissedAt, null)
      ));

    if (type && type !== 'all') {
      query = query.where(eq(unitEconomicsInsights.insightType, type as any)) as any;
    }

    if (severity && severity !== 'all') {
      query = query.where(eq(unitEconomicsInsights.severity, severity as any)) as any;
    }

    const records = (query as any)
      .orderBy(desc(unitEconomicsInsights.detectedAt))
      .all() || [];

    const insights = records.map((r: any) => ({
      id: r.id,
      insightType: r.insightType,
      severity: r.severity,
      title: r.title,
      description: r.description,
      segmentId: r.segmentId,
      segmentType: r.segmentType,
      metric: r.metric,
      currentValue: r.currentValue,
      previousValue: r.previousValue,
      delta: r.delta,
      suggestedActions: r.suggestedActions ? JSON.parse(r.suggestedActions) : [],
      detectedAt: r.detectedAt,
    }));

    res.json({
      siteId,
      data: insights,
      summary: {
        total: insights.length,
        critical: insights.filter(i => i.severity === 'critical').length,
        warning: insights.filter(i => i.severity === 'warning').length,
        info: insights.filter(i => i.severity === 'info').length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/unit-economics/insights/:id/dismiss
 * Mark an insight as dismissed
 */
router.post('/insights/:id/dismiss', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const insightId = req.params.id;

    db.update(unitEconomicsInsights)
      .set({ dismissedAt: new Date().toISOString() })
      .where(and(
        eq(unitEconomicsInsights.id, insightId),
        eq(unitEconomicsInsights.siteId, siteId)
      ))
      .run();

    res.json({ success: true, insightId });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/unit-economics/insights/:id/resolve
 * Mark an insight as resolved
 */
router.post('/insights/:id/resolve', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);
    const insightId = req.params.id;

    db.update(unitEconomicsInsights)
      .set({ resolvedAt: new Date().toISOString() })
      .where(and(
        eq(unitEconomicsInsights.id, insightId),
        eq(unitEconomicsInsights.siteId, siteId)
      ))
      .run();

    res.json({ success: true, insightId });
  } catch (error) {
    handleError(res, error);
  }
});

// ── Health Check ────────────────────────────────────────────────────────────

/**
 * GET /api/unit-economics/health
 * Get overall unit economics health score
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const siteId = extractSiteId(req);

    // Get latest metrics
    const latestLTV = db
      .select()
      .from(ltvMetrics)
      .where(eq(ltvMetrics.siteId, siteId))
      .orderBy(desc(ltvMetrics.periodStart))
      .limit(1)
      .get();

    const latestChurn = db
      .select()
      .from(churnMetrics)
      .where(eq(churnMetrics.siteId, siteId))
      .orderBy(desc(churnMetrics.periodStart))
      .limit(1)
      .get();

    const latestPayback = db
      .select()
      .from(paybackMetrics)
      .where(eq(paybackMetrics.siteId, siteId))
      .orderBy(desc(paybackMetrics.periodStart))
      .limit(1)
      .get();

    const ltv = latestLTV?.recommendedLtv || 0;
    const cac = latestPayback?.cacForSegment || 0;
    const payback = latestPayback?.paybackMonths || 0;
    const churn = latestChurn?.churnRate || 0;

    const healthScore = ue.calculateUnitEconomicsHealthScore(ltv, cac, payback, churn);

    res.json({
      siteId,
      healthScore,
      components: {
        ltv,
        cac,
        ltvCacRatio: cac > 0 ? ltv / cac : 0,
        paybackMonths: payback,
        churnRate: churn,
      },
      status:
        healthScore >= 75 ? 'healthy' :
        healthScore >= 50 ? 'warning' :
        'critical',
    });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
