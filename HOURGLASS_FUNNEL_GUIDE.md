# Hourglass Funnel Model Guide

## Overview

The Hourglass Funnel is a 7-stage customer lifecycle model designed to track the complete customer journey from awareness through advocacy. It expands beyond traditional acquisition funnels to include post-conversion metrics like retention, expansion, and advocacy.

## 7 Stages of the Hourglass

### 1. **Awareness** (Purple) - Brand Visibility
**Goal:** Maximize brand visibility and reach
- **Metrics:** Impressions, reach, page views, brand searches, followers gained
- **Key Questions:** How many people see our brand? What's our market reach?

### 2. **Interest** (Blue) - Traffic & Engagement
**Goal:** Drive engagement and traffic
- **Metrics:** Clicks, sessions, users, engagement rate, social interactions
- **Key Questions:** How many aware people show genuine interest? What's driving traffic?

### 3. **Consideration** (Cyan) - Lead Generation
**Goal:** Generate and qualify leads
- **Metrics:** Leads generated, form submissions, demos, trials, CPL
- **Key Questions:** How many people are we converting to leads? What's our lead quality?

### 4. **Conversion** (Emerald) - Revenue Generation
**Goal:** Drive revenue and close deals
- **Metrics:** Conversions, revenue, MRR/ARR, deals closed, ROI
- **Key Questions:** How much revenue are we generating? What's our deal velocity?

### 5. **Retention** (Amber) - Customer Loyalty
**Goal:** Keep customers engaged and reduce churn
- **Metrics:** Churn rate, NPS, retention rate, active users, repeat visits
- **Key Questions:** How many customers stay? How satisfied are they?

### 6. **Expansion** (Orange) - Revenue Growth from Existing Customers
**Goal:** Grow revenue from existing customers
- **Metrics:** MRR/ARR growth, expansion deals, expansion revenue
- **Future CRM Integration:** Upsell value, cross-sell value, CLV
- **Key Questions:** How much are existing customers growing? What's our expansion rate?

### 7. **Advocacy** (Rose) - Brand Promotion & Referrals
**Goal:** Turn customers into brand advocates
- **Metrics:** NPS, referral-driven traffic, followers, shares, brand searches
- **Future Integrations:** Referral revenue, case studies, testimonials
- **Key Questions:** How many customers actively promote us? What's our referral rate?

## How to Use in Marketing OS

### Selecting the Hourglass Model
1. Open **Dashboard**
2. Click **Funnel Selector** in the toolbar
3. Choose **Hourglass** from the dropdown
4. All dashboards and insights update to show 7-stage lifecycle

### What Changes
- **Dashboard:** Metrics grouped by all 7 stages instead of 5
- **Insights:** Stage-specific insights and recommendations
- **Plan:** Filter initiatives by stage
- **Execution:** Prioritize by target stage

## Integration with Features

### Dashboard
- Summary cards for each stage
- Key movements per stage
- Stage-specific bottleneck analysis
- Budget impact by stage

### Insights
- Insights generated per stage
- Stage-specific recommendations
- Lifecycle trend analysis
- Cross-stage correlations

### Execution Prioritization
- Ideas/experiments/initiatives filterable by stage
- "What to Do Next" widget shows high-priority items per stage
- Stage-aware prioritization scoring

### ABM Mode
- Account engagement tracked across all 7 stages
- ABM health scores include expansion & advocacy signals
- Account lifecycle position visible in reporting

## Metrics Availability

### Available Now (From Existing Sources)
✅ Awareness through Conversion
- Google Analytics, Google Ads, LinkedIn Ads, GSC
- Social media metrics
- Form and conversion data

### Partially Available
⚠️ Retention metrics vary by platform
- Engagement available
- Churn requires CRM data
- NPS requires survey tool

### Future (CRM Integration)
📋 Expansion & full Advocacy metrics
- Upsell/cross-sell tracking
- Referral attribution
- Account expansion metrics
- Customer health scores

## Stage Transitions (Key Ratios)

| Transition | Metric | Tracks |
|-----------|--------|--------|
| Awareness → Interest | CTR | Engagement from visibility |
| Interest → Consideration | Lead Gen Rate | Conversion to leads |
| Consideration → Conversion | Close Rate | Sales effectiveness |
| Conversion → Retention | Retention Rate | Customer stickiness |
| Retention → Expansion | Expansion Rate | Revenue growth per customer |
| Expansion → Advocacy | Advocacy Rate | Customer promoters |

## Common Use Cases

### E-commerce
Focus: Awareness (ads) → Consideration (product research) → Conversion (purchase) → Retention (repeat customers) → Expansion (higher AOV)

### B2B SaaS
Focus: Awareness (content) → Interest (lead forms) → Consideration (demos) → Conversion (paid signup) → Retention (engagement) → Expansion (seat growth)

### Agency Services
Focus: Awareness (brand) → Interest (RFP) → Consideration (proposal) → Conversion (project start) → Retention (delivery) → Expansion (additional projects)

## Troubleshooting

**"No data for Expansion/Advocacy"**
- These stages require CRM integration
- Manual data entry coming soon
- Use existing metrics as proxy for now

**"Wrong stage for my metric"**
- Default mapping available in metricClassification.ts
- Custom mapping planned for future versions

**"Stage seems empty"**
- Check if your data sources provide those metrics
- Some stages may not apply to your business model

## Technical Details

### Stage Colors (Tailwind)
- Awareness: `bg-purple-100 text-purple-700`
- Interest: `bg-blue-100 text-blue-700`
- Consideration: `bg-cyan-100 text-cyan-700`
- Conversion: `bg-emerald-100 text-emerald-700`
- Retention: `bg-amber-100 text-amber-700`
- Expansion: `bg-orange-100 text-orange-700`
- Advocacy: `bg-rose-100 text-rose-700`

### Configuration Files
- **Server:** `server/src/lib/funnelModels.ts` - HOURGLASS_MODEL definition
- **Client:** `client/src/lib/funnelModels.ts` - Type definitions
- **Selector:** `client/src/components/FunnelSelector.tsx` - UI selection

### Metric Mapping
See `server/src/lib/funnelModels.ts` for complete `stageToMetrics` mapping.

## Future Enhancements

1. **CRM Integration** - Direct Salesforce/HubSpot sync
2. **Custom Stages** - Reorder or modify stages
3. **Advanced Analytics** - Cohort analysis per stage
4. **Funnel Flow** - Visualization of user movement
5. **Stage Duration** - How long users spend in each stage
6. **Revenue Attribution** - Revenue impact per stage

---

**Status:** ✅ Production Ready
**Version:** 1.0
**Created:** 2026-04-28
