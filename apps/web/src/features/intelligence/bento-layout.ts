const FULL_ROW = "col-span-12";
const WIDE_COLUMN = "col-span-12 lg:col-span-7";
const NARROW_COLUMN = "col-span-12 lg:col-span-5";
const HALF_ROW = "col-span-12 md:col-span-6";
const THIRD_ROW = "col-span-12 lg:col-span-4";

export interface BentoLayout {
  hero: string;
  coverage: string;
  lead: string;
  divergences: string;
  sideDevelopment: string;
  savedReports: string;
  pastReports: string;
}

export interface BentoInput {
  hasCoverage: boolean;
  hasLead: boolean;
  hasDivergences: boolean;
  sideDevelopmentCount: number;
}

function pairedSpan(hasPartner: boolean, span: string): string {
  return hasPartner ? span : FULL_ROW;
}

type TailLayout = Pick<BentoLayout, "sideDevelopment" | "savedReports" | "pastReports">;

function tailLayout(sideDevelopmentCount: number): TailLayout {
  if (sideDevelopmentCount === 1) {
    return { sideDevelopment: THIRD_ROW, savedReports: THIRD_ROW, pastReports: THIRD_ROW };
  }
  return { sideDevelopment: HALF_ROW, savedReports: HALF_ROW, pastReports: HALF_ROW };
}

export function bentoLayout({
  hasCoverage,
  hasLead,
  hasDivergences,
  sideDevelopmentCount,
}: BentoInput): BentoLayout {
  return {
    hero: pairedSpan(hasCoverage, WIDE_COLUMN),
    coverage: NARROW_COLUMN,
    lead: pairedSpan(hasDivergences, WIDE_COLUMN),
    divergences: pairedSpan(hasLead, NARROW_COLUMN),
    ...tailLayout(sideDevelopmentCount),
  };
}
