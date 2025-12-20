'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

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
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await apiGet('/api/leadership/summary/weekly');
        setSummary(response.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load summary');
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
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
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Weekly Founder Summary</h1>
        <p className="text-muted-foreground">Week ending {summary?.week_ending}</p>
        <p className="text-sm text-muted-foreground">Data coverage: {summary?.data_coverage}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-3xl font-bold">{summary?.key_metrics.total_tickets_week}</p>
          <p className="text-sm text-muted-foreground">Tickets This Week</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-3xl font-bold">{summary?.key_metrics.unresolved_backlog}</p>
          <p className="text-sm text-muted-foreground">Unresolved Backlog</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-3xl font-bold text-red-600">{summary?.key_metrics.critical_issues}</p>
          <p className="text-sm text-muted-foreground">Critical Issues</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-3xl font-bold">{summary?.key_metrics.trend_vs_last_week}</p>
          <p className="text-sm text-muted-foreground">vs Last Week</p>
        </div>
      </div>

      {/* Top Risks */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">🚨 Top Risks</h2>
        <div className="space-y-3">
          {summary?.top_risks.map((risk, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${getSeverityColor(risk.severity)}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{risk.partner_name}</h3>
                <span className="text-xs uppercase font-medium">{risk.severity}</span>
              </div>
              <p className="text-sm font-medium mb-1">{risk.risk_type}</p>
              <p className="text-sm opacity-75">{risk.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Partners to Watch */}
      {summary?.partners_to_watch && summary.partners_to_watch.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">👀 Partners to Watch</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="list-disc list-inside space-y-1">
              {summary.partners_to_watch.map((partner, idx) => (
                <li key={idx} className="text-sm">{partner}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">✅ Recommended Actions</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ol className="list-decimal list-inside space-y-2">
            {summary?.recommended_actions.map((action, idx) => (
              <li key={idx} className="text-sm">{action}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
