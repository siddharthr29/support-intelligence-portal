'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users } from "lucide-react";
import { getGroupName } from "@/lib/constants";

interface GroupBreakdown {
  groupId: number;
  ticketCount: number;
  resolved: number;
  open: number;
  pending: number;
}

interface UnresolvedSummaryProps {
  groupBreakdown: GroupBreakdown[] | undefined;
  isLoading?: boolean;
}

// Groups to exclude from display
const EXCLUDED_GROUP_IDS = [36000457181];

// Color palette for groups
const GROUP_COLORS = [
  { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/20', icon: 'text-blue-500', badge: 'bg-blue-500/10 border-blue-500/30' },
  { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/20', icon: 'text-purple-500', badge: 'bg-purple-500/10 border-purple-500/30' },
  { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', icon: 'text-emerald-500', badge: 'bg-emerald-500/10 border-emerald-500/30' },
  { bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/20', icon: 'text-orange-500', badge: 'bg-orange-500/10 border-orange-500/30' },
];

export function UnresolvedSummary({ groupBreakdown, isLoading }: UnresolvedSummaryProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Unresolved Tickets by Group
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Filter out excluded groups and sort by unresolved count (open + pending) descending
  const sortedGroups = [...(groupBreakdown || [])]
    .filter(g => !EXCLUDED_GROUP_IDS.includes(g.groupId))
    .sort((a, b) => {
      const aUnresolved = a.open + a.pending;
      const bUnresolved = b.open + b.pending;
      return bUnresolved - aUnresolved;
    });

  const totalUnresolved = sortedGroups.reduce((sum, g) => sum + g.open + g.pending, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Unresolved Tickets by Group
          </CardTitle>
          <Badge variant={totalUnresolved > 10 ? "destructive" : "secondary"}>
            Total: {totalUnresolved}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Tickets requiring attention - critical for SLA compliance
        </p>
      </CardHeader>
      <CardContent>
        {sortedGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No group data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGroups.map((group, index) => {
              const colors = GROUP_COLORS[index % GROUP_COLORS.length];
              const unresolved = group.open + group.pending;
              
              return (
                <div 
                  key={group.groupId}
                  className={`p-4 rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Users className={`h-4 w-4 ${colors.icon}`} />
                    <h4 className="font-semibold text-sm truncate">{getGroupName(group.groupId)}</h4>
                  </div>
                  <div className="text-3xl font-bold mb-3">{unresolved}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={colors.badge}>
                      Open: {group.open}
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30">
                      Pending: {group.pending}
                    </Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Resolved: <span className="font-semibold text-green-600">{group.resolved}</span>
                    {' • '}
                    Total: {group.ticketCount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
