'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

interface MetricsSummary {
  long_unresolved_blockers: number;
  data_loss_incidents: number;
  how_to_volume: number;
  training_requests: number;
  sla_breaches: number;
  current_backlog: number;
  total_tickets_30d: number;
  avg_resolution_hours: number;
}

export default function MetricsPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await apiGet('/api/leadership/metrics/summary');
        setSummary(response.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Social Sector Metrics</h1>
      <p className="text-muted-foreground mb-8">Key metrics for NGO and social sector deployments</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold text-red-600">{summary?.long_unresolved_blockers || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">Long Unresolved Blockers</p>
          <p className="text-xs text-muted-foreground mt-1">Urgent/high tickets &gt;7 days</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold text-orange-600">{summary?.data_loss_incidents || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">Data Loss Incidents</p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold text-yellow-600">{summary?.how_to_volume || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">How-To Questions</p>
          <p className="text-xs text-muted-foreground mt-1">Adoption signal</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold text-blue-600">{summary?.training_requests || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">Training Requests</p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold text-red-600">{summary?.sla_breaches || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">SLA Breaches</p>
          <p className="text-xs text-muted-foreground mt-1">Urgent &gt;24h unresolved</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold">{summary?.current_backlog || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">Current Backlog</p>
          <p className="text-xs text-muted-foreground mt-1">Unresolved tickets</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold">{summary?.total_tickets_30d || 0}</p>
          <p className="text-sm text-muted-foreground mt-2">Total Tickets</p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <p className="text-4xl font-bold">{summary?.avg_resolution_hours ? Math.round(summary.avg_resolution_hours) : 0}h</p>
          <p className="text-sm text-muted-foreground mt-2">Avg Resolution</p>
          <p className="text-xs text-muted-foreground mt-1">Time to resolve</p>
        </div>
      </div>
    </div>
  );
}
