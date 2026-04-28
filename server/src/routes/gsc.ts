import { Router } from 'express';
import { db } from '../db/index.js';
import { gscProperties, gscMetrics, gscInsights, apiCredentials, sites } from '../db/schema.js';
import { sql, and, eq, gt, lt, gte, lte, desc, asc } from 'drizzle-orm';
import { generateGscInsights } from '../lib/gscInsights.js';

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────────

interface GscProperty {
  id: number;
  siteId: number;
  propertyUrl: string;
  propertyType: string;
  gcPropertyId: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  syncFrequency: number;
  createdAt: string;
  updatedAt: string;
}

interface GscMetric {
  id: number;
  siteId: number;
  propertyId: number;
  date: string;
  dimensionType: string;
  dimensionValue: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  periodType: string;
  createdAt: string;
  updatedAt: string;
}

interface GscInsight {
  id: number;
  siteId: number;
  propertyId: number;
  insightType: string;
  dimensionType: string;
  dimensionValue: string;
  severity: string;
  title: string;
  description: string;
  metrics: string; // JSON
  recommendation: string | null;
  generatedAt: string;
  dismissedAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Calculate percentile for a value in an array */
function getPercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/** Format number with locale-specific thousand separator */
function fmtNum(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}

/** Format percentage */
function fmtPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

// ── OAuth Endpoints ────────────────────────────────────────────────────────────

/**
 * POST /api/gsc/oauth/authorize?siteId=X
 * Initiates Google OAuth 2.0 flow
 * Returns authorization URL
 */
router.post('/oauth/authorize', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

    // Google OAuth 2.0 parameters
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/gsc-callback';
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.json({ authUrl, siteId });
  } catch (err) {
    console.error('OAuth authorize error:', err);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * POST /api/gsc/oauth/callback?siteId=X&code=Y
 * Handles OAuth callback from Google
 * Exchanges authorization code for access token
 */
router.post('/oauth/callback', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const code = req.query.code as string;

    if (!siteId || !code) return res.status(400).json({ error: 'siteId and code required' });

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/gsc-callback';

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData: any = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('Failed to get access token');

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
    const scope = tokenData.scope || '';

    // Store credentials in database
    const [cred] = await db
      .insert(apiCredentials)
      .values({
        siteId,
        provider: 'google_search_console',
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt,
        scope,
      })
      .returning();

    res.json({ success: true, credentialId: cred.id });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
});

// ── Property Management ────────────────────────────────────────────────────────

/**
 * GET /api/gsc/properties?siteId=X
 * Lists synced GSC properties for site
 */
router.get('/properties', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

    const props = await db.select().from(gscProperties).where(eq(gscProperties.siteId, siteId));

    // Enrich with sync status
    const enriched = props.map((p) => ({
      ...p,
      lastSyncedAt: p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleString('pt-BR') : null,
      nextSyncAt: p.lastSyncedAt
        ? new Date(parseDate(p.lastSyncedAt).getTime() + p.syncFrequency * 1000).toLocaleString('pt-BR')
        : 'Nunca',
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Get properties error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/**
 * POST /api/gsc/properties?siteId=X
 * Register/sync a GSC property for site
 * Body: { propertyUrl, propertyType }
 */
router.post('/properties', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

    const { propertyUrl, propertyType } = req.body;
    if (!propertyUrl || !propertyType) {
      return res.status(400).json({ error: 'propertyUrl and propertyType required' });
    }

    // Check if already exists
    const existing = await db
      .select()
      .from(gscProperties)
      .where(and(eq(gscProperties.siteId, siteId), eq(gscProperties.propertyUrl, propertyUrl)));

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Property already synced' });
    }

    // Create new property (gcPropertyId would come from Google API, using URL for now)
    const [prop] = await db
      .insert(gscProperties)
      .values({
        siteId,
        propertyUrl,
        propertyType,
        gcPropertyId: propertyUrl, // Placeholder; should be fetched from Google API
        isActive: true,
      })
      .returning();

    res.status(201).json(prop);
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Failed to register property' });
  }
});

/**
 * DELETE /api/gsc/properties/:id?siteId=X
 * Unlink GSC property (soft delete)
 */
router.delete('/properties/:id', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propId = +(req.params.id as string);

    if (!siteId || !propId) return res.status(400).json({ error: 'siteId and id required' });

    const [prop] = await db
      .update(gscProperties)
      .set({ isActive: false, updatedAt: sql`datetime('now')` })
      .where(and(eq(gscProperties.id, propId), eq(gscProperties.siteId, siteId)))
      .returning();

    if (!prop) return res.status(404).json({ error: 'Property not found' });

    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// ── Data Sync ──────────────────────────────────────────────────────────────────

/**
 * POST /api/gsc/sync?siteId=X&propertyId=Y
 * Manually trigger data sync from Google Search Console
 */
router.post('/sync', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    // Get property
    const [prop] = await db.select().from(gscProperties).where(eq(gscProperties.id, propertyId));
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    // Get credentials
    const [cred] = await db.select().from(apiCredentials).where(eq(apiCredentials.siteId, siteId));
    if (!cred) return res.status(400).json({ error: 'No credentials configured' });

    // TODO: Fetch data from Google Search Console API
    // For now, this is a placeholder that would need to be implemented with google-search-console package or direct API calls
    // This would fetch queries and pages data for the last 90 days

    // Mark as synced
    await db
      .update(gscProperties)
      .set({ lastSyncedAt: sql`datetime('now')`, updatedAt: sql`datetime('now')` })
      .where(eq(gscProperties.id, propertyId));

    res.json({ synced: true, propertyId, message: 'Sync queued (implement Google API integration)' });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

/**
 * GET /api/gsc/sync-status?siteId=X
 * Check sync status for all properties
 */
router.get('/sync-status', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    if (!siteId || isNaN(siteId)) return res.status(400).json({ error: 'siteId required' });

    const props = await db.select().from(gscProperties).where(eq(gscProperties.siteId, siteId));

    const status = props.map((p) => ({
      propertyId: p.id,
      propertyUrl: p.propertyUrl,
      lastSyncedAt: p.lastSyncedAt,
      syncFrequency: p.syncFrequency,
      nextSyncAt: p.lastSyncedAt
        ? new Date(parseDate(p.lastSyncedAt).getTime() + p.syncFrequency * 1000).toISOString()
        : null,
    }));

    res.json(status);
  } catch (err) {
    console.error('Sync status error:', err);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// ── Query Analysis ─────────────────────────────────────────────────────────────

/**
 * GET /api/gsc/queries?siteId=X&propertyId=Y&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Returns top queries in date range with month-over-month changes
 */
router.get('/queries', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const dateFrom = (req.query.dateFrom as string) || formatDate(subtractMonths(new Date(), 1));
    const dateTo = (req.query.dateTo as string) || formatDate(new Date());
    const sort = (req.query.sort as string) || 'impressions';
    const order = (req.query.order as string) || 'desc';
    const limit = +(req.query.limit as string) || 50;

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    // Get current period metrics
    const currentMetrics = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          eq(gscMetrics.dimensionType, 'query'),
          gte(gscMetrics.date, dateFrom),
          lte(gscMetrics.date, dateTo)
        )
      );

    // Group by dimension value (query) and sum metrics
    const queryMap = new Map<string, { impressions: number; clicks: number; ctr: number; positions: number[] }>();

    for (const m of currentMetrics) {
      const key = m.dimensionValue;
      const existing = queryMap.get(key) || { impressions: 0, clicks: 0, ctr: 0, positions: [] };
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.positions.push(m.position);
      queryMap.set(key, existing);
    }

    // Calculate aggregates
    const queries = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
        position: data.positions.length > 0 ? data.positions.reduce((a, b) => a + b) / data.positions.length : 0,
      }))
      .sort((a, b) => {
        const aVal = a[sort as keyof typeof a] as number;
        const bVal = b[sort as keyof typeof b] as number;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      })
      .slice(0, limit);

    res.json(queries);
  } catch (err) {
    console.error('Get queries error:', err);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

/**
 * GET /api/gsc/query-history?siteId=X&propertyId=Y&query=SEARCH_TERM
 * Time series for single query
 */
router.get('/query-history', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const query = (req.query.query as string) || '';
    const days = +(req.query.days as string) || 30;

    if (!siteId || !propertyId || !query) {
      return res.status(400).json({ error: 'siteId, propertyId, and query required' });
    }

    const dateFrom = formatDate(subtractMonths(new Date(), Math.ceil(days / 30)));

    const metrics = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          eq(gscMetrics.dimensionType, 'query'),
          eq(gscMetrics.dimensionValue, query),
          gte(gscMetrics.date, dateFrom)
        )
      )
      .orderBy(asc(gscMetrics.date));

    const history = metrics.map((m) => ({
      date: m.date,
      impressions: m.impressions,
      clicks: m.clicks,
      ctr: m.ctr,
      position: m.position,
    }));

    res.json(history);
  } catch (err) {
    console.error('Get query history error:', err);
    res.status(500).json({ error: 'Failed to fetch query history' });
  }
});

// ── Page Analysis ──────────────────────────────────────────────────────────────

/**
 * GET /api/gsc/pages?siteId=X&propertyId=Y&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Returns top pages by impressions/clicks
 */
router.get('/pages', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const dateFrom = (req.query.dateFrom as string) || formatDate(subtractMonths(new Date(), 1));
    const dateTo = (req.query.dateTo as string) || formatDate(new Date());
    const sort = (req.query.sort as string) || 'impressions';
    const order = (req.query.order as string) || 'desc';
    const limit = +(req.query.limit as string) || 30;

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    // Get current period metrics
    const currentMetrics = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          eq(gscMetrics.dimensionType, 'page'),
          gte(gscMetrics.date, dateFrom),
          lte(gscMetrics.date, dateTo)
        )
      );

    // Group by page URL and sum metrics
    const pageMap = new Map<string, { impressions: number; clicks: number; ctr: number; positions: number[] }>();

    for (const m of currentMetrics) {
      const key = m.dimensionValue;
      const existing = pageMap.get(key) || { impressions: 0, clicks: 0, ctr: 0, positions: [] };
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.positions.push(m.position);
      pageMap.set(key, existing);
    }

    // Calculate aggregates
    const pages = Array.from(pageMap.entries())
      .map(([page, data]) => ({
        page,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        position: data.positions.length > 0 ? data.positions.reduce((a, b) => a + b) / data.positions.length : 0,
      }))
      .sort((a, b) => {
        const aVal = a[sort as keyof typeof a] as number;
        const bVal = b[sort as keyof typeof b] as number;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      })
      .slice(0, limit);

    res.json(pages);
  } catch (err) {
    console.error('Get pages error:', err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

/**
 * GET /api/gsc/page-queries?siteId=X&propertyId=Y&page=URL
 * Get top queries driving traffic to a specific page
 */
router.get('/page-queries', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const page = (req.query.page as string) || '';

    if (!siteId || !propertyId || !page) {
      return res.status(400).json({ error: 'siteId, propertyId, and page required' });
    }

    // This would require a join table tracking query→page mappings
    // For now, return empty (would need additional data structure)
    res.json([]);
  } catch (err) {
    console.error('Get page queries error:', err);
    res.status(500).json({ error: 'Failed to fetch page queries' });
  }
});

// ── Insights Generation ────────────────────────────────────────────────────────

/**
 * POST /api/gsc/insights/generate?siteId=X&propertyId=Y
 * Generate insights for a property
 */
router.post('/insights/generate', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    // Generate insights
    const insights = await generateGscInsights(siteId, propertyId);

    // Clear old insights and store new ones
    await db.delete(gscInsights).where(and(eq(gscInsights.siteId, siteId), eq(gscInsights.propertyId, propertyId)));

    for (const insight of insights) {
      await db.insert(gscInsights).values(insight);
    }

    res.json({ generatedCount: insights.length, insights });
  } catch (err) {
    console.error('Generate insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * GET /api/gsc/insights?siteId=X&propertyId=Y
 * Returns active (non-dismissed) insights
 */
router.get('/insights', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const type = (req.query.type as string) || '';

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    let query = db
      .select()
      .from(gscInsights)
      .where(
        and(
          eq(gscInsights.siteId, siteId),
          eq(gscInsights.propertyId, propertyId),
          eq(gscInsights.dismissedAt, null) // Only active insights
        )
      );

    if (type) {
      query = query.where(eq(gscInsights.insightType, type));
    }

    const insights = await query.orderBy(desc(gscInsights.generatedAt));

    // Parse metrics JSON
    const parsed = insights.map((i) => ({
      ...i,
      metrics: JSON.parse(i.metrics),
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get insights error:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/**
 * POST /api/gsc/insights/:id/dismiss?siteId=X
 * Mark insight as dismissed
 */
router.post('/insights/:id/dismiss', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const insightId = +(req.params.id as string);

    if (!siteId || !insightId) {
      return res.status(400).json({ error: 'siteId and id required' });
    }

    const [insight] = await db
      .update(gscInsights)
      .set({ dismissedAt: sql`datetime('now')` })
      .where(and(eq(gscInsights.id, insightId), eq(gscInsights.siteId, siteId)))
      .returning();

    if (!insight) return res.status(404).json({ error: 'Insight not found' });

    res.json({ dismissed: true });
  } catch (err) {
    console.error('Dismiss insight error:', err);
    res.status(500).json({ error: 'Failed to dismiss insight' });
  }
});

/**
 * POST /api/gsc/insights/:id/restore?siteId=X
 * Restore dismissed insight
 */
router.post('/insights/:id/restore', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const insightId = +(req.params.id as string);

    if (!siteId || !insightId) {
      return res.status(400).json({ error: 'siteId and id required' });
    }

    const [insight] = await db
      .update(gscInsights)
      .set({ dismissedAt: null })
      .where(and(eq(gscInsights.id, insightId), eq(gscInsights.siteId, siteId)))
      .returning();

    if (!insight) return res.status(404).json({ error: 'Insight not found' });

    res.json({ restored: true });
  } catch (err) {
    console.error('Restore insight error:', err);
    res.status(500).json({ error: 'Failed to restore insight' });
  }
});

// ── Summary & Analytics ────────────────────────────────────────────────────────

/**
 * GET /api/gsc/summary?siteId=X&propertyId=Y&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Summary metrics for date range
 */
router.get('/summary', async (req, res) => {
  try {
    const siteId = +(req.query.siteId as string);
    const propertyId = +(req.query.propertyId as string);
    const dateFrom = (req.query.dateFrom as string) || formatDate(subtractMonths(new Date(), 1));
    const dateTo = (req.query.dateTo as string) || formatDate(new Date());

    if (!siteId || !propertyId) {
      return res.status(400).json({ error: 'siteId and propertyId required' });
    }

    // Get all metrics in range
    const metrics = await db
      .select()
      .from(gscMetrics)
      .where(
        and(
          eq(gscMetrics.siteId, siteId),
          eq(gscMetrics.propertyId, propertyId),
          gte(gscMetrics.date, dateFrom),
          lte(gscMetrics.date, dateTo)
        )
      );

    const summary = {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      position: 0,
      queriesCount: new Set<string>(),
      pagesCount: new Set<string>(),
    };

    let totalPosition = 0;
    let positionCount = 0;

    for (const m of metrics) {
      summary.impressions += m.impressions;
      summary.clicks += m.clicks;
      if (m.dimensionType === 'query') {
        summary.queriesCount.add(m.dimensionValue);
      } else {
        summary.pagesCount.add(m.dimensionValue);
      }
      if (m.position > 0) {
        totalPosition += m.position;
        positionCount++;
      }
    }

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.position = positionCount > 0 ? totalPosition / positionCount : 0;

    res.json({
      impressions: summary.impressions,
      clicks: summary.clicks,
      ctr: parseFloat(summary.ctr.toFixed(2)),
      position: parseFloat(summary.position.toFixed(1)),
      uniqueQueries: summary.queriesCount.size,
      uniquePages: summary.pagesCount.size,
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
