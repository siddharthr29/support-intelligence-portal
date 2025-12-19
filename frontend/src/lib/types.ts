export interface DateRange {
  startDate: string;
  endDate: string;
  displayRange: string;
}

export interface PriorityBreakdown {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatusBreakdown {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
}

export interface GroupBreakdown {
  groupId: number;
  ticketCount: number;
  resolved: number;
  open: number;
  pending: number;
}

export interface CompanyBreakdown {
  companyId: number;
  ticketCount: number;
}

export interface TopCompany {
  companyId: number;
  ticketCount: number;
}

export interface TagsAnalysis {
  ticketsWithTags: number;
  ticketsWithoutTags: number;
  tagBreakdown: { tag: string; count: number }[];
}

export interface DateRangeMetrics {
  dateRange: DateRange;
  computedAt: string;
  totalTickets: number;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsClosed: number;
  ticketsOpen: number;
  ticketsPending: number;
  priorityBreakdown: PriorityBreakdown;
  statusBreakdown: StatusBreakdown;
  escalatedTickets: number;
  groupBreakdown: GroupBreakdown[];
  companyBreakdown: CompanyBreakdown[];
  topCompany: TopCompany | null;
  tagsAnalysis?: TagsAnalysis;
}

export interface RftOrganisationMetrics {
  organisation: string;
  newlyReportedCurrentWeek: number;
  closuresThisWeek: number;
  closedRftsSoFar: number;
  totalOpenRfts: number;
}

export interface RftWeeklyTotals {
  newlyReportedCurrentWeek: number;
  closuresThisWeek: number;
  closedRftsSoFar: number;
  totalOpenRfts: number;
}

export interface RftData {
  snapshotId: string;
  fetchedAt: string;
  totals: RftWeeklyTotals;
  byOrganisation: RftOrganisationMetrics[];
}

export type NoteType = 'rft' | 'general' | 'highlight' | 'ticket';

export interface WeeklyNote {
  id: string;
  snapshotId: string;
  noteType: NoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
