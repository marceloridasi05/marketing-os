/**
 * Data Quality Calculator - Evaluates UTM data consistency and standardization
 * Measures:
 * - standardizationScore: % of campaigns using standard enum values
 * - attributionCoverageScore: % of traffic with complete UTM data
 * - deduplicationScore: % of campaigns without duplicates
 * - overallDataQuality: weighted average of above metrics
 */

import { db } from '../db/index.js';
import {
  utmCampaigns,
  utmSourceEnum,
  utmMediumEnum,
  performanceEntries,
  utmDataQualityMetrics,
} from '../db/schema.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

export interface DataQualityScore {
  standardizationScore: number; // 0-100
  attributionCoverageScore: number; // 0-100
  deduplicationScore: number; // 0-100
  overallDataQuality: number; // 0-100 (weighted average)
  totalCampaigns: number;
  standardizedCampaigns: number;
  duplicateCampaigns: number;
  uniqueSourceValues: number;
  uniqueMediumValues: number;
  recommendations: string[];
}

/**
 * Calculate data quality metrics for a site
 * Stores results in utmDataQualityMetrics table
 */
export async function calculateDataQualityMetrics(
  siteId: number
): Promise<DataQualityScore> {
  try {
    // 1. Fetch all campaigns for site
    const campaigns = await db
      .select()
      .from(utmCampaigns)
      .where(eq(utmCampaigns.siteId, siteId));

    const totalCampaigns = campaigns.length;

    if (totalCampaigns === 0) {
      return {
        standardizationScore: 0,
        attributionCoverageScore: 0,
        deduplicationScore: 0,
        overallDataQuality: 0,
        totalCampaigns: 0,
        standardizedCampaigns: 0,
        duplicateCampaigns: 0,
        uniqueSourceValues: 0,
        uniqueMediumValues: 0,
        recommendations: ['No campaigns found for this site.'],
      };
    }

    // 2. Fetch valid source and medium enums
    const validSources = await db
      .select({ source: utmSourceEnum.source })
      .from(utmSourceEnum)
      .where(eq(utmSourceEnum.siteId, siteId));

    const validMediums = await db
      .select({ medium: utmMediumEnum.medium })
      .from(utmMediumEnum)
      .where(eq(utmMediumEnum.siteId, siteId));

    const sourceSet = new Set(validSources.map(s => s.source.toLowerCase()));
    const mediumSet = new Set(validMediums.map(m => m.medium.toLowerCase()));

    // 3. Calculate standardization score
    // Campaigns with both valid source AND valid medium
    const standardizedCampaigns = campaigns.filter(
      c =>
        c.source &&
        c.medium &&
        sourceSet.has(c.source.toLowerCase()) &&
        mediumSet.has(c.medium.toLowerCase())
    ).length;

    const standardizationScore =
      totalCampaigns > 0
        ? Math.round((standardizedCampaigns / totalCampaigns) * 100)
        : 0;

    // 4. Calculate attribution coverage score
    // % of traffic entries linked to UTM campaigns (via utmCampaignId)
    const trafficWithComplete = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(performanceEntries)
      .where(
        and(
          eq(performanceEntries.siteId, siteId),
          sql`${performanceEntries.utmCampaignId} IS NOT NULL`
        )
      )
      .get();

    const totalTraffic = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(performanceEntries)
      .where(eq(performanceEntries.siteId, siteId))
      .get();

    const attributionCoverageScore =
      totalTraffic?.count && totalTraffic.count > 0
        ? Math.round(((trafficWithComplete?.count ?? 0) / totalTraffic.count) * 100)
        : 0;

    // 5. Calculate deduplication score
    // % of campaigns without duplicates (isDuplicate = false)
    const duplicateCampaigns = campaigns.filter(c => c.isDuplicate).length;
    const uniqueCampaigns = totalCampaigns - duplicateCampaigns;

    const deduplicationScore =
      totalCampaigns > 0
        ? Math.round((uniqueCampaigns / totalCampaigns) * 100)
        : 0;

    // 6. Calculate overall quality (weighted average)
    const weights = {
      standardization: 0.4, // Most important: consistent enum values
      coverage: 0.35, // Important: complete UTM tracking
      deduplication: 0.25, // Important: no duplicate data
    };

    const overallDataQuality = Math.round(
      standardizationScore * weights.standardization +
        attributionCoverageScore * weights.coverage +
        deduplicationScore * weights.deduplication
    );

    // 7. Generate recommendations
    const recommendations: string[] = [];

    if (standardizationScore < 70) {
      recommendations.push(
        `Standardization is at ${standardizationScore}%. Consider enforcing UTM source/medium dropdowns to improve consistency.`
      );
    }

    if (attributionCoverageScore < 80) {
      recommendations.push(
        `Attribution coverage is at ${attributionCoverageScore}%. Many records are missing complete UTM data. Audit tracking implementation.`
      );
    }

    if (deduplicationScore < 90) {
      recommendations.push(
        `${duplicateCampaigns} duplicate campaigns detected (${100 - deduplicationScore}%). Merge similar campaign names to improve data clarity.`
      );
    }

    if (overallDataQuality < 60) {
      recommendations.push(
        'Overall data quality is poor. Start with strict tracking for new campaigns while cleaning historical data.'
      );
    }

    // 8. Store metrics in database
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 1); // Previous day as start of period
    const periodEnd = new Date();

    const uniqueSourceValues = new Set(campaigns.map(c => c.source)).size;
    const uniqueMediumValues = new Set(campaigns.map(c => c.medium)).size;

    // Fetch previous period's score for trend analysis
    const previousMetric = await db
      .select({
        overallDataQuality: utmDataQualityMetrics.overallDataQuality,
      })
      .from(utmDataQualityMetrics)
      .where(eq(utmDataQualityMetrics.siteId, siteId))
      .orderBy(sql`${utmDataQualityMetrics.createdAt} DESC`)
      .limit(1)
      .get();

    const scoreChange = previousMetric
      ? overallDataQuality - (previousMetric.overallDataQuality || 0)
      : 0;

    await db.insert(utmDataQualityMetrics).values({
      siteId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      standardizationScore,
      attributionCoverageScore,
      deduplicationScore,
      overallDataQuality,
      totalCampaigns,
      standardizedCampaigns,
      duplicateCampaigns,
      uniqueSourceValues,
      uniqueMediumValues,
      previousScore: previousMetric?.overallDataQuality ?? overallDataQuality,
      scoreChange,
      recommendations: JSON.stringify(recommendations),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    return {
      standardizationScore,
      attributionCoverageScore,
      deduplicationScore,
      overallDataQuality,
      totalCampaigns,
      standardizedCampaigns,
      duplicateCampaigns,
      uniqueSourceValues,
      uniqueMediumValues,
      recommendations,
    };
  } catch (error) {
    console.error('Error calculating data quality metrics:', error);
    throw error;
  }
}

/**
 * Get latest data quality metrics for a site
 */
export async function getLatestDataQualityMetrics(
  siteId: number
): Promise<(typeof utmDataQualityMetrics.$inferSelect) | null> {
  try {
    const latest = await db
      .select()
      .from(utmDataQualityMetrics)
      .where(eq(utmDataQualityMetrics.siteId, siteId))
      .orderBy(sql`${utmDataQualityMetrics.createdAt} DESC`)
      .limit(1)
      .get();

    if (!latest) return null;

    return {
      ...latest,
      recommendations: latest.recommendations
        ? JSON.parse(latest.recommendations)
        : [],
    } as any;
  } catch (error) {
    console.error('Error fetching data quality metrics:', error);
    throw error;
  }
}

/**
 * Get data quality metrics history (last N periods)
 */
export async function getDataQualityMetricsHistory(
  siteId: number,
  limit: number = 12
): Promise<any[]> {
  try {
    const history = await db
      .select()
      .from(utmDataQualityMetrics)
      .where(eq(utmDataQualityMetrics.siteId, siteId))
      .orderBy(sql`${utmDataQualityMetrics.createdAt} DESC`)
      .limit(limit);

    return history.map(item => ({
      ...item,
      recommendations: item.recommendations
        ? JSON.parse(item.recommendations)
        : [],
    }));
  } catch (error) {
    console.error('Error fetching data quality metrics history:', error);
    throw error;
  }
}

/**
 * Determine health status based on overall data quality score
 */
export function getDataQualityStatus(
  score: number
): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

/**
 * Calculate score change trend (improving, stable, declining)
 */
export function getScoreTrend(
  current: number,
  previous: number
): 'improving' | 'stable' | 'declining' {
  const delta = current - previous;
  if (delta > 5) return 'improving';
  if (delta < -5) return 'declining';
  return 'stable';
}
