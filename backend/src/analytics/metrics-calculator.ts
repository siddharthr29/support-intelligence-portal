import type { FreshdeskTicket, FreshdeskGroup, FreshdeskCompany } from '../services/freshdesk';
import { FRESHDESK_PRIORITY, FRESHDESK_STATUS } from '../services/freshdesk';
import type {
  WeeklyMetrics,
  PriorityBreakdown,
  GroupResolution,
  CustomerTicketCount,
  UnresolvedSnapshot,
} from './types';
import { logger } from '../utils/logger';

const SUPPORT_ENGINEERS_GROUP_NAME = 'Support Engineers';
const PRODUCT_SUPPORT_GROUP_NAME = 'Product Support';

export function computeWeeklyMetrics(
  snapshotId: string,
  weekStartDate: string,
  weekEndDate: string,
  tickets: readonly FreshdeskTicket[],
  groups: readonly FreshdeskGroup[],
  companies: readonly FreshdeskCompany[]
): WeeklyMetrics {
  logger.info({ snapshotId, ticketCount: tickets.length }, 'Computing weekly metrics');

  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  const ticketsCreated = countTicketsCreatedInWeek(tickets, weekStartDate, weekEndDate);
  const ticketsResolved = countTicketsByStatus(tickets, FRESHDESK_STATUS.RESOLVED);
  const ticketsClosed = countTicketsByStatus(tickets, FRESHDESK_STATUS.CLOSED);

  const priorityBreakdown = computePriorityBreakdown(tickets);
  const resolutionByGroup = computeResolutionByGroup(tickets, groupMap);
  const customerWithMaxTickets = findCustomerWithMaxTickets(tickets, companyMap);
  const unresolvedSnapshot = computeUnresolvedSnapshot(tickets, groups);

  const averageResolutionTimeHours = computeAverageResolutionTime(tickets);

  const metrics: WeeklyMetrics = {
    snapshotId,
    weekStartDate,
    weekEndDate,
    computedAt: new Date().toISOString(),
    ticketsCreated,
    ticketsResolved,
    ticketsClosed,
    priorityBreakdown,
    resolutionByGroup,
    customerWithMaxTickets,
    unresolvedSnapshot,
    averageResolutionTimeHours,
  };

  logger.info({ snapshotId, ticketsCreated, ticketsResolved }, 'Weekly metrics computed');

  return metrics;
}

function countTicketsCreatedInWeek(
  tickets: readonly FreshdeskTicket[],
  weekStartDate: string,
  weekEndDate: string
): number {
  const start = new Date(weekStartDate).getTime();
  const end = new Date(weekEndDate).getTime();

  return tickets.filter(t => {
    const created = new Date(t.created_at).getTime();
    return created >= start && created <= end;
  }).length;
}

function countTicketsByStatus(
  tickets: readonly FreshdeskTicket[],
  status: number
): number {
  return tickets.filter(t => t.status === status).length;
}

function computePriorityBreakdown(tickets: readonly FreshdeskTicket[]): PriorityBreakdown {
  return {
    urgent: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.URGENT).length,
    high: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.HIGH).length,
    medium: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.MEDIUM).length,
    low: tickets.filter(t => t.priority === FRESHDESK_PRIORITY.LOW).length,
  };
}

function computeResolutionByGroup(
  tickets: readonly FreshdeskTicket[],
  groupMap: Map<number, string>
): readonly GroupResolution[] {
  const groupStats = new Map<number, { resolved: number; open: number; pending: number }>();

  for (const ticket of tickets) {
    if (ticket.group_id === null) continue;

    if (!groupStats.has(ticket.group_id)) {
      groupStats.set(ticket.group_id, { resolved: 0, open: 0, pending: 0 });
    }

    const stats = groupStats.get(ticket.group_id)!;

    if (ticket.status === FRESHDESK_STATUS.RESOLVED || ticket.status === FRESHDESK_STATUS.CLOSED) {
      stats.resolved++;
    } else if (ticket.status === FRESHDESK_STATUS.OPEN) {
      stats.open++;
    } else if (ticket.status === FRESHDESK_STATUS.PENDING) {
      stats.pending++;
    }
  }

  const results: GroupResolution[] = [];

  for (const [groupId, stats] of groupStats) {
    results.push({
      groupId,
      groupName: groupMap.get(groupId) || `Group ${groupId}`,
      ticketsResolved: stats.resolved,
      ticketsOpen: stats.open,
      ticketsPending: stats.pending,
    });
  }

  return results;
}

function findCustomerWithMaxTickets(
  tickets: readonly FreshdeskTicket[],
  companyMap: Map<number, string>
): CustomerTicketCount | null {
  const companyCounts = new Map<number, number>();

  for (const ticket of tickets) {
    if (ticket.company_id === null) continue;

    const current = companyCounts.get(ticket.company_id) || 0;
    companyCounts.set(ticket.company_id, current + 1);
  }

  let maxCompanyId: number | null = null;
  let maxCount = 0;

  for (const [companyId, count] of companyCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxCompanyId = companyId;
    }
  }

  if (maxCompanyId === null) {
    return null;
  }

  return {
    companyId: maxCompanyId,
    companyName: companyMap.get(maxCompanyId) || `Company ${maxCompanyId}`,
    ticketCount: maxCount,
  };
}

function computeUnresolvedSnapshot(
  tickets: readonly FreshdeskTicket[],
  groups: readonly FreshdeskGroup[]
): UnresolvedSnapshot {
  const supportEngineersGroup = groups.find(g => g.name === SUPPORT_ENGINEERS_GROUP_NAME);
  const productSupportGroup = groups.find(g => g.name === PRODUCT_SUPPORT_GROUP_NAME);

  const supportEngineersGroupId = supportEngineersGroup?.id;
  const productSupportGroupId = productSupportGroup?.id;

  let seOpen = 0;
  let sePending = 0;
  let psOpen = 0;
  let psPending = 0;
  let psMarkedForRelease = 0;

  for (const ticket of tickets) {
    if (ticket.group_id === supportEngineersGroupId) {
      if (ticket.status === FRESHDESK_STATUS.OPEN) seOpen++;
      if (ticket.status === FRESHDESK_STATUS.PENDING) sePending++;
    }

    if (ticket.group_id === productSupportGroupId) {
      if (ticket.status === FRESHDESK_STATUS.OPEN) psOpen++;
      if (ticket.status === FRESHDESK_STATUS.PENDING) psPending++;
      if (ticket.type === 'Marked for release') psMarkedForRelease++;
    }
  }

  return {
    supportEngineers: {
      open: seOpen,
      pending: sePending,
    },
    productSupport: {
      open: psOpen,
      pending: psPending,
      markedForRelease: psMarkedForRelease,
    },
  };
}

function computeAverageResolutionTime(tickets: readonly FreshdeskTicket[]): number | null {
  const resolvedTickets = tickets.filter(
    t => t.status === FRESHDESK_STATUS.RESOLVED || t.status === FRESHDESK_STATUS.CLOSED
  );

  if (resolvedTickets.length === 0) {
    return null;
  }

  let totalHours = 0;

  for (const ticket of resolvedTickets) {
    const created = new Date(ticket.created_at).getTime();
    const updated = new Date(ticket.updated_at).getTime();
    const diffMs = updated - created;
    const diffHours = diffMs / (1000 * 60 * 60);
    totalHours += diffHours;
  }

  return totalHours / resolvedTickets.length;
}
