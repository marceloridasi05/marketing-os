/**
 * Campaign Normalizer - Normalizes campaign names and detects duplicates
 * Handles campaign name variations, regex-based rules, and duplicate detection
 */

import { db } from '../db/index.js';
import {
  utmCampaigns,
  campaignNormalizationRules,
} from '../db/schema.js';
import { eq, and, ne, inArray } from 'drizzle-orm';

export interface NormalizationResult {
  original: string;
  normalized: string;
  appliedRules: string[];
}

export interface DuplicateCandidate {
  id: number;
  name: string;
  campaignNormalized?: string;
  distance: number;
  isDuplicate: boolean;
}

export interface NormalizationRule {
  id: number;
  pattern: string;
  replacement: string;
  description?: string;
  active: boolean;
}

const NORMALIZATION_CHAIN = [
  // 1. Apply regex rules
  { name: 'regexRules', fn: applyRegexRules },
  // 2. Trim whitespace
  { name: 'trim', fn: (s: string) => s.trim() },
  // 3. Lowercase
  { name: 'lowercase', fn: (s: string) => s.toLowerCase() },
  // 4. Remove special characters and replace with underscores
  { name: 'slugify', fn: slugify },
  // 5. Collapse multiple underscores
  { name: 'collapseUnderscores', fn: (s: string) => s.replace(/_+/g, '_') },
  // 6. Remove leading/trailing underscores
  {
    name: 'stripUnderscores',
    fn: (s: string) => s.replace(/^_+|_+$/g, ''),
  },
];

/**
 * Normalize a campaign name using all normalization rules and transformations
 */
export async function normalizeCampaignName(
  campaignName: string,
  siteId: number
): Promise<NormalizationResult> {
  const appliedRules: string[] = [];
  let current = campaignName;

  // Get active normalization rules for this site
  const rules = await getActiveNormalizationRules(siteId);

  // Apply each normalization step
  for (const step of NORMALIZATION_CHAIN) {
    const previous = current;

    if (step.name === 'regexRules') {
      const result = applyRegexRulesWithRules(current, rules);
      current = result.normalized;
      if (result.appliedRules.length > 0) {
        appliedRules.push(...result.appliedRules);
      }
    } else {
      current = step.fn(current);
    }

    if (current !== previous) {
      appliedRules.push(step.name);
    }
  }

  return {
    original: campaignName,
    normalized: current,
    appliedRules,
  };
}

/**
 * Detect duplicate campaigns based on normalized name similarity
 * Uses Levenshtein distance and exact normalized name matching
 */
export async function detectDuplicates(
  campaignName: string,
  siteId: number,
  excludeId?: number
): Promise<DuplicateCandidate[]> {
  try {
    const normalized = await normalizeCampaignName(campaignName, siteId);

    // First, exact match on normalized name (high confidence duplicates)
    const exactMatches = await db
      .select({
        id: utmCampaigns.id,
        name: utmCampaigns.name,
        campaignNormalized: utmCampaigns.campaignNormalized,
        isDuplicate: utmCampaigns.isDuplicate,
      })
      .from(utmCampaigns)
      .where(
        and(
          eq(utmCampaigns.siteId, siteId),
          eq(utmCampaigns.campaignNormalized, normalized.normalized)
        )
      );

    const candidates: DuplicateCandidate[] = [];

    // Add exact matches
    for (const match of exactMatches) {
      if (!excludeId || match.id !== excludeId) {
        candidates.push({
          id: match.id,
          name: match.name,
          campaignNormalized: match.campaignNormalized || undefined,
          distance: 0,
          isDuplicate: match.isDuplicate,
        });
      }
    }

    // If no exact matches, find close matches by Levenshtein distance
    if (candidates.length === 0) {
      const allCampaigns = await db
        .select({
          id: utmCampaigns.id,
          name: utmCampaigns.name,
          campaignNormalized: utmCampaigns.campaignNormalized,
          isDuplicate: utmCampaigns.isDuplicate,
        })
        .from(utmCampaigns)
        .where(eq(utmCampaigns.siteId, siteId));

      for (const campaign of allCampaigns) {
        if (!excludeId || campaign.id !== excludeId) {
          // Compare against both original and normalized forms
          const nameDistance = levenshteinDistance(
            campaignName.toLowerCase(),
            campaign.name.toLowerCase()
          );
          const normalizedDistance = campaign.campaignNormalized
            ? levenshteinDistance(
                normalized.normalized,
                campaign.campaignNormalized
              )
            : nameDistance;

          const minDistance = Math.min(nameDistance, normalizedDistance);

          // Consider duplicates if distance is within threshold (20% of longer string)
          const threshold = Math.max(campaignName.length, campaign.name.length) * 0.2;
          if (minDistance <= threshold && minDistance < 10) {
            candidates.push({
              id: campaign.id,
              name: campaign.name,
              campaignNormalized: campaign.campaignNormalized || undefined,
              distance: minDistance,
              isDuplicate: campaign.isDuplicate,
            });
          }
        }
      }

      // Sort by distance (closest first)
      candidates.sort((a, b) => a.distance - b.distance);
    }

    return candidates;
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return [];
  }
}

/**
 * Get normalization suggestions for a campaign name
 */
export async function suggestNormalization(
  campaignName: string,
  siteId: number
): Promise<NormalizationResult> {
  return normalizeCampaignName(campaignName, siteId);
}

/**
 * Merge campaign variations - update all references to point to primary campaign
 * This is an atomic operation that ensures data integrity
 */
export async function mergeVariations(
  primaryCampaignId: number,
  siteId: number,
  duplicateIds?: number[]
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    // If specific duplicates provided, merge those
    if (duplicateIds && duplicateIds.length > 0) {
      await db
        .update(utmCampaigns)
        .set({
          isDuplicate: true,
          duplicateOf: primaryCampaignId,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(
          and(
            eq(utmCampaigns.siteId, siteId),
            inArray(utmCampaigns.id, duplicateIds)
          )
        );

      return {
        success: true,
        updatedCount: duplicateIds.length,
      };
    }

    // Otherwise, find campaigns with matching normalized name and merge them
    const primary = await db
      .select({
        campaignNormalized: utmCampaigns.campaignNormalized,
      })
      .from(utmCampaigns)
      .where(eq(utmCampaigns.id, primaryCampaignId))
      .limit(1);

    if (!primary || !primary[0] || !primary[0].campaignNormalized) {
      return {
        success: false,
        updatedCount: 0,
        error: 'Primary campaign not found or has no normalized name',
      };
    }

    // Find all duplicates (same normalized name, different ID)
    const duplicates = await db
      .select({ id: utmCampaigns.id })
      .from(utmCampaigns)
      .where(
        and(
          eq(utmCampaigns.siteId, siteId),
          eq(utmCampaigns.campaignNormalized, primary[0].campaignNormalized),
          ne(utmCampaigns.id, primaryCampaignId)
        )
      );

    if (duplicates.length === 0) {
      return {
        success: true,
        updatedCount: 0,
      };
    }

    // Mark all duplicates
    const ids = duplicates.map(d => d.id);
    await db
      .update(utmCampaigns)
      .set({
        isDuplicate: true,
        duplicateOf: primaryCampaignId,
        updatedAt: new Date().toISOString(),
      } as any)
      .where(inArray(utmCampaigns.id, ids));

    return {
      success: true,
      updatedCount: duplicates.length,
    };
  } catch (error) {
    return {
      success: false,
      updatedCount: 0,
      error: `Error merging variations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get all active normalization rules for a site
 */
export async function getActiveNormalizationRules(
  siteId: number
): Promise<NormalizationRule[]> {
  try {
    const results = await db
      .select({
        id: campaignNormalizationRules.id,
        pattern: campaignNormalizationRules.pattern,
        replacement: campaignNormalizationRules.replacement,
        description: campaignNormalizationRules.description,
        active: campaignNormalizationRules.active,
      })
      .from(campaignNormalizationRules)
      .where(
        and(
          eq(campaignNormalizationRules.siteId, siteId),
          eq(campaignNormalizationRules.active, true)
        )
      );

    return results.map(r => ({
      id: r.id,
      pattern: r.pattern,
      replacement: r.replacement,
      description: r.description || undefined,
      active: Boolean(r.active),
    }));
  } catch (error) {
    console.error('Error getting normalization rules:', error);
    return [];
  }
}

/**
 * Create a new normalization rule
 */
export async function createNormalizationRule(
  siteId: number,
  pattern: string,
  replacement: string,
  description?: string
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // Validate regex pattern
    try {
      new RegExp(pattern, 'gi');
    } catch {
      return {
        success: false,
        error: `Invalid regex pattern: ${pattern}`,
      };
    }

    const result = await db
      .insert(campaignNormalizationRules)
      .values({
        siteId,
        pattern,
        replacement,
        description: description || undefined,
        active: true,
      } as any);

    return {
      success: true,
      id: result.lastInsertRowid as number,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error creating rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Apply regex rules to a string
 */
function applyRegexRulesWithRules(
  input: string,
  rules: NormalizationRule[]
): { normalized: string; appliedRules: string[] } {
  let current = input;
  const applied: string[] = [];

  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, 'gi');
      const before = current;
      current = current.replace(regex, rule.replacement);
      if (current !== before) {
        applied.push(`regex:${rule.description || rule.pattern}`);
      }
    } catch (error) {
      console.warn(`Failed to apply rule ${rule.id}:`, error);
    }
  }

  return { normalized: current, appliedRules: applied };
}

/**
 * Apply regex rules (stub version when rules aren't provided)
 */
function applyRegexRules(input: string): string {
  // This is a placeholder - actual rules come from the database
  return input;
}

/**
 * Convert string to URL-safe slug
 */
function slugify(input: string): string {
  return input
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_'); // Replace hyphens with underscores
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1, // deletion
        matrix[i - 1][j] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}
