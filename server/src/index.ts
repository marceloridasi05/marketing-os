import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
