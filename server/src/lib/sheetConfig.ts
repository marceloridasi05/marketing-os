import { db } from '../db/index.js';
import { sites } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface SheetGids {
  siteData?: number;
  adsKpis?: number;
  linkedinPage?: number;
  planSchedule?: number;
  budgetItems?: number;
  adsBudgets?: number;
}

export interface SheetConfig {
  spreadsheetId: string;
  gids: SheetGids;
}

// Legacy default (old spreadsheet)
const DEFAULT_SHEET_ID = '1r1JVQCv2iQK3b3v6GjaFNDF7DHJNUDCfzZG80zHhGrg';
const DEFAULT_GIDS: Required<SheetGids> = {
  siteData: 0,
  adsKpis: 1053786189,
  linkedinPage: 339632884,
  planSchedule: 1215258222,
  budgetItems: 554566232,
  adsBudgets: 530264620,
};

export async function getSheetConfig(
  siteId: number | undefined,
  key: keyof SheetGids,
): Promise<{ sheetId: string; gid: number }> {
  let sheetId = DEFAULT_SHEET_ID;
  let gid = DEFAULT_GIDS[key];

  if (siteId) {
    const [site] = await db
      .select({ sheetConfig: sites.sheetConfig })
      .from(sites)
      .where(eq(sites.id, siteId));
    if (site?.sheetConfig) {
      try {
        const cfg: Partial<SheetConfig> = JSON.parse(site.sheetConfig);
        if (cfg.spreadsheetId) sheetId = cfg.spreadsheetId;
        if (cfg.gids?.[key] != null) gid = cfg.gids[key]!;
      } catch { /* ignore malformed JSON */ }
    }
  }

  return { sheetId, gid };
}
