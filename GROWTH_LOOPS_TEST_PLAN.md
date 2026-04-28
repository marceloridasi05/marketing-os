# Growth Loops Engine - Comprehensive Test Plan

## Overview
This document outlines 60+ test cases for the Growth Loops Engine module, covering:
- Database integrity (schema, migrations, constraints)
- Core calculations (CAC, LTV, payback, churn, health score)
- Insight detection (all 5 insight types)
- API endpoints (CRUD, metrics, insights)
- Frontend UI (page layouts, data display, interactions)
- Integration points (funnel models, unit economics, attribution, dashboard)
- End-to-end scenarios (multi-loop workflows)

---

## Part 1: Database & Schema Tests (8 tests)

### DB-1: Table Creation
**Objective**: Verify all 5 growth loop tables exist with correct schema
- [ ] `growth_loops` table exists with all 14 fields (id, siteId, name, type, etc.)
- [ ] `growth_loop_metrics` table exists with period-based data (inputVolume, actionCount, etc.)
- [ ] `growth_loop_stages` table exists with stage-by-stage tracking
- [ ] `growth_loop_insights` table exists with insightType, severity, suggestedActions
- [ ] `growth_loop_attributions` table exists with loop-to-channel/campaign links

**Test Steps**:
1. Connect to database (SQLite)
2. Run `SELECT name FROM sqlite_master WHERE type='table'` for each table
3. Run `PRAGMA table_info(growth_loops)` for each table to verify columns

**Expected Result**: All 5 tables present with correct column names and types

---

### DB-2: Index Creation
**Objective**: Verify all 5 indexes exist for query performance
- [ ] `growth_loop_metrics_site_loop_period_idx` index exists
- [ ] `growth_loop_stages_site_loop_period_idx` index exists
- [ ] `growth_loop_insights_site_loop_idx` index exists
- [ ] `growth_loop_insights_type_severity_idx` index exists
- [ ] `growth_loop_attributions_loop_idx` index exists

**Test Steps**:
1. Run `SELECT name FROM sqlite_master WHERE type='index'` for each index

**Expected Result**: All 5 indexes present

---

### DB-3: Migrations Run Successfully
**Objective**: Verify database migrations execute without errors
**Test Steps**:
1. Delete/backup existing database
2. Run `npm run db:migrate`
3. Check for error messages

**Expected Result**: Migration completes successfully, all tables created

---

### DB-4: Constraints & Foreign Keys
**Objective**: Verify referential integrity constraints
**Test Steps**:
1. Insert growth loop with invalid siteId → should fail
2. Insert growth loop metric with invalid loopId → should fail
3. Insert attribution with invalid loopId → should fail

**Expected Result**: All foreign key constraints enforced

---

### DB-5: Data Isolation by Site
**Objective**: Verify multi-tenant isolation (siteId filtering)
**Test Steps**:
1. Create loop in site 1 with ID 100
2. Create loop in site 2 with ID 200
3. Query site 1 loops → should return only loop 100
4. Query site 2 loops → should return only loop 200

**Expected Result**: No data leakage between sites

---

### DB-6: Default Values
**Objective**: Verify default column values
**Test Steps**:
1. Insert growth loop without isActive, isPriority, createdAt
2. Read back record

**Expected Result**: isActive=true, isPriority=false, createdAt=current timestamp

---

### DB-7: Nullable Columns
**Objective**: Verify columns that can be NULL
**Test Steps**:
1. Insert growth loop without description → should succeed
2. Insert metric without bottleneckDetection → should succeed

**Expected Result**: NULL values accepted where allowed

---

### DB-8: Large Data Handling
**Objective**: Verify tables handle large datasets
**Test Steps**:
1. Insert 1000 loop metrics records
2. Insert 10,000 insights records
3. Query by siteId and period

**Expected Result**: Queries complete in <500ms, no truncation/errors

---

## Part 2: Calculation Library Tests (15 tests)

### CALC-1: CAC Calculation - Basic
**Objective**: Verify basic CAC calculation (cost / customers acquired)
**Input**: inputCost=1000, outputCount=10 customers
**Expected**: CAC = 1000 / 10 = 100

**Test Steps**:
1. Call `calculateLoopCAC(1000, 10)`
2. Assert result.cac === 100
3. Assert result.confidence = 'high' (clear data)

---

### CALC-2: CAC Calculation - Zero Customers
**Objective**: Verify CAC handles zero customer count safely
**Input**: inputCost=1000, outputCount=0
**Expected**: CAC = 0 (or infinity flag)

**Test Steps**:
1. Call `calculateLoopCAC(1000, 0)`
2. Assert result.cac === 0 (or result.error set)
3. Assert result.confidence = 'low' (insufficient data)

---

### CALC-3: LTV Calculation - Simple Multiplier
**Objective**: Verify simple LTV method (Initial Order × Multiplier)
**Input**: firstOrderValue=100, multiplier=3
**Expected**: LTV = 100 × 3 = 300

**Test Steps**:
1. Call `calculateLoopLTV({ method: 'simple', firstOrderValue: 100, multiplier: 3 })`
2. Assert result.ltv === 300

---

### CALC-4: LTV Calculation - Churn-based
**Objective**: Verify churn-based LTV (ARPU / Churn Rate)
**Input**: monthlyARPU=50, monthlyChurnRate=0.05 (5%), grossMarginPercent=0.7
**Expected**: LTV = (50 × 0.7) / 0.05 = 700

**Test Steps**:
1. Call `calculateLoopLTV({ method: 'churn_based', monthlyARPU: 50, churnRate: 0.05, margin: 0.7 })`
2. Assert result.ltv = 700

---

### CALC-5: LTV/CAC Ratio - Healthy
**Objective**: Verify ratio calculation and health status
**Input**: LTV=300, CAC=100
**Expected**: Ratio=3.0, healthStatus='healthy'

**Test Steps**:
1. Call `calculateLTVCACRatio(300, 100)`
2. Assert result.ratio === 3.0
3. Assert result.healthStatus === 'healthy' (>2.5)

---

### CALC-6: LTV/CAC Ratio - Warning
**Objective**: Verify warning threshold
**Input**: LTV=200, CAC=100
**Expected**: Ratio=2.0, healthStatus='warning'

**Test Steps**:
1. Call `calculateLTVCACRatio(200, 100)`
2. Assert result.ratio === 2.0
3. Assert result.healthStatus === 'warning' (2.0-2.5)

---

### CALC-7: LTV/CAC Ratio - Critical
**Objective**: Verify critical threshold
**Input**: LTV=100, CAC=100
**Expected**: Ratio=1.0, healthStatus='critical'

**Test Steps**:
1. Call `calculateLTVCACRatio(100, 100)`
2. Assert result.ratio === 1.0
3. Assert result.healthStatus === 'critical' (<2.0)

---

### CALC-8: Payback Period Calculation
**Objective**: Verify payback months calculation
**Input**: CAC=100, monthlyRevenue=20, churnRate=0.05
**Expected**: Payback = 100 / (20 × (1-0.05)) = 5.26 months

**Test Steps**:
1. Call `calculatePaybackPeriod(100, 20, 0.05)`
2. Assert result ≈ 5.26

---

### CALC-9: Payback Health Status - Healthy
**Objective**: Verify payback health (< 12 months = healthy)
**Input**: paybackMonths=6
**Expected**: healthStatus='healthy'

**Test Steps**:
1. Call `assessPaybackHealth(6)`
2. Assert result.healthStatus === 'healthy'

---

### CALC-10: Payback Health Status - Warning
**Objective**: Verify payback health (12-18 months = warning)
**Input**: paybackMonths=15
**Expected**: healthStatus='warning'

**Test Steps**:
1. Call `assessPaybackHealth(15)`
2. Assert result.healthStatus === 'warning'

---

### CALC-11: Stage Conversion Rate
**Objective**: Verify stage-to-stage conversion calculation
**Input**: Input volume=1000, Action count=500, Output count=100
**Expected**: Input→Action=50%, Action→Output=20%, Overall=10%

**Test Steps**:
1. Call `calculateStageConversion(input=1000, action=500, output=100)`
2. Assert result.inputToAction === 0.5
3. Assert result.actionToOutput === 0.2
4. Assert result.overall === 0.1

---

### CALC-12: Loop Strength Classification
**Objective**: Verify strength classification (weak/medium/strong)
**Input Case 1**: LTV/CAC=3.0, Payback=6mo, Growth=30%
**Expected**: 'strong'

**Test Steps**:
1. Call `classifyLoopStrength(3.0, 6, 30)`
2. Assert result === 'strong'

**Input Case 2**: LTV/CAC=1.5, Payback=24mo, Growth=5%
**Expected**: 'weak'

**Test Steps**:
1. Call `classifyLoopStrength(1.5, 24, 5)`
2. Assert result === 'weak'

---

### CALC-13: Health Score Calculation
**Objective**: Verify loop health score (0-100)
**Input**: ratio=2.5, payback=12, conversion=25%, growth=15%
**Expected**: healthScore between 50-75 (warning)

**Test Steps**:
1. Call `calculateLoopHealthScore(2.5, 12, 0.25, 15)`
2. Assert result >= 50 and result <= 75
3. Assert result typeof === 'number'

---

### CALC-14: Self-Sustaining Detection
**Objective**: Verify self-sustaining loop detection
**Input**: LTV=300, CAC=100 (ratio=3.0), payback=6mo, reinvestment=20%
**Expected**: isSelfSustaining=true

**Test Steps**:
1. Call `isSelfSustaining(300, 100, 6, 0.20)`
2. Assert result === true

**Input 2**: LTV=100, CAC=100 (ratio=1.0), payback=24mo, reinvestment=5%
**Expected**: isSelfSustaining=false

**Test Steps**:
1. Call `isSelfSustaining(100, 100, 24, 0.05)`
2. Assert result === false

---

### CALC-15: Efficiency Degradation Detection
**Objective**: Verify efficiency degradation metrics
**Input**: CAC trend=+15% (deteriorating), Conv trend=-20%, Cycle trend=+50%
**Expected**: degradation=true, severity='high'

**Test Steps**:
1. Call `detectEfficiencyDegradation({ cac: 1.15, conversion: 0.8, cycleTime: 1.5 })`
2. Assert result.hasOptimization === true
3. Assert result.severity === 'high'

---

## Part 3: Insight Detection Tests (10 tests)

### INSIGHT-1: Bottleneck Detection
**Objective**: Detect conversion bottlenecks
**Input**: Input→Action=60%, Action→Output=15% (vs benchmark 40% for loop type)
**Expected**: bottleneck at Action→Output stage

**Test Steps**:
1. Set loop type='viral'
2. Call `detectBottlenecks(loopData)`
3. Assert result includes bottleneck with stage='output' and severity='critical'

---

### INSIGHT-2: Rising CAC Detection
**Objective**: Detect CAC increase > 10% MoM
**Input**: Previous CAC=100, Current CAC=115 (15% increase)
**Expected**: insight generated with severity='warning'

**Test Steps**:
1. Call `detectRisingCAC(previousCAC=100, currentCAC=115)`
2. Assert result.severity === 'warning'
3. Assert result.delta === 0.15

---

### INSIGHT-3: Falling LTV Detection
**Objective**: Detect LTV decline in recent cohorts
**Input**: 12-month avg LTV=300, Recent 3-month avg LTV=225 (25% decline)
**Expected**: insight generated with severity='critical'

**Test Steps**:
1. Call `detectFallingLTV(baselineLTV=300, recentLTV=225)`
2. Assert result.severity === 'critical' (>25% decline)

---

### INSIGHT-4: Unhealthy Ratio Detection
**Objective**: Detect LTV/CAC < 2.0x
**Input**: LTV=100, CAC=100 (ratio=1.0)
**Expected**: insight generated with severity='critical'

**Test Steps**:
1. Call `detectUnhealthyRatio(ltv=100, cac=100)`
2. Assert result.severity === 'critical'
3. Assert result.suggestedActions.length > 0

---

### INSIGHT-5: Churn Spike Detection
**Objective**: Detect churn rate > baseline + 2 std deviations
**Input**: Baseline churn=5%, Std dev=2%, Current=12%
**Expected**: insight generated with severity='warning'

**Test Steps**:
1. Call `detectChurnSpike(baseline=0.05, stdDev=0.02, current=0.12)`
2. Assert result.severity === 'warning' (churn > baseline + 1.5σ)

---

### INSIGHT-6: Long Payback Detection
**Objective**: Detect payback period > 18 months
**Input**: paybackMonths=24
**Expected**: insight generated with severity='critical'

**Test Steps**:
1. Call `detectLongPayback(paybackMonths=24, target=12)`
2. Assert result.severity === 'critical' (>18 months)

---

### INSIGHT-7: Scalability Potential Detection
**Objective**: Detect high-growth, healthy loops with 3x+ multiplier
**Input**: healthScore=85, monthlyGrowth=25%, CAC trend=stable
**Expected**: insight generated with scalability potential=5x

**Test Steps**:
1. Call `detectScalabilityPotential(health=85, growth=0.25, cac_trend='stable')`
2. Assert result.insight !== null
3. Assert result.insight.scalabilityPotential >= 3

---

### INSIGHT-8: Unsustainability Detection
**Objective**: Detect unsustainable loops (low ratio + high payback + low reinvestment)
**Input**: ratio=1.2, payback=20mo, reinvestment=5%
**Expected**: insight generated with severity='critical'

**Test Steps**:
1. Call `detectUnsustainability(1.2, 20, 0.05)`
2. Assert result.severity === 'critical'
3. Assert result.suggestedActions includes CAC reduction

---

### INSIGHT-9: Acceleration Detection
**Objective**: Detect loop inflection points (CAC ↓ + conversion ↑ + volume ↑)
**Input**: CAC -15%, Conversion +25%, Volume +40%
**Expected**: insight generated with severity='info' (acceleration)

**Test Steps**:
1. Call `detectAcceleration(cac=-0.15, conversion=0.25, volume=0.40)`
2. Assert result.insight !== null
3. Assert result.severity === 'info' (positive signal)

---

### INSIGHT-10: Insight Dismissal & Resolution
**Objective**: Verify insight dismissal and resolution workflows
**Test Steps**:
1. Create insight in DB (insightType='rising_cac', dismissedAt=null)
2. Call `dismissInsight(insightId)` → sets dismissedAt to now
3. Query insights → dismissed insight should not appear in active list
4. Call `resolveInsight(insightId)` → sets resolvedAt to now
5. Query resolved insights → should appear in historical view

**Expected Result**: Insights properly marked as dismissed/resolved

---

## Part 4: API Endpoint Tests (20 tests)

### API-1: GET /api/growth-loops (List)
**Objective**: List all loops for a site
**Test Steps**:
1. Create 3 loops for site 1
2. GET /api/growth-loops?siteId=1
3. Assert response.data.length === 3
4. Assert response.summary.totalLoops === 3

---

### API-2: GET /api/growth-loops (Empty)
**Objective**: Handle no loops
**Test Steps**:
1. GET /api/growth-loops?siteId=999
2. Assert response.data.length === 0
3. Assert response.success === true

---

### API-3: POST /api/growth-loops (Create)
**Objective**: Create new growth loop
**Test Steps**:
1. POST /api/growth-loops with body: { siteId, name, type, inputType, actionType, outputMetricKey, targetCac, targetLtv }
2. Assert response.data.id > 0
3. Assert response.data.isActive === true
4. Assert response.data.createdAt is timestamp

---

### API-4: POST /api/growth-loops (Validation)
**Objective**: Validate required fields
**Test Steps**:
1. POST without name → 400 error
2. POST without type → 400 error
3. POST without actionType → 400 error
4. Assert error message includes field name

---

### API-5: GET /api/growth-loops/:id (Retrieve)
**Objective**: Get specific loop details
**Test Steps**:
1. Create loop with ID 5
2. GET /api/growth-loops/5?siteId=1
3. Assert response.data.id === 5
4. Assert response.data has all fields

---

### API-6: GET /api/growth-loops/:id (Not Found)
**Objective**: Handle missing loop
**Test Steps**:
1. GET /api/growth-loops/999?siteId=1
2. Assert response.success === false
3. Assert response.error includes 'not found'

---

### API-7: PUT /api/growth-loops/:id (Update)
**Objective**: Update loop details
**Test Steps**:
1. Create loop with name='Original'
2. PUT /api/growth-loops/5 with { name: 'Updated', isPriority: true }
3. GET /api/growth-loops/5
4. Assert response.data.name === 'Updated'
5. Assert response.data.isPriority === true
6. Assert response.data.updatedAt changed

---

### API-8: DELETE /api/growth-loops/:id (Soft Delete)
**Objective**: Soft delete loop (mark as inactive)
**Test Steps**:
1. Create loop with isActive=true
2. DELETE /api/growth-loops/5?siteId=1
3. GET /api/growth-loops/5?siteId=1
4. Assert response.data.isActive === false
5. GET /api/growth-loops?siteId=1 with ?activeOnly=true
6. Assert deleted loop not in list

---

### API-9: GET /api/growth-loops/metrics/:loopId
**Objective**: Get loop metrics by period
**Test Steps**:
1. Insert loop metrics for loop 1, period 2026-04
2. GET /api/growth-loops/metrics/1?siteId=1&period=2026-04
3. Assert response.data has inputVolume, actionCount, outputCount, cac, ltv, healthScore
4. Assert response.summary has avg, min, max values

---

### API-10: GET /api/growth-loops/stages/:loopId
**Objective**: Get stage-by-stage breakdown
**Test Steps**:
1. Insert stage data (input, action, output, reinvestment)
2. GET /api/growth-loops/stages/1?siteId=1
3. Assert response.data has 4 stage objects
4. Each stage has: stageCount, conversionRate, timeInStage, cost

---

### API-11: GET /api/growth-loops/insights
**Objective**: Get loop insights
**Test Steps**:
1. Create insights for loop 1
2. GET /api/growth-loops/insights?siteId=1
3. Assert response.data array sorted by severity
4. Assert response.summary has count by type

---

### API-12: GET /api/growth-loops/insights (Filter by Type)
**Objective**: Filter insights by type
**Test Steps**:
1. Create insights: 2 bottleneck, 1 degradation, 1 scalability
2. GET /api/growth-loops/insights?siteId=1&type=bottleneck
3. Assert response.data.length === 2

---

### API-13: POST /api/growth-loops/insights/:id/dismiss
**Objective**: Dismiss insight
**Test Steps**:
1. Create insight with ID 10
2. POST /api/growth-loops/insights/10/dismiss?siteId=1
3. GET /api/growth-loops/insights?siteId=1
4. Assert insight ID 10 not in response

---

### API-14: GET /api/growth-loops/comparison
**Objective**: Compare multiple loops
**Test Steps**:
1. Create 3 loops with different metrics
2. GET /api/growth-loops/comparison?siteId=1
3. Assert response.data sorted by healthScore
4. Assert response.summary shows rankings

---

### API-15: GET /api/growth-loops/:loopId/attribution
**Objective**: Get loop attribution to campaigns/channels
**Test Steps**:
1. Create attribution records linking loop 1 to channel 'google_ads', campaign 'summer_sale'
2. GET /api/growth-loops/1/attribution?siteId=1
3. Assert response.data has channelId, campaignName, attributionWeight, cacSource

---

### API-16: GET /api/unit-economics/by-loop
**Objective**: Get unit economics aggregated by loop
**Test Steps**:
1. Create loop with attributions
2. Insert LTV metrics for attributed channels
3. GET /api/unit-economics/by-loop?siteId=1
4. Assert response.data has recommendedLtv, avgCac, paybackMonths per loop
5. Assert response.summary has healthyLoops, warningLoops, criticalLoops counts

---

### API-17: GET /api/utms/campaigns-by-loop
**Objective**: Get campaigns grouped by loop
**Test Steps**:
1. Create 2 loops, 3 campaigns
2. Create attributions linking campaigns to loops
3. GET /api/utms/campaigns-by-loop?siteId=1
4. Assert response shows loops with campaign arrays

---

### API-18: GET /api/utms/campaign/:id/loop-impact
**Objective**: Get loop impact for specific campaign
**Test Steps**:
1. Create campaign 5 linked to loops 1 and 3
2. GET /api/utms/campaign/5/loop-impact?siteId=1
3. Assert response.loopsImpacted.length === 2
4. Assert loop IDs include 1 and 3

---

### API-19: API Response Format
**Objective**: Verify consistent API response format
**Test Steps**:
1. Make 10 different API calls
2. For each, assert response has:
   - { success: bool, data: any, summary?: {}, insights?: [], error?: string }

---

### API-20: Error Handling
**Objective**: Verify error handling
**Test Steps**:
1. GET without siteId → 400 with message 'siteId required'
2. GET with invalid siteId → empty data
3. POST with invalid body → 400 with validation message
4. Server error (e.g., DB disconnect) → 500 with error message

---

## Part 5: Frontend UI Tests (10 tests)

### UI-1: GrowthLoopsPage Loads
**Objective**: Verify main page loads without errors
**Test Steps**:
1. Navigate to /growth-loops
2. Assert page title present
3. Assert 4 tabs visible: Overview, Loop Details, Insights, Comparison Matrix

---

### UI-2: Overview Tab Displays Loops
**Objective**: Verify loop cards render correctly
**Test Steps**:
1. Navigate to /growth-loops with selectedSite
2. Assert API called with siteId
3. Assert loop cards display: name, type, health badge, CAC, LTV, ratio, growth %
4. Assert color coding: green (healthy), yellow (warning), red (critical)

---

### UI-3: Loop Card Interactions
**Objective**: Verify card click navigation
**Test Steps**:
1. Click on loop card
2. Assert navigates to /growth-loops-config with loopId
3. Assert form pre-fills with loop data

---

### UI-4: Insights Tab Displays
**Objective**: Verify insights render with correct styling
**Test Steps**:
1. Click Insights tab
2. Assert insight cards display with:
   - Title, type badge, severity color
   - Current/previous metrics, delta
   - Suggested actions accordion
3. Assert critical insights appear first (red)

---

### UI-5: Insights Dismiss Button
**Objective**: Verify dismissal workflow
**Test Steps**:
1. Click dismiss button on insight
2. Assert API called: POST /api/growth-loops/insights/:id/dismiss
3. Assert insight card removed from view
4. Assert no page reload (smooth removal)

---

### UI-6: GrowthLoopsConfig Form
**Objective**: Verify configuration form fields
**Test Steps**:
1. Navigate to /growth-loops-config
2. Assert form has fields:
   - Loop name (text)
   - Loop type (dropdown): paid, viral, content, sales, ABM, event, product
   - Input type (dropdown)
   - Action type (dropdown)
   - Output metric (dropdown)
   - Target CAC/LTV/payback/cycle (inputs)
3. Assert Create button disabled until required fields filled

---

### UI-7: GrowthLoopsConfig Submit
**Objective**: Verify form submission
**Test Steps**:
1. Fill form with valid data
2. Click Create
3. Assert API called: POST /api/growth-loops
4. Assert success toast shown
5. Assert navigates to /growth-loops
6. Assert new loop appears in list

---

### UI-8: GrowthLoopsConfig Edit
**Objective**: Verify editing existing loop
**Test Steps**:
1. Click edit on loop card
2. Assert form pre-fills with loop data
3. Change loop name
4. Click Save
5. Assert API called: PUT /api/growth-loops/:id
6. Assert updated name visible in list

---

### UI-9: GrowthLoopWidget on Dashboard
**Objective**: Verify dashboard widget displays
**Test Steps**:
1. Navigate to Dashboard
2. Scroll to section 3.7 (Growth Loops)
3. Assert widget displays:
   - "Top 3 Loops" header
   - Loop name, type badge, health score
   - Active insights count
   - "Analyze" and "Configure" buttons
4. Assert data loads from API

---

### UI-10: Responsive Design
**Objective**: Verify layout on mobile/tablet/desktop
**Test Steps**:
1. Test at 375px (mobile) - cards stack vertically
2. Test at 768px (tablet) - 2-column layout
3. Test at 1280px (desktop) - 3-column layout
4. Assert no horizontal scroll, text readable

---

## Part 6: Integration Tests (5 tests)

### INT-1: Funnel Model Integration
**Objective**: Verify loop metrics appear in funnel views
**Test Steps**:
1. Create AIDA funnel view
2. Create loop with type='paid'
3. Assert Interest stage shows loop_input_volume
4. Assert Action stage shows loop_cac, loop_ltv, loop_ltv_cac_ratio
5. Assert Hourglass model shows loop_health_score in retention stage

---

### INT-2: Unit Economics Integration
**Objective**: Verify unit economics show loop breakdowns
**Test Steps**:
1. Create loop with attribution to channel 'google_ads'
2. Create LTV metrics for 'google_ads'
3. GET /api/unit-economics/by-loop?siteId=1
4. Assert response includes loop with aggregated CAC, LTV, payback
5. Assert health score calculated correctly

---

### INT-3: Attribution Integration
**Objective**: Verify campaign linking to loops
**Test Steps**:
1. Create campaign 'summer_sale' in channel 'facebook'
2. Create loop 'viral_referral'
3. Create attribution linking campaign to loop
4. GET /api/utms/campaigns-by-loop?siteId=1
5. Assert response shows 'viral_referral' with 'summer_sale' in campaigns array

---

### INT-4: Dashboard Integration
**Objective**: Verify widget updates reflect loop data
**Test Steps**:
1. Create loop with healthScore=85
2. Navigate to Dashboard
3. Assert widget shows loop with high score
4. Update loop metrics (CAC +30%)
5. Refresh dashboard
6. Assert widget updates, health score changes

---

### INT-5: Insights Feed Integration
**Objective**: Verify growth loop insights appear in main insights page
**Test Steps**:
1. Create loop insight (rising_cac)
2. GET /api/insights?siteId=1
3. Assert response includes growth_loop insights mixed with performance insights
4. Assert sorted by severity across all insight types

---

## Part 7: End-to-End Scenarios (7 tests)

### E2E-1: New Loop Creation Workflow
**Objective**: Test complete flow from idea to metrics display
**Test Steps**:
1. Navigate to /growth-loops
2. Click "New Loop"
3. Fill form: name='Email Referral', type='viral', metrics
4. Submit
5. Assert loop created with ID
6. Navigate back to /growth-loops
7. Assert new loop visible in Overview
8. Assert metrics loading (via API)

---

### E2E-2: Loop Optimization Workflow
**Objective**: Test response to insights and metrics updates
**Test Steps**:
1. Create loop with poor health (LTV/CAC=1.5)
2. View Insights tab
3. Assert "Unhealthy Ratio" insight shows
4. View suggested action: "Reduce CAC"
5. Update loop attribution (reduce paid spend)
6. Refresh metrics
7. Assert CAC decreased, ratio improved
8. Assert insight severity changed to 'warning'

---

### E2E-3: Multi-Loop Comparison
**Objective**: Test comparative analysis across loops
**Test Steps**:
1. Create 4 loops: paid, viral, content, sales
2. Navigate to Comparison Matrix tab
3. Assert 2x2 grid visible (health vs scalability)
4. Assert each loop plotted by position
5. Assert quick wins highlighted (high/low) in "Quick Wins" quadrant

---

### E2E-4: Campaign Attribution Workflow
**Objective**: Test linking campaigns to loops
**Test Steps**:
1. Create loop 'webinar_to_trial'
2. Create campaign 'webinar_may_2026'
3. Navigate to /growth-loops-config, edit loop
4. Link campaign to loop
5. GET /api/utms/campaign/X/loop-impact
6. Assert webinar_to_trial shows in impacted loops
7. View /growth-loops/metrics - assert campaign data aggregated to loop

---

### E2E-5: Scaling Assessment
**Objective**: Test scalability detection and recommendations
**Test Steps**:
1. Create high-performing loop: health=85, growth=25%, CAC stable
2. Refresh insights
3. Assert "Scalability Potential" insight generates
4. Assert recommended multiplier 3x-5x
5. Click suggested action: "Scale budget"
6. Verify metrics update with new projections

---

### E2E-6: Crisis Detection
**Objective**: Test crisis detection and remediation suggestions
**Test Steps**:
1. Create healthy loop: LTV=300, CAC=100, growth=20%
2. Inject degradation: CAC +50%, conversion -30%, growth -40%
3. Refresh metrics
4. Assert multiple critical insights generate
5. Assert suggestedActions include:
   - Pause low-performing channels
   - Audit creative/copy changes
   - Investigate product feedback
6. Click dismiss on non-critical insights
7. Focus on highest-severity

---

### E2E-7: Data Export & Reporting
**Objective**: Test data export functionality (if implemented)
**Test Steps**:
1. Navigate to /growth-loops
2. Click "Export" button
3. Assert CSV/JSON download
4. Verify data includes: loop name, type, metrics, insights
5. Open in spreadsheet - verify formatting correct

---

## Part 8: Performance & Scalability Tests (3 tests)

### PERF-1: Large Dataset Query
**Objective**: Verify query performance with large data volume
**Test Steps**:
1. Insert 100 loops with 1000+ metrics each
2. GET /api/growth-loops?siteId=1
3. Assert response time < 500ms
4. GET /api/growth-loops/metrics/1 (single loop)
5. Assert response time < 200ms

---

### PERF-2: Insight Generation Speed
**Objective**: Verify insight generation completes quickly
**Test Steps**:
1. Trigger insight generation for 100 loops
2. Assert completes in < 5 seconds
3. Assert all 5 detector functions run in parallel

---

### PERF-3: Dashboard Widget Load
**Objective**: Verify widget doesn't slow page load
**Test Steps**:
1. Profile Dashboard load time without widget
2. Profile Dashboard load time with widget (10 loops)
3. Assert widget load adds < 200ms
4. Assert lazy-loads if needed

---

## Acceptance Criteria

### All Tests Must Pass
- ✅ Database integrity (8/8 tests)
- ✅ Calculations accuracy (15/15 tests)
- ✅ Insight detection (10/10 tests)
- ✅ API functionality (20/20 tests)
- ✅ Frontend UI (10/10 tests)
- ✅ Integrations (5/5 tests)
- ✅ End-to-end scenarios (7/7 tests)
- ✅ Performance (3/3 tests)

### Coverage Requirements
- Minimum 60 test cases (we have 78)
- All calculation functions tested
- All 5 insight types tested
- All API endpoints tested
- At least 1 end-to-end scenario per loop type

### Release Checklist
- [ ] All 78 test cases execute without error
- [ ] Code coverage > 85% (calculations, insights, routes)
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings
- [ ] Documentation complete (3 docs)
- [ ] Build succeeds: `npm run build`

---

## Test Execution Guide

### Local Testing
```bash
# Run specific test suite
npm test -- growth-loops.test.ts

# Run all tests
npm test

# Generate coverage report
npm run test:coverage

# Test database
npm run db:test

# Test frontend
npm run test:frontend
```

### CI/CD Pipeline
- Tests run automatically on PR creation
- Must pass all tests before merge to main
- Coverage report generated and linked

### Manual Testing Checklist
- [ ] Create sample data for each loop type
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iOS Safari, Android Chrome
- [ ] Test with screen reader (WCAG 2.1 AA)
- [ ] Test with 50+ loops (performance)
- [ ] Test error scenarios (network down, invalid data)

---

## Known Issues & Limitations

1. **Real-time Updates**: Currently not live; requires page refresh to see new insights
   - Planned: WebSocket/SSE integration in future version

2. **Metrics Aggregation**: Attribution weights simplified for MVP
   - Planned: Full multi-touch attribution in future version

3. **Export Functionality**: Not implemented in MVP
   - Planned: CSV/JSON/PDF export in future version

4. **Mobile Responsiveness**: Tables not optimized for mobile
   - Planned: Mobile UI refinement in future version

---

## Appendix: Test Data Fixtures

### Sample Loop Configuration
```json
{
  "name": "Email Referral",
  "type": "viral",
  "inputType": "leads",
  "actionType": "invite",
  "outputMetricKey": "new_users",
  "targetCac": 50,
  "targetLtv": 500,
  "targetPaybackMonths": 8,
  "targetCycleHours": 24
}
```

### Sample Metrics
```json
{
  "loopId": 1,
  "period": "2026-04",
  "inputVolume": 5000,
  "actionCount": 2500,
  "outputCount": 750,
  "cac": 133,
  "ltv": 450,
  "ltv_cac_ratio": 3.38,
  "paybackMonths": 4.2,
  "healthScore": 88,
  "strengthLevel": "strong"
}
```

### Sample Insight
```json
{
  "insightType": "scalability",
  "severity": "info",
  "title": "Email Referral loop is scaling well",
  "metric": "ltv_cac_ratio",
  "currentValue": 3.38,
  "previousValue": 2.9,
  "delta": 0.16,
  "suggestedActions": [
    {
      "title": "Double email send volume",
      "priority": "high",
      "estimatedImpact": 2.0
    }
  ]
}
```

---

**Total Test Cases: 78**
**Estimated Test Duration: 2-3 hours (manual) / 5-10 minutes (automated)**
**Last Updated: 2026-04-28**
