# Growth Loops Engine - User Guide

Welcome to the Growth Loops Engine! This guide will help you understand, create, analyze, and optimize self-reinforcing growth cycles in your marketing-os platform.

---

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Creating & Managing Loops](#creating--managing-loops)
5. [Analyzing Loop Performance](#analyzing-loop-performance)
6. [Understanding Insights](#understanding-insights)
7. [Optimizing Loops](#optimizing-loops)
8. [Advanced Features](#advanced-features)
9. [FAQ](#faq)

---

## Overview

A **growth loop** is a self-reinforcing cycle where output from one stage becomes input for the next, creating sustainable growth. For example:
- **Viral Loop**: User signs up → Invites friends → Friends sign up → New invites
- **Content Loop**: Content attracts readers → Readers share → Shares bring more readers
- **Sales Loop**: Outreach finds prospects → Demos convert buyers → Referrals from buyers

The Growth Loops Engine helps you:
✅ **Model** your loops as distinct systems  
✅ **Measure** key metrics: CAC, LTV, payback period, health score  
✅ **Monitor** trends and anomalies in real-time  
✅ **Optimize** bottlenecks and scale high-performers  
✅ **Forecast** impact of changes before implementing them  

---

## Core Concepts

### The Loop Lifecycle
Every growth loop has 4 stages:

```
1. INPUT → 2. ACTION → 3. OUTPUT → 4. REINVESTMENT
(awareness)   (engagement)  (conversion)  (growth fuel)
```

**Example: Email Referral Loop**
1. **Input**: 10,000 leads in email list
2. **Action**: 2,500 people click referral link (25% conversion)
3. **Output**: 750 new sign-ups generated (30% conversion)
4. **Reinvestment**: Add 750 new emails to list → Back to Input

### Key Metrics

#### CAC (Customer Acquisition Cost)
**Formula**: Total Acquisition Cost ÷ Customers Acquired

For the email loop:
- Cost: $2,500 (email platform, salaries)
- Customers: 750
- **CAC = $2,500 ÷ 750 = $3.33 per customer**

**Healthy**: < $50  
**Warning**: $50-100  
**Critical**: > $100  

#### LTV (Lifetime Value)
**Formula**: Average Revenue Per Customer × Retention × Lifespan

For the email loop:
- First order value: $100
- Repeat purchase multiplier: 3x (3 purchases lifetime)
- **LTV = $100 × 3 = $300**

**Healthy**: LTV > 3× CAC  
**Warning**: LTV = 2-3× CAC  
**Critical**: LTV < 2× CAC  

#### LTV/CAC Ratio
**Formula**: LTV ÷ CAC

For the email loop: $300 ÷ $3.33 = **90:1 ratio** ✅ EXCELLENT

**Interpretation**:
- **> 3.0**: Healthy, sustainable growth
- **2.0-3.0**: Marginal, optimize to improve
- **< 2.0**: Unsustainable, losing money

#### Payback Period
**Formula**: CAC ÷ (Monthly Revenue per Customer × (1 - Churn Rate))

For the email loop:
- CAC: $3.33
- Monthly revenue: $10 per customer
- Churn: 5%
- **Payback = $3.33 ÷ ($10 × 0.95) = 0.35 months = 10 days**

**Interpretation**:
- **< 12 months**: Healthy, quick ROI
- **12-18 months**: Warning, cash flow concern
- **> 18 months**: Critical, may never break even

#### Health Score
**0-100 scale** combining:
- LTV/CAC ratio (40% weight)
- Payback period (30% weight)
- Conversion rate (20% weight)
- Growth rate (10% weight)

**80-100**: 🟢 Healthy  
**50-79**: 🟡 Warning  
**< 50**: 🔴 Critical  

#### Loop Strength
**Classification** based on multiple factors:

- **Strong** (⭐⭐⭐): LTV/CAC > 3.0 AND payback < 6mo AND growth > 20%
- **Medium** (⭐⭐): LTV/CAC 2.0-3.0 AND payback 6-12mo AND growth 10-20%
- **Weak** (⭐): LTV/CAC < 2.0 OR payback > 12mo OR growth < 10%

### Loop Types

The Engine supports 7 loop types with different characteristics:

| Type | Example | Input | Action | Output | Cycle Time |
|------|---------|-------|--------|--------|-----------|
| **Paid** | Google Ads → Landing page → Sale | Traffic | Click | Conversion | 1-7 days |
| **Viral** | User invites friends | Users | Invite | New users | 3-30 days |
| **Content** | Blog post → shares → readers | Content | Share | Page views | 7-90 days |
| **Sales** | Outreach → Demo → Deal | Leads | Demo | Customer | 7-30 days |
| **ABM** | Account targeting | Accounts | Meeting | Deal | 30-90 days |
| **Event** | Event → attendee → referral | Registrations | Attendance | New leads | 7-60 days |
| **Product** | Feature drives usage → retention → expansion | Users | Feature use | Upgrades | 7-180 days |

---

## Getting Started

### Step 1: Navigate to Growth Loops
From the sidebar, click **Growth Loops** (under Analysis section).

You'll see the Growth Loops dashboard with 4 tabs:
- **Overview**: Summary of all loops
- **Loop Details**: Deep dive into one loop
- **Insights**: Anomalies and recommendations
- **Comparison Matrix**: Health vs Scalability visualization

### Step 2: Create Your First Loop
Click the **"+ New Loop"** button at the top right.

**Fill out the form:**

1. **Loop Name**: "Email Referral Program" (descriptive, unique)
2. **Loop Type**: Select from dropdown (e.g., "viral")
3. **Input Type**: What drives the loop?
   - "leads" = email list size
   - "users" = app users
   - "traffic" = website visitors
4. **Action Type**: What do people do?
   - "invite" = send referral
   - "share" = share content
   - "click" = click ad
5. **Output Metric**: What gets counted as success?
   - "new_users" = new signups
   - "conversions" = purchases
   - "revenue" = dollars earned
6. **Target Metrics**: Your goals (optional, for reference)
   - Target CAC: $50
   - Target LTV: $500
   - Target payback: 10 months
   - Target cycle time: 24 hours

Click **Create Loop**.

Your loop is now live! Next, link it to your data sources.

### Step 3: Link to Campaigns/Channels
Once the loop is created, you need to tell the system which campaigns feed this loop.

**From the loop details page:**
1. Scroll to "Attribution" section
2. Click "Add Channel/Campaign"
3. Select channel (e.g., "Email")
4. Select campaign (e.g., "Referral Campaign")
5. Set attribution weight (usually 1.0 = 100% of campaign goes to loop)
6. Choose CAC source: "utm_attribution" or "calculated"
7. Save

The system will now automatically:
- Track costs from that campaign
- Count new customers acquired
- Calculate CAC for the loop
- Match to LTV and payback

---

## Creating & Managing Loops

### Creating a Viral Loop

**Example: Discord Invite Loop**

1. **Loop Name**: "Discord Invite Loop"
2. **Type**: Viral
3. **Input**: "new_users" (recent signups)
4. **Action**: "invite" (send server invites)
5. **Output**: "new_users" (friends who join)
6. **Targets**:
   - CAC: $5 (cost per person brought to Discord)
   - LTV: $100 (lifetime revenue per user)
   - Payback: 3 months
   - Cycle: 7 days

**Success metrics to track**:
- Input: Weekly new Discord sign-ups
- Action: % of users who send invites
- Output: New signups from referrals
- Quality: Are referred users as engaged as organic?

### Creating a Content Loop

**Example: Blog → Social Shares → Organic Traffic**

1. **Loop Name**: "Content-to-Traffic Loop"
2. **Type**: Content
3. **Input**: "content_published" (new posts)
4. **Action**: "share" (social shares)
5. **Output**: "organic_traffic" (new visitors)
6. **Targets**:
   - CAC: $0 (organic!)
   - LTV: $75 (average revenue per visitor)
   - Payback: Immediate
   - Cycle: 30 days

**Success metrics to track**:
- Posts per month
- Shares per post (target: 100+ by week 1)
- Organic traffic attribution
- Visitor → customer conversion rate

### Editing a Loop

1. Click the loop in the Overview or go to **Growth Loops Config**
2. Click **Edit** on the loop card
3. Update any fields (name, targets, status)
4. Click **Save**

Changes update immediately. Metrics recalculate automatically.

### Archiving a Loop

1. Click the loop
2. Click **Archive** (soft delete - data preserved)
3. Loop disappears from "Active" view but can be restored

---

## Analyzing Loop Performance

### Understanding the Overview Dashboard

**Loop Cards** show at-a-glance metrics:
- **Name & Type** badge
- **Health Score** (0-100, colored)
- **Key Metrics**:
  - Input volume (e.g., "5,000 leads")
  - Conversion rate (e.g., "25%")
  - CAC (e.g., "$3.33")
  - LTV (e.g., "$300")
  - LTV/CAC ratio (e.g., "90:1")
  - Payback period (e.g., "10 days")
- **Growth Rate** (e.g., "+25% MoM")
- **Status** (Active/Paused)

**Color coding**:
- 🟢 Green = Healthy (health score 80+)
- 🟡 Yellow = Warning (health score 50-79)
- 🔴 Red = Critical (health score < 50)

### Viewing Detailed Metrics

Click on a loop to see **Loop Details** tab:

**Input → Action → Output → Reinvestment** flow chart shows:
- Input volume (5,000)
- Action count (2,500)
- Conversion % (50%)
- Output count (1,250)
- Reinvestment $ (dedicated budget)

**Historical trends** (month-over-month):
- CAC trend: Is it rising (bad) or falling (good)?
- Conversion trend: Are people engaging more?
- LTV trend: Is customer quality improving?
- Growth acceleration: Is the loop expanding?

**Stage breakdown**:
- Time in each stage (how fast is the cycle?)
- Cost per stage (where is money spent?)
- Drop-off at each stage (where do people leave?)

### Comparing Multiple Loops

Click **Comparison Matrix** tab to see all loops plotted on:
- **X-axis**: Effort (CAC/spend required)
- **Y-axis**: Impact (LTV potential)

**Quadrants**:
- **Quick Wins** (top-left): High impact, low effort → Scale these!
- **Strategic Bets** (top-right): High impact, high effort → Build these
- **Fill Time** (bottom-left): Low impact, low effort → Nice to have
- **Reconsider** (bottom-right): Low impact, high effort → Pause or kill

---

## Understanding Insights

Insights are **automated alerts** that detect issues or opportunities in your loops.

### The 5 Insight Types

#### 1. 🚨 Bottleneck Detection
**What it is**: A stage where conversion drops below benchmark

**Example**:
```
"Email Referral Loop - Bottleneck Detected
Input → Action: 50% (benchmark: 40%) ✓ OK
Action → Output: 15% (benchmark: 40%) ✗ BOTTLENECK"
```

**What it means**: People are clicking the referral link, but few are converting to signup. Problem: Landing page, offer, or form friction.

**Suggested Actions**:
- 🔴 Test landing page variants (CTA color, copy, images)
- 🔴 Simplify signup form (remove optional fields)
- 🟡 Check device compatibility (mobile experience?)
- 🟡 Test different offers (free trial vs discount)

**What to do**: Click the top action, implement A/B test, measure conversion for 1-2 weeks.

---

#### 2. 📈 Efficiency Degradation
**What it is**: CAC rising, conversion falling, or cycle time extending

**Example**:
```
"Email Referral Loop - Efficiency Degrading
CAC: $3.33 → $3.98 (+19% this month) ⚠️
Conversion: 50% → 40% (-20% this month) ⚠️
Cycle time: 7 days → 10 days (+43% this month) ⚠️"
```

**What it means**: The loop is getting more expensive, less effective, and slower. Likely cause: Market saturation, list fatigue, platform algorithm changes.

**Suggested Actions**:
- 🔴 Analyze audience changes (are we reaching the same people?)
- 🔴 Test new creative (are emails stale?)
- 🟡 Reduce email frequency (combat list fatigue)
- 🟡 Segment audience (tailor message per group)
- 🔴 Audit tracking (is conversion tracking accurate?)

**What to do**: Look for root cause (check last 30 days of changes), implement 1-2 fixes, monitor for 2-4 weeks.

---

#### 3. 🚀 Scalability Potential
**What it is**: Loop is healthy and growing fast – opportunity to scale

**Example**:
```
"Email Referral Loop - High Growth Detected
Health score: 85/100 ✓ Strong
Monthly growth: +28% ✓ Accelerating
CAC trend: Stable/improving ✓
Potential multiplier: 5x (could do 5× current volume)"
```

**What it means**: This loop works well and can handle more investment. You can confidently increase spending/effort.

**Suggested Actions**:
- 🟢 Increase email send volume (+50% more invites)
- 🟢 Expand audience (target look-alike segments)
- 🟢 Allocate more resources (team time, tools, budget)
- 🟢 Extend cycle (enable multi-stage nurturing)
- 🟢 Partner expansion (co-promote with allies)

**What to do**: Implement 1-2 growth actions, expect CAC to stay flat or improve, revenue to grow 2-5×.

---

#### 4. ⚠️ Unsustainability Detected
**What it is**: Loop burning money (LTV < 2× CAC) with no path to profitability

**Example**:
```
"Paid Ads Loop - Unsustainable Economics
LTV: $100
CAC: $75
Ratio: 1.3:1 (target: 3:1)
Payback: 24 months (target: 12 months)
Reinvestment: 5% (need: 15%+)"
```

**What it means**: Each customer costs nearly as much as they're worth. At this rate, you'll never recoup acquisition costs before they churn.

**Suggested Actions**:
- 🔴 PAUSE SPENDING immediately (stem bleeding)
- 🔴 Reduce CAC (use cheaper channels, improve targeting)
- 🔴 Improve LTV (upsells, subscription, retention)
- 🔴 Reduce targeting costs (geographic, demographic restrictions)
- 🔴 Build brand (organic + word-of-mouth to reduce paid dependency)
- 🟡 Extend payback window (if customer lifetime can reach 36+ months)

**What to do**: Pause or reduce spending immediately. Spend 2-4 weeks fixing LTV or CAC. If neither improves, kill the loop.

---

#### 5. ⚡ Acceleration Detected
**What it is**: Loop inflection point – CAC dropping, conversion rising, volume surging

**Example**:
```
"Viral Loop - Acceleration Inflection
CAC: $20 → $15 (-25%) 🟢
Conversion: 25% → 35% (+40%) 🟢
Monthly growth: +45% 🟢
Status: Entering exponential growth phase"
```

**What it means**: The loop is hitting escape velocity. Network effects or virality are kicking in. This is the moment to push hard.

**Suggested Actions**:
- 🟢 Double down on spending (growth window is NOW)
- 🟢 Hire team to handle inbound (you'll be overwhelmed)
- 🟢 Prepare infrastructure (servers, support, fulfillment)
- 🟢 Secure funding (growth requires capital)
- 🟢 Expand to new segments (ride the wave)

**What to do**: Act immediately. Capitalize on momentum before competitors notice. Next 4-8 weeks are critical.

---

### Dismissing Insights

If an insight is outdated or not actionable:
1. Click **Dismiss** on the insight card
2. Insight moves to "Dismissed" history (not deleted)
3. If similar issue detected later, new insight will be created

You can view dismissed insights in history if needed.

---

## Optimizing Loops

### The Optimization Workflow

```
1. Analyze (identify problem)
2. Hypothesize (guess root cause)
3. Test (run A/B experiment)
4. Measure (track for 2-4 weeks)
5. Implement (roll out winner or kill)
6. Monitor (watch for side effects)
```

### Optimization Examples

#### Problem: Rising CAC
**Insight**: "Email Loop - CAC up 20% this month ($3.33 → $4.00)"

**Diagnosis**:
- Check if input list size changed (maybe fewer engaged users)
- Check if conversion rate changed (maybe landing page issue)
- Check if costs changed (maybe platform raising rates)

**Experiments**:
- A: Send referral email 2x/week instead of 1x (increase volume)
- B: Test new subject line (improve open rate)
- C: Test new landing page (improve conversion)
- D: Target only power users (improve quality)

**Measurement**:
- Run for 14-28 days (need statistical significance)
- Track CAC, not just activity

**Decision**:
- Winner: Scale to 100% of traffic
- Loser: Revert or iterate

#### Problem: Low Conversion at Action Stage
**Insight**: "Content Loop - Bottleneck detected: Share rate 10% (benchmark: 20%)"

**Diagnosis**:
- Are people reading content? (check engagement time)
- Is share button visible? (check mobile UX)
- Is share benefit clear? (do they understand why share?)

**Experiments**:
- A: Move share button above the fold
- B: Offer incentive for shares (bonus points, raffle entry)
- C: Simplify share copy ("Share with 1 friend" vs "Share widely")
- D: Pre-fill share message (remove friction)

**Measurement**:
- Run for 7-14 days
- Track share-to-post ratio, not absolute shares

**Decision**:
- Winner: Scale broadly
- Loser: Try next test

#### Problem: Flat Growth
**Insight**: "Product Loop - No new growth detected, using existing customer pool"

**Diagnosis**:
- Loop is recycling existing customers, not attracting new ones
- Reinvestment might be too low or going wrong direction

**Experiments**:
- A: Expand to new customer segment (different industry, company size)
- B: Partner with complementary product (cross-promotion)
- C: Create free tier (reduce barrier to entry)
- D: Referral incentives (encourage existing to bring friends)

**Measurement**:
- Run for 30 days
- Track new user acquisition, not existing

**Decision**:
- If no movement: Loop may be mature, shift resources elsewhere
- If growth returns: Scale winning channel

---

## Advanced Features

### Unit Economics Integration
View how each loop contributes to overall unit economics:

1. Navigate to **Unit Economics** page
2. Filter by loop (if available)
3. See CAC, LTV, payback broken down per loop
4. Identify most profitable loop

### Funnel Model Integration
See how loops fit in your overall funnel:

1. Navigate to **Funnel** page
2. Select funnel model (AIDA, AARRR, Hourglass, etc.)
3. Loops appear as metrics on relevant stages
4. Example: "Viral loop input" → Awareness stage, "Viral loop output" → Conversion stage

### Attribution Mapping
Link campaigns to specific loops:

1. Navigate to **Growth Loops Config**
2. Edit loop
3. Scroll to "Attribution" section
4. Click "Add Campaign"
5. Select campaign from dropdown
6. Set weight (usually 1.0 = 100%)
7. Save

Now when that campaign runs:
- Costs automatically attributed to loop
- Conversions from campaign → loop output
- Loop metrics update automatically

### Export & Analysis
To export loop data for external analysis:

1. Go to **Growth Loops** page
2. (Feature coming soon) Click "Export"
3. Select format: CSV, JSON, or PDF
4. Download and analyze in Excel, Python, Tableau, etc.

---

## FAQ

### Q: How often are metrics updated?
**A**: Metrics update daily (overnight). Some real-time metrics like CAC update when campaigns sync (usually within 24 hours of spend).

### Q: Can I have multiple loops of the same type?
**A**: Yes! You might have "Email Referral Loop" and "SMS Referral Loop" both running. Compare them to see which is more efficient.

### Q: What if my loop spans multiple channels?
**A**: Use Attribution weights. If an email campaign and Facebook ad both feed the same loop, set each to 0.5 weight. CAC and LTV will be aggregated.

### Q: How do I know if my loop health score is good?
**A**: 
- 80-100 = Excellent, scale it
- 50-79 = Good, optimize it
- < 50 = Struggling, fix or kill it

### Q: Should I optimize CAC or LTV first?
**A**: 
1. If CAC is high (ratio < 2:1): Reduce CAC first (faster)
2. If LTV is low (ratio < 2:1): Improve LTV first (more sustainable)
3. If both are bad: Fix CAC first, then LTV

### Q: How long before I see results from optimization?
**A**: 
- Paid loops: 1-2 weeks
- Viral loops: 2-4 weeks (slower feedback)
- Content loops: 4-8 weeks (compounding effect)

### Q: Can I pause and resume a loop?
**A**: Yes! Click the loop, then toggle "Status" from Active to Paused. Metrics freeze but data preserved.

### Q: What's the difference between Bottleneck and Degradation insights?
**A**: 
- **Bottleneck** = One stage is consistently converting worse than benchmark (structural problem)
- **Degradation** = Overall efficiency getting worse over time (trend problem)

### Q: How do I compare 2 loops side-by-side?
**A**: 
1. Go to **Comparison Matrix** tab
2. Look for both loops on the grid
3. Click either loop to see full details
4. Or create a custom report by exporting both

### Q: What if my loop metrics aren't updating?
**A**: 
1. Check if campaigns linked to loop have active data
2. Check data source (Google Analytics, UTM tags) flowing to platform
3. Wait 24 hours (metrics update daily)
4. Contact support if still not updating

### Q: Can I project future growth?
**A**: Currently, growth projections are in insights ("scalability potential shows 5x possible"). Advanced forecasting coming soon.

### Q: How do I measure loop virality (coefficient)?
**A**: Not built into MVP yet. For now, track: (Output ÷ Input) = virality factor.
- 0.15 = Email referral typical
- 0.25+ = Viral products (Dropbox, Slack)

### Q: Should I focus on one loop or multiple?
**A**: Build multiple loops:
- 1-2 strong loops (scale these)
- 2-3 medium loops (optimize these)
- 1-2 experimental loops (test new channels)
- Avoid more than 5-6 (attention fragmented)

---

## Support & Resources

- **Documentation**: GROWTH_LOOPS_IMPLEMENTATION.md (technical details)
- **Test Plan**: GROWTH_LOOPS_TEST_PLAN.md (what's tested)
- **API Reference**: /api/growth-loops (endpoint details)
- **Feedback**: [Create issue in GitHub]
- **Questions**: [Slack channel or email]

---

**Last Updated**: 2026-04-28  
**Version**: 1.0  
**Status**: Production Ready
