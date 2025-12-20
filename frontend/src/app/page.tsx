'use client';

import { useState, useEffect, lazy, Suspense } from "react";
import { format, startOfWeek, endOfWeek, startOfYear } from "date-fns";
import { Shell } from "@/components/layout/shell";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Ticket, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  RefreshCcw,
  Loader2,
  Calendar
} from "lucide-react";
import { useTicketStore } from "@/stores/ticket-store";
import { useYearStore } from "@/stores/year-store";

// Lazy load heavy components for better performance
const PriorityChart = lazy(() => import("@/components/dashboard/priority-chart").then(m => ({ default: m.PriorityChart })));
const StatusChart = lazy(() => import("@/components/dashboard/status-chart").then(m => ({ default: m.StatusChart })));
const UnresolvedSummary = lazy(() => import("@/components/dashboard/unresolved-summary").then(m => ({ default: m.UnresolvedSummary })));

// Loading skeleton for lazy components
const ChartSkeleton = () => (
  <div className="h-[300px] bg-white rounded-lg border p-6">
    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
    <div className="h-[200px] w-full bg-gray-100 rounded animate-pulse"></div>
  </div>
);

const MetricCardSkeleton = () => (
  <div className="bg-white rounded-lg border p-6">
    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
    <div className="h-8 w-16 bg-gray-300 rounded animate-pulse mb-2"></div>
    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
  </div>
);

// Date range presets - Dashboard uses only past month and week (YTD moved to Yearly Report)
type DatePreset = 'current_week' | 'past_month' | 'custom';

export default function DashboardPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('current_week');
  const { selectedYear } = useYearStore();
  
  // Use centralized ticket store
  const { 
    dateRange, 
    setDateRange, 
    filteredStats, 
    isLoading: isStatsLoading, 
    error: statsError,
    fetchAllTickets,
    lastFetched,
  } = useTicketStore();

  // Fetch tickets on mount
  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  // Update date range when preset changes
  useEffect(() => {
    const now = new Date();
    if (datePreset === 'past_month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setDateRange({ from: monthAgo, to: now });
    } else if (datePreset === 'current_week') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const effectiveEnd = now < weekEnd ? now : weekEnd;
      setDateRange({ from: weekStart, to: effectiveEnd });
    }
  }, [datePreset, setDateRange]);

  const handleRefresh = () => {
    // Force refetch by clearing lastFetched
    useTicketStore.setState({ lastFetched: null });
    fetchAllTickets();
    toast.success('Refreshing data from Freshdesk...');
  };

  useEffect(() => {
    if (statsError) {
      toast.error("Failed to load dashboard statistics");
    }
  }, [statsError]);

  // Use filtered stats from store
  const statsData = filteredStats ? {
    priorityBreakdown: filteredStats.priorityBreakdown,
    statusBreakdown: filteredStats.statusBreakdown,
    groupBreakdown: filteredStats.groupBreakdown,
  } : null;

  const resolutionRate = filteredStats?.resolutionRate ?? 0;
  const hasNoData = filteredStats && filteredStats.totalTickets === 0;

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Support Intelligence Dashboard - {selectedYear}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isStatsLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading live data from Freshdesk...
                </span>
              ) : (
                <>
                  {dateRange.from && dateRange.to && (
                    <span>
                      {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </span>
                  )}
                  {lastFetched && (
                    <span className="ml-2 text-xs">
                      (Cached: {lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })})
                    </span>
                  )}
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Data syncs automatically every Friday at 4:30 PM IST. Last sync fetches new/updated tickets since previous sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <Button
                variant={datePreset === 'current_week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('current_week')}
                className="text-xs"
              >
                This Week
              </Button>
              <Button
                variant={datePreset === 'past_month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('past_month')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Past Month
              </Button>
            </div>
            <DateRangePicker
              startDate={dateRange.from}
              endDate={dateRange.to}
              onSelect={(range) => {
                setDatePreset('custom');
                if (range) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isStatsLoading}
              className="text-xs gap-1"
            >
              <RefreshCcw className={`h-3 w-3 ${isStatsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Empty State for No Data */}
        {hasNoData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              No Data Available for {selectedYear}
            </h3>
            <p className="text-sm text-yellow-700 mb-4">
              There are no tickets recorded for this year. Please select a different year or wait for data to be synced.
            </p>
          </div>
        )}

        {/* Key Metrics Grid */}
        {!hasNoData && (
          <>
            {isStatsLoading ? (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <MetricCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="New Tickets"
                  value={filteredStats?.ticketsCreated ?? 0}
                  subtitle={dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}` : 'Select date range'}
                  icon={Ticket}
                  iconClassName="from-blue-500/20 to-blue-600/10"
                  infoText="Total new tickets created in the selected period."
                />
                <MetricCard
                  title="Completed"
                  value={(filteredStats?.ticketsResolved ?? 0) + (filteredStats?.ticketsClosed ?? 0)}
                  subtitle={`${filteredStats?.ticketsResolved ?? 0} resolved, ${filteredStats?.ticketsClosed ?? 0} closed`}
                  icon={CheckCircle2}
                  iconClassName="from-green-500/20 to-green-600/10"
                  infoText="Tickets resolved or closed in the selected period."
                />
                <MetricCard
                  title="High Priority"
                  value={(filteredStats?.urgentTickets ?? 0) + (filteredStats?.highTickets ?? 0)}
                  subtitle={`${filteredStats?.urgentTickets ?? 0} urgent, ${filteredStats?.highTickets ?? 0} high`}
                  icon={AlertTriangle}
                  iconClassName="from-red-500/20 to-red-600/10"
                  infoText="Urgent and High priority tickets requiring attention."
                />
                <MetricCard
                  title="Completion Rate"
                  value={`${resolutionRate}%`}
                  subtitle={`${filteredStats?.ticketsOpen ?? 0} open, ${filteredStats?.ticketsPending ?? 0} pending`}
                  icon={TrendingUp}
                  iconClassName="from-purple-500/20 to-purple-600/10"
                  infoText="Percentage of tickets completed (resolved + closed)."
                />
              </div>
            )}

            {/* Charts - Lazy loaded */}
            <div className="grid gap-6 md:grid-cols-2">
              <Suspense fallback={<ChartSkeleton />}>
                <PriorityChart 
                  data={statsData?.priorityBreakdown} 
                  isLoading={isStatsLoading} 
                />
              </Suspense>
              <Suspense fallback={<ChartSkeleton />}>
                <StatusChart 
                  data={statsData?.statusBreakdown} 
                  isLoading={isStatsLoading} 
                />
              </Suspense>
            </div>

            {/* Unresolved Summary - Lazy loaded */}
            <Suspense fallback={<ChartSkeleton />}>
              <UnresolvedSummary 
                groupBreakdown={statsData?.groupBreakdown} 
                isLoading={isStatsLoading} 
              />
            </Suspense>
          </>
        )}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
