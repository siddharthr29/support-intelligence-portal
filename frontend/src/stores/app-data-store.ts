import { create } from 'zustand';
import { FRESHDESK_STATUS, FRESHDESK_PRIORITY, getCompanyName as getCompanyNameFromConstants, getGroupName as getGroupNameFromConstants } from '@/lib/constants';
import { apiGet } from '@/lib/api-client';

export interface Ticket {
  id: number;
  subject: string;
  status: number;
  priority: number;
  groupId: number | null;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface WeekStats {
  ticketsCreated: number;
  ticketsResolved: number;
  urgentTickets: number;
  highTickets: number;
  mediumTickets: number;
  lowTickets: number;
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
  ticketsWithTags: number;
  ticketsWithoutTags: number;
}

interface AppDataState {
  // Raw data
  tickets: Ticket[];
  companies: Record<number, string>;
  groups: Record<number, string>;
  lastSyncTimestamp: string | null;
  
  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  
  // Actions
  fetchAppData: (year?: number, forceRefresh?: boolean) => Promise<void>;
  clearData: () => void;
  
  // Computed helpers
  getTicketsByDateRange: (startDate: Date, endDate: Date) => Ticket[];
  getWeekStats: (weekStart: Date, weekEnd: Date) => WeekStats;
  getAllTimeUnresolvedByGroup: () => Array<{ groupId: number; open: number; pending: number; total: number }>;
  getMarkedReleaseVersions: (groupId: number) => Array<{ version: string; count: number }>;
  getCompanyName: (companyId: number) => string;
  getGroupName: (groupId: number) => string;
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
  // Initial state
  tickets: [],
  companies: {},
  groups: {},
  lastSyncTimestamp: null,
  isLoading: false,
  isLoaded: false,
  error: null,
  
  // Fetch all data in ONE request
  fetchAppData: async (year?: number, forceRefresh = false) => {
    // Allow force refresh to bypass loaded check
    if (!forceRefresh && get().isLoaded && !get().isLoading) return;
    
    set({ isLoading: true, error: null });
    
    const selectedYear = year || new Date().getFullYear();
    
    try {
      console.log('[AppDataStore] Fetching unified app data...', { year: selectedYear });
      const cacheBust = Date.now(); // Force fresh data
      const json = await apiGet(`/api/app-data?year=${selectedYear}&_t=${cacheBust}`);
      
      console.log('[AppDataStore] Data loaded:', {
        ticketCount: json.data.tickets.length,
        companyCount: Object.keys(json.data.companies).length,
        groupCount: Object.keys(json.data.groups).length,
      });
      
      // Defensive: Handle missing or invalid data
      set({
        tickets: Array.isArray(json.data?.tickets) ? json.data.tickets : [],
        companies: json.data?.companies || {},
        groups: json.data?.groups || {},
        lastSyncTimestamp: json.data?.lastSyncTimestamp || null,
        isLoading: false,
        isLoaded: true,
        error: null,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      console.error('[AppDataStore] Error:', errorMessage, error);
      
      // CRITICAL: Set isLoaded to true even on error to prevent infinite retries
      set({ 
        isLoading: false, 
        isLoaded: true, // Prevent retry loops
        error: errorMessage,
        // Set safe defaults on error
        tickets: [],
        companies: {},
        groups: {},
      });
    }
  },

  // Clear all data to force fresh reload
  clearData: () => {
    set({
      tickets: [],
      companies: {},
      groups: {},
      lastSyncTimestamp: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    });
  },
  
  // Filter tickets by date range (computed locally, no API call)
  getTicketsByDateRange: (startDate: Date, endDate: Date) => {
    const { tickets } = get();
    return tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= startDate && created <= endDate;
    });
  },
  
  // Compute week stats from tickets (no API call)
  // IMPORTANT: 
  // - ticketsCreated = tickets where createdAt is in the week
  // - ticketsResolved = tickets where status is resolved/closed AND updatedAt is in the week
  // - groupBreakdown.resolved = tickets resolved in the week by that group
  getWeekStats: (weekStart: Date, weekEnd: Date) => {
    const { tickets } = get();
    
    // Filter tickets CREATED in the week (for ticketsCreated count) - only include main support groups
    const ticketsCreatedInWeek = tickets.filter(t => {
      const created = new Date(t.createdAt);
      const isInDateRange = created >= weekStart && created <= weekEnd;
      if (!isInDateRange) return false;
      
      // Only include Support Engineers and Product Support groups
      if (!t.groupId) return false;
      // Support Engineers groups
      if (t.groupId === 36000098156 || t.groupId === 36000247507) return true;
      // Product Support groups
      if (t.groupId === 36000098158 || t.groupId === 36000247508 || t.groupId === 36000441443) return true;
      return false;
    });
    
    // Filter tickets RESOLVED in the week (status is resolved/closed AND updatedAt in week)
    const ticketsResolvedInWeek = tickets.filter(t => {
      const updated = new Date(t.updatedAt);
      const isResolved = t.status === FRESHDESK_STATUS.RESOLVED || t.status === FRESHDESK_STATUS.CLOSED;
      return isResolved && updated >= weekStart && updated <= weekEnd;
    });
    
    // Priority breakdown (based on tickets CREATED in the week)
    const urgentTickets = ticketsCreatedInWeek.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length;
    const highTickets = ticketsCreatedInWeek.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length;
    const mediumTickets = ticketsCreatedInWeek.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length;
    const lowTickets = ticketsCreatedInWeek.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length;
    
    // Total resolved count - only include Support Engineers and Product Support groups
    const relevantResolvedTickets = ticketsResolvedInWeek.filter(ticket => {
      if (!ticket.groupId) return false;
      // Support Engineers groups
      if (ticket.groupId === 36000098156 || ticket.groupId === 36000247507) return true;
      // Product Support groups (before aggregation)
      if (ticket.groupId === 36000098158 || ticket.groupId === 36000247508 || ticket.groupId === 36000441443) return true;
      return false;
    });
    const resolvedTickets = relevantResolvedTickets.length;
    
    // Group breakdown for RESOLVED tickets (tickets resolved in the week, grouped by groupId)
    const groupResolvedMap = new Map<number, number>();
    for (const ticket of ticketsResolvedInWeek) {
      if (ticket.groupId) {
        // Combine Product Support groups into one category (same logic as backend)
        let effectiveGroupId = ticket.groupId;
        if (ticket.groupId === 36000098158 || ticket.groupId === 36000247508 || ticket.groupId === 36000441443) {
          effectiveGroupId = 36000247508; // Use the main Product Support group ID
        }
        groupResolvedMap.set(effectiveGroupId, (groupResolvedMap.get(effectiveGroupId) || 0) + 1);
      }
    }
    
    // Group breakdown for CREATED tickets (for ticketCount, open, pending)
    const groupCreatedMap = new Map<number, { total: number; open: number; pending: number }>();
    for (const ticket of ticketsCreatedInWeek) {
      if (ticket.groupId) {
        const existing = groupCreatedMap.get(ticket.groupId) || { total: 0, open: 0, pending: 0 };
        existing.total++;
        if (ticket.status === FRESHDESK_STATUS.OPEN) existing.open++;
        if (ticket.status === FRESHDESK_STATUS.PENDING) existing.pending++;
        groupCreatedMap.set(ticket.groupId, existing);
      }
    }
    
    // Merge both maps to create final group breakdown
    const allGroupIds = new Set([...groupCreatedMap.keys(), ...groupResolvedMap.keys()]);
    const groupBreakdown = Array.from(allGroupIds)
      .map(groupId => ({
        groupId,
        ticketCount: groupCreatedMap.get(groupId)?.total || 0,
        open: groupCreatedMap.get(groupId)?.open || 0,
        pending: groupCreatedMap.get(groupId)?.pending || 0,
        resolved: groupResolvedMap.get(groupId) || 0,
      }))
      .sort((a, b) => b.resolved - a.resolved); // Sort by resolved count
    
    // Company breakdown (based on tickets CREATED in the week)
    const companyMap = new Map<number, number>();
    for (const ticket of ticketsCreatedInWeek) {
      if (ticket.companyId) {
        companyMap.set(ticket.companyId, (companyMap.get(ticket.companyId) || 0) + 1);
      }
    }
    const companyBreakdown = Array.from(companyMap.entries())
      .map(([companyId, count]) => ({ companyId, ticketCount: count }))
      .sort((a, b) => b.ticketCount - a.ticketCount);
    
    // Tags breakdown (based on tickets CREATED in the week)
    const tagMap = new Map<string, number>();
    let ticketsWithTags = 0;
    let ticketsWithoutTags = 0;
    for (const ticket of ticketsCreatedInWeek) {
      if (ticket.tags && ticket.tags.length > 0) {
        ticketsWithTags++;
        for (const tag of ticket.tags) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        }
      } else {
        ticketsWithoutTags++;
      }
    }
    const tagsBreakdown = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    return {
      ticketsCreated: ticketsCreatedInWeek.length,
      ticketsResolved: resolvedTickets,
      urgentTickets,
      highTickets,
      mediumTickets,
      lowTickets,
      groupBreakdown,
      companyBreakdown,
      tagsBreakdown,
      ticketsWithTags,
      ticketsWithoutTags,
    };
  },
  
  // Get ALL TIME unresolved tickets by group (not filtered by date)
  getAllTimeUnresolvedByGroup: () => {
    const { tickets } = get();
    
    // Only count OPEN and PENDING tickets (unresolved)
    const unresolvedTickets = tickets.filter(t => 
      t.status === FRESHDESK_STATUS.OPEN || t.status === FRESHDESK_STATUS.PENDING
    );
    
    const groupMap = new Map<number, { open: number; pending: number; total: number }>();
    for (const ticket of unresolvedTickets) {
      if (ticket.groupId) {
        // Combine Product Support groups into one category (same logic as backend)
        let effectiveGroupId = ticket.groupId;
        if (ticket.groupId === 36000098158 || ticket.groupId === 36000247508 || ticket.groupId === 36000441443) {
          effectiveGroupId = 36000247508; // Use the main Product Support group ID
        }
        
        const existing = groupMap.get(effectiveGroupId) || { open: 0, pending: 0, total: 0 };
        existing.total++;
        if (ticket.status === FRESHDESK_STATUS.OPEN) existing.open++;
        if (ticket.status === FRESHDESK_STATUS.PENDING) existing.pending++;
        groupMap.set(effectiveGroupId, existing);
      }
    }
    
    return Array.from(groupMap.entries())
      .map(([groupId, stats]) => ({
        groupId,
        open: stats.open,
        pending: stats.pending,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);
  },
  
  // Get count of tickets with version tags (marked for release) in a specific group
  getMarkedReleaseVersions: (groupId: number) => {
    const { tickets } = get();
    
    // Only count OPEN and PENDING tickets in the specified group
    const unresolvedInGroup = tickets.filter(t => 
      t.groupId === groupId &&
      (t.status === FRESHDESK_STATUS.OPEN || t.status === FRESHDESK_STATUS.PENDING)
    );
    
    // Version tag pattern: X.Y or X.Y.Z
    const versionPattern = /^\d+\.\d+(\.\d+)?$/;
    
    // Count tickets that have at least one version tag
    let ticketsWithVersionTag = 0;
    for (const ticket of unresolvedInGroup) {
      const hasVersionTag = (ticket.tags || []).some(tag => versionPattern.test(tag));
      if (hasVersionTag) {
        ticketsWithVersionTag++;
      }
    }
    
    // Return as array with single item for compatibility
    return [{ version: 'total', count: ticketsWithVersionTag }];
  },
  
  // Get company name by ID (uses hardcoded constants first)
  getCompanyName: (companyId: number) => {
    // First try hardcoded constants (most reliable)
    const constantName = getCompanyNameFromConstants(companyId);
    if (!constantName.startsWith('Company ')) return constantName;
    
    // Fall back to API cache
    const { companies } = get();
    return companies[companyId] || constantName;
  },
  
  // Get group name by ID (uses hardcoded constants first)
  getGroupName: (groupId: number) => {
    // First try hardcoded constants (most reliable)
    const constantName = getGroupNameFromConstants(groupId);
    if (!constantName.startsWith('Group ')) return constantName;
    
    // Fall back to API cache
    const { groups } = get();
    return groups[groupId] || constantName;
  },
}));
