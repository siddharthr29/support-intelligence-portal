'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { useLeadership } from '@/contexts/leadership-context';

interface WeeklySummary {
  week_ending: string;
  data_coverage: string;
  top_risks: Array<{
    partner_name: string;
    risk_type: string;
    severity: string;
    details: string;
  }>;
  partners_to_watch: string[];
  recommended_actions: string[];
  key_metrics: {
    total_tickets_week: number;
    unresolved_backlog: number;
    critical_issues: number;
    trend_vs_last_week: string;
  };
}

export default function SummaryPage() {
  const { isInitialLoad, setIsInitialLoad, cachedData, setCachedData } = useLeadership();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(isInitialLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const cacheKey = 'summary-weekly';
    
    // Check cache first
    if (cachedData[cacheKey]) {
      setSummary(cachedData[cacheKey]);
      setLoading(false);
      return;
    }

    // Only show loading on initial load
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiGet('/api/leadership/summary/weekly');
      setSummary(response.data);
      setCachedData(cacheKey, response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [cachedData, setCachedData, isInitialLoad, setIsInitialLoad]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-2">Error Loading Summary</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Executive Summary</h1>
          <p className="text-gray-600">Week ending {summary?.week_ending}</p>
          <p className="text-sm text-gray-500">Data coverage: {summary?.data_coverage}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Tickets This Week</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.key_metrics.total_tickets_week || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Unresolved Backlog</span>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.key_metrics.unresolved_backlog || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Critical Issues</span>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{summary?.key_metrics.critical_issues || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">vs Last Week</span>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.key_metrics.trend_vs_last_week || 'N/A'}</p>
          </div>
        </div>

        {/* Top Risks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Top Risks
          </h2>
          <div className="space-y-3">
            {summary?.top_risks && summary.top_risks.length > 0 ? (
              summary.top_risks.map((risk, idx) => (
                <div key={idx} className={`bg-white border rounded-lg p-6 ${getSeverityColor(risk.severity)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{risk.partner_name || 'Unknown Partner'}</h3>
                    <span className="text-xs uppercase font-bold px-2 py-1 rounded">{risk.severity}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-1">{risk.risk_type}</p>
                  <p className="text-sm text-gray-600">{risk.details}</p>
                </div>
              ))
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">No critical risks detected</p>
                <p className="text-sm text-green-600 mt-1">All partners operating within normal parameters</p>
              </div>
            )}
          </div>
        </div>

        {/* Partners to Watch */}
        {summary?.partners_to_watch && summary.partners_to_watch.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Partners to Watch</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <ul className="space-y-2">
                {summary.partners_to_watch.map((partner, idx) => (
                  <li key={idx} className="text-sm text-yellow-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                    {partner}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Recommended Actions
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            {summary?.recommended_actions && summary.recommended_actions.length > 0 ? (
              <ol className="space-y-3">
                {summary.recommended_actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-blue-900 flex gap-3">
                    <span className="font-bold text-blue-600">{idx + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-blue-700">No specific actions required at this time</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
