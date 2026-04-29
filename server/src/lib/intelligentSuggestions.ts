/**
 * Intelligent Suggestions Engine - Real-time suggestions with fuzzy matching
 * Supports gradual enforcement with confidence scoring and caching
 */

import { db } from '../db/index.js';
import {
  utmSourceEnum,
  utmMediumEnum,
  campaignNormalizationRules,
  utmSuggestionCache,
  utmValueHistory,
  utmEnforcementConfig,
} from '../db/schema.js';
import { eq, and, like, gte, lte } from 'drizzle-orm';

export interface Suggestion {
  value: string;
  type: 'standard' | 'normalized' | 'fuzzy_match' | 'history';
  confidence: number; // 0-1
  reason: string;
  displayName?: string;
}

export interface SuggestionResponse {
  input: string;
  suggestions: Suggestion[];
  warning?: string;
  enforcement: {
    mode: 'flexible' | 'moderate' | 'strict';
    allowFreeText: boolean;
    strictnessLevel: number;
  };
}

/**
 * Get intelligent suggestions for a UTM value
 * Combines: exact matches, fuzzy matches, history, normalization
 */
export async function getSuggestions(
  userInput: string,
  inputType: 'source' | 'medium' | 'campaign',
  siteId: number
): Promise<SuggestionResponse> {
  try {
    // Get enforcement config
    const config = await getEnforcementConfig(siteId);

    // Check cache first (avoid recalculating)
    const cached = await checkSuggestionCache(siteId, userInput, inputType);
    if (cached) {
      return {
        input: userInput,
        suggestions: cached,
        enforcement: {
          mode: config.enforcementMode as any,
          allowFreeText: Boolean(config.allowFreeText),
          strictnessLevel: config.strictnessLevel,
        },
      };
    }

    const suggestions: Suggestion[] = [];
    let warning: string | undefined;

    if (inputType === 'source' || inputType === 'medium') {
      // Get exact matches from enums
      const enumTable = inputType === 'source' ? utmSourceEnum : utmMediumEnum;
      const enumField = inputType === 'source' ? utmSourceEnum.source : utmMediumEnum.medium;

      const exact = await db
        .select({
          value: enumField,
          displayName:
            inputType === 'source'
              ? utmSourceEnum.displayName
              : utmMediumEnum.displayName,
        })
        .from(enumTable)
        .where(
          and(
            eq(enumTable.siteId, siteId),
            eq(enumField, userInput.toLowerCase())
          )
        );

      if (exact.length > 0) {
        suggestions.push({
          value: exact[0].value,
          type: 'standard',
          confidence: 1.0,
          reason: 'Exact match in standard values',
          displayName: exact[0].displayName,
        });
      }

      // Get fuzzy matches
      const fuzzyMatches = await db
        .select({
          value: enumField,
          displayName:
            inputType === 'source'
              ? utmSourceEnum.displayName
              : utmMediumEnum.displayName,
        })
        .from(enumTable)
        .where(eq(enumTable.siteId, siteId));

      for (const match of fuzzyMatches) {
        const similarity = calculateSimilarity(
          userInput.toLowerCase(),
          match.value.toLowerCase()
        );

        if (
          similarity >= config.fuzzyMatchThreshold &&
          similarity < 1.0 &&
          !suggestions.some(s => s.value === match.value)
        ) {
          suggestions.push({
            value: match.value,
            type: 'fuzzy_match',
            confidence: similarity,
            reason: `Similar to "${match.value}"`,
            displayName: match.displayName,
          });
        }
      }
    }

    // Check normalization rules
    const rules = await db
      .select({
        pattern: campaignNormalizationRules.pattern,
        replacement: campaignNormalizationRules.replacement,
        description: campaignNormalizationRules.description,
      })
      .from(campaignNormalizationRules)
      .where(
        and(
          eq(campaignNormalizationRules.siteId, siteId),
          eq(campaignNormalizationRules.active, true)
        )
      );

    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        if (regex.test(userInput)) {
          const normalized = userInput.replace(regex, rule.replacement);
          if (
            normalized !== userInput &&
            !suggestions.some(s => s.value === normalized)
          ) {
            suggestions.push({
              value: normalized,
              type: 'normalized',
              confidence: 0.95,
              reason: rule.description || `Matches normalization rule`,
            });
          }
        }
      } catch (error) {
        // Skip invalid rules
      }
    }

    // Check value history
    if (inputType !== 'campaign') {
      const history = await db
        .select({
          canonicalValue: utmValueHistory.canonicalValue,
          variants: utmValueHistory.variants,
        })
        .from(utmValueHistory)
        .where(
          and(
            eq(utmValueHistory.siteId, siteId),
            eq(utmValueHistory.valueType, inputType)
          )
        );

      for (const item of history) {
        try {
          const variants = JSON.parse(item.variants);
          for (const variant of variants) {
            const similarity = calculateSimilarity(
              userInput.toLowerCase(),
              variant.value.toLowerCase()
            );

            if (
              similarity >= 0.8 &&
              !suggestions.some(s => s.value === item.canonicalValue)
            ) {
              suggestions.push({
                value: item.canonicalValue,
                type: 'history',
                confidence: similarity * 0.9, // Slightly lower confidence for history
                reason: `${variant.usageCount} previous uses normalized to "${item.canonicalValue}"`,
              });
              break;
            }
          }
        } catch (error) {
          // Skip invalid history entries
        }
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    suggestions.splice(5); // Keep top 5

    // Warn if value is non-standard
    if (
      suggestions.length === 0 &&
      config.enforcementMode !== 'flexible'
    ) {
      warning = `"${userInput}" is not a standard ${inputType}. Standard values: ${
        inputType === 'source'
          ? 'google, linkedin, facebook, direct, organic, referral, email'
          : 'cpc, cpm, organic, email, social, referral, direct, none'
      }`;
    }

    // Cache suggestions
    if (suggestions.length > 0) {
      await cacheSuggestions(siteId, userInput, inputType, suggestions);
    }

    return {
      input: userInput,
      suggestions,
      warning,
      enforcement: {
        mode: config.enforcementMode as any,
        allowFreeText: Boolean(config.allowFreeText),
        strictnessLevel: config.strictnessLevel,
      },
    };
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return {
      input: userInput,
      suggestions: [],
      enforcement: {
        mode: 'flexible',
        allowFreeText: true,
        strictnessLevel: 0,
      },
    };
  }
}

/**
 * Get enforcement configuration for a site
 */
export async function getEnforcementConfig(siteId: number) {
  try {
    const config = await db
      .select()
      .from(utmEnforcementConfig)
      .where(eq(utmEnforcementConfig.siteId, siteId))
      .get();

    if (config) {
      return config;
    }

    // Create default config
    return {
      id: 0,
      siteId,
      enforcementMode: 'flexible',
      strictnessLevel: 0,
      allowFreeText: 1,
      autoNormalize: 1,
      fuzzyMatchThreshold: 0.85,
      lastStrictnessIncrease: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting enforcement config:', error);
    return {
      id: 0,
      siteId,
      enforcementMode: 'flexible',
      strictnessLevel: 0,
      allowFreeText: 1,
      autoNormalize: 1,
      fuzzyMatchThreshold: 0.85,
      lastStrictnessIncrease: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Update enforcement configuration
 */
export async function updateEnforcementConfig(
  siteId: number,
  updates: {
    enforcementMode?: 'flexible' | 'moderate' | 'strict';
    strictnessLevel?: number;
    allowFreeText?: boolean;
    autoNormalize?: boolean;
    fuzzyMatchThreshold?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db
      .select({ id: utmEnforcementConfig.id })
      .from(utmEnforcementConfig)
      .where(eq(utmEnforcementConfig.siteId, siteId))
      .get();

    if (existing) {
      await db
        .update(utmEnforcementConfig)
        .set({
          ...(updates.enforcementMode && {
            enforcementMode: updates.enforcementMode,
          }),
          ...(updates.strictnessLevel !== undefined && {
            strictnessLevel: updates.strictnessLevel,
          }),
          ...(updates.allowFreeText !== undefined && {
            allowFreeText: updates.allowFreeText,
          }),
          ...(updates.autoNormalize !== undefined && {
            autoNormalize: updates.autoNormalize,
          }),
          ...(updates.fuzzyMatchThreshold !== undefined && {
            fuzzyMatchThreshold: updates.fuzzyMatchThreshold,
          }),
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(utmEnforcementConfig.id, existing.id));
    } else {
      await db.insert(utmEnforcementConfig).values({
        siteId,
        enforcementMode: updates.enforcementMode || 'flexible',
        strictnessLevel: updates.strictnessLevel ?? 0,
        allowFreeText: updates.allowFreeText !== false,
        autoNormalize: updates.autoNormalize !== false,
        fuzzyMatchThreshold: updates.fuzzyMatchThreshold ?? 0.85,
      } as any);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Error updating config: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Calculate similarity between two strings (0-1)
 * Uses a combination of methods for better matching
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;

  // Exact substring match
  if (a.includes(b) || b.includes(a)) return 0.95;

  // Levenshtein distance normalized
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const normalized = 1 - distance / maxLen;

  return Math.max(0, normalized);
}

/**
 * Calculate Levenshtein distance
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

/**
 * Check suggestion cache
 */
async function checkSuggestionCache(
  siteId: number,
  userInput: string,
  inputType: string
): Promise<Suggestion[] | null> {
  try {
    const cached = await db
      .select({ suggestions: utmSuggestionCache.suggestions })
      .from(utmSuggestionCache)
      .where(
        and(
          eq(utmSuggestionCache.siteId, siteId),
          eq(utmSuggestionCache.userInput, userInput),
          eq(utmSuggestionCache.inputType, inputType),
          gte(utmSuggestionCache.expiresAt, new Date().toISOString())
        )
      )
      .get();

    if (cached) {
      return JSON.parse(cached.suggestions);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Cache suggestions
 */
async function cacheSuggestions(
  siteId: number,
  userInput: string,
  inputType: string,
  suggestions: Suggestion[]
): Promise<void> {
  try {
    // Cache for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert(utmSuggestionCache).values({
      siteId,
      userInput,
      inputType,
      suggestions: JSON.stringify(suggestions),
      confidenceScore: suggestions[0]?.confidence ?? 0,
      expiresAt: expiresAt.toISOString(),
    } as any);
  } catch (error) {
    // Ignore caching errors
  }
}
