import { create } from 'zustand';
import { startOfYear, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { FRESHDESK_STATUS, FRESHDESK_PRIORITY, getCompanyName as getCompanyNameFromConstants, getGroupName as getGroupNameFromConstants } from '@/lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface TicketSummary {
  id: number;
  created_at: string;
  status: number;
  priority: number;
  group_id: number | null;
  company_id: number | null;
  tags: string[];
}

export interface FilteredStats {
  totalTickets: number;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsClosed: number;
  ticketsOpen: number;
  ticketsPending: number;
  urgentTickets: number;
  highTickets: number;
  mediumTickets: number;
  lowTickets: number;
  resolutionRate: number;
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  statusBreakdown: {
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  groupBreakdown: Array<{
    groupId: number;
    ticketCount: number;
    open: number;
    pending: number;
    resolved: number;
  }>;
  companyBreakdown: Array<{
    companyId: number;
    ticketCount: number;
  }>;
  tagsBreakdown: Array<{
    tag: string;
    count: number;
  }>;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface TicketStore {
  // Raw data (fetched once)
  allTickets: TicketSummary[];
  companies: Record<number, string>;
  groups: Record<number, string>;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  
  // Date range filter
  dateRange: DateRange;
  
  // Computed/filtered stats
  filteredStats: FilteredStats | null;
  
  // Actions
  fetchAllTickets: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
  computeFilteredStats: () => void;
  
  // Helpers
  getTicketsInRange: () => TicketSummary[];
  getCompanyName: (companyId: number) => string;
  getGroupName: (groupId: number) => string;
}

// Compute stats from a list of tickets
function computeStats(tickets: TicketSummary[]): FilteredStats {
  const totalTickets = tickets.length;
  
  // Status counts
  const ticketsOpen = tickets.filter(t => t.status === FRESHDESK_STATUS.OPEN).length;
  const ticketsPending = tickets.filter(t => t.status === FRESHDESK_STATUS.PENDING).length;
  const ticketsResolved = tickets.filter(t => t.status === FRESHDESK_STATUS.RESOLVED).length;
  const ticketsClosed = tickets.filter(t => t.status === FRESHDESK_STATUS.CLOSED).length;
  
  // Priority counts
  const urgentTickets = tickets.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length;
  const highTickets = tickets.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length;
  const mediumTickets = tickets.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length;
  const lowTickets = tickets.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length;
  
  // Resolution rate
  const resolutionRate = totalTickets > 0 
    ? Math.round(((ticketsResolved + ticketsClosed) / totalTickets) * 100) 
    : 0;
  
  // Group breakdown
  const groupMap = new Map<number, { open: number; pending: number; resolved: number; total: number }>();
  tickets.forEach(t => {
    if (t.group_id) {
      const existing = groupMap.get(t.group_id) || { open: 0, pending: 0, resolved: 0, total: 0 };
      existing.total++;
      if (t.status === FRESHDESK_STATUS.OPEN) existing.open++;
      if (t.status === FRESHDESK_STATUS.PENDING) existing.pending++;
      if (t.status === FRESHDESK_STATUS.RESOLVED) existing.resolved++;
      groupMap.set(t.group_id, existing);
    }
  });
  
  const groupBreakdown = Array.from(groupMap.entries())
    .map(([groupId, stats]) => ({
      groupId,
      ticketCount: stats.total,
      open: stats.open,
      pending: stats.pending,
      resolved: stats.resolved,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount);
  
  // Company breakdown
  const companyMap = new Map<number, number>();
  tickets.forEach(t => {
    if (t.company_id) {
      companyMap.set(t.company_id, (companyMap.get(t.company_id) || 0) + 1);
    }
  });
  
  const companyBreakdown = Array.from(companyMap.entries())
    .map(([companyId, ticketCount]) => ({ companyId, ticketCount }))
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, 15); // Top 15
  
  // Tags breakdown
  const tagMap = new Map<string, number>();
  tickets.forEach(t => {
    (t.tags || []).forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });
  
  const tagsBreakdown = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20
  
  return {
    totalTickets,
    ticketsCreated: totalTickets,
    ticketsResolved,
    ticketsClosed,
    ticketsOpen,
    ticketsPending,
    urgentTickets,
    highTickets,
    mediumTickets,
    lowTickets,
    resolutionRate,
    priorityBreakdown: {
      urgent: urgentTickets,
      high: highTickets,
      medium: mediumTickets,
      low: lowTickets,
    },
    statusBreakdown: {
      open: ticketsOpen,
      pending: ticketsPending,
      resolved: ticketsResolved,
      closed: ticketsClosed,
    },
    groupBreakdown,
    companyBreakdown,
    tagsBreakdown,
  };
}

export const useTicketStore = create<TicketStore>()((set, get) => ({
  // Initial state
  allTickets: [],
  companies: {},
  groups: {},
  isLoading: false,
  error: null,
  lastFetched: null,
  dateRange: {
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: new Date(),
  },
  filteredStats: null,
  
  // Fetch all tickets from unified /api/app-data endpoint
  fetchAllTickets: async () => {
    const state = get();
    
    // Skip if already loading
    if (state.isLoading) return;
    
    set({ isLoading: true, error: null });
    
    try {
      // Get current year from year store
      const currentYear = new Date().getFullYear();
      
      // Use unified app-data endpoint with year parameter
      const res = await fetch(`${API_BASE_URL}/api/app-data?year=${currentYear}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch app data: ${res.status}`);
      }
      
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch app data');
      }
      
      console.log('[TicketStore] Raw API response:', {
        ticketCount: json.data?.tickets?.length,
        hasTickets: Array.isArray(json.data?.tickets),
        firstTicket: json.data?.tickets?.[0],
      });
      
      // Transform tickets to expected format
      const tickets: TicketSummary[] = (json.data?.tickets || []).map((t: { id: number; createdAt: string; status: number; priority: number; groupId: number | null; companyId: number | null; tags: string[] }) => ({
        id: t.id,
        created_at: t.createdAt,
        status: t.status,
        priority: t.priority,
        group_id: t.groupId,
        company_id: t.companyId,
        tags: t.tags || [],
      }));
      
      console.log('[TicketStore] Transformed tickets:', {
        count: tickets.length,
        firstTicket: tickets[0],
      });
      
      set({ 
        allTickets: tickets,
        companies: json.data?.companies || {},
        groups: json.data?.groups || {},
        isLoading: false, 
        lastFetched: new Date(),
        error: null,
      });
      
      // Compute stats for current date range
      get().computeFilteredStats();
      
    } catch (error) {
      console.error('[TicketStore] Fetch error:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  
  // Set date range and recompute stats locally (no API call needed)
  setDateRange: (range: DateRange) => {
    set({ dateRange: range });
    // Recompute stats locally from cached tickets
    get().computeFilteredStats();
  },
  
  // Get tickets within the current date range
  getTicketsInRange: () => {
    const { allTickets, dateRange } = get();
    
    if (!dateRange.from || !dateRange.to) {
      return allTickets;
    }
    
    return allTickets.filter((ticket: TicketSummary) => {
      const createdAt = new Date(ticket.created_at);
      return isWithinInterval(createdAt, { 
        start: dateRange.from!, 
        end: dateRange.to! 
      });
    });
  },
  
  // Compute filtered stats based on date range
  computeFilteredStats: () => {
    const ticketsInRange = get().getTicketsInRange();
    const stats = computeStats(ticketsInRange);
    set({ filteredStats: stats });
  },
  
  // Get company name by ID (uses hardcoded constants, falls back to API cache)
  getCompanyName: (companyId: number) => {
    // First try hardcoded constants (most reliable)
    const constantName = getCompanyNameFromConstants(companyId);
    if (!constantName.startsWith('Company ')) return constantName;
    
    // Fall back to API cache
    const { companies } = get();
    return companies[companyId] || constantName;
  },
  
  // Get group name by ID (uses hardcoded constants, falls back to API cache)
  getGroupName: (groupId: number) => {
    // First try hardcoded constants (most reliable)
    const constantName = getGroupNameFromConstants(groupId);
    if (!constantName.startsWith('Group ')) return constantName;
    
    // Fall back to API cache
    const { groups } = get();
    return groups[groupId] || constantName;
  },
}));
