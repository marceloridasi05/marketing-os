import { Router } from 'express';

const router = Router();

const ABM_BASE = process.env.ABM_API_URL || 'https://ip-tracker-production-73ef.up.railway.app';

async function proxyGet(path: string) {
  const res = await fetch(`${ABM_BASE}${path}`);
  if (!res.ok) throw new Error(`ABM API error: ${res.status}`);
  return res.json();
}

// GET /summary — aggregated data for dashboard widget
router.get('/summary', async (_req, res) => {
  try {
    const [stats, intelligence, targets] = await Promise.all([
      proxyGet('/api/stats'),
      proxyGet('/api/intelligence'),
      proxyGet('/api/abm/targets'),
    ]);

    const accounts = intelligence.accounts || [];
    const intStats = intelligence.stats || {};

    // Top accounts by visits (with data)
    const topAccounts = accounts
      .filter((a: Record<string, unknown>) => (a.total_visits as number || 0) > 0)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.total_visits as number) || 0) - ((a.total_visits as number) || 0))
      .slice(0, 10)
      .map((a: Record<string, unknown>) => ({
        name: a.company_name,
        visits: a.total_visits,
        sessions: a.unique_sessions,
        intent: a.intent_level,
        lastSeen: a.last_seen,
        pages: a.unique_pages,
        heatScore: a.final_heat_score || a.intent_score || 0,
        outboundScore: a.outbound_count || 0,
        accountStatus: a.account_status,
      }));

    // Linha de Chegada: targets with heat scores
    const targetList = targets.targets || [];
    const linhaDeChegada = targetList
      .filter((t: Record<string, unknown>) => (t.total_heat_score as number || 0) > 0 || (t.total_visits as number || 0) > 0)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.total_heat_score as number) || 0) - ((a.total_heat_score as number) || 0))
      .slice(0, 15)
      .map((t: Record<string, unknown>) => ({
        name: t.name,
        domain: t.domain,
        heatScore: t.total_heat_score || 0,
        abmScore: t.abm_score || 0,
        outboundScore: t.outbound_score || 0,
        visits: t.total_visits || 0,
        accountStatus: t.account_status,
      }));

    // Recent visits (last 20 identified)
    let recentVisits: Record<string, unknown>[] = [];
    try {
      const visitsRaw = await proxyGet('/api/visits?limit=100');
      const identified = (visitsRaw as Record<string, unknown>[])
        .filter((v) => v.company || v.inferred_company || v.matched_target_company)
        .slice(0, 15);
      recentVisits = identified.map((v) => ({
        company: v.company || v.inferred_company || v.matched_target_company,
        page: v.page_path || v.page,
        source: v.utm_source || v.first_touch_source || 'direct',
        timestamp: v.timestamp,
        intent: v.buying_intent_level,
        confidence: v.confidence_level,
      }));
    } catch { /* ignore */ }

    res.json({
      stats: {
        totalVisits: stats.total_visits || 0,
        identifiedLogos: stats.identified_logos || 0,
        estimatedLogos: stats.estimated_logos || 0,
        totalLogoReach: stats.total_logo_reach || 0,
        corporateVisits: stats.corporate_visits || 0,
        icpInferredLogos: stats.icp_inferred_logos || 0,
        lastVisit: stats.last_visit,
      },
      intelligence: {
        totalAccounts: intStats.total_accounts || 0,
        onFire: intStats.on_fire || 0,
        hot: intStats.hot || 0,
        warm: intStats.warm || 0,
        cold: intStats.cold || 0,
        identityConfirmed: intStats.identity_confirmed || 0,
      },
      targets: {
        total: targets.summary?.total || 0,
        manualTargets: targets.summary?.manual_targets || 0,
        detected: targets.summary?.detected || 0,
      },
      topAccounts,
      linhaDeChegada,
      recentVisits,
      abmUrl: ABM_BASE,
    });
  } catch (err) {
    console.error('ABM proxy error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
