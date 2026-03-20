import { db } from './index.js';
import { channels, performanceEntries, budgets, fixedCosts, initiatives, goals } from './schema.js';

function seed() {
  console.log('Seeding database...');

  // Clear existing data
  db.delete(performanceEntries).run();
  db.delete(budgets).run();
  db.delete(goals).run();
  db.delete(initiatives).run();
  db.delete(fixedCosts).run();
  db.delete(channels).run();

  // Channels
  const channelValues = [
    { name: 'Google Ads', category: 'Paid', active: true },
    { name: 'LinkedIn Ads', category: 'Paid', active: true },
    { name: 'Organic Search', category: 'Organic', active: true },
    { name: 'LinkedIn Page', category: 'Organic', active: true },
    { name: 'Website', category: 'Owned', active: true },
    { name: 'Events', category: 'Offline', active: true },
    { name: 'PR', category: 'Earned', active: true },
  ];

  const insertedChannels = channelValues.map((v) =>
    db.insert(channels).values(v).returning().get()
  );

  const channelMap: Record<string, number> = {};
  for (const ch of insertedChannels) {
    channelMap[ch.name] = ch.id;
  }

  // Fixed costs
  const fixedCostValues = [
    { name: 'HubSpot', category: 'CRM & Automation', monthlyCost: 800, startDate: '2025-01-01', active: true },
    { name: 'Snov.io', category: 'Lead Generation', monthlyCost: 99, startDate: '2025-01-01', active: true },
    { name: 'Asana', category: 'Project Management', monthlyCost: 120, startDate: '2025-01-01', active: true },
    { name: 'Claude', category: 'AI Tools', monthlyCost: 200, startDate: '2025-06-01', active: true },
    { name: 'Adobe Creative Cloud', category: 'Design', monthlyCost: 450, startDate: '2025-01-01', active: true },
    { name: 'LinkedIn Premium', category: 'Social Media', monthlyCost: 60, startDate: '2025-01-01', active: true },
  ];
  for (const v of fixedCostValues) {
    db.insert(fixedCosts).values(v).run();
  }

  // Initiatives
  const initValues = [
    { name: 'Founder content on LinkedIn', objective: 'Brand awareness', actionType: 'Content', channel: 'LinkedIn Page', year: 2026, month: 1, startDate: '2026-01-06', endDate: '2026-06-30', status: 'ongoing', priority: 'high' },
    { name: 'Trade media PR', objective: 'Media coverage', actionType: 'PR', channel: 'PR', year: 2026, month: 1, startDate: '2026-01-15', endDate: '2026-03-31', status: 'ongoing', priority: 'medium' },
    { name: 'Event participation – SaaStr', objective: 'Lead generation', actionType: 'Event', channel: 'Events', year: 2026, month: 3, startDate: '2026-03-10', endDate: '2026-03-12', status: 'planned', priority: 'high' },
    { name: 'Website revamp', objective: 'Conversion optimization', actionType: 'Development', channel: 'Website', year: 2026, month: 2, startDate: '2026-02-01', endDate: '2026-04-30', status: 'ongoing', priority: 'high' },
    { name: 'Branded search campaign', objective: 'Lead capture', actionType: 'Paid campaign', channel: 'Google Ads', year: 2026, month: 1, startDate: '2026-01-01', status: 'ongoing', priority: 'medium' },
    { name: 'Institutional LinkedIn campaign', objective: 'Brand awareness', actionType: 'Paid campaign', channel: 'LinkedIn Ads', year: 2026, month: 2, startDate: '2026-02-01', endDate: '2026-04-30', status: 'ongoing', priority: 'medium' },
    { name: 'Podcast initiative', objective: 'Thought leadership', actionType: 'Content', channel: 'PR', year: 2026, month: 3, startDate: '2026-03-01', status: 'planned', priority: 'low' },
    { name: 'Case study launch', objective: 'Social proof', actionType: 'Content', channel: 'Website', year: 2026, month: 2, startDate: '2026-02-15', endDate: '2026-03-15', status: 'done', priority: 'medium' },
  ];
  for (const v of initValues) {
    db.insert(initiatives).values(v).run();
  }

  // Goals
  const goalValues = [
    { year: 2026, month: 1, metricName: 'Leads', targetValue: 150 },
    { year: 2026, month: 1, metricName: 'Sessions', targetValue: 12000 },
    { year: 2026, month: 1, metricName: 'Conversions', targetValue: 30 },
    { year: 2026, month: 2, metricName: 'Leads', targetValue: 180 },
    { year: 2026, month: 2, metricName: 'Sessions', targetValue: 14000 },
    { year: 2026, month: 2, metricName: 'Conversions', targetValue: 35 },
    { year: 2026, month: 3, metricName: 'Leads', targetValue: 200 },
    { year: 2026, month: 3, metricName: 'Sessions', targetValue: 16000 },
    { year: 2026, month: 3, metricName: 'Conversions', targetValue: 40 },
  ];
  for (const v of goalValues) {
    db.insert(goals).values(v).run();
  }

  // Budgets
  const planned: Record<string, number> = {
    'Google Ads': 5000, 'LinkedIn Ads': 4000, 'Organic Search': 0,
    'LinkedIn Page': 0, 'Website': 1500, 'Events': 3000, 'PR': 2000,
  };
  for (const [chName, chId] of Object.entries(channelMap)) {
    const p = planned[chName] || 0;
    for (let m = 1; m <= 3; m++) {
      const spent = m <= 2 ? Math.round(p * (0.85 + Math.random() * 0.3)) : 0;
      db.insert(budgets).values({
        year: 2026, month: m, channelId: chId,
        plannedBudget: p, actualSpent: spent,
      }).run();
    }
  }

  // Performance entries
  const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Monthly for Jan & Feb
  for (const month of [1, 2]) {
    const dateStr = `2026-${String(month).padStart(2, '0')}-01`;

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['Google Ads'],
      campaignName: 'Brand Search', campaignType: 'brand',
      impressions: r(40000, 60000), clicks: r(3000, 5000), sessions: r(2800, 4500),
      users: r(2000, 3500), newUsers: r(1500, 2800), leads: r(30, 50),
      conversions: r(8, 15), cost: r(4200, 5500),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['Google Ads'],
      campaignName: 'Non-Brand Search', campaignType: 'non_brand',
      impressions: r(80000, 120000), clicks: r(4000, 7000), sessions: r(3500, 6000),
      users: r(3000, 5000), newUsers: r(2500, 4500), leads: r(20, 40),
      conversions: r(5, 12), cost: r(3000, 4500),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['LinkedIn Ads'],
      campaignName: 'Institutional Campaign', campaignType: 'institutional',
      impressions: r(50000, 90000), clicks: r(1500, 3000), sessions: r(1200, 2500),
      users: r(1000, 2000), newUsers: r(800, 1800), leads: r(15, 30),
      conversions: r(3, 8), cost: r(3500, 4500),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['Organic Search'],
      campaignType: 'organic',
      impressions: r(200000, 350000), clicks: r(8000, 15000), sessions: r(7500, 14000),
      users: r(6000, 12000), newUsers: r(4000, 9000), leads: r(40, 70),
      conversions: r(10, 20),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['LinkedIn Page'],
      campaignName: 'Founder posts', campaignType: 'organic',
      impressions: r(15000, 30000), clicks: r(800, 2000), sessions: r(600, 1500),
      users: r(500, 1200), newUsers: r(400, 1000), leads: r(5, 15),
      conversions: r(1, 4),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'monthly', channelId: channelMap['Website'],
      sessions: r(10000, 18000), users: r(8000, 15000), newUsers: r(5000, 10000),
      leads: r(50, 90), conversions: r(15, 30),
    }).run();
  }

  // Weekly for March
  for (const week of [1, 2, 3]) {
    const day = (week - 1) * 7 + 2;
    const dateStr = `2026-03-${String(day).padStart(2, '0')}`;

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'weekly', channelId: channelMap['Google Ads'],
      campaignName: 'Brand Search', campaignType: 'brand',
      impressions: r(10000, 15000), clicks: r(800, 1200), sessions: r(700, 1100),
      users: r(500, 900), newUsers: r(400, 700), leads: r(8, 14),
      conversions: r(2, 5), cost: r(1000, 1400),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'weekly', channelId: channelMap['LinkedIn Ads'],
      campaignName: 'ABM Campaign', campaignType: 'ABM',
      impressions: r(12000, 20000), clicks: r(400, 800), sessions: r(350, 700),
      users: r(300, 600), newUsers: r(250, 500), leads: r(5, 10),
      conversions: r(1, 3), cost: r(900, 1200),
    }).run();

    db.insert(performanceEntries).values({
      date: dateStr, periodType: 'weekly', channelId: channelMap['Organic Search'],
      campaignType: 'organic',
      impressions: r(50000, 90000), clicks: r(2000, 4000), sessions: r(1800, 3500),
      users: r(1500, 3000), newUsers: r(1000, 2200), leads: r(10, 18),
      conversions: r(3, 6),
    }).run();
  }

  console.log('Seed complete!');
  console.log(`  Channels: ${insertedChannels.length}`);
  console.log('  Performance entries: 21');
  console.log('  Fixed costs: 6');
  console.log('  Initiatives: 8');
  console.log(`  Goals: ${goalValues.length}`);
  process.exit(0);
}

seed();
