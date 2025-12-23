'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { IndiaMapLeaflet } from '@/components/leadership/india-map-leaflet';
import { useDebounce } from '@/hooks/useDebounce';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { useLeadership } from '@/contexts/leadership-context';
import { 
  Building2, 
  MapPin, 
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Map as MapIcon,
  Plus,
  Edit,
  Trash2,
  Share2,
  X,
  Save,
  Download,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface Implementation {
  id: number;
  slNo: number;
  organisationName: string;
  sector: string;
  projectName: string;
  forType: string;
  website: string | null;
  state: string;
}

type SortField = 'organisationName' | 'sector' | 'projectName' | 'forType' | 'state';
type SortDirection = 'asc' | 'desc' | null;

const STATE_COLORS: Record<string, string> = {
  'Andhra Pradesh': '#ef4444', 'Arunachal Pradesh': '#f97316', 'Assam': '#eab308',
  'Bihar': '#22c55e', 'Chhattisgarh': '#3b82f6', 'Goa': '#8b5cf6',
  'Gujarat': '#ec4899', 'Haryana': '#f59e0b', 'Himachal Pradesh': '#10b981',
  'Jharkhand': '#6366f1', 'Karnataka': '#ef4444', 'Kerala': '#f97316',
  'Madhya Pradesh': '#eab308', 'Maharashtra': '#22c55e', 'Manipur': '#3b82f6',
  'Meghalaya': '#8b5cf6', 'Mizoram': '#ec4899', 'Nagaland': '#f59e0b',
  'Odisha': '#10b981', 'Punjab': '#6366f1', 'Rajasthan': '#ef4444',
  'Sikkim': '#f97316', 'Tamil Nadu': '#eab308', 'Telangana': '#22c55e',
  'Tripura': '#3b82f6', 'Uttar Pradesh': '#8b5cf6', 'Uttarakhand': '#ec4899',
  'West Bengal': '#f59e0b', 'Delhi': '#10b981', 'Jammu and Kashmir': '#6366f1',
  'Ladakh': '#ef4444'
};

const INDIAN_STATES = Object.keys(STATE_COLORS);

export default function ImplementationsPage() {
  const { isInitialLoad, setIsInitialLoad, cachedData, setCachedData } = useLeadership();
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(isInitialLoad);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingImpl, setEditingImpl] = useState<Implementation | null>(null);
  const [formData, setFormData] = useState<Partial<Implementation>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchImplementations = useCallback(async () => {
    const cacheKey = 'implementations-google-sheets';
    
    // Check cache first (cache for 5 minutes)
    const cachedEntry = cachedData[cacheKey];
    const now = Date.now();
    if (cachedEntry && cachedEntry.timestamp && (now - cachedEntry.timestamp < 5 * 60 * 1000)) {
      setImplementations(cachedEntry.data);
      setLoading(false);
      return;
    }

    // Only show loading on initial load
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiGet('/api/google-sheets/implementations');
      const data = response.data.implementations || [];
      setImplementations(data);
      setCachedData(cacheKey, { data, timestamp: now });
    } catch (error) {
      console.error('Failed to load implementations from Google Sheets:', error);
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [cachedData, setCachedData, isInitialLoad, setIsInitialLoad]);

  useEffect(() => {
    fetchImplementations();
  }, [fetchImplementations]);

  // Memoize state stats calculation
  const stateStats = useMemo(() => {
    const stats: Record<string, number> = {};
    implementations.forEach(impl => {
      const state = impl.state || 'Unknown';
      stats[state] = (stats[state] || 0) + 1;
    });
    return stats;
  }, [implementations]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.organisationName?.trim()) {
      errors.organisationName = 'Organisation name is required';
    }
    if (!formData.sector?.trim()) {
      errors.sector = 'Sector is required';
    }
    if (!formData.projectName?.trim()) {
      errors.projectName = 'Program name is required';
    }
    if (!formData.state?.trim()) {
      errors.state = 'State is required';
    }
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      errors.website = 'Website must be a valid URL (starting with http:// or https://)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNew = () => {
    setEditingImpl(null);
    setFormData({
      organisationName: '',
      sector: '',
      projectName: '',
      forType: 'Self',
      website: '',
      state: ''
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEdit = (impl: Implementation) => {
    setEditingImpl(impl);
    setFormData({ ...impl });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingImpl) {
        await apiPut(`/api/implementations/${editingImpl.id}`, {
          organisationName: formData.organisationName!.trim(),
          sector: formData.sector!.trim(),
          projectName: formData.projectName!.trim(),
          forType: formData.forType || 'Self',
          website: formData.website?.trim() || null,
          state: formData.state!.trim(),
        });
      } else {
        await apiPost('/api/implementations', {
          organisationName: formData.organisationName!.trim(),
          sector: formData.sector!.trim(),
          projectName: formData.projectName!.trim(),
          forType: formData.forType || 'Self',
          website: formData.website?.trim() || null,
          state: formData.state!.trim(),
        });
      }

      await fetchImplementations();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to save implementation:', error);
      alert('Failed to save implementation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (impl: Implementation) => {
    if (!confirm(`Delete ${impl.organisationName}?`)) return;

    try {
      await apiDelete(`/api/implementations/${impl.id}`);
      await fetchImplementations();
    } catch (error) {
      console.error('Failed to delete implementation:', error);
      alert('Failed to delete implementation. Please try again.');
    }
  };

  const downloadMapAsPDF = async () => {
    if (!mapRef.current) return;
    
    setIsDownloading(true);
    try {
      // Call backend PDF generation endpoint
      const currentUrl = window.location.href;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/pdf/generate-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      // Get PDF blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avni-implementations-map-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download map:', error);
      alert(`Failed to download map: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareMap = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/share/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.shareUrl);
        alert(`Shareable link created and copied to clipboard!\n\nLink expires in 24 hours.\n\n${data.shareUrl}`);
      } else {
        throw new Error('Failed to create share link');
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
      // Fallback to simple URL copy
      const url = `${window.location.origin}/leadership/implementations?view=map`;
      await navigator.clipboard.writeText(url);
      alert('Map link copied to clipboard!');
    }
  };

  // Memoize filtered and sorted implementations
  const filteredImplementations = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    return implementations.filter(impl => (
      impl.organisationName.toLowerCase().includes(query) ||
      impl.sector.toLowerCase().includes(query) ||
      impl.projectName.toLowerCase().includes(query) ||
      impl.forType.toLowerCase().includes(query) ||
      impl.state.toLowerCase().includes(query) ||
      (impl.website && impl.website.toLowerCase().includes(query))
    ));
  }, [implementations, debouncedSearchQuery]);

  const sortedImplementations = useMemo(() => {
    if (!sortField || !sortDirection) return filteredImplementations;
    
    return [...filteredImplementations].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      if (sortDirection === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });
  }, [filteredImplementations, sortField, sortDirection]);

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
        <div className="container mx-auto p-6 flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <LeadershipNavigation />
        
        <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
          <p className="text-gray-600">
            Manage and visualize Avni implementations across India
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">Implementation Data from Google Sheets</h2>
              <p className="text-sm text-gray-600 mb-4">
                Data is synced from the master Google Sheets document. To add, edit, or delete implementations, please update the Google Sheet directly.
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/1SQkrkD1JQihp4nRsojl1YDUrVdMr2bS9--voyOkpU9A/edit?gid=57503310#gid=57503310"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open Google Sheet
              </a>
            </div>
            <div className="text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-1">Current Data:</p>
                <p className="text-blue-700">{implementations.length} implementations</p>
                <p className="text-blue-700">{Object.keys(stateStats).length} states</p>
                <p className="text-xs text-blue-600 mt-2">✓ Synced from Google Sheets</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchImplementations}
                  className="mt-2 w-full"
                >
                  <RefreshCcw className="h-3 w-3 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </div>

        {implementations.length > 0 && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search implementations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className="gap-2"
                >
                  <MapIcon className="h-4 w-4" />
                  Map
                </Button>
                {viewMode === 'map' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareMap}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, sortedImplementations.length)}-{Math.min(currentPage * itemsPerPage, sortedImplementations.length)} of {sortedImplementations.length} implementations
            </p>

            {viewMode === 'table' && (
              <>
              <ResponsiveTable>
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sl. No
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('organisationName')}
                        >
                          <div className="flex items-center gap-2">
                            Organisation
                            {getSortIcon('organisationName')}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('sector')}
                        >
                          <div className="flex items-center gap-2">
                            Sector
                            {getSortIcon('sector')}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('projectName')}
                        >
                          <div className="flex items-center gap-2">
                            Program
                            {getSortIcon('projectName')}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('forType')}
                        >
                          <div className="flex items-center gap-2">
                            For
                            {getSortIcon('forType')}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('state')}
                        >
                          <div className="flex items-center gap-2">
                            State
                            {getSortIcon('state')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Website
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedImplementations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((impl) => (
                        <tr key={impl.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{impl.slNo}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{impl.organisationName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.sector}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.projectName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.forType}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {impl.state}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {impl.website && (
                              <a
                                href={impl.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                Visit
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </ResponsiveTable>
              
              {/* Pagination Controls */}
              {sortedImplementations.length > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(sortedImplementations.length / itemsPerPage)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedImplementations.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(sortedImplementations.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}


            {viewMode === 'map' && (
              <div ref={mapRef} className="bg-white rounded-lg border p-8">
                <div className="flex items-center justify-center mb-6 pb-6 border-b">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Avni Implementations Across India</h2>
                    <p className="text-gray-600">Empowering communities through technology • {implementations.length} Active Implementations</p>
                    <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* India Map Visualization */}
                <div className="mb-8">
                  <IndiaMapLeaflet 
                    stateData={stateStats}
                    onStateClick={(state) => {
                      console.log('State clicked:', state);
                      // Could add filtering by state here
                    }}
                  />
                </div>

                {/* State-wise Implementation Details */}
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Implementation Details by State</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(stateStats)
                      .sort((a, b) => b[1] - a[1])
                      .map(([state, count]) => (
                        <div
                          key={state}
                          className="border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{state}</h4>
                            <span className="text-sm font-medium text-blue-600">{count} impl.</span>
                          </div>
                          <div className="space-y-1">
                            {implementations
                              .filter(impl => impl.state === state)
                              .slice(0, 3)
                              .map((impl) => (
                                <div key={impl.id} className="text-xs text-gray-600">
                                  • {impl.organisationName}
                                </div>
                              ))}
                            {implementations.filter(impl => impl.state === state).length > 3 && (
                              <div className="text-xs text-gray-500 italic">
                                +{implementations.filter(impl => impl.state === state).length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t text-center">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Avni by Samanvay Foundation</span> • Building technology for social impact
                  </p>
                  <p className="text-xs text-gray-500 mt-1">www.avniproject.org</p>
                </div>
              </div>
            )}
          </>
        )}

        {implementations.length === 0 && (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">Add your first implementation</p>
            <Button onClick={handleAddNew} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              Add New Implementation
            </Button>
          </div>
        )}
      </div>

      </div>
    </ErrorBoundary>
  );
}
