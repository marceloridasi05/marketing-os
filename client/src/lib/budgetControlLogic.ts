/**
 * Budget Control Calculation Logic
 *
 * Core functions for calculating per-channel budget control metrics:
 * - Saldo (available balance) per channel
 * - Pacing analysis (consumption % vs expected % based on day of month)
 * - Status indicators (healthy, warning, critical)
 */

export interface ChannelBudgetControl {
  channel: 'google' | 'meta' | 'linkedin';
  verbaMensalCadastrada: number | null;
  consumoMensalAtual: number;
  saldoDisponivel: number | null;
  percentualConsumido: number | null;
  diaAtual: number;
  totalDiasMes: number;
  percentualEsperado: number;
  statusPacing: 'acima' | 'abaixo' | 'dentro' | 'futuro' | 'nao-aplicavel';
}

export interface BudgetControlSummary {
  ano: number;
  mes: number;
  channels: {
    google: ChannelBudgetControl;
    meta: ChannelBudgetControl;
    linkedin: ChannelBudgetControl;
  };
  total: {
    verbaMensalCadastrada: number;
    consumoMensalAtual: number;
    saldoDisponivel: number;
    percentualConsumido: number;
    statusPacing: 'acima' | 'abaixo' | 'dentro' | 'futuro' | 'nao-aplicavel';
  };
}

/**
 * Calculate the total number of days in a given month/year
 */
export function calculateDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get the current day of the month (1-31)
 */
export function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

/**
 * Determine if a given date is in the current month
 */
function isCurrentMonth(year: number, month: number): boolean {
  const today = new Date();
  return year === today.getFullYear() && month === today.getMonth() + 1;
}

/**
 * Determine if a given date is in a past month relative to today
 */
function isPastMonth(year: number, month: number): boolean {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
}

/**
 * Determine if a given date is in a future month relative to today
 */
function isFutureMonth(year: number, month: number): boolean {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
}

/**
 * Calculate pacing metrics and status for a specific channel
 */
export function calculateChannelControl(
  channel: 'google' | 'meta' | 'linkedin',
  verbaCadastrada: number | null,
  consumoMensal: number,
  ano: number,
  mes: number
): ChannelBudgetControl {
  const totalDiasMes = calculateDaysInMonth(ano, mes);
  const diaAtual = getCurrentDayOfMonth();

  const saldoDisponivel = verbaCadastrada !== null ? verbaCadastrada - consumoMensal : null;
  const percentualConsumido = verbaCadastrada !== null && verbaCadastrada > 0
    ? Math.round((consumoMensal / verbaCadastrada) * 100 * 10) / 10
    : null;

  let statusPacing: 'acima' | 'abaixo' | 'dentro' | 'futuro' | 'nao-aplicavel' = 'nao-aplicavel';
  let percentualEsperado = 100;

  if (isFutureMonth(ano, mes)) {
    statusPacing = 'futuro';
    percentualEsperado = 0;
  } else if (isPastMonth(ano, mes)) {
    statusPacing = 'nao-aplicavel';
    percentualEsperado = 100;
  } else if (isCurrentMonth(ano, mes)) {
    percentualEsperado = Math.round((diaAtual / totalDiasMes) * 100);

    if (percentualConsumido === null) {
      statusPacing = 'nao-aplicavel';
    } else {
      const diff = percentualConsumido - percentualEsperado;
      if (diff > 10) {
        statusPacing = 'acima';
      } else if (diff < -10) {
        statusPacing = 'abaixo';
      } else {
        statusPacing = 'dentro';
      }
    }
  }

  return {
    channel,
    verbaMensalCadastrada: verbaCadastrada,
    consumoMensalAtual: consumoMensal,
    saldoDisponivel,
    percentualConsumido,
    diaAtual,
    totalDiasMes,
    percentualEsperado,
    statusPacing,
  };
}

/**
 * Calculate complete budget control summary for all channels
 */
export function calculateBudgetControlSummary(
  row: {
    monthlyGoogle?: number | null;
    monthlyLinkedin?: number | null;
    monthlyMeta?: number | null;
  },
  allocations: Array<{
    year: number;
    month: number;
    googleBudget?: number | null;
    metaBudget?: number | null;
    linkedinBudget?: number | null;
  }>,
  ano: number,
  mes: number
): BudgetControlSummary | null {
  const allocation = allocations.find(a => a.year === ano && a.month === mes);

  if (!allocation) {
    return null;
  }

  const googleBudget = allocation.googleBudget ?? null;
  const metaBudget = allocation.metaBudget ?? null;
  const linkedinBudget = allocation.linkedinBudget ?? null;

  if (googleBudget === null && metaBudget === null && linkedinBudget === null) {
    return null;
  }

  const googleConsumo = row.monthlyGoogle ?? 0;
  const metaConsumo = row.monthlyMeta ?? 0;
  const linkedinConsumo = row.monthlyLinkedin ?? 0;

  const google = calculateChannelControl('google', googleBudget, googleConsumo, ano, mes);
  const meta = calculateChannelControl('meta', metaBudget, metaConsumo, ano, mes);
  const linkedin = calculateChannelControl('linkedin', linkedinBudget, linkedinConsumo, ano, mes);

  const totalVerbaMensalCadastrada = (googleBudget ?? 0) + (metaBudget ?? 0) + (linkedinBudget ?? 0);
  const totalConsumoMensalAtual = googleConsumo + metaConsumo + linkedinConsumo;
  const totalSaldoDisponivel = totalVerbaMensalCadastrada - totalConsumoMensalAtual;
  const totalPercentualConsumido = totalVerbaMensalCadastrada > 0
    ? Math.round((totalConsumoMensalAtual / totalVerbaMensalCadastrada) * 100 * 10) / 10
    : 0;

  let totalStatusPacing: 'acima' | 'abaixo' | 'dentro' | 'futuro' | 'nao-aplicavel' = 'dentro';
  const statuses = [google.statusPacing, meta.statusPacing, linkedin.statusPacing];

  if (statuses.includes('futuro')) {
    totalStatusPacing = 'futuro';
  } else if (statuses.includes('acima')) {
    totalStatusPacing = 'acima';
  } else if (statuses.includes('abaixo')) {
    totalStatusPacing = 'abaixo';
  } else if (statuses.includes('dentro')) {
    totalStatusPacing = 'dentro';
  } else {
    totalStatusPacing = 'nao-aplicavel';
  }

  return {
    ano,
    mes,
    channels: {
      google,
      meta,
      linkedin,
    },
    total: {
      verbaMensalCadastrada: totalVerbaMensalCadastrada,
      consumoMensalAtual: totalConsumoMensalAtual,
      saldoDisponivel: totalSaldoDisponivel,
      percentualConsumido: totalPercentualConsumido,
      statusPacing: totalStatusPacing,
    },
  };
}

/**
 * Find the most recent month with data from filtered dataset
 */
export function getMostRecentMonthWithData(
  filteredData: Array<{ year?: number; month?: number }>
): { year: number; month: number } | null {
  if (filteredData.length === 0) {
    return null;
  }

  let maxYear = -1;
  let maxMonth = -1;

  for (const row of filteredData) {
    if (row.year !== undefined && row.month !== undefined) {
      if (row.year > maxYear || (row.year === maxYear && row.month > maxMonth)) {
        maxYear = row.year;
        maxMonth = row.month;
      }
    }
  }

  if (maxYear === -1 || maxMonth === -1) {
    return null;
  }

  return { year: maxYear, month: maxMonth };
}

/**
 * Extract year and month from a date range filter
 */
export function getMonthFromDateRange(
  dateRange: { start: string; end: string } | null
): { year: number; month: number } | null {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return null;
  }

  const startParts = dateRange.start.split('-');
  const endParts = dateRange.end.split('-');

  if (startParts.length < 2 || endParts.length < 2) {
    return null;
  }

  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10);
  const endYear = parseInt(endParts[0], 10);
  const endMonth = parseInt(endParts[1], 10);

  if (startYear === endYear && startMonth === endMonth) {
    return { year: startYear, month: startMonth };
  }

  return null;
}
