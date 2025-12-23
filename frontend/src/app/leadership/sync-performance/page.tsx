'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchSyncPerformanceData, fetchLatestSyncPerformanceFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { 
  Activity, 
  RefreshCcw, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2,
  Building2,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function LeadershipSyncPerformancePage() {
  const queryClient = useQueryClient();
  const [showLowPerformersOnly, setShowLowPerformersOnly] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');

  const { data: syncPerfResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['sync-performance'],
    queryFn: () => fetchSyncPerformanceData(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_BASE_URL}/api/sync-performance/fetch?force=true`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh sync performance data');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-performance'] });
      toast.success("Sync performance metrics refreshed from Metabase");
    },
    onError: () => {
      toast.error("Failed to refresh sync performance metrics");
    },
  });

  const syncPerfData = syncPerfResponse?.data;

  const getUsabilityBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const getPerformanceStatusColor = (status: string) => {
    if (status?.includes('Excellent')) return 'bg-green-100 text-green-800 border-green-300';
    if (status?.includes('Good')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (status?.includes('Fair')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (status?.includes('Needs Attention')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getHealthStatusIcon = (status: string) => {
    if (status?.includes('Healthy Growth')) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (status?.includes('Stable')) return <Minus className="h-4 w-4 text-blue-600" />;
    if (status?.includes('Drop')) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const lowPerformers = syncPerfData?.byOrganisation?.filter((org: any) => org.usabilityScore < 50).length || 0;
  
  // Performance distribution for pie chart
  const performanceDistribution = syncPerfData?.byOrganisation?.reduce((acc: any, org: any) => {
    const status = org.performanceStatus || 'Unknown';
    const key = status.replace(/[🟢🟡🟠🔴]/g, '').trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pieData = performanceDistribution ? Object.entries(performanceDistribution).map(([name, value]) => ({
    name,
    value,
    color: name === 'Excellent' ? '#22c55e' : name === 'Good' ? '#eab308' : name === 'Fair' ? '#f97316' : '#ef4444'
  })) : [];

  // Filter organizations based on performance filter
  const filteredOrgs = syncPerfData?.byOrganisation?.filter((org: any) => {
    if (showLowPerformersOnly && org.usabilityScore >= 50) return false;
    if (performanceFilter === 'all') return true;
    return org.performanceStatus?.includes(performanceFilter);
  }) || [];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('sync-performance-tour-seen');
    
    if (!hasSeenTour && syncPerfData) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          {
            element: '#sync-perf-header',
            popover: {
              title: '🎉 Welcome to Sync Performance!',
              description: 'Track organization sync reliability and usability scores from the last 6 months. This helps identify platform stability issues.',
              side: "bottom",
              align: 'start'
            }
          },
          {
            element: '#sync-perf-cards',
            popover: {
              title: '📊 Key Metrics Overview',
              description: 'Quick summary calculated from Metabase data: total organizations, average success rates, and usability scores. Click "Low Performers" to drill down to organizations with score < 50%.',
              side: "bottom",
              align: 'start'
            }
          },
          {
            element: '#sync-perf-table',
            popover: {
              title: '📋 Organization Performance Table',
              description: 'View sync performance for each organization: total syncs, success/failure counts, success rate, and usability score. Organizations are ranked by sync volume (lower rank = fewer syncs).',
              side: "top",
              align: 'start'
            }
          },
          {
            element: '#sync-perf-refresh',
            popover: {
              title: '🔄 Refresh Data',
              description: 'Click here to fetch the latest sync performance metrics from Metabase. Data is cached for 30 minutes.',
              side: "left",
              align: 'start'
            }
          }
        ],
        onDestroyStarted: () => {
          localStorage.setItem('sync-performance-tour-seen', 'true');
          driverObj.destroy();
        }
      });

      setTimeout(() => {
        driverObj.drive();
      }, 500);
    }
  }, [syncPerfData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      <div className="container mx-auto p-6 space-y-6">
        <div id="sync-perf-header">
          <SectionHeader
            title="Organization Usability & Sync Performance"
            description="Sync reliability and usability metrics from last 6 months - critical for platform stability"
            icon={Activity}
            action={
              <Button
                id="sync-perf-refresh"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                size="sm"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${mutation.isPending ? 'animate-spin' : ''}`} />
                Refresh from Metabase
              </Button>
            }
          />
        </div>

        {!syncPerfData ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No sync performance data available</p>
              <p className="text-sm">Click refresh to fetch latest metrics from Metabase</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div id="sync-perf-cards" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Organizations"
                value={syncPerfData.totals.totalOrganisations}
                subtitle="Production orgs"
                icon={Building2}
                tooltipKey="sync_perf.total_orgs"
                variant="info"
              />

              <StatCard
                title="Avg Success Rate"
                value={`${syncPerfData.totals.avgSuccessRate.toFixed(1)}%`}
                subtitle="Successful syncs"
                icon={CheckCircle2}
                tooltipKey="sync_perf.avg_success"
                variant="success"
              />

              <StatCard
                title="Avg Usability Score"
                value={`${syncPerfData.totals.avgUsabilityScore.toFixed(1)}%`}
                subtitle="Overall health"
                icon={TrendingUp}
                tooltipKey="sync_perf.avg_usability"
                variant={syncPerfData.totals.avgUsabilityScore >= 70 ? "success" : "warning"}
              />

              <StatCard
                title="Low Performers"
                value={lowPerformers}
                subtitle="Score < 50%"
                icon={AlertCircle}
                tooltipKey="sync_perf.low_performers"
                variant={lowPerformers > 0 ? "error" : "success"}
                onClick={() => {
                  setShowLowPerformersOnly(!showLowPerformersOnly);
                  toast.info(showLowPerformersOnly ? "Showing all organizations" : `Showing ${lowPerformers} low performers`);
                }}
                className="cursor-pointer hover:shadow-lg transition-shadow"
              />
            </div>

            {/* Performance Distribution Chart */}
            {pieData.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance Distribution
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Organizations by performance status
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filter by Performance
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Quick filters for performance status
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant={performanceFilter === 'all' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setPerformanceFilter('all')}
                    >
                      All Organizations ({syncPerfData.byOrganisation?.length || 0})
                    </Button>
                    <Button
                      variant={performanceFilter === 'Excellent' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setPerformanceFilter('Excellent')}
                    >
                      {`🟢 Excellent (${pieData.find((d: any) => d.name === 'Excellent')?.value || 0})`}
                    </Button>
                    <Button
                      variant={performanceFilter === 'Good' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setPerformanceFilter('Good')}
                    >
                      {`🟡 Good (${pieData.find((d: any) => d.name === 'Good')?.value || 0})`}
                    </Button>
                    <Button
                      variant={performanceFilter === 'Fair' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setPerformanceFilter('Fair')}
                    >
                      {`🟠 Fair (${pieData.find((d: any) => d.name === 'Fair')?.value || 0})`}
                    </Button>
                    <Button
                      variant={performanceFilter === 'Needs Attention' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setPerformanceFilter('Needs Attention')}
                    >
                      {`🔴 Needs Attention (${pieData.find((d: any) => d.name === 'Needs Attention')?.value || 0})`}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card id="sync-perf-table">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Sync Performance by Organization
                      {showLowPerformersOnly && (
                        <Badge variant="destructive" className="ml-2">Low Performers Only</Badge>
                      )}
                      {performanceFilter !== 'all' && (
                        <Badge variant="secondary" className="ml-2">{performanceFilter} Only</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredOrgs.length} of {syncPerfData.byOrganisation?.length || 0} organizations
                    </p>
                  </div>
                  {(showLowPerformersOnly || performanceFilter !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowLowPerformersOnly(false);
                        setPerformanceFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {syncPerfData.byOrganisation && syncPerfData.byOrganisation.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  Rank
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Ranking based on total sync volume (1 = organization with least syncs)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="w-[280px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  Organization
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Name of the production organization with Live status</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                  Total Syncs
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Total sync attempts in the last 6 months (complete + incomplete syncs)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                  Successful
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Number of syncs completed successfully (status = 'complete')</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                  Incomplete
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Number of syncs that did not complete (status != 'complete')</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                  Success Rate
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Percentage of successful syncs out of total attempts</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                  Usability Score
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Composite metric combining success rate (70% weight) and usage volume (30% weight). Organizations with low sync count get penalized even with high success rate.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrgs.map((org: any) => (
                          <TableRow key={org.organisationName}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {org.rank}
                            </TableCell>
                            <TableCell className="font-medium">
                              {org.organisationName}
                            </TableCell>
                            <TableCell className="text-right">
                              {org.totalSyncs?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {org.successfulSyncs?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {org.incompleteSyncs?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {org.successRate?.toFixed(1) || 0}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getUsabilityBadgeVariant(org.usabilityScore || 0)}>
                                {org.usabilityScore?.toFixed(1) || 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No organization data available
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-4 text-xs text-muted-foreground text-center">
                Last fetched: {new Date(syncPerfData.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                {' • '}
                Snapshot ID: {syncPerfData.snapshotId}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
