# Unit Economics Module - End-to-End Test Plan

## Test Objectives
Verify that all components of the Unit Economics module work together correctly to deliver accurate CAC, LTV, and business health metrics.

---

## Phase 1: Database & Schema Tests

### T1.1: Database Tables Created
**Objective**: Verify all 5 new tables exist with correct schema

**Steps**:
1. Start server: `npm run dev` (server)
2. Check database for tables:
   - `unitEconomicsConfig`
   - `ltvMetrics`
   - `churnMetrics`
   - `paybackMetrics`
   - `unitEconomicsInsights`

**Expected Result**: ✅ All 5 tables exist
**Status**: [ ] Pass / [ ] Fail

**SQL Query**:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'unit%';
```

---

### T1.2: Schema Validation
**Objective**: Verify columns match expected structure

**Test for unitEconomicsConfig**:
```sql
PRAGMA table_info(unitEconomicsConfig);
```

**Expected Columns**:
- id (integer, PK)
- siteId (integer, FK)
- ltvCalculationMethod (text)
- ltvSimpleMultiplier (real)
- ltvAssumedMonthlyChurnRate (real)
- ltvGrossMarginPercent (real)
- cacAttributionModel (text)
- cacCostComponents (text)
- targetPaybackMonths (integer)
- segmentBy (text)
- createdAt, updatedAt (text)

**Status**: [ ] Pass / [ ] Fail

---

### T1.3: Indexes Created
**Objective**: Verify performance indexes exist

**Steps**:
```sql
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name LIKE 'unit%';
```

**Expected**: At least 4 indexes on siteId, periodStart, insightType

**Status**: [ ] Pass / [ ] Fail

---

## Phase 2: Calculation Library Tests

### T2.1: CAC Calculation
**Objective**: Verify CAC = spend / customers acquired

**Test Data**:
- Spend: $1000
- Customers Acquired: 10
- Expected CAC: $100

**Steps**:
1. Open Node REPL in `/server/src/lib/`
2. Import unitEconomics.ts
3. Call `calculateCAC(1000, 10)`
4. Verify result = 100

**Test Code**:
```typescript
import { calculateCAC } from './unitEconomics.js';
const cac = calculateCAC(1000, 10);
console.assert(cac === 100, `CAC should be 100, got ${cac}`);
```

**Status**: [ ] Pass / [ ] Fail

---

### T2.2: LTV - Simple Method
**Objective**: Verify LTV (Simple) = Initial Order Value × Multiplier

**Test Data**:
- Initial Order Value: $300
- Multiplier: 3.0
- Expected LTV: $900

**Test Code**:
```typescript
import { calculateSimpleLTV } from './unitEconomics.js';
const ltv = calculateSimpleLTV(300, 3.0);
console.assert(ltv === 900, `LTV should be 900, got ${ltv}`);
```

**Status**: [ ] Pass / [ ] Fail

---

### T2.3: LTV - Churn-Based Method
**Objective**: Verify LTV (Churn) = (Monthly ARPU × Margin) / Monthly Churn Rate

**Test Data**:
- Monthly ARPU: $100
- Gross Margin %: 0.70
- Monthly Churn Rate: 0.05 (5%)
- Expected LTV: ($100 × 0.70) / 0.05 = $1400

**Test Code**:
```typescript
import { calculateChurnBasedLTV } from './unitEconomics.js';
const ltv = calculateChurnBasedLTV(100, 0.70, 0.05);
console.assert(ltv === 1400, `LTV should be 1400, got ${ltv}`);
```

**Status**: [ ] Pass / [ ] Fail

---

### T2.4: LTV/CAC Ratio Health Status
**Objective**: Verify ratio classification and health score

**Test Cases**:

**4A. Healthy Ratio (> 3.0x)**
- LTV: $900, CAC: $100
- Expected: healthy, ratio = 9.0x, healthScore = 100

```typescript
import { calculateLTVCACRatio } from './unitEconomics.js';
const result = calculateLTVCACRatio(900, 100);
console.assert(result.healthStatus === 'healthy', 'Should be healthy');
console.assert(result.ratio === 9.0, 'Ratio should be 9.0');
```

**4B. Warning Ratio (2.0-3.0x)**
- LTV: $250, CAC: $100
- Expected: warning, ratio = 2.5x

**4C. Critical Ratio (< 2.0x)**
- LTV: $100, CAC: $100
- Expected: critical, ratio = 1.0x

**Status**: [ ] Pass / [ ] Fail

---

### T2.5: Payback Period Calculation
**Objective**: Verify payback = CAC / (monthly revenue × (1 - churn))

**Test Data**:
- CAC: $100
- Monthly Revenue per Customer: $50
- Monthly Churn Rate: 0.05
- Expected Payback: $100 / ($50 × 0.95) = $100 / $47.5 ≈ 2.1 months

**Test Code**:
```typescript
import { calculatePaybackPeriod } from './unitEconomics.js';
const payback = calculatePaybackPeriod(100, 50, 0.05);
console.assert(payback > 2 && payback < 2.2, `Payback should be ~2.1, got ${payback}`);
```

**Status**: [ ] Pass / [ ] Fail

---

### T2.6: Churn Rate Calculation
**Objective**: Verify churn = (start - end + new) / start

**Test Data**:
- Starting Customers: 100
- Ending Customers: 90
- New Customers: 20
- Expected Churn: (100 - 90 + 20) / 100 = 0.30 (30%)

**Test Code**:
```typescript
import { calculateChurnRate } from './unitEconomics.js';
const churn = calculateChurnRate(100, 90, 20);
console.assert(churn === 0.3, `Churn should be 0.3, got ${churn}`);
```

**Status**: [ ] Pass / [ ] Fail

---

### T2.7: Rising CAC Detection
**Objective**: Verify CAC anomaly detection

**Test Data**:
- Current CAC: $110
- Previous CAC: $100
- Change: 10% increase

**Test Code**:
```typescript
import { calculateCACSnapshot, isRisingCAC } from './unitEconomics.js';
const snapshot = calculateCACSnapshot(110, 100);
const rising = isRisingCAC(snapshot, 'monthly');
console.assert(rising.severity === 'warning', 'Should be warning (>5%)');
console.assert(rising.isRising === true, 'Should detect rising CAC');
```

**Status**: [ ] Pass / [ ] Fail

---

## Phase 3: API Endpoint Tests

### T3.1: GET /api/unit-economics/config
**Objective**: Verify config endpoint returns settings

**Steps**:
1. Ensure server running: `npm run dev` (server)
2. Call: `GET http://localhost:3001/api/unit-economics/config?siteId=1`

**Expected Response**:
```json
{
  "siteId": 1,
  "ltvCalculationMethod": "simple",
  "ltvSimpleMultiplier": 3.0,
  "ltvAssumedMonthlyChurnRate": 0.05,
  "ltvGrossMarginPercent": 0.7,
  "cacAttributionModel": "last_touch",
  "cacCostComponents": ["media_spend"],
  "targetPaybackMonths": 12,
  "segmentBy": "channel"
}
```

**Status**: [ ] Pass / [ ] Fail

---

### T3.2: PUT /api/unit-economics/config
**Objective**: Verify config can be updated

**Steps**:
1. Send PUT to `http://localhost:3001/api/unit-economics/config?siteId=1`
2. Request body:
```json
{
  "ltvCalculationMethod": "churn_based",
  "targetPaybackMonths": 18
}
```

**Expected**: ✅ 200 OK, config updated in database

**Verification**:
```sql
SELECT * FROM unitEconomicsConfig WHERE siteId = 1;
-- Should show ltvCalculationMethod = 'churn_based', targetPaybackMonths = 18
```

**Status**: [ ] Pass / [ ] Fail

---

### T3.3: GET /api/unit-economics/cac
**Objective**: Verify CAC metrics endpoint

**Steps**:
1. Call: `GET http://localhost:3001/api/unit-economics/cac?siteId=1&period=2026-04`

**Expected Response Structure**:
```json
[
  {
    "channel": "google_ads",
    "spend": 5000,
    "customersAcquired": 50,
    "cac": 100,
    "cacSnapshot": {
      "current": 100,
      "previous": 95,
      "ratio": 1.053,
      "delta": 5.26
    }
  }
]
```

**Status**: [ ] Pass / [ ] Fail

---

### T3.4: GET /api/unit-economics/ltv
**Objective**: Verify LTV calculation endpoint

**Steps**:
1. Call: `GET http://localhost:3001/api/unit-economics/ltv?siteId=1&period=2026-04`

**Expected Response**:
```json
{
  "simple": 900,
  "churnBased": 1400,
  "crmDriven": 950,
  "recommended": 900,
  "healthScore": 85
}
```

**Status**: [ ] Pass / [ ] Fail

---

### T3.5: GET /api/unit-economics/ratios
**Objective**: Verify LTV/CAC ratio endpoint

**Steps**:
1. Call: `GET http://localhost:3001/api/unit-economics/ratios?siteId=1&period=2026-04`

**Expected Response**:
```json
{
  "ltv": 900,
  "cac": 100,
  "ratio": 9.0,
  "healthStatus": "healthy",
  "healthScore": 100,
  "interpretation": "LTV/CAC 9.0x - Sustainable growth, strong unit economics"
}
```

**Status**: [ ] Pass / [ ] Fail

---

### T3.6: GET /api/unit-economics/insights
**Objective**: Verify insights endpoint returns anomalies

**Steps**:
1. Call: `GET http://localhost:3001/api/unit-economics/insights?siteId=1`

**Expected**: Array of insight objects with:
- id, type, severity
- title, description
- suggestedActions array

**Status**: [ ] Pass / [ ] Fail

---

### T3.7: POST /api/unit-economics/insights/:id/dismiss
**Objective**: Verify insights can be dismissed

**Steps**:
1. Get an insight ID from T3.6
2. POST to `http://localhost:3001/api/unit-economics/insights/{insightId}/dismiss`

**Expected**: ✅ 200 OK, insight marked as dismissed

**Verification**:
```sql
SELECT dismissedAt FROM unitEconomicsInsights WHERE id = '{insightId}';
-- Should have non-NULL dismissedAt timestamp
```

**Status**: [ ] Pass / [ ] Fail

---

## Phase 4: Frontend Component Tests

### T4.1: UnitEconomicsConfig Page Loads
**Objective**: Verify configuration page renders

**Steps**:
1. Start client: `npm run dev` (client, separate terminal)
2. Navigate to `http://localhost:5173/unit-economics-config`
3. Verify page loads without errors

**Expected**:
- ✅ Header: "Unit Economics Configuration"
- ✅ CAC Configuration section with checkboxes
- ✅ Attribution Model dropdown
- ✅ LTV Calculation Method radio buttons
- ✅ Business Assumptions inputs
- ✅ Save and Reset buttons

**Browser Console**: ❌ No errors

**Status**: [ ] Pass / [ ] Fail

---

### T4.2: UnitEconomicsConfig Form Submission
**Objective**: Verify config form saves to API

**Steps**:
1. On `/unit-economics-config` page
2. Select:
   - CAC Components: media_spend, team_salary
   - Attribution Model: linear
   - LTV Method: churn_based
   - Churn Rate: 8%
   - Gross Margin: 65%
   - Target Payback: 14 months
3. Click "Save Configuration"

**Expected**:
- ✅ "Configuration saved successfully" message appears
- ✅ Network tab shows PUT request to `/api/unit-economics/config`
- ✅ Database reflects changes

**Status**: [ ] Pass / [ ] Fail

---

### T4.3: UnitEconomics Dashboard - Overview Tab
**Objective**: Verify main dashboard Overview tab loads and displays data

**Steps**:
1. Navigate to `http://localhost:5173/unit-economics`
2. Verify Overview tab loads

**Expected Elements**:
- ✅ Summary cards: Average CAC, LTV, LTV/CAC Ratio, Payback Period
- ✅ Health badge on ratio card (✓ Healthy / ⚠ Warning / ✗ Critical)
- ✅ Channel breakdown table with columns:
  - Channel, Spend, Customers, CAC, Trend

**Data Validation**:
- CAC = Spend / Customers (verify calculation)
- Ratio health status matches threshold rules

**Status**: [ ] Pass / [ ] Fail

---

### T4.4: UnitEconomics Dashboard - Detailed Analysis Tab
**Objective**: Verify charts and detailed visualizations

**Steps**:
1. Click "Detailed Analysis" tab
2. Verify 4 chart sections render

**Expected**:
- ✅ CAC Trend chart (shows month-over-month trend)
- ✅ LTV by Cohort chart (stacked area showing retention curves)
- ✅ Payback Progression chart (bar chart showing months 1-12)
- ✅ Churn Analysis section

**Chart Validation**:
- X-axis shows time periods or months
- Y-axis shows correct metrics
- Data labels visible

**Status**: [ ] Pass / [ ] Fail

---

### T4.5: UnitEconomics Dashboard - Insights Tab
**Objective**: Verify insights display and interactions

**Steps**:
1. Click "Insights & Decisions" tab
2. Verify insight cards render

**Expected**:
- ✅ Insight cards with:
  - Icon (✗ critical / ⚠ warning / ✓ info)
  - Title and description
  - Severity badge (critical/warning/info)
  - Metrics (current vs previous)
  - Dismiss button
  - Expand/collapse chevron

**Interaction Test**:
1. Click expand chevron on an insight
2. Verify suggested actions accordion expands
3. Click dismiss button
4. Verify insight disappears from active list

**Status**: [ ] Pass / [ ] Fail

---

### T4.6: UnitEconomicsWidget on Dashboard
**Objective**: Verify dashboard widget displays

**Steps**:
1. Navigate to `http://localhost:5173/` (main dashboard)
2. Scroll down to section 3.6 "Unit Economics"

**Expected Widget Content**:
- ✅ Title: "Unit Economics"
- ✅ Average CAC with value
- ✅ MoM trend indicator (↑/↓)
- ✅ LTV/CAC Ratio with health badge
- ✅ Active issues count
- ✅ "View Full Analysis" link

**Data Validation**:
- Widget numbers match main dashboard
- Trends calculated correctly
- Link navigates to `/unit-economics`

**Status**: [ ] Pass / [ ] Fail

---

### T4.7: Sidebar Navigation
**Objective**: Verify Unit Economics appears in sidebar

**Steps**:
1. Check sidebar under "Análise" section
2. Look for "Unit Economics" with TrendingUp icon

**Expected**:
- ✅ "Unit Economics" link visible
- ✅ Correct icon (TrendingUp)
- ✅ Link active when on `/unit-economics` page

**Status**: [ ] Pass / [ ] Fail

---

## Phase 5: Integration Tests

### T5.1: Complete Data Flow
**Objective**: Verify end-to-end data flow from DB to UI

**Scenario**: New campaign with known metrics
- Campaign: "Google Ads - April"
- Spend: $2000
- Customers: 25
- Expected CAC: $80

**Steps**:
1. Insert test data into budgets table
2. Insert conversion data into performanceEntries
3. Navigate to `/unit-economics`
4. Verify CAC displays $80

**Expected**:
- ✅ Test data inserted successfully
- ✅ API calculates correct CAC
- ✅ UI displays matching value
- ✅ No database errors in console

**Status**: [ ] Pass / [ ] Fail

---

### T5.2: Funnel Model Integration
**Objective**: Verify UE metrics appear in funnel analysis

**Steps**:
1. Open Funnel Selector on Performance page (if available)
2. Select "Hourglass" model
3. Verify CAC metric appears in "Interest" stage
4. Verify LTV metric appears in "Retention" stage

**Expected**:
- ✅ CAC displays in correct stage
- ✅ LTV displays in retention stage
- ✅ Churn rate visible in retention
- ✅ All values match unit economics page

**Status**: [ ] Pass / [ ] Fail

---

### T5.3: Multi-Site Isolation
**Objective**: Verify data isolation between sites

**Steps**:
1. Configure data for Site 1
2. Switch to Site 2 (if available)
3. Configure different data for Site 2
4. Navigate back to Site 1
5. Verify Site 1 config/data remains unchanged

**Expected**:
- ✅ Each site has separate config
- ✅ Metrics don't bleed between sites
- ✅ Database queries filter correctly by siteId

**Status**: [ ] Pass / [ ] Fail

---

## Phase 6: Performance & Edge Cases

### T6.1: Empty Data Handling
**Objective**: Verify graceful handling of missing data

**Steps**:
1. Create new site with no metrics data
2. Navigate to `/unit-economics`
3. Verify UI doesn't crash

**Expected**:
- ✅ UI loads without errors
- ✅ Empty state messages display
- ✅ Cards show "No data available" or similar
- ✅ No console errors

**Status**: [ ] Pass / [ ] Fail

---

### T6.2: Zero Division Handling
**Objective**: Verify calculations handle edge cases

**Test Cases**:
- CAC with 0 customers acquired → should return 0
- LTV with 0 churn rate → should return 0
- Ratio with 0 CAC → should handle gracefully

**Expected**: ✅ All functions return 0 or safe default

**Status**: [ ] Pass / [ ] Fail

---

### T6.3: Large Dataset Performance
**Objective**: Verify performance with substantial data

**Steps**:
1. Insert 1000+ rows of gscMetrics (if using GSC)
2. Insert 500+ rows into unitEconomicsConfig
3. Load `/unit-economics` dashboard
4. Measure load time

**Expected**:
- ✅ Page loads in < 2 seconds
- ✅ Charts render smoothly
- ✅ No timeout errors
- ✅ Database indexes used efficiently

**Status**: [ ] Pass / [ ] Fail

---

## Summary Checklist

- [ ] **Phase 1**: All 5 database tables created with correct schema
- [ ] **Phase 2**: All calculation functions produce correct results
- [ ] **Phase 3**: All API endpoints respond with proper data
- [ ] **Phase 4**: Frontend components load and display data
- [ ] **Phase 5**: End-to-end data flow works correctly
- [ ] **Phase 6**: Edge cases handled gracefully

---

## Known Limitations & Notes

1. **Chart Placeholders**: Detailed Analysis tab shows placeholder text for charts. Full chart implementation would use a charting library (recharts, chart.js, etc.)

2. **Real Data Required**: Tests assume real budget, performance, and conversion data. For testing, seed database with sample data or create fixtures.

3. **API Mock Data**: Frontend currently makes real API calls. For isolated frontend testing, mock the API responses.

4. **Database Path**: Ensure database path is correct for your environment. Default: `./marketing-os.db`

---

## Test Execution Notes

- Run tests in order (Phase 1 → Phase 6)
- Each phase depends on previous phases passing
- Record results in Status fields (✅ Pass / ❌ Fail)
- For failures, note error message and reproduction steps

---

**Test Plan Created**: 2026-04-28
**Module Version**: 1.0 (Complete Implementation)
