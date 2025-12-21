'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { DateRangeMetrics } from "@/lib/types";
import { MetricTooltip } from "@/components/ui/metric-tooltip";

interface StatsCardsProps {
  data: DateRangeMetrics | undefined;
  isLoading: boolean;
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Fallback values if data is undefined (should ideally be handled by parent or API return 0s)
  const totalTickets = data?.totalTickets ?? 0;
  const resolved = data?.ticketsResolved ?? 0;
  const closed = data?.ticketsClosed ?? 0; // Assuming API provides this or part of breakdown
  // Note: ticketsClosed is in DateRangeMetrics interface but might be 0 if not populated
  const resolvedCount = data?.ticketsResolved ?? 0;
  const closedCount = data?.ticketsClosed ?? 0;
  
  const urgent = data?.priorityBreakdown?.urgent ?? 0;
  const high = data?.priorityBreakdown?.high ?? 0;
  const pending = data?.ticketsPending ?? 0;

  const cards = [
    {
      title: "Total Tickets",
      value: totalTickets,
      icon: Ticket,
      description: "In selected period",
      color: "text-blue-500",
      tooltipKey: "dashboard.total_tickets",
    },
    {
      title: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
      description: `${resolvedCount} resolved, ${closedCount} closed`,
      color: "text-green-500",
      tooltipKey: "dashboard.resolved",
    },
    {
      title: "Urgent & High",
      value: urgent + high,
      icon: AlertCircle,
      description: `${urgent} urgent, ${high} high`,
      color: "text-red-500",
      tooltipKey: "dashboard.urgent_high",
    },
    {
      title: "Pending",
      value: pending,
      icon: Clock,
      description: "Awaiting response",
      color: "text-yellow-500",
      tooltipKey: "dashboard.pending",
    },
  ];

  if (!data && !isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.title} className="opacity-60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">No data available</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <MetricTooltip metricKey={card.tooltipKey} />
            </div>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
