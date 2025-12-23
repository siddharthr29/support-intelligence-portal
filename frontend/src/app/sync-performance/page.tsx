'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/shell";
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
  Building2
} from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function SyncPerformancePage() {
  const queryClient = useQueryClient();
  const [showLowPerformersOnly, setShowLowPerformersOnly] = useState(false);

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

  const lowPerformers = syncPerfData?.byOrganisation?.filter((org: any) => org.usabilityScore < 50).length || 0;

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
      <Shell>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
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
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {showLowPerformersOnly 
                        ? `Showing ${lowPerformers} organizations with usability score < 50%`
                        : "Organizations ranked by sync volume - lower rank indicates fewer syncs"
                      }
                    </p>
                  </div>
                  {showLowPerformersOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLowPerformersOnly(false)}
                    >
                      Show All
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
                        {syncPerfData.byOrganisation
                          .filter((org: any) => !showLowPerformersOnly || org.usabilityScore < 50)
                          .map((org: any) => (
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
    </Shell>
  );
}
