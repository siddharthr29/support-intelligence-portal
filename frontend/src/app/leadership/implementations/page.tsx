'use client';

import { useState, useRef, useEffect } from 'react';
import { LeadershipNavigation } from '@/components/leadership/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload,
  Building2, 
  MapPin, 
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Map as MapIcon,
  AlertCircle,
  CheckCircle2,
  Download
} from 'lucide-react';
import Papa from 'papaparse';

interface Implementation {
  sl_no: number;
  organisation_name: string;
  sector: string;
  project_name: string;
  for_type: string;
  website: string;
  state: string;
}

type SortField = 'organisation_name' | 'sector' | 'project_name' | 'for_type' | 'state';
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

export default function ImplementationsPage() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stateStats, setStateStats] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('avni_implementations');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setImplementations(data);
        calculateStateStats(data);
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  const calculateStateStats = (data: Implementation[]) => {
    const stats: Record<string, number> = {};
    data.forEach(impl => {
      const state = impl.state || 'Unknown';
      stats[state] = (stats[state] || 0) + 1;
    });
    setStateStats(stats);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[];
          
          // Validate required columns
          const requiredColumns = ['sl_no', 'organisation_name', 'sector', 'project_name', 'for_type', 'website', 'state'];
          const headers = Object.keys(data[0] || {});
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            setUploadError(`Missing required columns: ${missingColumns.join(', ')}`);
            return;
          }

          // Transform and validate data
          const implementations: Implementation[] = data.map((row, index) => {
            if (!row.organisation_name || !row.sector || !row.project_name) {
              throw new Error(`Row ${index + 2}: Missing required fields (organisation_name, sector, or project_name)`);
            }

            return {
              sl_no: Number(row.sl_no) || index + 1,
              organisation_name: String(row.organisation_name).trim(),
              sector: String(row.sector).trim(),
              project_name: String(row.project_name).trim(),
              for_type: String(row.for_type || 'Self').trim(),
              website: String(row.website || '').trim(),
              state: String(row.state || 'Unknown').trim(),
            };
          });

          if (implementations.length === 0) {
            setUploadError('CSV file is empty or has no valid data');
            return;
          }

          // Save to state and localStorage
          setImplementations(implementations);
          localStorage.setItem('avni_implementations', JSON.stringify(implementations));
          calculateStateStats(implementations);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);

        } catch (error) {
          setUploadError(error instanceof Error ? error.message : 'Failed to parse CSV file');
        }
      },
      error: (error) => {
        setUploadError(`CSV parsing error: ${error.message}`);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter implementations
  const filteredImplementations = implementations.filter(impl => {
    const query = searchQuery.toLowerCase();
    return (
      impl.organisation_name.toLowerCase().includes(query) ||
      impl.sector.toLowerCase().includes(query) ||
      impl.project_name.toLowerCase().includes(query) ||
      impl.for_type.toLowerCase().includes(query) ||
      impl.state.toLowerCase().includes(query) ||
      impl.website.toLowerCase().includes(query)
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

  const downloadSampleCSV = () => {
    const sample = `sl_no,organisation_name,sector,project_name,for_type,website,state
1,Sample NGO,Health,Community Health Program,Self,https://example.com,Maharashtra
2,Another Organization,Education,School Program,Government,https://example.org,Karnataka`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'avni_implementations_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
          <p className="text-gray-600">
            Upload CSV to view and manage Avni implementations across India
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">Upload Implementation Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with columns: sl_no, organisation_name, sector, project_name, for_type, website, state
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadSampleCSV}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Sample
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-1">Current Data:</p>
                <p className="text-blue-700">{implementations.length} implementations</p>
                <p className="text-blue-700">{Object.keys(stateStats).length} states</p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {uploadError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Upload Error</p>
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-900 font-semibold">CSV uploaded successfully! {implementations.length} implementations loaded.</p>
            </div>
          )}
        </div>

        {implementations.length > 0 && (
          <>
            {/* Controls */}
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
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Showing {sortedImplementations.length} of {implementations.length} implementations
            </p>

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sl. No
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('organisation_name')}
                        >
                          <div className="flex items-center gap-2">
                            Organisation
                            {getSortIcon('organisation_name')}
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
                          onClick={() => handleSort('project_name')}
                        >
                          <div className="flex items-center gap-2">
                            Program
                            {getSortIcon('project_name')}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('for_type')}
                        >
                          <div className="flex items-center gap-2">
                            For
                            {getSortIcon('for_type')}
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
                      {sortedImplementations.map((impl, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{impl.sl_no}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{impl.organisation_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.sector}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.project_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{impl.for_type}</td>
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
                </div>
              </div>
            )}

            {/* Map View */}
            {viewMode === 'map' && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Avni Implementations Across India
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stateStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([state, count]) => (
                      <div
                        key={state}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        style={{ borderLeftWidth: '4px', borderLeftColor: STATE_COLORS[state] || '#6b7280' }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{state}</h3>
                            <p className="text-sm text-gray-600">{count} implementation{count !== 1 ? 's' : ''}</p>
                          </div>
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: STATE_COLORS[state] || '#6b7280' }}
                          >
                            {count}
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          {implementations
                            .filter(impl => impl.state === state)
                            .slice(0, 3)
                            .map((impl, idx) => (
                              <div key={idx} className="text-xs text-gray-600 truncate">
                                • {impl.organisation_name}
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
            )}
          </>
        )}

        {implementations.length === 0 && (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">Upload a CSV file to view Avni implementations</p>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
