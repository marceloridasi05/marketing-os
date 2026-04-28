/**
 * UTM Preset Validator - Validates source and medium against enumerated values
 * Ensures consistency across all UTM campaigns and channels
 */

import { db } from '../db/index.js';
import {
  utmSourceEnum,
  utmMediumEnum,
  channelMappings,
  channels,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface SourceEnumValue {
  id: number;
  source: string;
  displayName: string;
  icon?: string;
  category?: string;
  isDefault: boolean;
}

export interface MediumEnumValue {
  id: number;
  medium: string;
  displayName: string;
  costType?: string;
  isDefault: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  enumId?: number;
}

export interface ChannelMapping {
  id: number;
  source: string;
  medium: string;
  mappedChannelId: number;
  mappedChannelName: string;
  isAutomatic: boolean;
}

/**
 * Validate if a source value is in the whitelist for the site
 */
export async function validateSource(
  sourceValue: string,
  siteId: number
): Promise<ValidationResult> {
  try {
    const result = await db
      .select({ id: utmSourceEnum.id, source: utmSourceEnum.source })
      .from(utmSourceEnum)
      .where(
        and(
          eq(utmSourceEnum.siteId, siteId),
          eq(utmSourceEnum.source, sourceValue)
        )
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: true,
        enumId: result[0].id,
      };
    }

    // Check for close matches for suggestions
    const allSources = await db
      .select({ source: utmSourceEnum.source })
      .from(utmSourceEnum)
      .where(eq(utmSourceEnum.siteId, siteId));

    const suggestion = findClosestMatch(
      sourceValue,
      allSources.map((s) => s.source)
    );

    return {
      isValid: false,
      error: `Source "${sourceValue}" is not in the whitelist for this site`,
      suggestion,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Error validating source: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate if a medium value is in the whitelist for the site
 */
export async function validateMedium(
  mediumValue: string,
  siteId: number
): Promise<ValidationResult> {
  try {
    const result = await db
      .select({ id: utmMediumEnum.id, medium: utmMediumEnum.medium })
      .from(utmMediumEnum)
      .where(
        and(
          eq(utmMediumEnum.siteId, siteId),
          eq(utmMediumEnum.medium, mediumValue)
        )
      )
      .limit(1);

    if (result.length > 0) {
      return {
        isValid: true,
        enumId: result[0].id,
      };
    }

    // Check for close matches for suggestions
    const allMediums = await db
      .select({ medium: utmMediumEnum.medium })
      .from(utmMediumEnum)
      .where(eq(utmMediumEnum.siteId, siteId));

    const suggestion = findClosestMatch(
      mediumValue,
      allMediums.map((m) => m.medium)
    );

    return {
      isValid: false,
      error: `Medium "${mediumValue}" is not in the whitelist for this site`,
      suggestion,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Error validating medium: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get the channel that a source+medium combination maps to
 */
export async function getChannelForSourceMedium(
  source: string,
  medium: string,
  siteId: number
): Promise<ChannelMapping | null> {
  try {
    const result = await db
      .select({
        id: channelMappings.id,
        source: channelMappings.source,
        medium: channelMappings.medium,
        mappedChannelId: channelMappings.mappedChannelId,
        channelName: channels.name,
        isAutomatic: channelMappings.isAutomatic,
      })
      .from(channelMappings)
      .innerJoin(channels, eq(channelMappings.mappedChannelId, channels.id))
      .where(
        and(
          eq(channelMappings.siteId, siteId),
          eq(channelMappings.source, source),
          eq(channelMappings.medium, medium)
        )
      )
      .limit(1);

    if (result.length > 0) {
      return {
        id: result[0].id,
        source: result[0].source,
        medium: result[0].medium,
        mappedChannelId: result[0].mappedChannelId,
        mappedChannelName: result[0].channelName,
        isAutomatic: result[0].isAutomatic,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting channel mapping:', error);
    return null;
  }
}

/**
 * Suggest a channel mapping based on source+medium patterns
 */
export async function suggestChannelMapping(
  source: string,
  medium: string,
  siteId: number
): Promise<ChannelMapping | null> {
  // First check if there's an existing mapping
  const existing = await getChannelForSourceMedium(source, medium, siteId);
  if (existing) {
    return existing;
  }

  // Try to find by common patterns
  const patterns: Record<string, string> = {
    'google|cpc': 'Google Ads',
    'google|cpm': 'Google Ads',
    'linkedin|cpc': 'LinkedIn Ads',
    'linkedin|cpm': 'LinkedIn Ads',
    'facebook|cpc': 'Meta Ads',
    'facebook|cpm': 'Meta Ads',
    'instagram|cpc': 'Meta Ads',
    'instagram|cpm': 'Meta Ads',
    'direct|direct': 'Direct',
    'organic|organic': 'Organic Search',
    'email|email': 'Email',
  };

  const patternKey = `${source.toLowerCase()}|${medium.toLowerCase()}`;
  const suggestedChannelName = patterns[patternKey];

  if (suggestedChannelName) {
    // Find the channel by name
    const channelResult = await db
      .select({ id: channels.id, name: channels.name })
      .from(channels)
      .where(
        and(
          eq(channels.siteId, siteId),
          eq(channels.name, suggestedChannelName)
        )
      )
      .limit(1);

    if (channelResult.length > 0) {
      return {
        id: 0, // Not yet persisted
        source,
        medium,
        mappedChannelId: channelResult[0].id,
        mappedChannelName: channelResult[0].name,
        isAutomatic: true,
      };
    }
  }

  return null;
}

/**
 * Get all valid source enum values for a site
 */
export async function getSourceEnums(
  siteId: number
): Promise<SourceEnumValue[]> {
  try {
    const results = await db
      .select({
        id: utmSourceEnum.id,
        source: utmSourceEnum.source,
        displayName: utmSourceEnum.displayName,
        icon: utmSourceEnum.icon,
        category: utmSourceEnum.category,
        isDefault: utmSourceEnum.isDefault,
      })
      .from(utmSourceEnum)
      .where(eq(utmSourceEnum.siteId, siteId));

    return results as SourceEnumValue[];
  } catch (error) {
    console.error('Error getting source enums:', error);
    return [];
  }
}

/**
 * Get all valid medium enum values for a site
 */
export async function getMediumEnums(siteId: number): Promise<MediumEnumValue[]> {
  try {
    const results = await db
      .select({
        id: utmMediumEnum.id,
        medium: utmMediumEnum.medium,
        displayName: utmMediumEnum.displayName,
        costType: utmMediumEnum.costType,
        isDefault: utmMediumEnum.isDefault,
      })
      .from(utmMediumEnum)
      .where(eq(utmMediumEnum.siteId, siteId));

    return results as MediumEnumValue[];
  } catch (error) {
    console.error('Error getting medium enums:', error);
    return [];
  }
}

/**
 * Seed default source and medium enums for a new site
 */
export async function seedDefaultEnums(siteId: number): Promise<void> {
  try {
    const defaultSources = [
      { source: 'google', displayName: 'Google', category: 'paid', isDefault: true },
      { source: 'linkedin', displayName: 'LinkedIn', category: 'paid', isDefault: false },
      { source: 'facebook', displayName: 'Facebook', category: 'paid', isDefault: false },
      { source: 'instagram', displayName: 'Instagram', category: 'paid', isDefault: false },
      { source: 'direct', displayName: 'Direct', category: 'direct', isDefault: false },
      { source: 'organic', displayName: 'Organic', category: 'organic', isDefault: false },
      { source: 'referral', displayName: 'Referral', category: 'organic', isDefault: false },
      { source: 'email', displayName: 'Email', category: 'paid', isDefault: false },
    ];

    const defaultMediums = [
      { medium: 'cpc', displayName: 'Cost Per Click', costType: 'paid', isDefault: true },
      { medium: 'cpm', displayName: 'Cost Per Mille', costType: 'paid', isDefault: false },
      { medium: 'organic', displayName: 'Organic', costType: 'organic', isDefault: true },
      { medium: 'email', displayName: 'Email', costType: 'paid', isDefault: false },
      { medium: 'social', displayName: 'Social', costType: 'paid', isDefault: false },
      { medium: 'referral', displayName: 'Referral', costType: 'organic', isDefault: false },
      { medium: 'direct', displayName: 'Direct', costType: 'direct', isDefault: false },
      { medium: 'none', displayName: 'None', costType: 'direct', isDefault: false },
    ];

    // Check if already seeded
    const sourceCount = await db
      .select({ count: utmSourceEnum.id })
      .from(utmSourceEnum)
      .where(eq(utmSourceEnum.siteId, siteId));

    if (sourceCount.length === 0) {
      // Insert sources
      for (const source of defaultSources) {
        await db.insert(utmSourceEnum).values({
          siteId,
          source: source.source,
          displayName: source.displayName,
          category: source.category || undefined,
          isDefault: source.isDefault,
        } as any);
      }

      // Insert mediums
      for (const medium of defaultMediums) {
        await db.insert(utmMediumEnum).values({
          siteId,
          medium: medium.medium,
          displayName: medium.displayName,
          costType: medium.costType || undefined,
          isDefault: medium.isDefault,
        } as any);
      }
    }
  } catch (error) {
    console.error('Error seeding default enums:', error);
  }
}

/**
 * Find the closest string match (Levenshtein distance)
 * Used for suggesting corrections
 */
function findClosestMatch(
  input: string,
  options: string[],
  maxDistance: number = 2
): string | undefined {
  let closest: string | undefined;
  let minDistance = maxDistance;

  for (const option of options) {
    const distance = levenshteinDistance(input.toLowerCase(), option.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = option;
    }
  }

  return closest;
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
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}
