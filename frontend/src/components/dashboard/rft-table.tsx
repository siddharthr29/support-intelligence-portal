'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { RftData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchLatestRftFetch } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface RftMetricsTableProps {
  data: RftData | undefined;
  isLoading: boolean;
}

export function RftMetricsTable({ data, isLoading }: RftMetricsTableProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchLatestRftFetch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rft'] });
      toast.success("RFT metrics refreshed successfully");
    },
    onError: () => {
      toast.error("Failed to refresh RFT metrics");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (!data) {
    return (
      <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rule Failure Telemetry (RFT)</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${mutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No RFT data available. Click refresh to fetch latest metrics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rule Failure Telemetry (RFT)</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${mutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Organization</TableHead>
                <TableHead className="text-right">Newly Reported</TableHead>
                <TableHead className="text-right">Closures (This Week)</TableHead>
                <TableHead className="text-right">Closed (So Far)</TableHead>
                <TableHead className="text-right">Total Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{data.totals.newlyReportedCurrentWeek.toLocaleString()}</TableCell>
                <TableCell className="text-right">{data.totals.closuresThisWeek.toLocaleString()}</TableCell>
                <TableCell className="text-right">{data.totals.closedRftsSoFar.toLocaleString()}</TableCell>
                <TableCell className="text-right text-red-600">{data.totals.totalOpenRfts.toLocaleString()}</TableCell>
              </TableRow>
              {data.byOrganisation.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No organisation data found.
                  </TableCell>
                </TableRow>
              ) : (
                data.byOrganisation.map((org) => (
                  <TableRow key={org.organisation}>
                    <TableCell className="font-medium">{org.organisation}</TableCell>
                    <TableCell className="text-right">{org.newlyReportedCurrentWeek.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{org.closuresThisWeek.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{org.closedRftsSoFar.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={org.totalOpenRfts > 1000 ? "destructive" : "secondary"}>
                        {org.totalOpenRfts.toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
            Fetched at: {new Date(data.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </CardContent>
    </Card>
  );
}
