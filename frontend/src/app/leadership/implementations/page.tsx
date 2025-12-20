'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCcw, Building2, Users, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface Implementation {
  organisation_name: string;
  state: string;
  district: string;
  project_name: string;
  start_date: string;
  status: string;
  users_count: number;
  subjects_count: number;
}

export default function ImplementationsPage() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchImplementations = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await apiGet(`/api/metabase/implementations${force ? '?force=true' : ''}`);
      setImplementations(response.data.implementations || []);
      setLastFetched(new Date());
    } catch (error) {
      console.error('Failed to load implementations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchImplementations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2 bg-gray-400" />
            <Skeleton className="h-6 w-96 bg-gray-300" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 bg-gray-300" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
            <p className="text-gray-600">
              {implementations.length} active implementations across India
              {lastFetched && (
                <span className="ml-2 text-xs text-gray-500">
                  • Last updated: {lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => fetchImplementations(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh from Metabase
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Implementations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{implementations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {implementations.reduce((sum, impl) => sum + (impl.users_count || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {implementations.reduce((sum, impl) => sum + (impl.subjects_count || 0), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">States Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {new Set(implementations.map(impl => impl.state)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Implementations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {implementations.map((impl, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{impl.organisation_name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{impl.project_name}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{impl.district}, {impl.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Started: {new Date(impl.start_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{impl.users_count} users • {impl.subjects_count} subjects</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      impl.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {impl.status || 'Active'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {implementations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No implementations found</p>
              <p className="text-sm">Click refresh to fetch latest data from Metabase</p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">About This Data</h3>
                <p className="text-sm text-gray-700">
                  This data is fetched from Metabase (Question 816) using secure authentication and shows all active Avni implementations across India. 
                  The data includes organization details, project information, user counts, and subject counts. 
                  Click "Refresh from Metabase" to get the latest data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
