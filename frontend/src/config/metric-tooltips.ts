/**
 * CENTRALIZED METRIC TOOLTIPS CONFIGURATION
 * 
 * This file contains all tooltip explanations for metrics across the application.
 * Each tooltip explains:
 * 1. What the metric represents
 * 2. How it is calculated
 * 3. Data source and logic
 */

export interface MetricTooltip {
  title: string;
  description: string;
  calculation: string;
  dataSource: string;
}

export const METRIC_TOOLTIPS: Record<string, MetricTooltip> = {
  // ============================================
  // DASHBOARD (Support Engineer Module)
  // ============================================
  
  'dashboard.total_tickets': {
    title: 'Total Tickets',
    description: 'Total number of tickets created in the selected date range',
    calculation: 'COUNT of all tickets where created_at is within the selected date range',
    dataSource: 'YtdTicket table filtered by createdAt date',
  },

  'dashboard.resolved': {
    title: 'Resolved Tickets',
    description: 'Tickets that have been resolved or closed in the selected period',
    calculation: 'COUNT of tickets with status = 4 (Resolved) OR status = 5 (Closed)',
    dataSource: 'YtdTicket table where status IN (4, 5)',
  },

  'dashboard.urgent_high': {
    title: 'Urgent & High Priority',
    description: 'Critical tickets requiring immediate attention',
    calculation: 'COUNT of tickets with priority = 4 (Urgent) + priority = 3 (High)',
    dataSource: 'YtdTicket table where priority IN (3, 4)',
  },

  'dashboard.pending': {
    title: 'Pending Tickets',
    description: 'Tickets awaiting customer response or action',
    calculation: 'COUNT of tickets with status = 3 (Pending)',
    dataSource: 'YtdTicket table where status = 3',
  },

  // ============================================
  // WEEKLY REPORT
  // ============================================

  'weekly.tickets_created': {
    title: 'Tickets Created This Week',
    description: 'New tickets created between Friday 5pm (last week) and Friday 5pm (this week)',
    calculation: 'COUNT of tickets where created_at >= last Friday 5pm AND created_at < this Friday 5pm',
    dataSource: 'WeeklySnapshot table for the selected week',
  },

  'weekly.tickets_resolved': {
    title: 'Tickets Resolved This Week',
    description: 'Tickets resolved by Support Engineers group during the week',
    calculation: 'COUNT of tickets resolved by group_id = 36000098156 (Support Engineers) with status = 4 or 5',
    dataSource: 'WeeklySnapshot.ticketsResolvedSupportEngineers',
  },

  'weekly.urgent': {
    title: 'Urgent Tickets',
    description: 'Highest priority tickets created this week',
    calculation: 'COUNT of tickets with priority = 4 (Urgent)',
    dataSource: 'WeeklySnapshot.urgentTickets',
  },

  'weekly.high': {
    title: 'High Priority Tickets',
    description: 'High priority tickets created this week',
    calculation: 'COUNT of tickets with priority = 3 (High)',
    dataSource: 'WeeklySnapshot.highTickets',
  },

  'weekly.avg_time_per_ticket': {
    title: 'Average Time Per Ticket',
    description: 'Average engineer hours spent per resolved ticket',
    calculation: 'Total Engineer Hours ÷ Tickets Resolved by Support Engineers',
    dataSource: 'EngineerHours table (manual input) divided by resolved count',
  },

  'weekly.unresolved_se': {
    title: 'Unresolved - Support Engineers',
    description: 'Open and Pending tickets assigned to Support Engineers at week end',
    calculation: 'COUNT of tickets with group_id = 36000098156 AND status IN (2=Open, 3=Pending)',
    dataSource: 'WeeklySnapshot.unresolvedSupportEngineers',
  },

  'weekly.unresolved_ps': {
    title: 'Unresolved - Product Support',
    description: 'Open, Pending, and Marked for Release tickets in Product Support at week end',
    calculation: 'COUNT of tickets with group_id = 36000098158 AND status IN (2=Open, 3=Pending, 7=Marked for Release)',
    dataSource: 'WeeklySnapshot.unresolvedProductSupport',
  },

  // ============================================
  // MONTHLY REPORT
  // ============================================

  'monthly.opening_balance': {
    title: 'Opening Balance',
    description: 'Unresolved tickets at the start of the month',
    calculation: 'COUNT of tickets created before month start that were Open/Pending OR resolved during this month',
    dataSource: 'YtdTicket table: tickets created < month start with status Open/Pending or updated_at in current month',
  },

  'monthly.closing_balance': {
    title: 'Closing Balance',
    description: 'Unresolved tickets at the end of the month',
    calculation: 'COUNT of tickets created up to month end with status = 2 (Open) OR status = 3 (Pending)',
    dataSource: 'YtdTicket table: tickets with createdAt <= month end AND status IN (2, 3)',
  },

  'monthly.tickets_created': {
    title: 'Tickets Created',
    description: 'Total tickets created during the month',
    calculation: 'COUNT of tickets where created_at >= month start AND created_at <= month end',
    dataSource: 'YtdTicket table filtered by createdAt within month boundaries',
  },

  'monthly.tickets_resolved': {
    title: 'Tickets Resolved',
    description: 'Tickets resolved during the month',
    calculation: 'COUNT of tickets with status = 4 (Resolved) AND updated_at within month',
    dataSource: 'YtdTicket table where status = 4 AND updated_at in month range',
  },

  'monthly.tickets_closed': {
    title: 'Tickets Closed',
    description: 'Tickets closed during the month',
    calculation: 'COUNT of tickets with status = 5 (Closed) AND updated_at within month',
    dataSource: 'YtdTicket table where status = 5 AND updated_at in month range',
  },

  'monthly.resolution_rate': {
    title: 'Resolution Rate',
    description: 'Percentage of created tickets that were resolved',
    calculation: '(Tickets Resolved + Tickets Closed) ÷ Tickets Created × 100',
    dataSource: 'Calculated from monthly resolved and created counts',
  },

  'monthly.avg_resolution_time': {
    title: 'Average Resolution Time',
    description: 'Average hours spent per resolved ticket',
    calculation: 'Total Engineer Hours ÷ (Resolved + Closed) OR 2.5 hrs if no engineer data',
    dataSource: 'EngineerHours table aggregated for month, fallback to 2.5 hrs estimate',
  },

  'monthly.product_support': {
    title: 'Product Support Tickets',
    description: 'Tickets assigned to Product Support team',
    calculation: 'COUNT of tickets created this month with group_id = 36000098158',
    dataSource: 'YtdTicket table where group_id = Product Support (36000098158)',
  },

  'monthly.support_engineers': {
    title: 'Support Engineers Tickets',
    description: 'Tickets assigned to Support Engineers team',
    calculation: 'COUNT of tickets created this month with group_id = 36000098156',
    dataSource: 'YtdTicket table where group_id = Support Engineers (36000098156)',
  },

  // ============================================
  // YEARLY REPORT
  // ============================================

  'yearly.total_tickets': {
    title: 'Total Tickets (YTD)',
    description: 'All tickets created from January 1st to now',
    calculation: 'COUNT of tickets where created_at >= Jan 1 of current year',
    dataSource: 'YtdTicket table filtered by year',
  },

  'yearly.resolution_rate': {
    title: 'Resolution Rate (YTD)',
    description: 'Percentage of tickets resolved year-to-date',
    calculation: '(Resolved + Closed) ÷ Total Tickets × 100',
    dataSource: 'YtdTicket table aggregated by status',
  },

  'yearly.open': {
    title: 'Open Tickets',
    description: 'Currently open tickets',
    calculation: 'COUNT of tickets with status = 2 (Open)',
    dataSource: 'YtdTicket table where status = 2',
  },

  'yearly.pending': {
    title: 'Pending Tickets',
    description: 'Tickets awaiting response',
    calculation: 'COUNT of tickets with status = 3 (Pending)',
    dataSource: 'YtdTicket table where status = 3',
  },

  'yearly.resolved': {
    title: 'Resolved Tickets',
    description: 'Tickets marked as resolved',
    calculation: 'COUNT of tickets with status = 4 (Resolved)',
    dataSource: 'YtdTicket table where status = 4',
  },

  'yearly.closed': {
    title: 'Closed Tickets',
    description: 'Tickets marked as closed',
    calculation: 'COUNT of tickets with status = 5 (Closed)',
    dataSource: 'YtdTicket table where status = 5',
  },

  // ============================================
  // RFT (Ready for Testing)
  // ============================================

  'rft.total_organisations': {
    title: 'Total Organisations',
    description: 'Number of unique organisations with RFT data',
    calculation: 'COUNT DISTINCT of organisation_id from RFT snapshots',
    dataSource: 'RftSnapshot table grouped by organisationId',
  },

  'rft.total_tickets': {
    title: 'Total RFT Tickets',
    description: 'All tickets marked for release across all organisations',
    calculation: 'SUM of markedReleaseCount from all RFT snapshots',
    dataSource: 'RftSnapshot.markedReleaseCount aggregated',
  },

  'rft.avg_per_org': {
    title: 'Average Per Organisation',
    description: 'Average number of RFT tickets per organisation',
    calculation: 'Total RFT Tickets ÷ Total Organisations',
    dataSource: 'Calculated from RFT totals',
  },

  // ============================================
  // LEADERSHIP MODULE - IMPLEMENTATIONS
  // ============================================

  'leadership.total_implementations': {
    title: 'Total Implementations',
    description: 'Number of Avni implementations across all partners',
    calculation: 'COUNT of unique implementation records',
    dataSource: 'Implementation table',
  },

  'leadership.active_partners': {
    title: 'Active Partners',
    description: 'Partners with at least one active implementation',
    calculation: 'COUNT DISTINCT of partner_id where status = Active',
    dataSource: 'Implementation table grouped by partnerId',
  },

  'leadership.implementations_by_state': {
    title: 'Implementations by State',
    description: 'Geographic distribution of implementations',
    calculation: 'COUNT of implementations grouped by state',
    dataSource: 'Implementation table aggregated by state field',
  },

  'leadership.implementations_by_partner': {
    title: 'Implementations by Partner',
    description: 'Distribution of implementations across partners',
    calculation: 'COUNT of implementations grouped by partner_id',
    dataSource: 'Implementation table aggregated by partnerId',
  },

  // ============================================
  // COMPANIES
  // ============================================

  'companies.total_tickets': {
    title: 'Total Tickets',
    description: 'All tickets from this company',
    calculation: 'COUNT of tickets where company_id matches',
    dataSource: 'YtdTicket table filtered by companyId',
  },

  'companies.resolved': {
    title: 'Resolved',
    description: 'Resolved and closed tickets',
    calculation: 'COUNT where company_id matches AND status IN (4, 5)',
    dataSource: 'YtdTicket table filtered by companyId and status',
  },

  'companies.resolution_rate': {
    title: 'Resolution Rate',
    description: 'Percentage of tickets resolved',
    calculation: 'Resolved ÷ Total × 100',
    dataSource: 'Calculated from company ticket counts',
  },

  // ============================================
  // ERROR LOGS
  // ============================================

  'errors.total_errors': {
    title: 'Total Errors',
    description: 'Number of error log entries',
    calculation: 'COUNT of error log records in date range',
    dataSource: 'ActivityLog table where level = error',
  },

  'errors.by_service': {
    title: 'Errors by Service',
    description: 'Distribution of errors across services',
    calculation: 'COUNT of errors grouped by service name',
    dataSource: 'ActivityLog table aggregated by service field',
  },
};

/**
 * Get tooltip for a specific metric
 */
export function getMetricTooltip(key: string): MetricTooltip | null {
  return METRIC_TOOLTIPS[key] || null;
}

/**
 * Format tooltip content for display
 */
export function formatTooltipContent(tooltip: MetricTooltip): string {
  return `${tooltip.description}\n\nCalculation: ${tooltip.calculation}\n\nSource: ${tooltip.dataSource}`;
}

/**
 * Get short tooltip (description only)
 */
export function getShortTooltip(key: string): string {
  const tooltip = METRIC_TOOLTIPS[key];
  return tooltip ? tooltip.description : '';
}

/**
 * Get full tooltip (all details)
 */
export function getFullTooltip(key: string): string {
  const tooltip = METRIC_TOOLTIPS[key];
  return tooltip ? formatTooltipContent(tooltip) : '';
}
