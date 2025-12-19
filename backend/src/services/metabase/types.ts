export interface RftOrganisationMetrics {
  readonly organisation: string;
  readonly newlyReportedCurrentWeek: number;
  readonly closuresThisWeek: number;
  readonly closedRftsSoFar: number;
  readonly totalOpenRfts: number;
}

export interface RftWeeklyTotals {
  readonly newlyReportedCurrentWeek: number;
  readonly closuresThisWeek: number;
  readonly closedRftsSoFar: number;
  readonly totalOpenRfts: number;
}

export interface RftWeeklyMetrics {
  readonly fetchedAt: string;
  readonly questionId: number;
  readonly totals: RftWeeklyTotals;
  readonly byOrganisation: readonly RftOrganisationMetrics[];
}

export interface MetabaseQueryResponse {
  readonly data: {
    readonly rows: readonly (string | number)[][];
    readonly cols: readonly { name: string; display_name: string }[];
  };
}
