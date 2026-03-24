import { db } from './src/db/index.js';
import { budgetItems, monthlyBudgetLimits } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

// Check budget limits
const limits = await db.select().from(monthlyBudgetLimits).orderBy(monthlyBudgetLimits.year, monthlyBudgetLimits.month);
console.log('=== Monthly Budget Limits ===');
limits.forEach(l => console.log(`${l.year}-${l.month}: R$ ${l.amount}`));

// Check section totals
const sectionTotals = await db.select({
  section: budgetItems.section,
  totalPlanned: sql<number>`sum(${budgetItems.planned})`,
  totalActual: sql<number>`sum(${budgetItems.actual})`,
}).from(budgetItems).groupBy(budgetItems.section);
console.log('\n=== Section Totals ===');
sectionTotals.forEach(s => console.log(`${s.section}: planned=${s.totalPlanned?.toFixed(2)}, actual=${s.totalActual?.toFixed(2)}`));

// Check grand total
const grand = await db.select({
  totalPlanned: sql<number>`sum(${budgetItems.planned})`,
  totalActual: sql<number>`sum(${budgetItems.actual})`,
}).from(budgetItems);
console.log('\n=== Grand Total ===');
console.log(`planned=${grand[0].totalPlanned?.toFixed(2)}, actual=${grand[0].totalActual?.toFixed(2)}`);
