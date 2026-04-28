# Growth Loops Engine - Technical Implementation Reference

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Core Calculation Library](#core-calculation-library)
4. [Insights Detection System](#insights-detection-system)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Integration Points](#integration-points)
8. [Deployment & Monitoring](#deployment--monitoring)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React)                        │
│  GrowthLoopsPage │ GrowthLoopsConfig │ GrowthLoopWidget │
└────────────────┬────────────────────────────────────────┘
                 │ REST API
┌────────────────┴────────────────────────────────────────┐
│              Express Routes Layer                        │
│         /api/growth-loops  /api/unit-economics          │
│         /api/utms/campaigns-by-loop                     │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│            Business Logic Layer                          │
│  growthLoops.ts (calculations)                          │
│  growthLoopInsights.ts (anomaly detection)              │
│  attributionModels.ts (attribution)                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│           Data Access Layer (Drizzle ORM)               │
│  5 Core Tables:                                          │
│  - growth_loops (loop definitions)                       │
│  - growth_loop_metrics (period data)                     │
│  - growth_loop_stages (stage breakdown)                  │
│  - growth_loop_insights (anomalies)                      │
│  - growth_loop_attributions (campaign links)            │
└────────────────┬────────────────────────────────────────┘
                 │
           ┌─────┴─────┐
           │  SQLite   │
           │  Database │
           └───────────┘
```

### Data Flow

**Creation Flow**:
1. User fills form in `GrowthLoopsConfig.tsx`
2. POST /api/growth-loops with loop definition
3. `growthLoops.ts` route creates record in `growth_loops` table
4. Returns loopId + empty metrics

**Metrics Flow**:
1. Campaign data syncs from Google Ads, Facebook, etc.
2. `growthLoops.ts` calculates metrics based on linked campaigns
3. Stores in `growth_loop_metrics` table (daily/weekly/monthly)
4. `growthLoopInsights.ts` detects anomalies
5. Stores insights in `growth_loop_insights` table
6. Frontend fetches and displays

**Attribution Flow**:
1. User creates attribution (link campaign → loop)
2. Stored in `growth_loop_attributions` table
3. `calculateLoopCAC()` queries attributions to find campaign costs
4. CAC calculated as: (campaign cost × attribution weight) / (conversions from that campaign)

---

## Database Schema

### Table 1: growth_loops
**Purpose**: Define growth loops (configuration + status)

```typescript
export const growthLoops = sqliteTable('growth_loops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  
  // Basic info
  name: text('name').notNull(), // "Email Referral"
  description: text('description'), // Optional longer description
  type: text('type').notNull(), // 'paid'|'viral'|'content'|'sales'|'abm'|'event'|'product'
  
  // Loop stages configuration
  inputType: text('input_type').notNull(), // 'traffic'|'leads'|'users'|'accounts'
  actionType: text('action_type').notNull(), // 'click'|'signup'|'demo_request'|'invite'|'purchase'|'trial_start'
  outputMetricKey: text('output_metric_key').notNull(), // 'conversions'|'revenue'|'new_users'|'subscriptions'
  
  // Target metrics (reference values)
  targetCac: real('target_cac'), // $100
  targetLtv: real('target_ltv'), // $500
  targetPaybackMonths: integer('target_payback_months'), // 12
  targetCycleHours: integer('target_cycle_hours'), // 24
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isPriority: integer('is_priority', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX growth_loops_site_idx ON growth_loops(site_id);
CREATE INDEX growth_loops_type_idx ON growth_loops(type);
```

**Usage**:
- CRUD operations: Create, retrieve, list, update, soft-delete loops
- Filtering: By siteId, type, status, priority
- Sorting: By name, created date, updated date

---

### Table 2: growth_loop_metrics
**Purpose**: Period-based metrics (daily/weekly/monthly aggregations)

```typescript
export const growthLoopMetrics = sqliteTable('growth_loop_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  
  // Period
  periodStart: text('period_start').notNull(), // '2026-04-01'
  periodEnd: text('period_end').notNull(), // '2026-04-30'
  periodType: text('period_type').default('monthly'), // 'daily'|'weekly'|'monthly'
  
  // Stage metrics (raw counts)
  inputVolume: integer('input_volume').default(0), // 5000
  actionCount: integer('action_count').default(0), // 2500
  outputCount: integer('output_count').default(0), // 750
  reinvestmentAmount: real('reinvestment_amount').default(0), // $2500
  
  // Revenue data
  outputRevenue: real('output_revenue').default(0), // $75000 (from conversions)
  
  // Conversion rates (derived)
  inputToActionRate: real('input_to_action_rate').default(0), // 0.50 = 50%
  actionToOutputRate: real('action_to_output_rate').default(0), // 0.30 = 30%
  
  // Efficiency metrics (calculated)
  cac: real('cac').default(0), // $133 = cost / output
  ltv: real('ltv').default(0), // $450 = revenue / output
  ltvCacRatio: real('ltv_cac_ratio').default(0), // 3.38
  paybackMonths: real('payback_months').default(0), // 4.2
  cycleTimeHours: integer('cycle_time_hours'), // 24 = time from input to output
  
  // Growth metrics (trend)
  volumeGrowthPercent: real('volume_growth_percent').default(0), // 0.25 = +25% MoM
  cacTrendPercent: real('cac_trend_percent').default(0), // -0.15 = -15% improving
  conversionTrendPercent: real('conversion_trend_percent').default(0), // 0.10 = +10%
  
  // Health scoring
  healthScore: real('health_score').default(50), // 0-100
  healthStatus: text('health_status').default('warning'), // 'healthy'|'warning'|'critical'
  strengthLevel: text('strength_level').default('medium'), // 'weak'|'medium'|'strong'
  isSelfSustaining: integer('is_self_sustaining', { mode: 'boolean' }).default(false),
  
  // Bottleneck detection
  bottleneckStage: text('bottleneck_stage'), // 'input_to_action'|'action_to_output'
  bottleneckSeverity: text('bottleneck_severity'), // 'warning'|'critical'
  
  // Timestamps
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX growth_loop_metrics_site_loop_period_idx 
  ON growth_loop_metrics(site_id, loop_id, period_start);
```

**Usage**:
- Store calculated metrics for each period
- Trend analysis: Compare month-over-month
- Charts: Display time-series data
- Alerts: Trigger insights based on thresholds

---

### Table 3: growth_loop_stages
**Purpose**: Stage-by-stage breakdown (input, action, output, reinvestment)

```typescript
export const growthLoopStages = sqliteTable('growth_loop_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  
  // Stage identifier
  stageName: text('stage_name').notNull(), // 'input'|'action'|'output'|'reinvestment'
  
  // Period
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  
  // Stage-specific metrics
  stageCount: integer('stage_count').default(0), // e.g., 5000 for input
  stageRevenue: real('stage_revenue').default(0), // $0 for input, $75k for output
  stageCost: real('stage_cost').default(0), // Cost to execute stage
  
  // Conversion & timing
  conversionRate: real('conversion_rate').default(0), // 0.50 = 50% convert to next stage
  timeInStage: integer('time_in_stage').default(0), // Hours spent in stage
  
  // Quality metrics
  qualityScore: real('quality_score').default(50), // 0-100
  dropOffRate: real('drop_off_rate').default(0), // % leaving at this stage
  
  // Timestamps
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX growth_loop_stages_site_loop_period_idx 
  ON growth_loop_stages(site_id, loop_id, period_start);
```

**Usage**:
- Visualize stage-by-stage flow
- Identify bottlenecks at specific stages
- Calculate time-to-value
- Cost allocation by stage

---

### Table 4: growth_loop_insights
**Purpose**: Detected anomalies, bottlenecks, and recommendations

```typescript
export const growthLoopInsights = sqliteTable('growth_loop_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  
  // Insight type & severity
  insightType: text('insight_type').notNull(), 
    // 'bottleneck'|'degradation'|'scalability'|'sustainability'|'acceleration'
  severity: text('severity').notNull(), // 'critical'|'warning'|'info'
  
  // Content
  title: text('title').notNull(), // "Email Loop - CAC Rising"
  description: text('description').notNull(), // Full explanation
  
  // Metrics involved
  metric: text('metric'), // 'cac'|'ltv'|'conversion'|'growth'
  currentValue: real('current_value'),
  previousValue: real('previous_value'),
  delta: real('delta'), // Change % or absolute
  
  // Suggested actions (JSON array)
  suggestedActions: text('suggested_actions'), // JSON: [{ title, description, priority, metricsToMonitor }]
  scalabilityPotential: real('scalability_potential'), // 2.0-10.0x multiplier
  
  // Status
  dismissedAt: text('dismissed_at'), // NULL = active
  resolvedAt: text('resolved_at'), // NULL = unresolved
  
  // Timestamps
  generatedAt: text('generated_at').default(sql`(datetime('now'))`).notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX growth_loop_insights_site_loop_idx 
  ON growth_loop_insights(site_id, loop_id);
CREATE INDEX growth_loop_insights_type_severity_idx 
  ON growth_loop_insights(insight_type, severity);
```

**Usage**:
- Detect anomalies (bottlenecks, degradation, etc.)
- Provide actionable recommendations
- Track insight acknowledgment (dismiss/resolve)
- Historical audit trail

---

### Table 5: growth_loop_attributions
**Purpose**: Link loops to campaigns/channels and define CAC/LTV sources

```typescript
export const growthLoopAttributions = sqliteTable('growth_loop_attributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteId: integer('site_id').notNull().references(() => sites.id),
  loopId: integer('loop_id').notNull().references(() => growthLoops.id),
  
  // Links to existing systems
  utmCampaignId: integer('utm_campaign_id').references(() => utmCampaigns.id),
  channelId: integer('channel_id').references(() => channels.id),
  funnelStageId: text('funnel_stage_id'), // e.g., 'awareness', 'conversion'
  
  // Data sources
  cacSource: text('cac_source').default('calculated'), 
    // 'utm_attribution'|'calculated'|'custom'
  ltvSource: text('ltv_source').default('calculated'),
    // 'utm_attribution'|'calculated'|'crmdriven'|'custom'
  
  // Attribution config
  attributionWindow: integer('attribution_window').default(30), // Days
  attributionModel: text('attribution_model').default('last_touch'),
    // 'first_touch'|'last_touch'|'linear'|'time_decay'
  
  // Weight (for multi-source loops)
  attributionWeight: real('attribution_weight').default(1.0), // 0-1, sum=1.0
  
  // Timestamps
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX growth_loop_attributions_loop_idx 
  ON growth_loop_attributions(loop_id);
CREATE INDEX growth_loop_attributions_campaign_idx 
  ON growth_loop_attributions(utm_campaign_id);
```

**Usage**:
- Link loops to campaigns for CAC/LTV calculation
- Support multi-source attribution (weighted)
- Track attribution methodology per loop
- Enable campaign-level performance analysis

---

## Core Calculation Library

**File**: `/server/src/lib/growthLoops.ts` (~700 lines)

### Type Definitions

```typescript
interface LoopCAC {
  cac: number; // Customer Acquisition Cost
  confidence: 'high' | 'medium' | 'low'; // Based on data quality
  dataPoints: number; // N of conversions used
  sourceCost: number; // Total cost attributed
}

interface LoopLTV {
  ltv: number; // Lifetime Value
  method: 'simple' | 'churn_based' | 'crmdriven';
  monthlyARPU?: number;
  monthlyChurnRate?: number;
  projectedLifespan?: number; // Months
}

interface LoopConversion {
  inputVolume: number;
  actionCount: number;
  outputCount: number;
  inputToAction: number; // %
  actionToOutput: number; // %
  overall: number; // %
}

interface LoopSpeed {
  cycleTimeHours: number; // Time from input to output
  avgTimePerStage: Record<string, number>;
  trend: 'accelerating' | 'stable' | 'degrading';
}

interface LoopHealth {
  score: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
  ltvCacRatio: number;
  paybackMonths: number;
  conversionRate: number;
  growthRate: number;
}

interface BottleneckDetection {
  hasBottleneck: boolean;
  affectedStage: 'input_to_action' | 'action_to_output';
  severity: 'warning' | 'critical';
  currentRate: number;
  benchmarkRate: number;
  delta: number; // Percentage points below benchmark
}
```

### CAC Calculation

```typescript
export async function calculateLoopCAC(
  loopId: number,
  siteId: number,
  period?: string
): Promise<LoopCAC> {
  // 1. Get loop definition
  const loop = await db.select().from(growthLoops).where(eq(growthLoops.id, loopId)).get();
  
  // 2. Get attributions (campaigns linked to this loop)
  const attributions = await db.select()
    .from(growthLoopAttributions)
    .where(eq(growthLoopAttributions.loopId, loopId));
  
  // 3. For each attribution, get campaign costs
  let totalCost = 0;
  let totalConversions = 0;
  
  for (const attr of attributions) {
    // Get campaign spend from utmCacAnalysis or performanceEntries
    const campaignCost = await queryCampaignCost(
      attr.utmCampaignId,
      attr.channelId,
      siteId,
      period
    );
    
    // Get conversions attributed to this campaign
    const conversions = await queryCampaignConversions(
      attr.utmCampaignId,
      siteId,
      period,
      attr.attributionModel
    );
    
    // Weight by attribution weight
    totalCost += campaignCost * attr.attributionWeight;
    totalConversions += conversions * attr.attributionWeight;
  }
  
  // 4. Calculate CAC
  const cac = totalConversions > 0 ? totalCost / totalConversions : 0;
  
  // 5. Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (totalConversions < 5) confidence = 'low'; // Too few data points
  else if (totalConversions < 20) confidence = 'medium';
  
  return {
    cac,
    confidence,
    dataPoints: totalConversions,
    sourceCost: totalCost,
  };
}
```

### LTV Calculation (3 Methods)

```typescript
export function calculateLoopLTV(
  config: LoopLTVConfig,
  outputCount: number,
  outputRevenue: number
): LoopLTV {
  // Method 1: Simple (e-commerce, products)
  if (config.method === 'simple') {
    const avgOrderValue = outputRevenue / outputCount;
    const ltv = avgOrderValue * (config.multiplier || 3);
    return { ltv, method: 'simple' };
  }
  
  // Method 2: Churn-based (SaaS, subscriptions)
  if (config.method === 'churn_based') {
    const monthlyARPU = config.monthlyARPU || (outputRevenue / outputCount) / 12;
    const churnRate = config.monthlyChurnRate || 0.05;
    const margin = config.grossMarginPercent || 0.7;
    const ltv = (monthlyARPU * margin) / churnRate;
    return { 
      ltv, 
      method: 'churn_based',
      monthlyARPU,
      monthlyChurnRate: churnRate,
      projectedLifespan: Math.round(1 / churnRate), // Months
    };
  }
  
  // Method 3: CRM-driven (actual observed lifetime revenue)
  if (config.method === 'crmdriven') {
    const ltv = outputRevenue / outputCount;
    return { ltv, method: 'crmdriven' };
  }
  
  return { ltv: 0, method: 'simple' };
}
```

### LTV/CAC Ratio Analysis

```typescript
export function calculateLTVCACRatio(ltv: number, cac: number): {
  ratio: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  healthScore: number;
} {
  const ratio = cac > 0 ? ltv / cac : 0;
  
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (ratio < 2.0) healthStatus = 'critical';
  else if (ratio < 2.5) healthStatus = 'warning';
  
  // Health score: normalized 0-100
  // Score = (Ratio - 1) / 2 × 100, capped at 100
  const healthScore = Math.min((ratio - 1) / 2 * 100, 100);
  
  return { ratio, healthStatus, healthScore };
}
```

### Payback Period

```typescript
export function calculatePaybackPeriod(
  cac: number,
  monthlyRevenuePerCustomer: number,
  monthlyChurnRate: number = 0
): number {
  // Payback = CAC / (Monthly Revenue × (1 - Churn))
  const netMonthlyRevenue = monthlyRevenuePerCustomer * (1 - monthlyChurnRate);
  const paybackMonths = netMonthlyRevenue > 0 
    ? cac / netMonthlyRevenue 
    : Infinity;
  
  return paybackMonths;
}
```

### Health Score Calculation

```typescript
export function calculateLoopHealthScore(
  ltvCacRatio: number,
  paybackMonths: number,
  conversionRate: number,
  growthRate: number
): number {
  // Components (weights)
  const ratioScore = calculateLTVCACRatio(ltvCacRatio, 1).healthScore; // 40%
  
  const paybackScore = paybackMonths <= 12 ? 100 : 
                       paybackMonths <= 18 ? 50 : 0; // 30%
  
  const conversionScore = Math.min(conversionRate * 500, 100); // 20%
  
  const growthScore = Math.min(growthRate * 400, 100); // 10%
  
  // Weighted average
  const health = (ratioScore * 0.4) + 
                 (paybackScore * 0.3) + 
                 (conversionScore * 0.2) + 
                 (growthScore * 0.1);
  
  return Math.round(health);
}
```

### Bottleneck Detection

```typescript
export function detectBottleneck(
  inputToActionRate: number,
  actionToOutputRate: number,
  loopType: string
): BottleneckDetection | null {
  // Benchmarks by loop type
  const benchmarks = {
    'paid': { inputToAction: 0.05, actionToOutput: 0.10 },
    'viral': { inputToAction: 0.40, actionToOutput: 0.30 },
    'content': { inputToAction: 0.02, actionToOutput: 0.15 },
    'sales': { inputToAction: 0.10, actionToOutput: 0.20 },
    'abm': { inputToAction: 0.05, actionToOutput: 0.25 },
    'event': { inputToAction: 0.20, actionToOutput: 0.40 },
    'product': { inputToAction: 0.50, actionToOutput: 0.30 },
  };
  
  const benchmark = benchmarks[loopType] || benchmarks['paid'];
  
  // Check input→action
  if (inputToActionRate < benchmark.inputToAction * 0.5) {
    return {
      hasBottleneck: true,
      affectedStage: 'input_to_action',
      severity: inputToActionRate < benchmark.inputToAction * 0.25 ? 'critical' : 'warning',
      currentRate: inputToActionRate,
      benchmarkRate: benchmark.inputToAction,
      delta: (inputToActionRate - benchmark.inputToAction) / benchmark.inputToAction,
    };
  }
  
  // Check action→output (more critical)
  if (actionToOutputRate < benchmark.actionToOutput * 0.5) {
    return {
      hasBottleneck: true,
      affectedStage: 'action_to_output',
      severity: actionToOutputRate < benchmark.actionToOutput * 0.25 ? 'critical' : 'warning',
      currentRate: actionToOutputRate,
      benchmarkRate: benchmark.actionToOutput,
      delta: (actionToOutputRate - benchmark.actionToOutput) / benchmark.actionToOutput,
    };
  }
  
  return null;
}
```

### Self-Sustaining Detection

```typescript
export function isSelfSustaining(
  ltv: number,
  cac: number,
  paybackMonths: number,
  reinvestmentPercent: number
): boolean {
  // All criteria must be met
  const ratioHealthy = ltv / cac > 2.0; // LTV > 2× CAC
  const paybackHealthy = paybackMonths < 18; // Quick payback
  const reinvestmentHealthy = reinvestmentPercent > 0.15; // 15%+ reinvested
  
  return ratioHealthy && paybackHealthy && reinvestmentHealthy;
}
```

---

## Insights Detection System

**File**: `/server/src/lib/growthLoopInsights.ts` (~600 lines)

### Main Generator Function

```typescript
export async function generateGrowthLoopInsights(
  siteId: number,
  loopId?: number
): Promise<GrowthLoopInsight[]> {
  const insights: GrowthLoopInsight[] = [];
  
  // Get loops to analyze
  let loops = await db.select()
    .from(growthLoops)
    .where(eq(growthLoops.siteId, siteId));
  
  if (loopId) {
    loops = loops.filter(l => l.id === loopId);
  }
  
  for (const loop of loops) {
    // Get current and previous period metrics
    const current = await getLatestMetrics(loop.id, siteId);
    const previous = await getPreviousMetrics(loop.id, siteId);
    
    // Run all 5 detectors
    insights.push(...detectBottlenecks(current, loop.type));
    insights.push(...detectDegradation(current, previous));
    insights.push(...detectScalability(current));
    insights.push(...detectUnsustainability(current));
    insights.push(...detectAcceleration(current, previous));
  }
  
  // Sort by severity, then date
  insights.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Save to database
  for (const insight of insights) {
    await db.insert(growthLoopInsights).values({
      siteId,
      loopId: insight.loopId,
      insightType: insight.insightType,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      metric: insight.metric,
      currentValue: insight.currentValue,
      previousValue: insight.previousValue,
      delta: insight.delta,
      suggestedActions: JSON.stringify(insight.suggestedActions),
      scalabilityPotential: insight.scalabilityPotential,
      generatedAt: new Date().toISOString(),
    });
  }
  
  return insights;
}
```

### 5 Insight Detectors

#### 1. Bottleneck Detection
```typescript
function detectBottlenecks(
  metrics: LoopMetrics,
  loopType: string
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];
  
  const bottleneck = detectBottleneck(
    metrics.inputToActionRate,
    metrics.actionToOutputRate,
    loopType
  );
  
  if (bottleneck?.hasBottleneck) {
    insights.push({
      insightType: 'bottleneck',
      severity: bottleneck.severity,
      title: `${metrics.loopName} - ${bottleneck.affectedStage} Bottleneck`,
      description: `Conversion rate is ${Math.round(bottleneck.delta * 100)}% below benchmark...`,
      metric: bottleneck.affectedStage,
      currentValue: bottleneck.currentRate,
      previousValue: bottleneck.benchmarkRate,
      delta: bottleneck.delta,
      suggestedActions: [
        bottleneck.affectedStage === 'input_to_action'
          ? { title: 'Improve targeting/audience quality', priority: 'high' }
          : { title: 'Optimize landing page/form', priority: 'high' },
      ],
    });
  }
  
  return insights;
}
```

#### 2. Degradation Detection
```typescript
function detectDegradation(
  current: LoopMetrics,
  previous: LoopMetrics
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];
  
  const cacDelta = (current.cac - previous.cac) / previous.cac;
  const convDelta = (current.inputToActionRate - previous.inputToActionRate) / previous.inputToActionRate;
  const cycleDelta = (current.cycleTimeHours - previous.cycleTimeHours) / previous.cycleTimeHours;
  
  if (cacDelta > 0.05 || convDelta < -0.10 || cycleDelta > 0.20) {
    insights.push({
      insightType: 'degradation',
      severity: cacDelta > 0.10 ? 'critical' : 'warning',
      title: `${current.loopName} - Efficiency Degrading`,
      description: `CAC +${Math.round(cacDelta*100)}%, Conversion ${Math.round(convDelta*100)}%...`,
      suggestedActions: [
        { title: 'Audit recent changes (creative, targeting)', priority: 'high' },
        { title: 'Test A/B variants', priority: 'high' },
        { title: 'Check list/audience fatigue', priority: 'medium' },
      ],
    });
  }
  
  return insights;
}
```

#### 3. Scalability Detection
```typescript
function detectScalability(metrics: LoopMetrics): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];
  
  // Healthy + Growing = Scalable
  if (metrics.healthScore >= 70 && metrics.volumeGrowthPercent >= 0.20) {
    // Calculate potential multiplier based on health + growth
    const potentialMultiplier = 3 + (metrics.healthScore / 100) * 7; // 3-10x
    
    insights.push({
      insightType: 'scalability',
      severity: 'info',
      title: `${metrics.loopName} - Scaling Opportunity Detected`,
      description: `Health ${metrics.healthScore}/100, Growth +${Math.round(metrics.volumeGrowthPercent*100)}%...`,
      scalabilityPotential: potentialMultiplier,
      suggestedActions: [
        { title: 'Increase budget allocation', priority: 'high' },
        { title: 'Expand to new segments', priority: 'high' },
        { title: 'Build infrastructure for growth', priority: 'medium' },
      ],
    });
  }
  
  return insights;
}
```

#### 4. Unsustainability Detection
```typescript
function detectUnsustainability(metrics: LoopMetrics): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];
  
  const ratio = metrics.ltvCacRatio;
  const payback = metrics.paybackMonths;
  
  // Multiple failure modes
  if (ratio < 2.0 && payback > 18) {
    insights.push({
      insightType: 'sustainability',
      severity: 'critical',
      title: `${metrics.loopName} - Unsustainable Economics`,
      description: `LTV/CAC ${ratio.toFixed(1)}:1 (target 3:1), Payback ${payback.toFixed(0)} months...`,
      suggestedActions: [
        { title: 'Reduce CAC immediately', priority: 'critical' },
        { title: 'Improve LTV through upsells/retention', priority: 'critical' },
        { title: 'Consider pausing loop', priority: 'high', if: 'no improvement in 2 weeks' },
      ],
    });
  }
  
  return insights;
}
```

#### 5. Acceleration Detection
```typescript
function detectAcceleration(
  current: LoopMetrics,
  previous: LoopMetrics
): GrowthLoopInsight[] {
  const insights: GrowthLoopInsight[] = [];
  
  const cacImproving = current.cac < previous.cac * 0.85; // CAC down 15%+
  const convImproving = current.inputToActionRate > previous.inputToActionRate * 1.15; // Conv up 15%+
  const volumeGrowing = current.volumeGrowthPercent > 0.30; // Volume up 30%+
  
  if (cacImproving && convImproving && volumeGrowing) {
    insights.push({
      insightType: 'acceleration',
      severity: 'info',
      title: `${current.loopName} - Inflection Point Detected`,
      description: `Loop entering exponential growth: CAC down, conversion up, volume surging...`,
      suggestedActions: [
        { title: 'Double down immediately', priority: 'critical' },
        { title: 'Scale budget + team', priority: 'high' },
        { title: 'Prepare infrastructure', priority: 'high' },
      ],
    });
  }
  
  return insights;
}
```

---

## API Reference

### GET /api/growth-loops
**Purpose**: List all loops for a site

```typescript
// Request
GET /api/growth-loops?siteId=1

// Response
{
  success: true,
  data: [
    {
      id: 1,
      name: "Email Referral",
      type: "viral",
      healthScore: 85,
      isActive: true,
      ...
    }
  ],
  summary: {
    totalLoops: 5,
    activeLoops: 4,
    priorityLoops: 2
  }
}
```

### POST /api/growth-loops
**Purpose**: Create new loop

```typescript
// Request
POST /api/growth-loops?siteId=1
{
  name: "Email Referral",
  type: "viral",
  inputType: "leads",
  actionType: "invite",
  outputMetricKey: "new_users",
  targetCac: 50,
  targetLtv: 500,
  targetPaybackMonths: 8,
  targetCycleHours: 24
}

// Response
{
  success: true,
  data: {
    id: 1,
    ...
  }
}
```

### GET /api/growth-loops/:id
**Purpose**: Get specific loop details

### PUT /api/growth-loops/:id
**Purpose**: Update loop

### DELETE /api/growth-loops/:id
**Purpose**: Soft delete loop

### GET /api/growth-loops/metrics/:loopId
**Purpose**: Get period metrics

```typescript
GET /api/growth-loops/metrics/1?siteId=1&period=2026-04

{
  success: true,
  data: {
    loopId: 1,
    period: "2026-04",
    inputVolume: 5000,
    actionCount: 2500,
    outputCount: 750,
    cac: 133.33,
    ltv: 450,
    ltvCacRatio: 3.38,
    paybackMonths: 4.2,
    healthScore: 88,
    strengthLevel: "strong"
  }
}
```

### GET /api/growth-loops/insights
**Purpose**: Get loop insights

```typescript
GET /api/growth-loops/insights?siteId=1&type=bottleneck

{
  success: true,
  data: [
    {
      id: 10,
      loopId: 1,
      insightType: "bottleneck",
      severity: "warning",
      title: "Email Loop - Bottleneck Detected",
      description: "...",
      suggestedActions: [...]
    }
  ]
}
```

### GET /api/unit-economics/by-loop
**Purpose**: Get unit economics aggregated by loop

```typescript
GET /api/unit-economics/by-loop?siteId=1

{
  success: true,
  data: [
    {
      loopId: 1,
      loopName: "Email Referral",
      recommendedLtv: 450,
      avgCac: 133,
      avgPaybackMonths: 4.2,
      healthScore: 88,
      channels: [...]
    }
  ],
  summary: {
    loopCount: 2,
    averageHealthScore: 82,
    healthyLoops: 1,
    warningLoops: 1,
    criticalLoops: 0
  }
}
```

### GET /api/utms/campaigns-by-loop
**Purpose**: Get campaigns grouped by loop

### GET /api/utms/campaign/:id/loop-impact
**Purpose**: Get loop impact for campaign

---

## Frontend Components

### GrowthLoopsPage.tsx
**Location**: `/client/src/pages/GrowthLoops.tsx`
**Purpose**: Main dashboard (4 tabs)

**Tabs**:
1. Overview - Loop cards with key metrics
2. Details - Single loop deep dive
3. Insights - Anomaly cards with actions
4. Matrix - Health vs Scalability visualization

**Key Props**:
- `selectedSite` - Current site (from context)

**State**:
- `loops` - Array of loop objects
- `selectedLoop` - Currently viewing loop
- `insights` - Array of insights
- `activeTab` - Current tab

**API Calls**:
- `GET /api/growth-loops?siteId=X`
- `GET /api/growth-loops/metrics/X?siteId=Y`
- `GET /api/growth-loops/insights?siteId=X`

### GrowthLoopsConfig.tsx
**Location**: `/client/src/pages/GrowthLoopsConfig.tsx`
**Purpose**: Create & edit loops

**Form Fields**:
- name (text)
- type (dropdown)
- inputType (dropdown)
- actionType (dropdown)
- outputMetricKey (dropdown)
- targetCac, targetLtv, targetPaybackMonths (inputs)

**API Calls**:
- `POST /api/growth-loops` (create)
- `PUT /api/growth-loops/:id` (update)
- `GET /api/growth-loops/:id` (pre-fill edit)

### GrowthLoopWidget.tsx
**Location**: `/client/src/components/GrowthLoopWidget.tsx`
**Purpose**: Dashboard summary widget

**Displays**:
- Top 3 loops
- Health scores
- Active insights count
- Quick action buttons

**API Calls**:
- `GET /api/growth-loops?siteId=X&limit=3`
- `GET /api/growth-loops/insights?siteId=X`

---

## Integration Points

### 1. Funnel Models (/server/src/lib/funnelModels.ts)
Added loop metrics to all 5 preset models:

```typescript
// AIDA Model - Interest stage
interest: [
  'loop_input_volume',
  'loop_action_count',
  'loop_action_conversion_rate',
  ...
]
```

### 2. Unit Economics Integration
`GET /api/unit-economics/by-loop` aggregates CAC/LTV/payback per loop

### 3. Attribution Integration
`GET /api/utms/campaigns-by-loop` shows campaigns → loops mapping

### 4. Dashboard Integration
`<GrowthLoopWidget />` displays on main dashboard (section 3.7)

---

## Deployment & Monitoring

### Build & Deploy
```bash
# Build frontend
cd client && npm run build

# Build backend
cd server && npm run build

# Deploy to production
npm run deploy
```

### Monitoring
- **Error Rate**: Track POST/PUT failures (should be <1%)
- **Metrics Accuracy**: Spot-check CAC/LTV calculations monthly
- **Insight Frequency**: 5-10 insights per site per month is healthy
- **Performance**: API response time < 500ms

### Common Issues
1. **CAC not calculating**: Check if campaigns linked to loop
2. **Insights not generating**: Verify metrics have data
3. **Health score fluctuating**: Normal with small sample sizes

---

**Last Updated**: 2026-04-28  
**Version**: 1.0  
**Status**: Production Ready
