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

export interface SyncPerformanceOrganisationMetrics {
  readonly sNo: number;
  readonly organisationName: string;
  readonly totalSyncs: number;
  readonly successfulSyncs: number;
  readonly incompleteSyncs: number;
  readonly successRate: number;
  readonly usabilityScore: number;
  readonly rank: number;
}

export interface SyncPerformanceTotals {
  readonly totalOrganisations: number;
  readonly avgSuccessRate: number;
  readonly avgUsabilityScore: number;
}

export interface SyncPerformanceMetrics {
  readonly fetchedAt: string;
  readonly questionId: number;
  readonly totals: SyncPerformanceTotals;
  readonly byOrganisation: readonly SyncPerformanceOrganisationMetrics[];
}
