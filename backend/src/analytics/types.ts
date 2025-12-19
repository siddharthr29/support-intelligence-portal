export interface PriorityBreakdown {
  readonly urgent: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

export interface GroupResolution {
  readonly groupId: number;
  readonly groupName: string;
  readonly ticketsResolved: number;
  readonly ticketsOpen: number;
  readonly ticketsPending: number;
}

export interface CustomerTicketCount {
  readonly companyId: number;
  readonly companyName: string;
  readonly ticketCount: number;
}

export interface UnresolvedSnapshot {
  readonly supportEngineers: {
    readonly open: number;
    readonly pending: number;
  };
  readonly productSupport: {
    readonly open: number;
    readonly pending: number;
    readonly markedForRelease: number;
  };
}

export interface WeeklyMetrics {
  readonly snapshotId: string;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly computedAt: string;

  readonly ticketsCreated: number;
  readonly ticketsResolved: number;
  readonly ticketsClosed: number;

  readonly priorityBreakdown: PriorityBreakdown;
  readonly resolutionByGroup: readonly GroupResolution[];
  readonly customerWithMaxTickets: CustomerTicketCount | null;
  readonly unresolvedSnapshot: UnresolvedSnapshot;

  readonly averageResolutionTimeHours: number | null;
}

export interface EngineerHoursInput {
  readonly engineerName: string;
  readonly totalHoursWorked: number;
  readonly weekSnapshotId: string;
}

export interface DerivedEngineerMetrics {
  readonly engineerName: string;
  readonly totalHoursWorked: number;
  readonly ticketsResolved: number;
  readonly averageTimePerTicketHours: number | null;
}
