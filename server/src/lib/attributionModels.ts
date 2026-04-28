/**
 * Attribution Model Calculation Logic
 * Implements first-touch, last-touch, linear, and time-decay attribution models
 */

export interface TouchpointData {
  sessionId: string;
  campaignId: number;
  timestamp: Date;
  conversionValue: number;
}

export interface AttributionResult {
  campaignId: number;
  firstTouchCredit: number;
  lastTouchCredit: number;
  linearCredit: number;
  timeDecayCredit: number;
}

/**
 * First-Touch Attribution
 * The first campaign in the user journey gets 100% credit
 */
export function calculateFirstTouchAttribution(
  touchpoints: TouchpointData[],
  conversionValue: number
): AttributionResult[] {
  if (touchpoints.length === 0) {
    return [];
  }

  // Sort by timestamp ascending to find first touch
  const sorted = [...touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const firstTouch = sorted[0];

  // Create result for each unique campaign
  const results: AttributionResult[] = touchpoints
    .reduce((acc, touch) => {
      const existing = acc.find(r => r.campaignId === touch.campaignId);
      if (!existing) {
        acc.push({
          campaignId: touch.campaignId,
          firstTouchCredit: 0,
          lastTouchCredit: 0,
          linearCredit: 0,
          timeDecayCredit: 0,
        });
      }
      return acc;
    }, [] as AttributionResult[]);

  // Assign full credit to first touch
  const firstTouchResult = results.find(r => r.campaignId === firstTouch.campaignId);
  if (firstTouchResult) {
    firstTouchResult.firstTouchCredit = conversionValue;
  }

  return results;
}

/**
 * Last-Touch Attribution
 * The last campaign in the user journey gets 100% credit
 */
export function calculateLastTouchAttribution(
  touchpoints: TouchpointData[],
  conversionValue: number
): AttributionResult[] {
  if (touchpoints.length === 0) {
    return [];
  }

  // Sort by timestamp descending to find last touch
  const sorted = [...touchpoints].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastTouch = sorted[0];

  // Create result for each unique campaign
  const results: AttributionResult[] = touchpoints
    .reduce((acc, touch) => {
      const existing = acc.find(r => r.campaignId === touch.campaignId);
      if (!existing) {
        acc.push({
          campaignId: touch.campaignId,
          firstTouchCredit: 0,
          lastTouchCredit: 0,
          linearCredit: 0,
          timeDecayCredit: 0,
        });
      }
      return acc;
    }, [] as AttributionResult[]);

  // Assign full credit to last touch
  const lastTouchResult = results.find(r => r.campaignId === lastTouch.campaignId);
  if (lastTouchResult) {
    lastTouchResult.lastTouchCredit = conversionValue;
  }

  return results;
}

/**
 * Linear Attribution
 * All campaigns in the journey get equal credit
 */
export function calculateLinearAttribution(
  touchpoints: TouchpointData[],
  conversionValue: number
): AttributionResult[] {
  if (touchpoints.length === 0) {
    return [];
  }

  // Remove duplicates (same campaign in same user journey)
  const uniqueTouchpoints = Array.from(
    new Map(
      touchpoints.map(t => [t.campaignId, t])
    ).values()
  );

  const creditPerTouch = conversionValue / uniqueTouchpoints.length;

  // Create result for each unique campaign
  const results: AttributionResult[] = uniqueTouchpoints.map(touch => ({
    campaignId: touch.campaignId,
    firstTouchCredit: 0,
    lastTouchCredit: 0,
    linearCredit: creditPerTouch,
    timeDecayCredit: 0,
  }));

  return results;
}

/**
 * Time-Decay Attribution
 * More recent touchpoints get more credit (40% first, 60% distributed with decay)
 */
export function calculateTimeDecayAttribution(
  touchpoints: TouchpointData[],
  conversionValue: number,
  decayDays: number = 7
): AttributionResult[] {
  if (touchpoints.length === 0) {
    return [];
  }

  const sorted = [...touchpoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const conversionDate = sorted[sorted.length - 1].timestamp;

  // Calculate weights based on recency
  const weights = sorted.map(touch => {
    const daysBeforeConversion = Math.floor(
      (conversionDate.getTime() - touch.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Exponential decay: e^(-days/decay_period)
    return Math.exp(-daysBeforeConversion / decayDays);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Create result for each unique campaign with weighted credit
  const results: Map<number, number> = new Map();

  sorted.forEach((touch, index) => {
    const credit = (weights[index] / totalWeight) * conversionValue;
    results.set(touch.campaignId, (results.get(touch.campaignId) || 0) + credit);
  });

  return Array.from(results.entries()).map(([campaignId, credit]) => ({
    campaignId,
    firstTouchCredit: 0,
    lastTouchCredit: 0,
    linearCredit: 0,
    timeDecayCredit: credit,
  }));
}

/**
 * Combine attribution results from multiple models
 */
export function combineAttributionResults(
  firstTouch: AttributionResult[],
  lastTouch: AttributionResult[],
  linear: AttributionResult[],
  timeDecay: AttributionResult[]
): AttributionResult[] {
  // Get all unique campaign IDs
  const allCampaignIds = new Set<number>();
  [...firstTouch, ...lastTouch, ...linear, ...timeDecay].forEach(r => {
    allCampaignIds.add(r.campaignId);
  });

  // Combine results
  const combined: AttributionResult[] = Array.from(allCampaignIds).map(campaignId => {
    const ftResult = firstTouch.find(r => r.campaignId === campaignId);
    const ltResult = lastTouch.find(r => r.campaignId === campaignId);
    const linResult = linear.find(r => r.campaignId === campaignId);
    const tdResult = timeDecay.find(r => r.campaignId === campaignId);

    return {
      campaignId,
      firstTouchCredit: ftResult?.firstTouchCredit || 0,
      lastTouchCredit: ltResult?.lastTouchCredit || 0,
      linearCredit: linResult?.linearCredit || 0,
      timeDecayCredit: tdResult?.timeDecayCredit || 0,
    };
  });

  return combined;
}

/**
 * Calculate CAC (Customer Acquisition Cost)
 */
export interface CacMetrics {
  campaignId: number;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
  cac: number; // CAC = spend / leads
  roi: number; // ROI = (revenue - spend) / spend
  ltv?: number; // LTV if available
}

export function calculateCAC(
  campaignId: number,
  spend: number,
  leads: number,
  conversions: number,
  revenue: number
): CacMetrics {
  const cac = leads > 0 ? spend / leads : 0;
  const roi = spend > 0 ? (revenue - spend) / spend : 0;

  return {
    campaignId,
    spend,
    leads,
    conversions,
    revenue,
    cac,
    roi,
  };
}

/**
 * Group results by attribution model for comparison
 */
export interface AttributionComparison {
  campaignId: number;
  campaignName: string;
  firstTouchLeads: number;
  firstTouchRevenue: number;
  firstTouchCac: number;
  lastTouchLeads: number;
  lastTouchRevenue: number;
  lastTouchCac: number;
  linearLeads: number;
  linearRevenue: number;
  linearCac: number;
  timeDecayLeads: number;
  timeDecayRevenue: number;
  timeDecayCac: number;
}
