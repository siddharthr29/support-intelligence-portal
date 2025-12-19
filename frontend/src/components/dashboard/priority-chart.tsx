'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PriorityChartProps {
  data: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  } | undefined;
  isLoading?: boolean;
}

const COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export function PriorityChart({ data, isLoading }: PriorityChartProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="animate-pulse bg-muted rounded-full h-40 w-40" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Urgent', value: data.urgent, color: COLORS.urgent },
    { name: 'High', value: data.high, color: COLORS.high },
    { name: 'Medium', value: data.medium, color: COLORS.medium },
    { name: 'Low', value: data.low, color: COLORS.low },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          No ticket data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Priority Distribution</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              label={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [value, 'Tickets']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-4 mt-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {item.name}: {item.value} ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
