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
  
  // NEW: Performance Overview
  readonly performanceStatus?: string;
  readonly avgReliability?: number;
  readonly totalUsage6M?: number;
  readonly healthStatus?: string;
  
  // NEW: Monthly Trend Data (M-2: 2 months ago)
  readonly monthM2Name?: string;
  readonly monthM2Reliability?: number;
  readonly monthM2Usage?: number;
  
  // NEW: Monthly Trend Data (M-1: 1 month ago)
  readonly monthM1Name?: string;
  readonly monthM1Reliability?: number;
  readonly monthM1Usage?: number;
  
  // NEW: Monthly Trend Data (Current month)
  readonly monthCurrentName?: string;
  readonly monthCurrentReliability?: number;
  readonly monthCurrentUsage?: number;
  
  // NEW: Trend Deltas
  readonly reliabilityDelta?: number;
  readonly usageDeltaPct?: number;
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
