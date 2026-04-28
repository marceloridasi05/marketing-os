import { Router } from 'express';
import { db } from '../db/index.js';
import {
  utmCampaigns,
  utmGaSessions,
  utmGaConversions,
  utmTouchpoints,
  utmLibrary,
  utmCacAnalysis,
} from '../db/schema.js';
import { eq, and, sql, like, gte, lte } from 'drizzle-orm';
import {
  calculateFirstTouchAttribution,
  calculateLastTouchAttribution,
  calculateLinearAttribution,
  calculateTimeDecayAttribution,
  combineAttributionResults,
  calculateCAC,
} from '../lib/attributionModels.js';

const router = Router();

// ─── UTM Campaign Management ────────────────────────────────────────────────

/**
 * GET /api/utms/campaigns
 * List all UTM campaigns for a site with optional filtering
 */
router.get('/campaigns', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const conditions = [eq(utmCampaigns.siteId, siteId)];

    // Filter by status if provided
    if (req.query.status) {
      conditions.push(eq(utmCampaigns.status, String(req.query.status)));
    }

    const campaigns = await db
      .select()
      .from(utmCampaigns)
      .where(and(...conditions))
      .orderBy(utmCampaigns.updatedAt);

    res.json(campaigns);
  } catch (err) {
    console.error('Failed to list UTM campaigns:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/campaigns/:id
 * Get a specific UTM campaign with its details
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const [campaign] = await db
      .select()
      .from(utmCampaigns)
      .where(and(
        eq(utmCampaigns.id, +req.params.id),
        eq(utmCampaigns.siteId, siteId)
      ));

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Parse JSON fields
    const parsed = {
      ...campaign,
      channels: campaign.channels ? JSON.parse(campaign.channels) : [],
    };

    res.json(parsed);
  } catch (err) {
    console.error('Failed to get UTM campaign:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/utms/campaigns
 * Create a new UTM campaign with validation
 */
router.post('/campaigns', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const { name, source, medium, campaign, content, term, baseUrl, channels, expectedBudget, expectedSessions, expectedLeads, expectedRevenue } = req.body;

    // Validation
    if (!name || !source || !medium || !campaign) {
      return res.status(400).json({ error: 'name, source, medium, and campaign are required' });
    }

    // Check for duplicates (same source, medium, campaign, content)
    const existing = await db
      .select()
      .from(utmCampaigns)
      .where(and(
        eq(utmCampaigns.siteId, siteId),
        eq(utmCampaigns.source, source),
        eq(utmCampaigns.medium, medium),
        eq(utmCampaigns.campaign, campaign),
        eq(utmCampaigns.content, content || '')
      ));

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Campaign with these UTM parameters already exists' });
    }

    // Generate UTM URL if baseUrl provided
    let utmUrl = null;
    if (baseUrl) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      const params = [
        `utm_source=${encodeURIComponent(source)}`,
        `utm_medium=${encodeURIComponent(medium)}`,
        `utm_campaign=${encodeURIComponent(campaign)}`,
      ];
      if (content) params.push(`utm_content=${encodeURIComponent(content)}`);
      if (term) params.push(`utm_term=${encodeURIComponent(term)}`);
      utmUrl = baseUrl + separator + params.join('&');
    }

    const [newCampaign] = await db
      .insert(utmCampaigns)
      .values({
        siteId,
        name,
        source,
        medium,
        campaign,
        content: content || null,
        term: term || null,
        utmUrl,
        baseUrl: baseUrl || null,
        channels: channels ? JSON.stringify(channels) : null,
        expectedBudget: expectedBudget || null,
        expectedSessions: expectedSessions || null,
        expectedLeads: expectedLeads || null,
        expectedRevenue: expectedRevenue || null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    res.status(201).json(newCampaign);
  } catch (err) {
    console.error('Failed to create UTM campaign:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * PUT /api/utms/campaigns/:id
 * Update an existing UTM campaign
 */
router.put('/campaigns/:id', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const { name, status, baseUrl, channels, expectedBudget, expectedSessions, expectedLeads, expectedRevenue, notes } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (channels !== undefined) updateData.channels = JSON.stringify(channels);
    if (expectedBudget !== undefined) updateData.expectedBudget = expectedBudget;
    if (expectedSessions !== undefined) updateData.expectedSessions = expectedSessions;
    if (expectedLeads !== undefined) updateData.expectedLeads = expectedLeads;
    if (expectedRevenue !== undefined) updateData.expectedRevenue = expectedRevenue;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(utmCampaigns)
      .set(updateData)
      .where(and(
        eq(utmCampaigns.id, +req.params.id),
        eq(utmCampaigns.siteId, siteId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Failed to update UTM campaign:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/utms/campaigns/:id
 * Archive a campaign (soft delete)
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const [archived] = await db
      .update(utmCampaigns)
      .set({ status: 'archived', updatedAt: new Date().toISOString() })
      .where(and(
        eq(utmCampaigns.id, +req.params.id),
        eq(utmCampaigns.siteId, siteId)
      ))
      .returning();

    if (!archived) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ deleted: true, campaign: archived });
  } catch (err) {
    console.error('Failed to delete UTM campaign:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── UTM URL Generation ────────────────────────────────────────────────────

/**
 * POST /api/utms/campaigns/:id/url
 * Generate a UTM URL for a campaign
 */
router.post('/campaigns/:id/url', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const { baseUrl } = req.body;
    if (!baseUrl) {
      return res.status(400).json({ error: 'baseUrl required' });
    }

    const [campaign] = await db
      .select()
      .from(utmCampaigns)
      .where(and(
        eq(utmCampaigns.id, +req.params.id),
        eq(utmCampaigns.siteId, siteId)
      ));

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Generate URL
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params = [
      `utm_source=${encodeURIComponent(campaign.source)}`,
      `utm_medium=${encodeURIComponent(campaign.medium)}`,
      `utm_campaign=${encodeURIComponent(campaign.campaign)}`,
    ];
    if (campaign.content) params.push(`utm_content=${encodeURIComponent(campaign.content)}`);
    if (campaign.term) params.push(`utm_term=${encodeURIComponent(campaign.term)}`);

    const utmUrl = baseUrl + separator + params.join('&');

    res.json({ url: utmUrl });
  } catch (err) {
    console.error('Failed to generate UTM URL:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── UTM Validation & Suggestions ──────────────────────────────────────────

/**
 * POST /api/utms/validate
 * Check if UTM values already exist
 */
router.post('/validate', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const { source, medium, campaign, content } = req.body;

    const existing = await db
      .select()
      .from(utmCampaigns)
      .where(and(
        eq(utmCampaigns.siteId, siteId),
        eq(utmCampaigns.source, source),
        eq(utmCampaigns.medium, medium),
        eq(utmCampaigns.campaign, campaign),
        eq(utmCampaigns.content, content || '')
      ));

    res.json({ exists: existing.length > 0, campaign: existing[0] || null });
  } catch (err) {
    console.error('Failed to validate UTM values:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/suggestions
 * Get suggestions for standardized UTM values based on site history
 */
router.get('/suggestions', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const campaigns = await db
      .select()
      .from(utmCampaigns)
      .where(eq(utmCampaigns.siteId, siteId));

    // Extract unique values from existing campaigns
    const sources = [...new Set(campaigns.map(c => c.source))];
    const mediums = [...new Set(campaigns.map(c => c.medium))];
    const terms = campaigns
      .filter(c => c.term)
      .map(c => c.term)
      .filter((v): v is string => v !== null);

    res.json({ sources, mediums, terms });
  } catch (err) {
    console.error('Failed to get UTM suggestions:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── UTM Library (Templates) ───────────────────────────────────────────────

/**
 * GET /api/utms/library
 * List saved UTM templates for a site
 */
router.get('/library', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const templates = await db
      .select()
      .from(utmLibrary)
      .where(eq(utmLibrary.siteId, siteId))
      .orderBy(utmLibrary.name);

    // Parse JSON fields
    const parsed = templates.map(t => ({
      ...t,
      contentOptions: t.contentOptions ? JSON.parse(t.contentOptions) : [],
      termOptions: t.termOptions ? JSON.parse(t.termOptions) : [],
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Failed to list UTM library:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/utms/library
 * Create a new UTM template
 */
router.post('/library', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const { name, description, sourcePreset, mediumPreset, campaignTemplate, contentOptions, termOptions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const [newTemplate] = await db
      .insert(utmLibrary)
      .values({
        siteId,
        name,
        description: description || null,
        sourcePreset: sourcePreset || null,
        mediumPreset: mediumPreset || null,
        campaignTemplate: campaignTemplate || null,
        contentOptions: contentOptions ? JSON.stringify(contentOptions) : null,
        termOptions: termOptions ? JSON.stringify(termOptions) : null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    res.status(201).json(newTemplate);
  } catch (err) {
    console.error('Failed to create UTM template:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/utms/library/:id
 * Delete a UTM template
 */
router.delete('/library/:id', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const [deleted] = await db
      .delete(utmLibrary)
      .where(and(
        eq(utmLibrary.id, +req.params.id),
        eq(utmLibrary.siteId, siteId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete UTM template:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── GA4 Integration Endpoints ──────────────────────────────────────────────

/**
 * POST /api/utms/ga/sync
 * Sync GA4 sessions with UTM campaigns (placeholder for GA4 API integration)
 */
router.post('/ga/sync', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // TODO: Implement GA4 API sync
    // This would fetch sessions from GA4 API and sync with utm_ga_sessions table

    res.json({
      status: 'pending',
      message: 'GA4 sync not yet configured. Please set up Google Analytics 4 API credentials.',
      synced: 0,
    });
  } catch (err) {
    console.error('Failed to sync GA4 sessions:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/ga/sessions
 * Get GA4 sessions linked to UTM campaigns
 */
router.get('/ga/sessions', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const campaignId = req.query.campaignId ? +req.query.campaignId : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const conditions = [eq(utmGaSessions.siteId, siteId)];
    if (campaignId) {
      conditions.push(eq(utmGaSessions.utmCampaignId, campaignId));
    }

    const sessions = await db
      .select()
      .from(utmGaSessions)
      .where(and(...conditions))
      .orderBy(utmGaSessions.sessionStart);

    res.json(sessions);
  } catch (err) {
    console.error('Failed to get GA sessions:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/ga/conversions
 * Get conversions by UTM campaign
 */
router.get('/ga/conversions', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const campaignId = req.query.campaignId ? +req.query.campaignId : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const conditions = [eq(utmGaConversions.siteId, siteId)];
    if (campaignId) {
      conditions.push(eq(utmGaConversions.utmCampaignId, campaignId));
    }

    const conversions = await db
      .select()
      .from(utmGaConversions)
      .where(and(...conditions))
      .orderBy(utmGaConversions.eventDate);

    res.json(conversions);
  } catch (err) {
    console.error('Failed to get GA conversions:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── Attribution Models (Phase 2) ────────────────────────────────────────────

/**
 * GET /api/utms/attribution/models
 * Get site attribution configuration
 */
router.get('/attribution/models', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // TODO: Implement fetching from utm_attribution_models table
    // For now, return default config
    res.json({
      siteId,
      enabled: true,
      primaryModel: 'last_touch',
      lookbackWindow: 30,
      conversionEvents: ['lead', 'signup', 'purchase', 'demo_request'],
    });
  } catch (err) {
    console.error('Failed to get attribution models:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/utms/attribution/calculate
 * Calculate multi-touch attribution for a user journey
 */
router.post('/attribution/calculate', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const { gaUserId, conversionValue } = req.body;

    if (!siteId || !gaUserId || conversionValue === undefined) {
      return res.status(400).json({ error: 'siteId, gaUserId, and conversionValue required' });
    }

    // Get all touchpoints for this user
    const touchpoints = await db
      .select()
      .from(utmTouchpoints)
      .where(and(
        eq(utmTouchpoints.siteId, siteId),
        eq(utmTouchpoints.gaUserId, gaUserId)
      ))
      .orderBy(utmTouchpoints.touchDate);

    if (touchpoints.length === 0) {
      return res.json({
        gaUserId,
        touchpointCount: 0,
        attribution: { firstTouch: [], lastTouch: [], linear: [], timeDecay: [] },
      });
    }

    // Convert to attribution model format
    const touchpointData = touchpoints.map(t => ({
      sessionId: t.gaSessionId || '',
      campaignId: t.utmCampaignId || 0,
      timestamp: new Date(t.touchDate),
      conversionValue: 0, // Individual touchpoint value is 0, total goes to conversion
    }));

    // Calculate attribution across models
    const firstTouch = calculateFirstTouchAttribution(touchpointData, conversionValue);
    const lastTouch = calculateLastTouchAttribution(touchpointData, conversionValue);
    const linear = calculateLinearAttribution(touchpointData, conversionValue);
    const timeDecay = calculateTimeDecayAttribution(touchpointData, conversionValue);

    res.json({
      gaUserId,
      touchpointCount: touchpoints.length,
      conversionValue,
      attribution: {
        firstTouch,
        lastTouch,
        linear,
        timeDecay,
      },
    });
  } catch (err) {
    console.error('Failed to calculate attribution:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/attribution/compare-models
 * Compare first-touch vs last-touch vs linear attribution
 */
router.get('/attribution/compare-models', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // Get all campaigns for this site
    const campaigns = await db
      .select()
      .from(utmCampaigns)
      .where(eq(utmCampaigns.siteId, siteId));

    // TODO: Implement actual attribution comparison from database
    // For now, return summary structure
    const comparison = campaigns.map(campaign => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      source: campaign.source,
      medium: campaign.medium,
      campaign: campaign.campaign,
      firstTouchSessions: 0,
      firstTouchLeads: 0,
      firstTouchRevenue: 0,
      firstTouchCac: 0,
      lastTouchSessions: 0,
      lastTouchLeads: 0,
      lastTouchRevenue: 0,
      lastTouchCac: 0,
      linearSessions: 0,
      linearLeads: 0,
      linearRevenue: 0,
      linearCac: 0,
    }));

    res.json({ siteId, campaigns: comparison });
  } catch (err) {
    console.error('Failed to compare models:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/attribution/journey
 * Get user journey (touchpoints) leading to conversion
 */
router.get('/attribution/journey', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const gaUserId = req.query.gaUserId ? String(req.query.gaUserId) : undefined;

    if (!siteId || !gaUserId) {
      return res.status(400).json({ error: 'siteId and gaUserId required' });
    }

    // Get all touchpoints for this user
    const touchpoints = await db
      .select()
      .from(utmTouchpoints)
      .where(and(
        eq(utmTouchpoints.siteId, siteId),
        eq(utmTouchpoints.gaUserId, gaUserId)
      ))
      .orderBy(utmTouchpoints.touchDate);

    // Get campaign details for each touchpoint
    const journey = await Promise.all(
      touchpoints.map(async tp => {
        const [campaign] = await db
          .select()
          .from(utmCampaigns)
          .where(eq(utmCampaigns.id, tp.utmCampaignId || 0));

        return {
          ...tp,
          campaignName: campaign?.name || 'Unknown',
          campaignSource: campaign?.source,
          campaignMedium: campaign?.medium,
        };
      })
    );

    res.json({
      gaUserId,
      touchpointCount: journey.length,
      daysToConversion: journey.length > 0
        ? Math.floor(
            (new Date().getTime() - new Date(journey[0].touchDate).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : 0,
      journey,
    });
  } catch (err) {
    console.error('Failed to get journey:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── CAC & ROI Analysis (Phase 2) ──────────────────────────────────────────

/**
 * GET /api/utms/cac
 * Get CAC by campaign and attribution model
 */
router.get('/cac', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const campaignId = req.query.campaignId ? +req.query.campaignId : undefined;
    const model = req.query.model ? String(req.query.model) : 'last_touch';

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // Get cached CAC analysis
    const conditions = [eq(utmCacAnalysis.siteId, siteId)];
    if (campaignId) {
      conditions.push(eq(utmCacAnalysis.utmCampaignId, campaignId));
    }

    const cacData = await db
      .select()
      .from(utmCacAnalysis)
      .where(and(...conditions))
      .orderBy(utmCacAnalysis.periodStart);

    // Map to requested model
    const modelCAC = cacData.map(row => {
      let leads = 0;
      let revenue = 0;
      let cac = 0;

      if (model === 'first_touch') {
        leads = row.firstTouchLeads || 0;
        revenue = row.firstTouchRevenue || 0;
        cac = row.firstTouchCac || 0;
      } else if (model === 'linear') {
        leads = row.linearLeads || 0;
        revenue = row.linearRevenue || 0;
        cac = row.linearCac || 0;
      } else {
        // default to last_touch
        leads = row.lastTouchLeads || 0;
        revenue = row.lastTouchRevenue || 0;
        cac = row.lastTouchCac || 0;
      }

      return {
        campaignId: row.utmCampaignId,
        period: `${row.periodStart} to ${row.periodEnd}`,
        model,
        spend: row.spendInPeriod,
        leads,
        conversions: 0, // TODO: add to schema
        revenue,
        cac,
        roi: row.roiLastTouch || 0, // TODO: use model-specific ROI
      };
    });

    res.json(modelCAC);
  } catch (err) {
    console.error('Failed to get CAC:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/roi
 * Get ROI by campaign and period
 */
router.get('/roi', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;
    const period = req.query.period ? String(req.query.period) : undefined; // YYYY-MM

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    const conditions = [eq(utmCacAnalysis.siteId, siteId)];

    // Filter by period if provided (YYYY-MM)
    if (period) {
      const startDate = `${period}-01`;
      const [year, month] = period.split('-');
      const nextMonth = parseInt(month) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${(parseInt(month) + 1).toString().padStart(2, '0')}`;
      const endDate = `${nextMonth}-01`;

      conditions.push(
        and(
          gte(utmCacAnalysis.periodStart, startDate),
          lte(utmCacAnalysis.periodStart, endDate)
        )
      );
    }

    const roiData = await db
      .select()
      .from(utmCacAnalysis)
      .where(and(...conditions))
      .orderBy(utmCacAnalysis.periodStart);

    const roi = roiData.map(row => ({
      campaignId: row.utmCampaignId,
      period: `${row.periodStart} to ${row.periodEnd}`,
      spend: row.spendInPeriod,
      revenue: row.lastTouchRevenue,
      roi: row.roiLastTouch,
      roas: row.spendInPeriod ? (row.lastTouchRevenue || 0) / row.spendInPeriod : 0,
    }));

    res.json(roi);
  } catch (err) {
    console.error('Failed to get ROI:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/cohort-analysis
 * Cohort analysis by acquisition source
 */
router.get('/cohort-analysis', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // Get campaigns grouped by source
    const campaigns = await db
      .select()
      .from(utmCampaigns)
      .where(eq(utmCampaigns.siteId, siteId));

    const cohortsBySource = new Map<string, any>();

    campaigns.forEach(campaign => {
      const existing = cohortsBySource.get(campaign.source) || {
        source: campaign.source,
        campaignCount: 0,
        totalExpectedLeads: 0,
        totalExpectedRevenue: 0,
        campaigns: [],
      };

      existing.campaignCount += 1;
      existing.totalExpectedLeads += campaign.expectedLeads || 0;
      existing.totalExpectedRevenue += campaign.expectedRevenue || 0;
      existing.campaigns.push({
        id: campaign.id,
        name: campaign.name,
        expectedLeads: campaign.expectedLeads,
        expectedRevenue: campaign.expectedRevenue,
      });

      cohortsBySource.set(campaign.source, existing);
    });

    res.json(Array.from(cohortsBySource.values()));
  } catch (err) {
    console.error('Failed to get cohort analysis:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/utms/ltv-by-campaign
 * LTV (Lifetime Value) by acquisition campaign
 */
router.get('/ltv-by-campaign', async (req, res) => {
  try {
    const siteId = req.query.siteId ? +req.query.siteId : undefined;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId required' });
    }

    // TODO: Implement LTV calculation from actual customer data
    // For now, return estimate based on revenue/conversions
    const cacData = await db
      .select()
      .from(utmCacAnalysis)
      .where(eq(utmCacAnalysis.siteId, siteId));

    const ltvData = cacData.map(row => ({
      campaignId: row.utmCampaignId,
      period: `${row.periodStart} to ${row.periodEnd}`,
      conversions: row.lastTouchConversions || 0,
      revenue: row.lastTouchRevenue || 0,
      avgRevenuePerConversion: row.lastTouchConversions
        ? (row.lastTouchRevenue || 0) / row.lastTouchConversions
        : 0,
      estimatedLtv: row.lastTouchRevenue || 0, // TODO: calculate from actual LTV data
    }));

    res.json(ltvData);
  } catch (err) {
    console.error('Failed to get LTV by campaign:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
