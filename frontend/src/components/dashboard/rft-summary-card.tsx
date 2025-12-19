'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import type { RftData } from "@/lib/types";

interface RftSummaryCardProps {
  data: RftData | undefined;
  isLoading?: boolean;
}

export function RftSummaryCard({ data, isLoading }: RftSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4" />
            Rule Failure Telemetry (RFT)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4" />
            Rule Failure Telemetry (RFT)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px] text-muted-foreground">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">RFT data not available</p>
            <p className="text-xs">Configure Metabase integration to view</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totals } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4" />
            Rule Failure Telemetry (RFT)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {new Date(data.fetchedAt).toLocaleDateString('en-IN')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Product quality metrics - critical for customer satisfaction
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              Total Open
            </div>
            <div className="text-2xl font-bold text-red-600">
              {totals.totalOpenRfts.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Bug className="h-3 w-3 text-amber-500" />
              New This Week
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {totals.newlyReportedCurrentWeek.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              Closures This Week
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totals.closuresThisWeek.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3 w-3 text-blue-500" />
              Total Closed
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {totals.closedRftsSoFar.toLocaleString()}
            </div>
          </div>
        </div>

        {data.byOrganisation && data.byOrganisation.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">BY ORGANISATION</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.byOrganisation.slice(0, 5).map((org) => (
                <div key={org.organisation} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium truncate max-w-[150px]">{org.organisation}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-600 font-semibold">{org.totalOpenRfts} open</span>
                    <span className="text-green-600">+{org.closuresThisWeek} closed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
