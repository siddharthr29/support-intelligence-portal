'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
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
import { fetchRftData, fetchLatestRftFetch } from "@/lib/api";
import { toast } from "sonner";
import { 
  Bug, 
  RefreshCcw, 
  AlertCircle, 
  TrendingDown, 
  CheckCircle2,
  Building2
} from "lucide-react";

export default function RftMetricsPage() {
  const queryClient = useQueryClient();

  const { data: rftResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['rft'],
    queryFn: () => fetchRftData(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_BASE_URL}/api/rft/fetch?force=true`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh RFT data');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rft'] });
      toast.success("RFT metrics refreshed from Metabase");
    },
    onError: () => {
      toast.error("Failed to refresh RFT metrics");
    },
  });

  const rftData = rftResponse?.data;

  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Rule Failure Telemetry (RFT)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Product quality metrics from Metabase - critical for customer satisfaction
            </p>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${mutation.isPending ? 'animate-spin' : ''}`} />
            Refresh from Metabase
          </Button>
        </div>

        {!rftData ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No RFT data available</p>
              <p className="text-sm">Click refresh to fetch latest metrics from Metabase</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Total Open RFTs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {rftData.totals.totalOpenRfts.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requires attention
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bug className="h-4 w-4 text-amber-500" />
                    New This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    {rftData.totals.newlyReportedCurrentWeek.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Newly reported
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    Closures This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {rftData.totals.closuresThisWeek.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fixed this week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Total Closed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {rftData.totals.closedRftsSoFar.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Organisation Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  RFT by Organisation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Breakdown of rule failures by organisation - helps identify implementation quality issues
                </p>
              </CardHeader>
              <CardContent>
                {rftData.byOrganisation && rftData.byOrganisation.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Organisation</TableHead>
                          <TableHead className="text-right">New This Week</TableHead>
                          <TableHead className="text-right">Closures</TableHead>
                          <TableHead className="text-right">Total Closed</TableHead>
                          <TableHead className="text-right">Open RFTs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rftData.byOrganisation.map((org: { organisation: string; newlyReportedCurrentWeek: number; closuresThisWeek: number; closedRftsSoFar: number; totalOpenRfts: number }) => (
                          <TableRow key={org.organisation}>
                            <TableCell className="font-medium">{org.organisation}</TableCell>
                            <TableCell className="text-right">
                              {org.newlyReportedCurrentWeek.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {org.closuresThisWeek.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {org.closedRftsSoFar.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={org.totalOpenRfts > 5000 ? "destructive" : org.totalOpenRfts > 1000 ? "secondary" : "outline"}>
                                {org.totalOpenRfts.toLocaleString()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No organisation breakdown available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <div className="text-xs text-muted-foreground text-center">
              Last fetched: {new Date(rftData.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              {' • '}
              Snapshot ID: {rftData.snapshotId}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
