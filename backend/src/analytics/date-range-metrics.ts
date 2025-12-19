import type { TicketSnapshotRecord } from '../persistence/date-range-repository';
import { FRESHDESK_PRIORITY, FRESHDESK_STATUS } from '../services/freshdesk';
import type { DateRange } from '../utils/date-range';
import { logger } from '../utils/logger';

export interface DateRangeMetrics {
  readonly dateRange: {
    readonly startDate: string;
    readonly endDate: string;
    readonly displayRange: string;
  };
  readonly computedAt: string;

  readonly totalTickets: number;
  readonly ticketsCreated: number;
  readonly ticketsResolved: number;
  readonly ticketsClosed: number;
  readonly ticketsOpen: number;
  readonly ticketsPending: number;

  readonly priorityBreakdown: {
    readonly urgent: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };

  readonly statusBreakdown: {
    readonly open: number;
    readonly pending: number;
    readonly resolved: number;
    readonly closed: number;
  };

  readonly escalatedTickets: number;

  readonly groupBreakdown: readonly {
    readonly groupId: number;
    readonly ticketCount: number;
    readonly resolved: number;
    readonly open: number;
    readonly pending: number;
  }[];

  readonly companyBreakdown: readonly {
    readonly companyId: number;
    readonly ticketCount: number;
  }[];

  readonly topCompany: {
    readonly companyId: number;
    readonly ticketCount: number;
  } | null;

  // Tags analysis for weekly report
  readonly tagsAnalysis: {
    readonly ticketsWithTags: number;
    readonly ticketsWithoutTags: number;
    readonly tagBreakdown: readonly { tag: string; count: number }[];
  };
}

export function computeDateRangeMetrics(
  tickets: readonly TicketSnapshotRecord[],
  range: DateRange,
  displayRange: string
): DateRangeMetrics {
  logger.info({
    ticketCount: tickets.length,
    startDate: range.startDateISO,
    endDate: range.endDateISO,
  }, 'Computing date range metrics');

  const ticketsCreated = tickets.filter(t => {
    const created = new Date(t.createdAt).getTime();
    return created >= range.startDate.getTime() && created <= range.endDate.getTime();
  }).length;

  const ticketsResolved = tickets.filter(t => t.status === FRESHDESK_STATUS.RESOLVED).length;
  const ticketsClosed = tickets.filter(t => t.status === FRESHDESK_STATUS.CLOSED).length;
  const ticketsOpen = tickets.filter(t => t.status === FRESHDESK_STATUS.OPEN).length;
  const ticketsPending = tickets.filter(t => t.status === FRESHDESK_STATUS.PENDING).length;

  const priorityBreakdown = {
    urgent: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length,
    high: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length,
    medium: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length,
    low: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length,
  };

  const statusBreakdown = {
    open: ticketsOpen,
    pending: ticketsPending,
    resolved: ticketsResolved,
    closed: ticketsClosed,
  };

  const escalatedTickets = tickets.filter(t => t.isEscalated).length;

  const groupMap = new Map<number, { count: number; resolved: number; open: number; pending: number }>();
  for (const ticket of tickets) {
    if (ticket.groupId === null) continue;
    if (!groupMap.has(ticket.groupId)) {
      groupMap.set(ticket.groupId, { count: 0, resolved: 0, open: 0, pending: 0 });
    }
    const stats = groupMap.get(ticket.groupId)!;
    stats.count++;
    if (ticket.status === FRESHDESK_STATUS.RESOLVED || ticket.status === FRESHDESK_STATUS.CLOSED) {
      stats.resolved++;
    } else if (ticket.status === FRESHDESK_STATUS.OPEN) {
      stats.open++;
    } else if (ticket.status === FRESHDESK_STATUS.PENDING) {
      stats.pending++;
    }
  }

  const groupBreakdown = Array.from(groupMap.entries()).map(([groupId, stats]) => ({
    groupId,
    ticketCount: stats.count,
    resolved: stats.resolved,
    open: stats.open,
    pending: stats.pending,
  }));

  const companyMap = new Map<number, number>();
  for (const ticket of tickets) {
    if (ticket.companyId === null) continue;
    companyMap.set(ticket.companyId, (companyMap.get(ticket.companyId) || 0) + 1);
  }

  const companyBreakdown = Array.from(companyMap.entries())
    .map(([companyId, ticketCount]) => ({ companyId, ticketCount }))
    .sort((a, b) => b.ticketCount - a.ticketCount);

  const topCompany = companyBreakdown.length > 0 ? companyBreakdown[0] : null;

  // Tags analysis
  const ticketsWithTags = tickets.filter(t => t.tags && t.tags.length > 0).length;
  const ticketsWithoutTags = tickets.length - ticketsWithTags;
  
  const tagMap = new Map<string, number>();
  for (const ticket of tickets) {
    if (ticket.tags) {
      for (const tag of ticket.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
  }
  
  const tagBreakdown = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 tags

  const tagsAnalysis = {
    ticketsWithTags,
    ticketsWithoutTags,
    tagBreakdown,
  };

  return {
    dateRange: {
      startDate: range.startDateISO,
      endDate: range.endDateISO,
      displayRange,
    },
    computedAt: new Date().toISOString(),
    totalTickets: tickets.length,
    ticketsCreated,
    ticketsResolved,
    ticketsClosed,
    ticketsOpen,
    ticketsPending,
    priorityBreakdown,
    statusBreakdown,
    escalatedTickets,
    groupBreakdown,
    companyBreakdown,
    topCompany,
    tagsAnalysis,
  };
}
