'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { RecentTicketsTable } from '@/components/tickets/recent-tickets-table';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { useLeadership } from '@/contexts/leadership-context';
import { ProductSupportCard } from '@/components/dashboard/product-support-card';
import { useTicketStore } from '@/stores/ticket-store';

interface MetricsSummary {
  long_unresolved_blockers: number;
  data_loss_incidents: number;
  how_to_volume: number;
  training_requests: number;
  sla_breaches: number;
  current_backlog: number;
  total_tickets_30d: number;
  resolution_rate: number;
}

export default function LeadershipDashboard() {
  const { isInitialLoad, setIsInitialLoad, cachedData, setCachedData } = useLeadership();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(isInitialLoad);
  
  // Get Product Support metrics from ticket store
  const { getProductSupportMetrics, getCompanyName, fetchAllTickets, isLoading: ticketsLoading } = useTicketStore();

  const loadData = useCallback(async () => {
    const cacheKey = 'overview-metrics';
    
    // Check cache first
    if (cachedData[cacheKey]) {
      setMetrics(cachedData[cacheKey]);
      setLoading(false);
      return;
    }

    // Only show loading on initial load
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiGet('/api/leadership/metrics/summary');
      setMetrics(response.data);
      setCachedData(cacheKey, response.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [cachedData, setCachedData, isInitialLoad, setIsInitialLoad]);

  useEffect(() => {
    loadData();
    fetchAllTickets();
  }, [loadData, fetchAllTickets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const criticalAlerts = [
    metrics && metrics.sla_breaches > 0 && {
      type: 'critical',
      message: `${metrics.sla_breaches} SLA breaches in last 24h`,
      icon: AlertCircle,
    },
    metrics && metrics.data_loss_incidents > 0 && {
      type: 'critical',
      message: `${metrics.data_loss_incidents} data loss incidents (30d)`,
      icon: AlertTriangle,
    },
    metrics && metrics.long_unresolved_blockers > 0 && {
      type: 'warning',
      message: `${metrics.long_unresolved_blockers} long-unresolved blockers (>7d)`,
      icon: Clock,
    },
  ].filter(Boolean);
  
  // Get Product Support metrics
  const productSupportMetrics = getProductSupportMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <SectionHeader
          title="Executive Overview"
          description="Real-time support intelligence and partner health metrics"
          icon={BarChart3}
        />

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-red-900 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Critical Alerts
              <Badge variant="destructive" className="ml-auto">{criticalAlerts.length}</Badge>
            </h3>
            <div className="space-y-2">
              {criticalAlerts.map((alert: any, idx) => {
                const Icon = alert.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm text-red-800 bg-white/50 p-2 rounded-lg">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{alert.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Tickets"
            value={metrics?.total_tickets_30d || 0}
            subtitle="Last 30 days"
            icon={Users}
            tooltipKey="leadership.active_tickets"
            variant="info"
          />

          <StatCard
            title="Current Backlog"
            value={metrics?.current_backlog || 0}
            subtitle="Unresolved tickets"
            icon={AlertTriangle}
            tooltipKey="leadership.current_backlog"
            variant="warning"
          />

          <StatCard
            title="Resolution Rate"
            value={`${metrics?.resolution_rate || 0}%`}
            subtitle="Tickets resolved"
            icon={Clock}
            tooltipKey="leadership.resolution_rate"
            variant="primary"
          />

          <StatCard
            title="Critical Issues"
            value={(metrics?.sla_breaches || 0) + (metrics?.data_loss_incidents || 0)}
            subtitle="Needs attention"
            icon={AlertCircle}
            tooltipKey="leadership.critical_issues"
            variant="error"
          />
        </div>

        {/* Product Support Card */}
        <ProductSupportCard
          assignedCount={productSupportMetrics.assignedCount}
          closedCount={productSupportMetrics.closedCount}
          assignedTickets={productSupportMetrics.assignedTickets}
          closedTickets={productSupportMetrics.closedTickets}
          getCompanyName={getCompanyName}
          isLoading={ticketsLoading}
          trend={productSupportMetrics.trend}
        />

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/leadership/partners" className="bg-white rounded-lg border p-6 hover:border-green-600 hover:shadow-md transition-all">
            <h3 className="text-lg font-semibold mb-2">Partner Health</h3>
            <p className="text-gray-600 text-sm mb-4">
              View partner risk scores, engagement patterns, and operational health metrics
            </p>
            <span className="text-green-600 font-medium text-sm">View Partners →</span>
          </a>

          <a href="/leadership/metrics" className="bg-white rounded-lg border p-6 hover:border-green-600 hover:shadow-md transition-all">
            <h3 className="text-lg font-semibold mb-2">Deep Analytics</h3>
            <p className="text-gray-600 text-sm mb-4">
              Program risk, adoption signals, platform reliability, and capacity metrics
            </p>
            <span className="text-green-600 font-medium text-sm">View Metrics →</span>
          </a>

          <a href="/leadership/summary" className="bg-white rounded-lg border p-6 hover:border-green-600 hover:shadow-md transition-all">
            <h3 className="text-lg font-semibold mb-2">Weekly Summary</h3>
            <p className="text-gray-600 text-sm mb-4">
              Executive intelligence summary with top risks and recommended actions
            </p>
            <span className="text-green-600 font-medium text-sm">View Summary →</span>
          </a>
        </div>

        {/* Recent Tickets History */}
        <CollapsibleSection 
          title="Recent Tickets" 
          defaultOpen={false}
        >
          <RecentTicketsTable />
        </CollapsibleSection>
      </div>
    </div>
  );
}
