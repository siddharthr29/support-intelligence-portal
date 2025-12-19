'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface StatusChartProps {
  data: {
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  } | undefined;
  isLoading?: boolean;
}

const COLORS = {
  open: '#3b82f6',
  pending: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
};

export function StatusChart({ data, isLoading }: StatusChartProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="animate-pulse bg-muted rounded h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Open', value: data.open, color: COLORS.open },
    { name: 'Pending', value: data.pending, color: COLORS.pending },
    { name: 'Resolved', value: data.resolved, color: COLORS.resolved },
    { name: 'Closed', value: data.closed, color: COLORS.closed },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              width={70}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [value, 'Tickets']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
