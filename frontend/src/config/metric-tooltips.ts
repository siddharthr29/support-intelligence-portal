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

  'product_support.overview': {
    title: 'Product Team Support',
    description: 'Tickets assigned to and closed by the Product Support team',
    calculation: 'Assigned: COUNT of tickets with group_id = 36000098158 AND status IN (2=Open, 3=Pending). Closed: COUNT with status IN (4=Resolved, 5=Closed)',
    dataSource: 'YtdTicket table filtered by Product Support group (36000098158)',
  },

  // ============================================
  // RFT (Rule Failure Telemetry)
  // ============================================

  'rft.total_tickets': {
    title: 'Total Open RFTs',
    description: 'Total number of Rule Failure Telemetry tickets currently open',
    calculation: 'COUNT of open RFT tickets from Metabase',
    dataSource: 'Metabase RFT dashboard - refreshed on demand',
  },

  'rft.new_this_week': {
    title: 'New RFTs This Week',
    description: 'Newly reported RFT tickets in the current week',
    calculation: 'COUNT of RFT tickets created this week',
    dataSource: 'Metabase RFT dashboard - weekly aggregation',
  },

  'rft.closures_this_week': {
    title: 'RFT Closures This Week',
    description: 'RFT tickets resolved/closed in the current week',
    calculation: 'COUNT of RFT tickets closed this week',
    dataSource: 'Metabase RFT dashboard - weekly closures',
  },

  'rft.total_closed': {
    title: 'Total Closed RFTs',
    description: 'All-time count of closed RFT tickets',
    calculation: 'COUNT of all closed RFT tickets',
    dataSource: 'Metabase RFT dashboard - cumulative total',
  },

  'rft.avg_per_org': {
    title: 'Average RFTs per Organization',
    description: 'Average number of open RFTs across all organizations',
    calculation: 'Total Open RFTs ÷ Number of Organizations',
    dataSource: 'Metabase RFT dashboard - organizational breakdown',
  },

  // ============================================
  // COMPANIES PAGE
  // ============================================

  'companies.ticket_volume': {
    title: 'Company Ticket Volume',
    description: 'Total tickets created by this company in the year',
    calculation: 'COUNT of tickets where company_id matches',
    dataSource: 'YtdTicket table grouped by company_id',
  },

  'companies.weekly_tickets': {
    title: 'Weekly Ticket Count',
    description: 'Tickets created by this company in the last 7 days',
    calculation: 'COUNT of tickets in last 7 days for company',
    dataSource: 'YtdTicket table filtered by company and date',
  },

  // ============================================
  // LEADERSHIP MODULE - OVERVIEW
  // ============================================

  'leadership.active_tickets': {
    title: 'Active Tickets (30d)',
    description: 'Total tickets created in the last 30 days across all partners',
    calculation: 'COUNT of tickets where created_at >= NOW() - 30 days',
    dataSource: 'YtdTicket table - last 30 days',
  },

  'leadership.current_backlog': {
    title: 'Current Backlog',
    description: 'Total unresolved tickets (open or pending status)',
    calculation: 'COUNT of tickets with status IN (2=Open, 3=Pending)',
    dataSource: 'YtdTicket table - current unresolved count',
  },

  'leadership.avg_resolution': {
    title: 'Average Resolution Time',
    description: 'Average time to resolve tickets in hours',
    calculation: 'AVG(resolved_at - created_at) for resolved tickets',
    dataSource: 'YtdTicket table - only resolved tickets',
  },

  'leadership.critical_issues': {
    title: 'Critical Issues',
    description: 'Sum of SLA breaches and data loss incidents',
    calculation: 'SLA breaches (urgent >24h unresolved) + Data loss incidents (30d)',
    dataSource: 'Computed from YtdTicket table with business logic',
  },

  'leadership.sla_breaches': {
    title: 'SLA Breaches',
    description: 'Urgent tickets unresolved for more than 24 hours',
    calculation: 'COUNT of tickets with priority=4 AND status IN (2,3) AND age > 24h',
    dataSource: 'YtdTicket table with SLA logic',
  },

  'leadership.data_loss_incidents': {
    title: 'Data Loss Incidents',
    description: 'Tickets tagged with data loss in last 30 days',
    calculation: 'COUNT of tickets with "data loss" tag in last 30 days',
    dataSource: 'YtdTicket table filtered by tags',
  },

  'leadership.long_unresolved': {
    title: 'Long Unresolved Blockers',
    description: 'Urgent/high priority tickets unresolved for more than 7 days',
    calculation: 'COUNT of tickets with priority IN (3,4) AND status IN (2,3) AND age > 7 days',
    dataSource: 'YtdTicket table with blocker logic',
  },

  'leadership.how_to_volume': {
    title: 'How-To Tickets',
    description: 'Tickets categorized as "how-to" questions',
    calculation: 'COUNT of tickets with "how-to" tag or category',
    dataSource: 'YtdTicket table filtered by tags/category',
  },

  'leadership.training_requests': {
    title: 'Training Requests',
    description: 'Tickets requesting training or onboarding support',
    calculation: 'COUNT of tickets with "training" tag',
    dataSource: 'YtdTicket table filtered by training tags',
  },

  // ============================================
  // LEADERSHIP MODULE - PARTNERS
  // ============================================

  'leadership.partner_risk': {
    title: 'Partner Risk Score',
    description: 'Risk level based on ticket patterns and critical issues',
    calculation: 'Computed from data loss, sync failures, unresolved count, and urgent tickets',
    dataSource: 'Aggregated from multiple ticket metrics',
  },

  'leadership.partner_tickets_12m': {
    title: 'Partner Tickets (12 months)',
    description: 'Total tickets from this partner in the last 12 months',
    calculation: 'COUNT of tickets where partner_id matches in last 12 months',
    dataSource: 'YtdTicket table grouped by partner',
  },

  'leadership.partner_trend': {
    title: 'Partner Ticket Trend',
    description: 'Trend ratio comparing last 30 days to previous 30 days',
    calculation: '(Tickets last 30d ÷ Tickets previous 30d) - 1',
    dataSource: 'Computed from YtdTicket table date ranges',
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

// Helper function to get tooltip by key
export function getMetricTooltip(key: string): MetricTooltip | undefined {
  return METRIC_TOOLTIPS[key];
}

// Helper function to check if tooltip exists
export function hasMetricTooltip(key: string): boolean {
  return key in METRIC_TOOLTIPS;
}
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
