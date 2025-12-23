'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Shell } from "@/components/layout/shell";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
          <Card id="sync-perf-table">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Sync Performance by Organization
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organizations ranked by sync volume - lower rank indicates fewer syncs
                </p>
              </CardHeader>
              <CardContent>
                {syncPerfData.byOrganisation && syncPerfData.byOrganisation.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Rank</TableHead>
                          <TableHead className="w-[250px]">Organization</TableHead>
                          <TableHead className="text-right">Total Syncs</TableHead>
                          <TableHead className="text-right">Successful</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Success Rate</TableHead>
                          <TableHead className="text-right">Usability Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncPerfData.byOrganisation.map((org: any) => (
                          <TableRow key={org.organisationName}>
                            <TableCell className="font-medium text-muted-foreground">
                              {org.rank}
                            </TableCell>
                            <TableCell className="font-medium">
                              {org.organisationName}
                            </TableCell>
                            <TableCell className="text-right">
                              {org.totalSyncs.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {org.successfulSyncs.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {org.failedSyncs.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {org.successRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getUsabilityBadgeVariant(org.usabilityScore)}>
                                {org.usabilityScore.toFixed(1)}%
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
        )}
      </div>
    </Shell>
  );
}
