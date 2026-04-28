# Unit Economics Module - Configuration & Interpretation Guide

## Overview

The Unit Economics module transforms raw marketing data into strategic business decisions by analyzing **Customer Acquisition Cost (CAC)**, **Lifetime Value (LTV)**, and their relationship to business sustainability.

**Key Questions Answered:**
- How much does each customer cost to acquire?
- What is the lifetime value of a customer?
- Is the business model sustainable? (LTV/CAC ratio)
- How long to break even on acquisition spend? (Payback period)
- Are we losing customers faster than expected? (Churn rate)

---

## Navigation

### Access the Module

1. **From Dashboard**: Scroll to section 3.6 "Unit Economics" widget → Click "View Full Analysis"
2. **From Sidebar**: Under "Análise" section → Click "Unit Economics"
3. **Direct URL**: `/unit-economics`

### Configure Settings

1. Click "Configure" button on Unit Economics dashboard (top right)
2. Or navigate directly to `/unit-economics-config`
3. Adjust settings and click "Save Configuration"

---

## Configuration Guide

### CAC (Customer Acquisition Cost)

#### 1. **Cost Components** - What expenses to include in CAC?

Select all costs that should be attributed to customer acquisition:

**☐ Media Spend** (Recommended - Usually the primary CAC component)
- Google Ads, Facebook Ads, LinkedIn Ads platform costs
- Includes: clicks, impressions, conversions charged by platform

**☐ Team Salary** (Optional - Allocate marketing team costs)
- Annual marketing team salary / 12 / number of customers acquired per month
- Useful if you want all-in CAC including team costs

**☐ Tools & Software** (Optional - Marketing tool subscriptions)
- Marketing automation tools, analytics platforms, CRM
- Allocate proportionally to acquisition activities

**☐ Fixed Costs** (Optional - Infrastructure overhead)
- Office rent, servers, utilities allocated to marketing
- Use if you want comprehensive cost accounting

**Default**: Select only **Media Spend** for lean CAC analysis

---

#### 2. **Attribution Model** - How to credit each channel?

Choose how to distribute customers when they arrive through multiple touchpoints:

**🔵 First Touch** (Marketing Funnel / Awareness-focused)
- Credit the FIRST channel that touched the customer
- Best for understanding awareness and top-of-funnel effectiveness
- Tends to show lower CAC (earlier touchpoints often cheaper)
- *Use when*: Focus is on initial awareness/discovery

**🔴 Last Touch** (Conversion-focused)
- Credit the LAST channel before conversion
- Best for understanding direct conversion drivers
- Tends to show higher CAC (final touchpoints more expensive)
- *Use when*: Focus is on immediate purchase drivers (default)

**🟡 Linear** (Balanced distribution)
- Credit all channels equally in the customer journey
- Distributes credit across awareness + conversion stages
- Shows "average" channel value
- *Use when*: Want balanced view of entire funnel

**Default**: **Last Touch** (most common for acquisition analysis)

---

### LTV (Lifetime Value)

LTV measures the total revenue expected from a customer over their entire relationship with your company. Choose ONE calculation method based on your business model:

#### 1. **Simple LTV** (E-Commerce / Transactional)

**Formula**: Initial Order Value × Multiplier

**Use When**:
- One-time purchase products (books, courses, physical goods)
- Repeat purchases within 1 year are minimal
- Simple repeat rate (e.g., "customers buy 3 times")

**Configuration**:
- **Multiplier**: How many times does a customer repurchase?
  - Default: 3.0 (customer buys 3 times on average)
  - Examples:
    - E-commerce: 2-5x typical
    - Premium products: 1.5-2x
    - Consumables: 5-10x

**Example**:
- Initial order value: $100
- Multiplier: 3.0
- **LTV = $300**

---

#### 2. **Churn-Based LTV** (SaaS / Recurring Revenue)

**Formula**: (Monthly ARPU × Gross Margin) / Monthly Churn Rate

**Use When**:
- Subscription or recurring revenue model
- Monthly or annual billing
- Predictable churn patterns (e.g., 5% per month)

**Configuration**:

**Gross Margin %** (0-100%)
- Percentage of revenue retained after cost of goods sold
- Formula: (Revenue - COGS) / Revenue × 100%
- Examples:
  - SaaS (mostly software): 70-85%
  - Marketplaces (commissions): 30-50%
  - Subscription boxes: 40-60%
- **Default**: 70%

**Monthly Churn Rate** (0-100%)
- Percentage of customers lost per month
- Examples:
  - Mature SaaS: 1-3% per month
  - Early-stage: 5-10% per month
  - Sticky products: <1% per month
- **Default**: 5%
- *Lower churn = higher LTV*

**Example**:
- Monthly ARPU: $100
- Gross Margin: 70%
- Monthly Churn: 5%
- **LTV = ($100 × 0.70) / 0.05 = $1,400**

---

#### 3. **CRM-Driven LTV** (Historical / Actual Data)

**Formula**: Observed Average Lifetime Revenue per Customer

**Use When**:
- You have 1-2 years of historical customer data
- Can calculate actual lifetime spend from CRM
- Want to use empirical data instead of assumptions

**Configuration**:
- System uses actual observed revenue from customer records
- No parameters to configure
- **Most accurate for mature products**

---

### Business Assumptions

#### **Target Payback Period** (Months)

How many months is acceptable to recover customer acquisition cost?

**Payback Period** = CAC / (Monthly Revenue × (1 - Churn Rate))

**Interpretation**:
- **< 12 months**: ✅ **Healthy** (quick ROI, good business model)
- **12-18 months**: ⚠️ **Warning** (extended cash flow impact)
- **> 18 months**: ✗ **Critical** (may never break even)

**Examples**:
- Startup with high growth: 12-18 months acceptable
- Mature business: <12 months target
- Premium products: 18-24 months acceptable

**Default**: 12 months

---

#### **Segment Analysis By**

How to break down unit economics metrics?

**Options**:
- **Channel** (Default): Google Ads, LinkedIn, Direct, Organic
- **Campaign**: Individual ad campaigns, seasonal promotions
- **Source**: UTM source, referral source, organic search

Choose based on how you want to compare acquisition efficiency.

---

## Dashboard Guide

### Overview Tab

Displays snapshot of current unit economics health:

#### **Summary Cards**

**1. Average CAC**
- Average cost to acquire one customer across all channels
- Trend indicator shows MoM change
- ↑ Rising CAC = efficiency declining (bad)
- ↓ Falling CAC = efficiency improving (good)

**2. LTV**
- Customer lifetime value using configured method
- Based on your selected calculation method (simple/churn-based/CRM-driven)

**3. LTV/CAC Ratio**
- Most important metric for business health
- Shows "health status" badge:
  - ✓ **Healthy** (>3.0x): Sustainable growth, strong unit economics
  - ⚠ **Warning** (2.0-3.0x): Marginal profitability, optimize needed
  - ✗ **Critical** (<2.0x): Losing money on acquisitions

**4. Payback Period**
- Number of months to recover customer acquisition cost
- Shows when breakeven is reached

#### **Channel Breakdown Table**

| Channel | Spend | Customers | CAC | Trend |
|---------|-------|-----------|-----|-------|
| google_ads | $5,000 | 50 | $100 | ↑ 5% |
| linkedin_ads | $3,000 | 25 | $120 | ↓ 3% |

**How to read**:
- Compare CAC across channels to identify efficient vs expensive channels
- Trends show if channel is becoming more or less efficient
- High-trend channels may need optimization

---

### Detailed Analysis Tab

Interactive charts showing trends and progression:

#### **CAC Trend Chart**
- Month-over-month CAC by channel
- Identifies rising CAC problems early
- **Warning threshold**: >5% MoM increase
- **Action**: If rising, investigate bid increases or audience saturation

#### **LTV by Cohort Chart**
- Shows retention curves for customer cohorts
- Newer cohorts typically have lower confirmed LTV
- **Action**: If new cohorts underperform, investigate acquisition quality

#### **Payback Progression Chart**
- Month-by-month revenue recovery
- Vertical line shows CAC baseline
- Intersection point = payback month
- **Action**: If extending beyond target, reduce CAC or improve retention

#### **Churn Analysis**
- Monthly churn rate trend
- Spikes indicate retention problems
- Validates LTV assumptions
- **Action**: If churn increases, investigate product/service issues

---

### Insights & Decisions Tab

Automated anomaly detection with recommended actions:

#### **Insight Types**

**1. Rising CAC** 🔺
- **Trigger**: CAC up >5% MoM or >10% YoY
- **Severity**: Warning (>5% MoM), Critical (>10% MoM)
- **Possible Causes**:
  - Market saturation or increased competition
  - Audience fatigue from repeated ads
  - Platform bid increases or algorithm changes
  - Seasonal changes (holidays, seasonality)
  - Lower quality lead generation
- **Suggested Actions**:
  - Pause underperforming ad sets
  - Test new audiences or targeting
  - Improve landing page conversion rate
  - Audit UTM tracking for accuracy

**2. Falling LTV** 📉
- **Trigger**: Recent cohorts 15-25% lower than 12-month baseline
- **Severity**: Warning (>15% decline), Critical (>25% decline)
- **Possible Causes**:
  - Lower initial order value (cheaper products or discounts)
  - Higher churn on new cohorts (retention problem)
  - Channel mix shift (sourcing from lower-quality channels)
  - Product/service quality decline
- **Suggested Actions**:
  - Analyze recent cohort quality (source, product mix)
  - Investigate retention and support issues
  - Review pricing and promotional activity
  - Check product/market fit changes

**3. Unhealthy Ratio** ⚠️
- **Trigger**: LTV/CAC < 2.5x (warning) or < 1.5x (critical)
- **Severity**: Warning (2.0-2.5x), Critical (<1.5x)
- **Possible Causes**:
  - CAC too high (paying too much for customers)
  - LTV too low (customers not spending enough / churning too fast)
  - Business model not viable at current unit economics
- **Suggested Actions**:
  - Reduce CAC via cheaper channels or improved conversion
  - Improve LTV via retention initiatives or upsells
  - Consider adjusting pricing or business model
  - Pause unprofitable channels

**4. Churn Spike** 📊
- **Trigger**: Churn rate > 1.5x baseline (warning) or > 2.0x (critical)
- **Severity**: Warning (>1.5x baseline), Critical (>2.0x baseline)
- **Possible Causes**:
  - Quality issue with recent cohorts
  - Product/service problem or regression
  - External factor (economic downturn, competitor change)
  - Support/onboarding issues for new customers
- **Suggested Actions**:
  - Audit recent cohort demographics and source
  - Review support tickets for common issues
  - Check product/service quality (if applicable)
  - Run retention campaigns for at-risk segments

**5. Long Payback Period** ⏱️
- **Trigger**: Payback > target (default 12 months)
- **Severity**: Warning (>18 months), Critical (>24 months)
- **Possible Causes**:
  - CAC too high relative to monthly revenue
  - Monthly revenue per customer too low
  - High churn reducing projected lifetime
  - Extended sales cycle (enterprise customers)
- **Suggested Actions**:
  - Reduce CAC via channel optimization
  - Increase monthly revenue (upsells, pricing)
  - Improve retention (lower churn)
  - If B2B: longer payback may be acceptable

#### **How to Use Insights**

1. **Review Daily**: Check Insights tab for new anomalies
2. **Prioritize**: Focus on Critical severity first, then Warning
3. **Act**: Click suggested action or investigate manually
4. **Dismiss**: Once addressed, click dismiss to remove from active list
5. **Track**: Resolved insights appear in "Historical" view

---

## Interpretation Examples

### Scenario 1: Rising CAC, Healthy LTV/CAC Ratio

```
CAC: $100 → $110 (+10%)
LTV: $900
Ratio: 8.2x → 8.2x (unchanged)
Status: ⚠️ Warning
```

**Interpretation**: CAC is increasing (efficiency declining), but ratio remains healthy. **Action**: Monitor trend; if continues, investigate causes.

---

### Scenario 2: Healthy Ratio, Rising Payback

```
CAC: $100 (stable)
LTV: $900 (stable)
Ratio: 9.0x ✅ (healthy)
Payback: 2 months → 3 months (↑50%)
Status: ⚠️ Warning
```

**Interpretation**: Ratio is healthy but payback extending. Churn may be increasing or monthly revenue declining. **Action**: Review churn metrics and monthly revenue trends.

---

### Scenario 3: Critical Ratio, Need Action

```
CAC: $150 (↑ 50%)
LTV: $300 (↓ 25%)
Ratio: 2.0x ⚠️ (warning)
Status: ✗ Critical
```

**Interpretation**: Ratio in critical zone. CAC rising while LTV falling = bad combination. **Action**: Urgent optimization needed. Reduce CAC via channel mix, improve LTV via retention/upsells.

---

## Integration with Other Modules

### Dashboard Widget
- Shows quick summary of CAC, LTV/CAC ratio, active issues
- Links to full Unit Economics analysis
- Updates with each dashboard refresh

### Funnel Models
Unit Economics metrics integrated into all funnel stages:

**Hourglass Model (7-stage)**:
- **Interest Stage**: CPC, CAC trend (acquisition efficiency)
- **Conversion Stage**: CAC, LTV, LTV/CAC ratio, payback (customer economics)
- **Retention Stage**: Churn rate, LTV (lifecycle value)

**AIDA, AARRR, TOFU-MOFU-BOFU, Sales-Led**: Similar stage-specific mappings

### Insights System
- Unit Economics insights appear in main Insights feed
- Ranked by severity alongside performance anomalies
- Offer actionable recommendations

---

## Best Practices

### 1. **Establish Baseline First**
- Run with defaults for 1-2 months
- Observe actual patterns
- Then adjust settings based on reality

### 2. **Segment by Channel**
- Compare CAC across channels (Google, LinkedIn, Direct)
- Identify most efficient channel for scaling
- Pause expensive channels below LTV threshold

### 3. **Monitor Trends, Not Snapshots**
- Single month anomalies are normal
- Look for 2-3 month trends for real signals
- React to consistent 10%+ changes

### 4. **Validate Assumptions**
- Compare calculated LTV to actual customer data
- If difference >20%, adjust multiplier/parameters
- Use CRM data when available

### 5. **Set Improvement Goals**
- Target ratio: >3.0x (healthy sustainable growth)
- Target payback: <12 months (quick ROI)
- Review monthly, adjust quarterly

### 6. **Prioritize High-Impact Changes**
1. **Reduce CAC** (easier, faster): Optimize channels, improve ad creative
2. **Improve LTV** (harder, slower): Retention, upsells, pricing

---

## Common Questions

### Q: Which LTV method should I use?
**A**: 
- **Simple**: If one-time purchase products → use multiplier
- **Churn-based**: If subscription/recurring → use churn rate approach
- **CRM-driven**: If 1+ year of data → use actual historical data
- *Start with Simple, migrate to Churn-based/CRM as you scale*

### Q: My ratio is <2.0x. Am I doomed?
**A**: Not necessarily. Depends on context:
- Startup with 12-month runway: Can subsidize growth
- Mature business: Must improve immediately
- High-LTV B2B: May have 24-month acceptable payback
- **Action**: Understand why ratio is low, then optimize CAC or LTV

### Q: CAC increased 20%. Should I panic?
**A**: Not if it's one month. Check:
1. Is it across all channels or one channel?
2. Did LTV increase (more valuable customers)?
3. Is it seasonal (holiday, end of quarter)?
4. Does trend continue next month?
- **Action**: Investigate before reacting

### Q: Why doesn't my calculated LTV match actual customer spend?
**A**: Common reasons:
- Multiplier too high/low (adjust based on reality)
- Churn rate estimate wrong (use actual data)
- Initial order value includes outliers (use median, not average)
- Time period too short (need 12+ months data)
- **Action**: Review assumptions quarterly with actual data

### Q: How often should I check unit economics?
**A**: 
- **Daily**: Quick glance at CAC/ratio on dashboard widget
- **Weekly**: Check for new insights in Insights tab
- **Monthly**: Full review of all metrics and trends
- **Quarterly**: Adjust configuration based on learnings

---

## Metric Definitions

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| **CAC** | Total Spend / Customers Acquired | Lower = better. Cost to acquire one customer. |
| **LTV** | Method-specific (simple/churn/CRM) | Higher = better. Total revenue from customer. |
| **LTV/CAC** | LTV / CAC | >3.0x healthy, 2.0-3.0x warning, <2.0x critical |
| **Payback** | CAC / Monthly Revenue × (1-Churn) | <12mo healthy, 12-18mo warning, >18mo critical |
| **Churn** | (Start - End + New) / Start | Lower = better. % of customers lost per period |
| **Health Score** | Weighted: 40% ratio + 40% payback + 20% churn | 0-100 scale. Higher = healthier economics. |

---

## Troubleshooting

### Charts Not Loading
- Check browser console for errors
- Verify API endpoints returning data (Network tab)
- Ensure database has metrics data

### Metrics Showing Zero
- Verify cost and conversion data exists in budgets/performanceEntries
- Check date range filters
- Ensure configuration is saved

### Anomalies Not Detected
- Thresholds may not be met (>5% for warning)
- Historical data needed for comparisons
- Check that insights are not dismissed

### Widget Not Showing on Dashboard
- Navigate to `/unit-economics` directly
- Check browser console for errors
- Verify UnitEconomicsWidget component imported

---

## Support & Resources

- **Module Docs**: See `/UNIT_ECONOMICS_GUIDE.md`
- **API Docs**: See `/server/src/routes/unitEconomics.ts`
- **Test Plan**: See `/UNIT_ECONOMICS_TEST_PLAN.md`
- **Database Schema**: See `/server/src/db/schema.ts` (unitEconomics* tables)

---

**Last Updated**: 2026-04-28
**Module Version**: 1.0 (Complete)
**Status**: ✅ Ready for Production
