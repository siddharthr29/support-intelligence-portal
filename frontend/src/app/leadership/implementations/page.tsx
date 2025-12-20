'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCcw, 
  Building2, 
  Users, 
  MapPin, 
  Calendar, 
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon
} from 'lucide-react';

interface Implementation {
  organisation_name: string;
  state: string;
  district: string;
  project_name: string;
  start_date: string;
  status: string;
  users_count: number;
  subjects_count: number;
  website?: string;
  sector?: string;
  for_type?: string;
  sl_no?: number;
}

type SortField = 'organisation_name' | 'sector' | 'project_name' | 'for_type';
type SortDirection = 'asc' | 'desc' | null;

export default function ImplementationsPage() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

  // Filter implementations based on search query
  const filteredImplementations = implementations.filter(impl => {
    const query = searchQuery.toLowerCase();
    return (
      impl.organisation_name?.toLowerCase().includes(query) ||
      impl.sector?.toLowerCase().includes(query) ||
      impl.project_name?.toLowerCase().includes(query) ||
      impl.for_type?.toLowerCase().includes(query) ||
      impl.website?.toLowerCase().includes(query)
    );
  });

  // Sort implementations
  const sortedImplementations = [...filteredImplementations].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (sortDirection === 'asc') {
      return aValue.toString().localeCompare(bValue.toString());
    } else {
      return bValue.toString().localeCompare(aValue.toString());
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
            <p className="text-gray-600">
              {sortedImplementations.length} of {implementations.length} implementations
              {lastFetched && (
                <span className="ml-2 text-xs text-gray-500">
                  • Last updated: {lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Cards
            </Button>
            <Button
              onClick={() => fetchImplementations(true)}
              disabled={refreshing}
              size="sm"
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by organisation, sector, program, or website..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sl.No
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('organisation_name')}
                      >
                        <div className="flex items-center gap-2">
                          Organisation
                          {getSortIcon('organisation_name')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('sector')}
                      >
                        <div className="flex items-center gap-2">
                          Sector
                          {getSortIcon('sector')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('project_name')}
                      >
                        <div className="flex items-center gap-2">
                          Program
                          {getSortIcon('project_name')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('for_type')}
                      >
                        <div className="flex items-center gap-2">
                          For
                          {getSortIcon('for_type')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedImplementations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-lg font-medium">No implementations found</p>
                          <p className="text-sm">Try adjusting your search or click refresh</p>
                        </td>
                      </tr>
                    ) : (
                      sortedImplementations.map((impl, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {impl.sl_no || index + 1}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="font-medium">{impl.organisation_name}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {impl.sector || impl.district}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {impl.project_name}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {impl.for_type || 'Self'}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {impl.website ? (
                              <a 
                                href={impl.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                <span className="truncate max-w-[200px]">{impl.website}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <>
            {sortedImplementations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Building2 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No implementations found</p>
                  <p className="text-sm">Try adjusting your search or click refresh</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedImplementations.map((impl, index) => (
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
                          <span>{impl.sector || impl.district}</span>
                        </div>
                        {impl.website && (
                          <div className="flex items-center gap-2 text-sm">
                            <ExternalLink className="h-4 w-4 text-gray-600" />
                            <a 
                              href={impl.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                            >
                              {impl.website}
                            </a>
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {impl.for_type || 'Active'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
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
