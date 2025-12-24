'use client';

import { useState, useEffect, lazy, Suspense } from "react";
import { format, startOfYear } from "date-fns";
import { getNowIST, getCurrentWeekBoundariesIST } from "@/lib/datetime";
import { Shell } from "@/components/layout/shell";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { RecentTicketsTable } from "@/components/tickets/recent-tickets-table";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { 
  Ticket, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  RefreshCcw,
  Loader2,
  Calendar,
  LayoutDashboard
} from "lucide-react";
import { useTicketStore } from "@/stores/ticket-store";
import { useYearStore } from "@/stores/year-store";
import { ProductSupportCard } from "@/components/dashboard/product-support-card";

// Lazy load heavy components for better performance
const PriorityChart = lazy(() => import("@/components/dashboard/priority-chart").then(m => ({ default: m.PriorityChart })));
const StatusChart = lazy(() => import("@/components/dashboard/status-chart").then(m => ({ default: m.StatusChart })));
const UnresolvedSummary = lazy(() => import("@/components/dashboard/unresolved-summary").then(m => ({ default: m.UnresolvedSummary })));

// Loading skeleton for lazy components
const ChartSkeleton = () => (
  <div className="h-[320px] bg-white rounded-xl border p-6 shadow-sm">
    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
    <div className="h-[240px] w-full bg-gray-100 rounded-lg animate-pulse"></div>
  </div>
);

const MetricCardSkeleton = () => (
  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 p-6 shadow-sm">
    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
    <div className="h-8 w-24 bg-gray-300 rounded animate-pulse mb-2"></div>
    <div className="h-3 w-28 bg-gray-200 rounded animate-pulse"></div>
  </div>
);

// Date range presets - Dashboard uses only past month and week (YTD moved to Yearly Report)
type DatePreset = 'current_week' | 'past_month' | 'custom';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [datePreset, setDatePreset] = useState<DatePreset>('current_week');
  const { selectedYear } = useYearStore();
  const currentYear = getNowIST().getFullYear();
  
  // Use centralized ticket store
  const { 
    dateRange, 
    setDateRange, 
    filteredStats, 
    isLoading: isStatsLoading, 
    error: statsError,
    fetchAllTickets,
    lastFetched,
    getProductSupportMetrics,
    getCompanyName,
  } = useTicketStore();

  // Redirect leadership users to leadership dashboard
  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (!authLoading && user) {
        const token = await user.getIdTokenResult();
        const claims = token.claims;
        
        if (claims.founder || claims.leadership) {
          router.push('/leadership');
        }
      }
    };
    
    checkRoleAndRedirect();
  }, [user, authLoading, router]);

  // Fetch tickets on mount
  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  // Update date range when preset changes
  useEffect(() => {
    const now = getNowIST();
    if (datePreset === 'past_month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setDateRange({ from: monthAgo, to: now });
    } else if (datePreset === 'current_week') {
      // Use centralized week boundaries (Friday 5pm to Friday 5pm)
      const { weekStart, weekEnd } = getCurrentWeekBoundariesIST(now);
      setDateRange({ from: weekStart, to: now });
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
  
  // Get Product Support metrics
  const productSupportMetrics = getProductSupportMetrics();

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
        {/* Header */}
        <SectionHeader
          title={`Dashboard ${currentYear}`}
          description={
            isStatsLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading live data...
              </span>
            ) : (
              dateRange.from && dateRange.to ? (
                <span className="flex items-center gap-3">
                  <span>{format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}</span>
                  <Badge variant="outline" className="text-xs">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    Auto-sync: Fridays 4:30 PM IST
                  </Badge>
                </span>
              ) : 'Select a date range to view metrics'
            )
          }
          icon={LayoutDashboard}
          action={
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex gap-1">
                <Button
                  variant={datePreset === 'current_week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDatePreset('current_week')}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">This Week</span>
                  <span className="sm:hidden">Week</span>
                </Button>
                <Button
                  variant={datePreset === 'past_month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDatePreset('past_month')}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Past Month</span>
                  <span className="sm:hidden">Month</span>
                </Button>
              </div>
              <div className="flex gap-2">
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
                  className="px-3"
                >
                  <RefreshCcw className={`h-4 w-4 ${isStatsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          }
        />

        {/* Empty State for No Data */}
        {hasNoData && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">
              No Data Available for {currentYear}
            </h3>
            <p className="text-sm text-amber-700 max-w-md mx-auto">
              There are no tickets recorded for this year. Please select a different year or wait for data to be synced.
            </p>
          </div>
        )}

        {/* Key Metrics Grid */}
        {!hasNoData && (
          <>
            {isStatsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <MetricCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="New Tickets"
                  value={filteredStats?.ticketsCreated ?? 0}
                  subtitle={dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}` : 'Select date range'}
                  icon={Ticket}
                  tooltipKey="dashboard.total_tickets"
                  variant="info"
                />
                <StatCard
                  title="Completed"
                  value={(filteredStats?.ticketsResolved ?? 0) + (filteredStats?.ticketsClosed ?? 0)}
                  subtitle={`${filteredStats?.ticketsResolved ?? 0} resolved, ${filteredStats?.ticketsClosed ?? 0} closed`}
                  icon={CheckCircle2}
                  tooltipKey="dashboard.resolved"
                  variant="success"
                />
                <StatCard
                  title="High Priority"
                  value={(filteredStats?.urgentTickets ?? 0) + (filteredStats?.highTickets ?? 0)}
                  subtitle={`${filteredStats?.urgentTickets ?? 0} urgent, ${filteredStats?.highTickets ?? 0} high`}
                  icon={AlertTriangle}
                  tooltipKey="dashboard.urgent_high"
                  variant="error"
                />
                <StatCard
                  title="Completion Rate"
                  value={`${resolutionRate}%`}
                  subtitle={`${filteredStats?.ticketsOpen ?? 0} open, ${filteredStats?.ticketsPending ?? 0} pending`}
                  icon={TrendingUp}
                  variant="primary"
                />
              </div>
            )}

            {/* Product Support Card - Separate Row */}
            <ProductSupportCard
              assignedCount={productSupportMetrics.assignedCount}
              closedCount={productSupportMetrics.closedCount}
              assignedTickets={productSupportMetrics.assignedTickets}
              closedTickets={productSupportMetrics.closedTickets}
              getCompanyName={getCompanyName}
              isLoading={isStatsLoading}
            />

            {/* Charts - Lazy loaded */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
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

            {/* Unresolved Summary - Collapsible */}
            <CollapsibleSection 
              title="Unresolved Tickets by Group" 
              defaultOpen={false}
              badge={
                <Badge variant="secondary">
                  {statsData?.groupBreakdown?.reduce((sum, g) => sum + g.open + g.pending, 0) ?? 0} total
                </Badge>
              }
            >
              <Suspense fallback={<ChartSkeleton />}>
                <UnresolvedSummary 
                  groupBreakdown={statsData?.groupBreakdown} 
                  isLoading={isStatsLoading} 
                />
              </Suspense>
            </CollapsibleSection>

            {/* Recent Tickets History - Collapsible */}
            <CollapsibleSection 
              title="Recent Tickets" 
              defaultOpen={false}
            >
              <RecentTicketsTable />
            </CollapsibleSection>
          </>
        )}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
