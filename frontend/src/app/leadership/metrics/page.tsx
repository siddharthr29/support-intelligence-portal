'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { LeadershipDateFilter } from '@/components/leadership/date-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AlertCircle, TrendingUp, Clock, Users, AlertTriangle, BookOpen, GraduationCap, Activity } from 'lucide-react';

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
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    return { from, to };
  });

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        });
        const response = await apiGet(`/api/leadership/metrics/summary?${params}`);
        console.log('Metrics data loaded:', response.data);
        setMetrics(response.data.summary);
      } catch (err: any) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = metrics;

  const metricCategories = [
    {
      title: 'Program Risk',
      description: 'Critical operational issues affecting program delivery',
      metrics: [
        { label: 'Long Unresolved Blockers', value: summary?.long_unresolved_blockers || 0, subtitle: 'Urgent/high tickets >7 days', icon: AlertCircle, color: 'red' },
        { label: 'Data Loss Incidents', value: summary?.data_loss_incidents || 0, subtitle: 'Last 30 days', icon: AlertTriangle, color: 'orange' },
        { label: 'SLA Breaches', value: summary?.sla_breaches || 0, subtitle: 'Urgent >24h unresolved', icon: Clock, color: 'red' },
      ]
    },
    {
      title: 'Adoption & Engagement',
      description: 'User adoption signals and training needs',
      metrics: [
        { label: 'How-To Questions', value: summary?.how_to_volume || 0, subtitle: 'Adoption signal', icon: BookOpen, color: 'yellow' },
        { label: 'Training Requests', value: summary?.training_requests || 0, subtitle: 'Last 30 days', icon: GraduationCap, color: 'blue' },
      ]
    },
    {
      title: 'Support Capacity',
      description: 'Team workload and efficiency metrics',
      metrics: [
        { label: 'Current Backlog', value: summary?.current_backlog || 0, subtitle: 'Unresolved tickets', icon: TrendingUp, color: 'orange' },
        { label: 'Total Tickets', value: summary?.total_tickets_30d || 0, subtitle: 'Last 30 days', icon: Users, color: 'blue' },
        { label: 'Avg Resolution', value: summary?.avg_resolution_hours ? Math.round(summary.avg_resolution_hours) : 0, subtitle: 'Time to resolve (hours)', icon: Activity, color: 'green' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Sector Metrics</h1>
              <p className="text-gray-600">
                {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
            <LeadershipDateFilter onDateChange={setDateRange} defaultPreset="12m" />
          </div>
        </div>

        {/* Metric Categories */}
        {metricCategories.map((category, idx) => (
          <div key={idx} className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.metrics.map((metric, metricIdx) => {
                const Icon = metric.icon;
                const colorClasses = {
                  red: 'text-red-600 bg-red-50 border-red-200',
                  orange: 'text-orange-600 bg-orange-50 border-orange-200',
                  yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
                  blue: 'text-blue-600 bg-blue-50 border-blue-200',
                  green: 'text-green-600 bg-green-50 border-green-200',
                }[metric.color];

                return (
                  <div key={metricIdx} className={`bg-white border rounded-lg p-6 ${colorClasses}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                      <Icon className={`h-5 w-5 ${metric.color === 'red' ? 'text-red-600' : metric.color === 'orange' ? 'text-orange-600' : metric.color === 'yellow' ? 'text-yellow-600' : metric.color === 'blue' ? 'text-blue-600' : 'text-green-600'}`} />
                    </div>
                    <div className={`text-4xl font-bold mb-1 ${metric.color === 'red' ? 'text-red-600' : metric.color === 'orange' ? 'text-orange-600' : metric.color === 'yellow' ? 'text-yellow-600' : metric.color === 'blue' ? 'text-blue-600' : 'text-green-600'}`}>
                      {typeof metric.value === 'number' ? metric.value : metric.value + 'h'}
                    </div>
                    <p className="text-xs text-gray-600">{metric.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legacy Metrics Grid (for backward compatibility) */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Metrics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-red-600">{summary?.long_unresolved_blockers || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Long Unresolved Blockers</p>
              <p className="text-xs text-gray-500 mt-1">Urgent/high tickets &gt;7 days</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-orange-600">{summary?.data_loss_incidents || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Data Loss Incidents</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-yellow-600">{summary?.how_to_volume || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">How-To Questions</p>
              <p className="text-xs text-gray-500 mt-1">Adoption signal</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-blue-600">{summary?.training_requests || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Training Requests</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-red-600">{summary?.sla_breaches || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">SLA Breaches</p>
              <p className="text-xs text-gray-500 mt-1">Urgent &gt;24h unresolved</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-gray-900">{summary?.current_backlog || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Current Backlog</p>
              <p className="text-xs text-gray-500 mt-1">Unresolved tickets</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-gray-900">{summary?.total_tickets_30d || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Total Tickets</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-4xl font-bold text-green-600">{summary?.avg_resolution_hours ? Math.round(summary.avg_resolution_hours) : 0}h</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">Avg Resolution</p>
              <p className="text-xs text-gray-500 mt-1">Time to resolve</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
