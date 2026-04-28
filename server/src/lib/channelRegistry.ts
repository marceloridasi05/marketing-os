/**
 * Channel Registry - Manages channel creation, mapping, and merging
 * Maintains consistent channel configuration and handles cascade updates
 */

import { db } from '../db/index.js';
import {
  channels,
  channelMappings,
  utmCampaigns,
  growthLoopAttributions,
  performanceEntries,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export interface StandardChannel {
  id?: number;
  name: string;
  category: string;
  displayName: string;
  isStandard: boolean;
}

export interface ChannelMappingConfig {
  source: string;
  medium: string;
  channelId: number;
  isAutomatic: boolean;
}

const STANDARD_CHANNELS: StandardChannel[] = [
  {
    name: 'Google Ads',
    category: 'paid-search',
    displayName: 'Google Search Ads',
    isStandard: true,
  },
  {
    name: 'LinkedIn Ads',
    category: 'paid-social',
    displayName: 'LinkedIn Ads',
    isStandard: true,
  },
  {
    name: 'Meta Ads',
    category: 'paid-social',
    displayName: 'Meta (Facebook & Instagram)',
    isStandard: true,
  },
  {
    name: 'Direct',
    category: 'direct',
    displayName: 'Direct Traffic',
    isStandard: true,
  },
  {
    name: 'Organic Search',
    category: 'organic',
    displayName: 'Organic Search',
    isStandard: true,
  },
  {
    name: 'Email',
    category: 'email',
    displayName: 'Email',
    isStandard: true,
  },
  {
    name: 'Other',
    category: 'other',
    displayName: 'Other Channels',
    isStandard: true,
  },
];

/**
 * Get all standard channels (predefined by system)
 */
export async function getStandardChannels(): Promise<StandardChannel[]> {
  return STANDARD_CHANNELS;
}

/**
 * Get channel for a campaign based on source/medium mapping
 */
export async function getChannelForCampaign(
  source: string,
  medium: string,
  siteId: number
): Promise<{ channelId: number; channelName: string } | null> {
  try {
    const result = await db
      .select({
        channelId: channelMappings.mappedChannelId,
        channelName: channels.name,
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
        channelId: result[0].channelId,
        channelName: result[0].channelName,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting channel for campaign:', error);
    return null;
  }
}

/**
 * Create default channel mappings for a site
 * Sets up the initial mapping of (source, medium) → channel
 */
export async function seedChannelMappings(siteId: number): Promise<void> {
  try {
    // First, ensure standard channels exist for this site
    const existingChannels = await db
      .select({ id: channels.id, name: channels.name })
      .from(channels)
      .where(and(eq(channels.siteId, siteId), eq(channels.isStandard, 1)));

    const channelMap = new Map<string, number>();
    for (const ch of existingChannels) {
      channelMap.set(ch.name, ch.id);
    }

    // Create any missing standard channels
    for (const stdChannel of STANDARD_CHANNELS) {
      if (!channelMap.has(stdChannel.name)) {
        const result = await db
          .insert(channels)
          .values({
            siteId,
            name: stdChannel.name,
            category: stdChannel.category,
            isStandard: 1,
            allowCustomNames: 1,
          });
        channelMap.set(stdChannel.name, result.lastInsertRowid as number);
      }
    }

    // Now create default mappings
    const defaultMappings: ChannelMappingConfig[] = [
      { source: 'google', medium: 'cpc', channelId: 0, isAutomatic: true }, // Will be filled in
      { source: 'google', medium: 'cpm', channelId: 0, isAutomatic: true },
      { source: 'linkedin', medium: 'cpc', channelId: 0, isAutomatic: true },
      { source: 'linkedin', medium: 'cpm', channelId: 0, isAutomatic: true },
      { source: 'facebook', medium: 'cpc', channelId: 0, isAutomatic: true },
      { source: 'facebook', medium: 'cpm', channelId: 0, isAutomatic: true },
      { source: 'instagram', medium: 'cpc', channelId: 0, isAutomatic: true },
      { source: 'instagram', medium: 'cpm', channelId: 0, isAutomatic: true },
      { source: 'direct', medium: 'direct', channelId: 0, isAutomatic: true },
      { source: 'organic', medium: 'organic', channelId: 0, isAutomatic: true },
      { source: 'email', medium: 'email', channelId: 0, isAutomatic: true },
    ];

    // Replace placeholder channel IDs and insert mappings
    for (const mapping of defaultMappings) {
      let targetChannelId = channelMap.get('Google Ads') || 0;

      if (mapping.source === 'linkedin') {
        targetChannelId = channelMap.get('LinkedIn Ads') || 0;
      } else if (
        mapping.source === 'facebook' ||
        mapping.source === 'instagram'
      ) {
        targetChannelId = channelMap.get('Meta Ads') || 0;
      } else if (mapping.source === 'direct') {
        targetChannelId = channelMap.get('Direct') || 0;
      } else if (mapping.source === 'organic') {
        targetChannelId = channelMap.get('Organic Search') || 0;
      } else if (mapping.source === 'email') {
        targetChannelId = channelMap.get('Email') || 0;
      }

      if (targetChannelId > 0) {
        try {
          await db.insert(channelMappings).values({
            siteId,
            source: mapping.source,
            medium: mapping.medium,
            mappedChannelId: targetChannelId,
            isAutomatic: mapping.isAutomatic,
          } as any);
        } catch (error) {
          // Mapping might already exist, ignore
        }
      }
    }
  } catch (error) {
    console.error('Error seeding channel mappings:', error);
  }
}

/**
 * Merge duplicate channels with cascade updates
 * This is atomic and updates all references across the system
 */
export async function mergeChannelDuplicates(
  primaryChannelId: number,
  duplicateChannelId: number,
  siteId: number
): Promise<{ success: boolean; updatedTables: string[]; error?: string }> {
  const updatedTables: string[] = [];

  try {
    // Step 1: Update performanceEntries
    try {
      const peUpdateResult = await db
        .update(performanceEntries)
        .set({ channelId: primaryChannelId } as any)
        .where(eq(performanceEntries.channelId, duplicateChannelId));
      if (peUpdateResult.changes > 0) {
        updatedTables.push(`performanceEntries (${peUpdateResult.changes} rows)`);
      }
    } catch {
      // Table might not exist in all deployments
    }

    // Step 2: Update utmCampaigns
    try {
      const ucUpdateResult = await db
        .update(utmCampaigns)
        .set({ mappedChannelId: primaryChannelId } as any)
        .where(eq(utmCampaigns.mappedChannelId, duplicateChannelId));
      if (ucUpdateResult.changes > 0) {
        updatedTables.push(`utmCampaigns (${ucUpdateResult.changes} rows)`);
      }
    } catch {
      // Table might not exist in all deployments
    }

    // Step 3: Update growthLoopAttributions
    try {
      const glaUpdateResult = await db
        .update(growthLoopAttributions)
        .set({ channelId: primaryChannelId } as any)
        .where(eq(growthLoopAttributions.channelId, duplicateChannelId));
      if (glaUpdateResult.changes > 0) {
        updatedTables.push(
          `growthLoopAttributions (${glaUpdateResult.changes} rows)`
        );
      }
    } catch {
      // Table might not exist in all deployments
    }

    // Step 4: Update channelMappings to point to primary channel
    const cmUpdateResult = await db
      .update(channelMappings)
      .set({ mappedChannelId: primaryChannelId } as any)
      .where(eq(channelMappings.mappedChannelId, duplicateChannelId));
    if (cmUpdateResult.changes > 0) {
      updatedTables.push(`channelMappings (${cmUpdateResult.changes} rows)`);
    }

    // Step 5: Delete the duplicate channel
    await db
      .delete(channels)
      .where(
        and(
          eq(channels.id, duplicateChannelId),
          eq(channels.siteId, siteId)
        )
      );
    updatedTables.push('channels (deleted duplicate)');

    return {
      success: true,
      updatedTables,
    };
  } catch (error) {
    return {
      success: false,
      updatedTables,
      error: `Error merging channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a custom channel for a site
 */
export async function createChannel(
  siteId: number,
  name: string,
  category: string
): Promise<{ success: boolean; channelId?: number; error?: string }> {
  try {
    // Check if channel already exists
    const existing = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.siteId, siteId), eq(channels.name, name)))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: `Channel "${name}" already exists for this site`,
      };
    }

    const result = await db
      .insert(channels)
      .values({
        siteId,
        name,
        category,
        isStandard: false,
        allowCustomNames: true,
        active: true,
      } as any);

    return {
      success: true,
      channelId: result.lastInsertRowid as number,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error creating channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create or update a channel mapping
 */
export async function createChannelMapping(
  siteId: number,
  source: string,
  medium: string,
  channelId: number,
  isAutomatic: boolean = false
): Promise<{ success: boolean; mappingId?: number; error?: string }> {
  try {
    // Check if mapping already exists
    const existing = await db
      .select({ id: channelMappings.id })
      .from(channelMappings)
      .where(
        and(
          eq(channelMappings.siteId, siteId),
          eq(channelMappings.source, source),
          eq(channelMappings.medium, medium)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing mapping
      await db
        .update(channelMappings)
        .set({
          mappedChannelId: channelId,
          isAutomatic: isAutomatic,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(channelMappings.id, existing[0].id));

      return {
        success: true,
        mappingId: existing[0].id,
      };
    }

    // Create new mapping
    const result = await db
      .insert(channelMappings)
      .values({
        siteId,
        source,
        medium,
        mappedChannelId: channelId,
        isAutomatic: isAutomatic,
      } as any);

    return {
      success: true,
      mappingId: result.lastInsertRowid as number,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error creating mapping: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get all channel mappings for a site
 */
export async function getChannelMappings(
  siteId: number
): Promise<Array<{ source: string; medium: string; channelName: string }>> {
  try {
    return await db
      .select({
        source: channelMappings.source,
        medium: channelMappings.medium,
        channelName: channels.name,
      })
      .from(channelMappings)
      .innerJoin(channels, eq(channelMappings.mappedChannelId, channels.id))
      .where(eq(channelMappings.siteId, siteId));
  } catch (error) {
    console.error('Error getting channel mappings:', error);
    return [];
  }
}

/**
 * Validate that a channel exists and is active
 */
export async function isChannelValid(
  channelId: number,
  siteId: number
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(
          eq(channels.id, channelId),
          eq(channels.siteId, siteId),
          eq(channels.active, 1)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error validating channel:', error);
    return false;
  }
}
