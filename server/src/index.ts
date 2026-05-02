import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import sitesRouter from './routes/sites.js';
import channelsRouter from './routes/channels.js';
import performanceRouter from './routes/performance.js';
import budgetsRouter from './routes/budgets.js';
import fixedCostsRouter from './routes/fixedCosts.js';
import initiativesRouter from './routes/initiatives.js';
import goalsRouter from './routes/goals.js';
import dashboardRouter from './routes/dashboard.js';
import referenceItemsRouter from './routes/referenceItems.js';
import siteDataRouter from './routes/siteData.js';
import adsKpisRouter from './routes/adsKpis.js';
import linkedinPageRouter from './routes/linkedinPage.js';
import chartAnnotationsRouter from './routes/chartAnnotations.js';
import budgetItemsRouter from './routes/budgetItems.js';
import adsBudgetsRouter from './routes/adsBudgets.js';
import aiAnalysisRouter from './routes/aiAnalysis.js';
import abmProxyRouter from './routes/abmProxy.js';
import suppliersRouter from './routes/suppliers.js';
import ideasRouter from './routes/ideas.js';
import experimentsRouter from './routes/experiments.js';
import planScheduleRouter from './routes/planSchedule.js';
import dataMappingsRouter from './routes/dataMappings.js';
import initiativeMetaRouter from './routes/initiativeMeta.js';
import insightsRouter from './routes/insights.js';
import seedAlphatechRouter from './routes/seedAlphatech.js';
import funnelsRouter from './routes/funnels.js';
import utmsRouter from './routes/utms.js';
import gscRouter from './routes/gsc.js';
import unitEconomicsRouter from './routes/unitEconomics.js';
import growthLoopsRouter from './routes/growthLoops.js';
import gtmRouter from './routes/gtm.js';
import commercialMetricsRouter from './routes/commercialMetrics.js';
import commercialFunnelDailyRouter from './routes/commercialFunnelDaily.js';
import monthlySpendRouter from './routes/monthlySpend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/sites', sitesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/fixed-costs', fixedCostsRouter);
app.use('/api/initiatives', initiativesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/reference-items', referenceItemsRouter);
app.use('/api/site-data', siteDataRouter);
app.use('/api/ads-kpis', adsKpisRouter);
app.use('/api/linkedin-page', linkedinPageRouter);
app.use('/api/chart-annotations', chartAnnotationsRouter);
app.use('/api/budget-items', budgetItemsRouter);
app.use('/api/ads-budgets', adsBudgetsRouter);
app.use('/api/ai-analysis', aiAnalysisRouter);
app.use('/api/abm', abmProxyRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/experiments', experimentsRouter);
app.use('/api/plan-schedule', planScheduleRouter);
app.use('/api/data-mappings', dataMappingsRouter);
app.use('/api/initiative-meta', initiativeMetaRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/funnels', funnelsRouter);
app.use('/api/utms', utmsRouter);
app.use('/api/gsc', gscRouter);
app.use('/api/unit-economics', unitEconomicsRouter);
app.use('/api/growth-loops', growthLoopsRouter);
app.use('/api/gtm', gtmRouter);
app.use('/api/commercial-metrics', commercialMetricsRouter);
app.use('/api/commercial-funnel-daily', commercialFunnelDailyRouter);
app.use('/api/monthly-spend', monthlySpendRouter);
app.use('/api/seed/alphatech', seedAlphatechRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch unhandled errors from async route handlers (Express 4 doesn't do this automatically)
app.use((err: Error, _req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => {
  console.error('[route error]', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Serve static frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Marketing OS running on http://localhost:${PORT}`);
});
