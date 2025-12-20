import { getPrismaClient } from '../../persistence/prisma-client';
import { logger } from '../../utils/logger';

/**
 * Weekly Founder Summary Service
 * Generates low-noise, high-signal weekly intelligence for founders
 */

export interface WeeklySummary {
  week_ending: string;
  data_coverage: string;
  top_risks: Array<{
    partner_name: string;
    risk_type: string;
    severity: string;
    details: string;
  }>;
  partners_to_watch: string[];
  recommended_actions: string[];
  key_metrics: {
    total_tickets_week: number;
    unresolved_backlog: number;
    critical_issues: number;
    trend_vs_last_week: string;
  };
}

export async function generateWeeklySummary(): Promise<WeeklySummary> {
  const prisma = getPrismaClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // Get data coverage
    const coverage = await prisma.ytdTicket.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    // Top risks - data loss patterns
    const dataLossRisks = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.name as partner_name,
        COUNT(*) as incident_count
      FROM ytd_tickets t
      JOIN company_cache c ON c.freshdesk_company_id = t.company_id
      WHERE 'data-loss' = ANY(t.tags)
        AND t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY c.name
      HAVING COUNT(*) > 2
      ORDER BY COUNT(*) DESC
      LIMIT 3
    `;

    // Critical volume partners
    const volumeRisks = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.name as partner_name,
        COUNT(*) as urgent_count
      FROM ytd_tickets t
      JOIN company_cache c ON c.freshdesk_company_id = t.company_id
      WHERE t.priority = 4
        AND t.status IN (2, 3)
        AND t.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY c.name
      HAVING COUNT(*) > 3
      ORDER BY COUNT(*) DESC
      LIMIT 3
    `;

    // Unresolved backlog partners
    const backlogRisks = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.name as partner_name,
        COUNT(*) as unresolved_count
      FROM ytd_tickets t
      JOIN company_cache c ON c.freshdesk_company_id = t.company_id
      WHERE t.status IN (2, 3)
        AND t.updated_at < NOW() - INTERVAL '7 days'
      GROUP BY c.name
      HAVING COUNT(*) > 5
      ORDER BY COUNT(*) DESC
      LIMIT 3
    `;

    // Combine top risks
    const topRisks: WeeklySummary['top_risks'] = [];

    for (const risk of dataLossRisks) {
      topRisks.push({
        partner_name: risk.partner_name,
        risk_type: 'Data Loss Pattern',
        severity: 'critical',
        details: `${risk.incident_count} data loss incidents in last 30 days`,
      });
    }

    for (const risk of volumeRisks) {
      topRisks.push({
        partner_name: risk.partner_name,
        risk_type: 'Critical Volume',
        severity: 'high',
        details: `${risk.urgent_count} urgent unresolved tickets this week`,
      });
    }

    for (const risk of backlogRisks) {
      topRisks.push({
        partner_name: risk.partner_name,
        risk_type: 'Unresolved Backlog',
        severity: 'medium',
        details: `${risk.unresolved_count} tickets unresolved >7 days`,
      });
    }

    // Partners with increasing trend
    const trendingPartners = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.name as partner_name,
        COUNT(*) FILTER (WHERE t.created_at >= ${weekAgo}) as this_week,
        COUNT(*) FILTER (WHERE t.created_at >= ${twoWeeksAgo} AND t.created_at < ${weekAgo}) as last_week
      FROM ytd_tickets t
      JOIN company_cache c ON c.freshdesk_company_id = t.company_id
      WHERE t.created_at >= ${twoWeeksAgo}
      GROUP BY c.name
      HAVING COUNT(*) FILTER (WHERE t.created_at >= ${twoWeeksAgo} AND t.created_at < ${weekAgo}) > 0
        AND COUNT(*) FILTER (WHERE t.created_at >= ${weekAgo})::FLOAT / 
            COUNT(*) FILTER (WHERE t.created_at >= ${twoWeeksAgo} AND t.created_at < ${weekAgo}) > 1.5
      ORDER BY COUNT(*) FILTER (WHERE t.created_at >= ${weekAgo}) DESC
      LIMIT 3
    `;

    const partnersToWatch = trendingPartners.map(p => p.partner_name);

    // Key metrics
    const thisWeekTickets = await prisma.ytdTicket.count({
      where: { createdAt: { gte: weekAgo } },
    });

    const lastWeekTickets = await prisma.ytdTicket.count({
      where: {
        createdAt: {
          gte: twoWeeksAgo,
          lt: weekAgo,
        },
      },
    });

    const unresolvedBacklog = await prisma.ytdTicket.count({
      where: { status: { in: [2, 3] } },
    });

    const criticalIssues = await prisma.ytdTicket.count({
      where: {
        priority: 4,
        status: { in: [2, 3] },
      },
    });

    const trendPercent = lastWeekTickets > 0
      ? ((thisWeekTickets - lastWeekTickets) / lastWeekTickets * 100).toFixed(0)
      : '0';

    const trendDirection = thisWeekTickets > lastWeekTickets ? '+' : '';

    // Generate recommended actions
    const recommendedActions: string[] = [];

    if (dataLossRisks.length > 0) {
      recommendedActions.push(
        `Schedule call with ${dataLossRisks[0].partner_name} re: data loss pattern (${dataLossRisks[0].incident_count} incidents)`
      );
    }

    if (volumeRisks.length > 0) {
      recommendedActions.push(
        `Review urgent backlog for ${volumeRisks[0].partner_name} (${volumeRisks[0].urgent_count} critical tickets)`
      );
    }

    if (trendingPartners.length > 0) {
      recommendedActions.push(
        `Monitor ${trendingPartners[0].partner_name} - ticket volume increased 50%+ this week`
      );
    }

    if (unresolvedBacklog > 50) {
      recommendedActions.push(
        `Consider capacity planning - backlog at ${unresolvedBacklog} tickets (+${((unresolvedBacklog / thisWeekTickets) * 100).toFixed(0)}%)`
      );
    }

    if (topRisks.some(r => r.risk_type === 'Data Loss Pattern')) {
      recommendedActions.push(
        'Review data sync infrastructure - multiple partners reporting data loss'
      );
    }

    return {
      week_ending: now.toISOString().split('T')[0],
      data_coverage: coverage._min.createdAt && coverage._max.createdAt
        ? `${coverage._min.createdAt.toISOString().split('T')[0]} to ${coverage._max.createdAt.toISOString().split('T')[0]}`
        : 'No data available',
      top_risks: topRisks.slice(0, 5),
      partners_to_watch: partnersToWatch,
      recommended_actions: recommendedActions.slice(0, 5),
      key_metrics: {
        total_tickets_week: thisWeekTickets,
        unresolved_backlog: unresolvedBacklog,
        critical_issues: criticalIssues,
        trend_vs_last_week: `${trendDirection}${trendPercent}%`,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate weekly summary');
    throw error;
  }
}
