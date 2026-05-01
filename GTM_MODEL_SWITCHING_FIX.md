# GTM Operating Model Switching Fix - Testing Guide

## Problem Fixed

**Issue**: The GTM Operating Model Selector appeared visually in the Dashboard, but clicking to change models didn't change the actual Dashboard content. The same stages, cards, metrics, charts, and summaries displayed regardless of which model was selected.

**Root Cause**: The GTMOperatingModelSelector was calling `setGtmModelId` (a direct state setter) instead of `handleGtmModelChange` (which calls the API and fetches updated data).

**Impact**: Without this fix, the model switcher was UI-only—it never synced with the server or fetched new data.

---

## Critical Changes Made

### 1. Fixed the Callback (Line 1059 in Dashboard.tsx)
**Before:**
```jsx
<GTMOperatingModelSelector
  selectedModelId={gtmModelId}
  onModelChange={setGtmModelId}  // ❌ WRONG: direct state setter
  ...
/>
```

**After:**
```jsx
<GTMOperatingModelSelector
  selectedModelId={gtmModelId}
  onModelChange={handleGtmModelChange}  // ✅ CORRECT: API-aware callback
  ...
/>
```

### 2. Enhanced handleGtmModelChange with Logging
The callback now logs the entire flow:
- Model change request (old → new model ID)
- Server API call success
- Model definition loaded (stage count, readiness %)

### 3. Improved GTM Flow Content
**Before**: Only displayed readiness percentages (data quality status)
**After**: Displays actual metric values aggregated by stage, just like legacy flow
- Uses `aggregateMetricsByStage()` to map real data to GTM stages
- Dynamically responds when model changes
- Shows actual metrics (sessions, leads, conversions, etc.) per stage

---

## How to Test the Fix

### Test Environment Setup
1. Start the dev server: `npm run dev`
2. Open http://localhost:5173 (or configured port)
3. Navigate to the Dashboard page
4. **Open browser DevTools Console** (F12 → Console tab)

### Test Case 1: Initial Load
**Expected Behavior:**
1. Dashboard loads
2. Console shows:
   ```
   🔍 Fetching GTM data for site: [siteId]
   ✅ GTM data loaded: {selectedModelId: "b2b_sales_led", modelName: "B2B Sales-Led", ...}
   📊 GTM Flow Rendering: {modelId: "b2b_sales_led", stageCount: 7, ...}
   ✅ GTM Flow Content Built: {stageCount: 7}
   ```
3. GTM section visible with "B2B Sales-Led" title
4. Shows 7 stages: Awareness, Engagement, Leads, SQLs, Opportunities, Revenue, Expansion

### Test Case 2: Switch to ABM Model
**Steps:**
1. Click the GTM Operating Model Selector dropdown
2. Select "B2B ABM" from the options
3. Watch the console and UI

**Expected Console Output:**
```
🔄 GTM Model Change Requested: {oldModel: "b2b_sales_led", newModel: "b2b_abm"}
✅ Model switched on server: b2b_abm
✅ Model definition loaded: {modelId: "b2b_abm", stages: 5, readiness: X%}
📊 GTM Flow Rendering: {modelId: "b2b_abm", stageCount: 5, stages: ["account_awareness", "engagement", "influence", "pipeline", "closed_revenue"]}
✅ GTM Flow Content Built: {stageCount: 5}
```

**Expected UI Changes:**
- GTM section title changes to "B2B ABM"
- Stage count changes from 7 to 5 stages
- Stage names change to: Account Awareness, Engagement, Influence, Pipeline, Closed Revenue
- Metric mappings change (ABM-specific metrics appear)
- Readiness percentages may differ from B2B Sales-Led

### Test Case 3: Switch to PLG Model
**Steps:**
1. Click dropdown again
2. Select "PLG (Product-Led Growth)"

**Expected Changes:**
- Title: "PLG - Stage Readiness"
- Stages: 6 (Awareness, Signup, Activation, Retention, Expansion, Virality)
- Different metrics (signup rate, activation rate, retention, MRR, etc.)
- Different readiness %

### Test Case 4: Switch Back to B2B Sales-Led
**Verification:**
- Returns to original state with 7 stages
- Console shows proper logging of each transition
- Data persists correctly

### Test Case 5: Verify Metrics Change
Check the "GTM Flow Rendering" log output for each model:
- **B2B Sales-Led**: Primary metrics: sessions, leads, mql, sql, opportunities, revenue
- **B2B ABM**: Primary metrics: account_awareness, reached_accounts, engaged_accounts, opportunities, closed_revenue
- **PLG**: Primary metrics: visitors, signups, activations, active_users, paying_users, retention
- **SMB Inbound**: Primary metrics: organic_sessions, engagement, leads, customers

---

## Console Logging Guide

### Key Logs to Watch

#### 1. Initial GTM Data Fetch
```
🔍 Fetching GTM data for site: 1
✅ GTM data loaded: {selectedModelId: "b2b_sales_led", modelName: "B2B Sales-Led", ...}
```
**Indicates:** Server successfully loaded the site's current GTM model

#### 2. Model Change Attempt
```
🔄 GTM Model Change Requested: {oldModel: "b2b_sales_led", newModel: "b2b_abm"}
✅ Model switched on server: b2b_abm
```
**Indicates:** API call to switch model succeeded

#### 3. GTM Flow Rendering
```
📊 GTM Flow Rendering: {
  modelId: "b2b_abm",
  modelName: "B2B ABM",
  stageCount: 5,
  stages: ["account_awareness", "engagement", "influence", "pipeline", "closed_revenue"],
  overallReadiness: 40
}
```
**Indicates:** New model is being visualized

#### 4. Flow Content Built
```
✅ GTM Flow Content Built: {stageCount: 5, stages: ["account_awareness", "engagement", ...]}
```
**Indicates:** Metrics have been aggregated and are ready for display

### Troubleshooting: If Logs Don't Appear

1. **Check browser console filters**: Make sure you're not filtering out log messages
2. **Check if site is loaded**: Should see "Fetching GTM data..." on initial load
3. **Try refreshing**: F5 or Cmd+R
4. **Check network tab**: Verify API calls to `/api/gtm/*` endpoints complete successfully

---

## Detailed Verification Checklist

### Selector Functionality
- [ ] GTMOperatingModelSelector renders in Dashboard
- [ ] Dropdown opens when clicked
- [ ] All 4 models listed (B2B Sales-Led, B2B ABM, PLG, SMB Inbound)
- [ ] Currently selected model is highlighted with ✓
- [ ] Clicking a model closes the dropdown

### Model Switching
- [ ] Clicking a different model logs "Model Change Requested" to console
- [ ] Console shows "Model switched on server" (no error)
- [ ] Console shows "Model definition loaded"
- [ ] GTM section updates within 1-2 seconds
- [ ] Stage count changes based on selected model
- [ ] Stage names change based on model

### Stage Display
- [ ] Each stage shows a label (e.g., "Awareness", "Engagement")
- [ ] Each stage has metrics displayed
- [ ] Metrics differ between models
- [ ] No "undefined" or "null" values visible
- [ ] Stage borders/colors match model type

### Data Integrity
- [ ] Switching models doesn't lose data
- [ ] Switching back to B2B Sales-Led shows original 7 stages again
- [ ] Metric values remain consistent (switching doesn't change raw data)
- [ ] No duplicate metrics across stages

### Performance
- [ ] Model switch completes in < 2 seconds
- [ ] No "Loading..." spinner stuck indefinitely
- [ ] Console shows no error messages (red)
- [ ] No network errors in Network tab

---

## Expected Behavior by Model

### B2B Sales-Led (Default)
- **Stages:** 7 (Awareness → Engagement → Leads → SQLs → Opportunities → Revenue → Expansion)
- **Primary Metrics:** Sessions → Leads → MQL → SQL → Opportunities → Revenue
- **Context:** Traditional B2B SaaS with direct sales

### B2B ABM
- **Stages:** 5 (Account Awareness → Engagement → Influence → Pipeline → Closed Revenue)
- **Primary Metrics:** Account Sessions → Decision Makers Engaged → SALs → Opportunities → Closed Won
- **Context:** Account-based marketing for enterprise deals

### PLG (Product-Led Growth)
- **Stages:** 6 (Awareness → Signup → Activation → Retention → Expansion → Virality)
- **Primary Metrics:** Impressions → Signups → Active Users → Paying Customers → MRR → Viral Coeff
- **Context:** Free tier / community-driven adoption

### SMB Inbound
- **Stages:** 4 (Organic Awareness → Engagement → Lead → Customer)
- **Primary Metrics:** Organic Sessions → Pages/Session → Lead Submissions → Customers
- **Context:** Small business acquisition via content

---

## If Something Goes Wrong

### Scenario: Model doesn't change
1. Check console for "Model switched on server" message
   - If not present: The API call failed
   - Check `/api/gtm/{siteId}/model` endpoint in Network tab
2. Check if error shows in red: "Failed to switch GTM model"
3. Verify site is selected (dropdown at top of Dashboard)

### Scenario: Stages don't update
1. Check for "GTM Flow Rendering" log
   - If missing: Component didn't re-render
   - If present but wrong stage count: API returned wrong data
2. Verify `gtmModel` state in React DevTools
3. Check if data exists: GTM flow won't render if `siteData.length === 0`

### Scenario: Only readiness shown, not actual metrics
1. This is expected if no siteData exists yet
2. Add data via SiteData page first
3. Then switch models to see metrics

### Scenario: Console shows warnings instead of ✅
1. Warnings (⚠️) are informational, usually safe
2. Errors (❌) are problems that need investigation
3. Check Network tab for failed API requests (4xx, 5xx status)

---

## Next Steps After Verification

Once the fix is confirmed working:

1. **Test on Production** (after going live)
   - Verify with real user data
   - Monitor for console errors
   - Check performance impact

2. **Refine UI/UX** (Optional)
   - Add visual transition when switching models
   - Show loading state more prominently
   - Add tooltips explaining each model

3. **User Documentation**
   - Create user guide explaining GTM models
   - Screenshot each model view
   - Explain when to use each model

4. **Complete Week 2-3 Features**
   - Manual metric input (SiteData page)
   - Data quality tracking with badges
   - Insights/alerts for missing metrics

---

## Summary of Fix

| Aspect | Before | After |
|--------|--------|-------|
| **Callback** | `setGtmModelId` | `handleGtmModelChange` |
| **Server Sync** | ❌ No | ✅ Yes |
| **Data Fetch** | ❌ No | ✅ Yes (new model definition, status, insights) |
| **Display Change** | ❌ No actual change | ✅ Stages, metrics update |
| **Logging** | ❌ Minimal | ✅ Comprehensive (model tracking, flow status) |
| **Metrics Shown** | Readiness % only | ✅ Actual values + readiness |

**Result**: The GTM Operating Model Selector now works end-to-end, enabling users to switch business models and see the Dashboard interpret their data through different operational lenses.
