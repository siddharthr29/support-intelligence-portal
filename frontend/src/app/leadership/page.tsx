'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { RecentTicketsTable } from '@/components/tickets/recent-tickets-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, TrendingDown, Users, Clock, AlertTriangle } from 'lucide-react';
import { useLeadership } from '@/contexts/leadership-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface MetricsSummary {
  long_unresolved_blockers: number;
  data_loss_incidents: number;
  how_to_volume: number;
  training_requests: number;
  sla_breaches: number;
  current_backlog: number;
  total_tickets_30d: number;
  avg_resolution_hours: number;
}

export default function LeadershipDashboard() {
  const { isInitialLoad, setIsInitialLoad, cachedData, setCachedData } = useLeadership();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(isInitialLoad);

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
  }, [loadData]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Executive Overview</h1>
          <p className="text-gray-600">Real-time support intelligence and partner health metrics</p>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-900 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Critical Alerts
            </h3>
            <div className="space-y-2">
              {criticalAlerts.map((alert: any, idx) => {
                const Icon = alert.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm text-red-800">
                    <Icon className="h-4 w-4" />
                    {alert.message}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Active Tickets</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">Total number of support tickets created in the last 30 days across all partners</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.total_tickets_30d || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Current Backlog</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">Total number of tickets that are currently unresolved (open or pending status)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.current_backlog || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Unresolved tickets</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Avg Resolution</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs font-semibold mb-1">Average time to resolve tickets</p>
                    <p className="text-xs max-w-xs mb-1">Formula: SUM(resolved_at - created_at) / COUNT(resolved tickets)</p>
                    <p className="text-xs max-w-xs text-gray-400">Only includes resolved tickets in the selected date range</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics?.avg_resolution_hours ? Math.round(metrics.avg_resolution_hours) : 0}h
            </div>
            <p className="text-sm text-gray-500 mt-1">Time to resolve</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Critical Issues</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">Sum of SLA breaches (urgent tickets unresolved &gt;24h) and data loss incidents in the last 30 days</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-600">
              {(metrics?.sla_breaches || 0) + (metrics?.data_loss_incidents || 0)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Needs attention</p>
          </div>
        </div>
        </TooltipProvider>

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
        <div className="mt-8">
          <RecentTicketsTable />
        </div>
      </div>
    </div>
  );
}
