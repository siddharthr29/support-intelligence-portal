'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

interface PartnerRisk {
  partner_id: number;
  partner_name: string;
  total_tickets_12m: number;
  tickets_last_30d: number;
  tickets_prev_30d: number;
  avg_resolution_hours: number;
  unresolved_count: number;
  urgent_tickets: number;
  high_tickets: number;
  data_loss_tickets: number;
  sync_failure_tickets: number;
  how_to_tickets: number;
  training_tickets: number;
  trend_ratio: number | null;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await apiGet('/api/leadership/partners');
        setPartners(response.data.partners);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load partners');
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading partner risk metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  const getRiskLevel = (partner: PartnerRisk): string => {
    if (partner.data_loss_tickets > 2 || partner.urgent_tickets > 5) return 'critical';
    if (partner.sync_failure_tickets > 1 || partner.unresolved_count > 10) return 'high';
    if (partner.how_to_tickets > 10 || partner.training_tickets > 5) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Partner Risk Intelligence</h1>
        <p className="text-muted-foreground">
          Operational risk assessment for all partners (last 12 months)
        </p>
      </div>

      <div className="grid gap-4">
        {partners.map((partner) => {
          const riskLevel = getRiskLevel(partner);
          const riskColor = getRiskColor(riskLevel);

          return (
            <div key={partner.partner_id} className={`border rounded-lg p-6 ${riskColor}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{partner.partner_name}</h3>
                  <p className="text-sm opacity-75">Partner ID: {partner.partner_id}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium uppercase">
                  {riskLevel} Risk
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold">{partner.total_tickets_12m}</p>
                  <p className="text-sm opacity-75">Total Tickets (12m)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{partner.unresolved_count}</p>
                  <p className="text-sm opacity-75">Unresolved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{partner.urgent_tickets}</p>
                  <p className="text-sm opacity-75">Urgent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {partner.avg_resolution_hours ? Math.round(partner.avg_resolution_hours) : 'N/A'}h
                  </p>
                  <p className="text-sm opacity-75">Avg Resolution</p>
                </div>
              </div>

              {(partner.data_loss_tickets > 0 || partner.sync_failure_tickets > 0 || 
                partner.how_to_tickets > 5 || partner.training_tickets > 3) && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-2">Risk Signals:</p>
                  <div className="flex flex-wrap gap-2">
                    {partner.data_loss_tickets > 0 && (
                      <span className="px-2 py-1 bg-red-200 text-red-900 rounded text-xs">
                        {partner.data_loss_tickets} Data Loss
                      </span>
                    )}
                    {partner.sync_failure_tickets > 0 && (
                      <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded text-xs">
                        {partner.sync_failure_tickets} Sync Failures
                      </span>
                    )}
                    {partner.how_to_tickets > 5 && (
                      <span className="px-2 py-1 bg-yellow-200 text-yellow-900 rounded text-xs">
                        {partner.how_to_tickets} How-To Questions
                      </span>
                    )}
                    {partner.training_tickets > 3 && (
                      <span className="px-2 py-1 bg-blue-200 text-blue-900 rounded text-xs">
                        {partner.training_tickets} Training Requests
                      </span>
                    )}
                  </div>
                </div>
              )}

              {partner.trend_ratio !== null && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm">
                    <span className="font-medium">30-day trend: </span>
                    {partner.trend_ratio > 1.5 ? (
                      <span className="text-red-700">↑ {Math.round((partner.trend_ratio - 1) * 100)}% increase</span>
                    ) : partner.trend_ratio < 0.7 ? (
                      <span className="text-green-700">↓ {Math.round((1 - partner.trend_ratio) * 100)}% decrease</span>
                    ) : (
                      <span className="text-gray-700">→ Stable</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {partners.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No partner data available
        </div>
      )}
    </div>
  );
}
