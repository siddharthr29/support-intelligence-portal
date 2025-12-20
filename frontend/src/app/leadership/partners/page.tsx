'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react';

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
  const [filteredPartners, setFilteredPartners] = useState<PartnerRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await apiGet('/api/leadership/partners');
        const partnerData = response.data.partners || [];
        setPartners(partnerData);
        setFilteredPartners(partnerData);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load partners:', err);
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  useEffect(() => {
    let filtered = partners;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(p => {
        const risk = getRiskLevel(p);
        return risk === riskFilter;
      });
    }

    setFilteredPartners(filtered);
  }, [searchQuery, riskFilter, partners]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
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
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Partner Health Intelligence</h1>
          <p className="text-gray-600">
            Real-time operational risk assessment for {partners.length} partners (last 12 months)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search partners by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    riskFilter === level
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredPartners.length} of {partners.length} partners
        </div>

        {/* Partner Cards */}
        <div className="grid gap-4">
        {filteredPartners.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-500">No partners found matching your filters</p>
          </div>
        ) : (
          filteredPartners.map((partner) => {
          const riskLevel = getRiskLevel(partner);
          const riskColor = getRiskColor(riskLevel);
          const trendIcon = partner.trend_ratio && partner.trend_ratio > 1.5 
            ? <TrendingUp className="h-4 w-4 text-red-600" />
            : partner.trend_ratio && partner.trend_ratio < 0.7
            ? <TrendingDown className="h-4 w-4 text-green-600" />
            : null;

          return (
            <div key={partner.partner_id} className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${riskColor}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{partner.partner_name || 'Unknown Partner'}</h3>
                    {trendIcon}
                  </div>
                  <p className="text-sm text-gray-500">Partner ID: {partner.partner_id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                  riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
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
        })
        )}
      </div>
      </div>
    </div>
  );
}
