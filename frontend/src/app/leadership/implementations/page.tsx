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
  Download,
  Plus,
  Edit,
  Trash2,
  Share2,
  X,
  Save
} from 'lucide-react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';

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

const INDIAN_STATES = Object.keys(STATE_COLORS);

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingImpl, setEditingImpl] = useState<Implementation | null>(null);
  const [formData, setFormData] = useState<Partial<Implementation>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
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

  const saveToLocalStorage = (data: Implementation[]) => {
    localStorage.setItem('avni_implementations', JSON.stringify(data));
    setImplementations(data);
    calculateStateStats(data);
  };

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
          
          const requiredColumns = ['sl_no', 'organisation_name', 'sector', 'project_name', 'for_type', 'website', 'state'];
          const headers = Object.keys(data[0] || {});
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            setUploadError(`Missing required columns: ${missingColumns.join(', ')}`);
            return;
          }

          const implementations: Implementation[] = data.map((row, index) => {
            if (!row.organisation_name || !row.sector || !row.project_name) {
              throw new Error(`Row ${index + 2}: Missing required fields`);
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

          saveToLocalStorage(implementations);
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.organisation_name?.trim()) {
      errors.organisation_name = 'Organisation name is required';
    }
    if (!formData.sector?.trim()) {
      errors.sector = 'Sector is required';
    }
    if (!formData.project_name?.trim()) {
      errors.project_name = 'Program name is required';
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
      sl_no: implementations.length + 1,
      organisation_name: '',
      sector: '',
      project_name: '',
      for_type: 'Self',
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

  const handleSave = () => {
    if (!validateForm()) return;

    const newImpl: Implementation = {
      sl_no: formData.sl_no || implementations.length + 1,
      organisation_name: formData.organisation_name!.trim(),
      sector: formData.sector!.trim(),
      project_name: formData.project_name!.trim(),
      for_type: formData.for_type || 'Self',
      website: formData.website?.trim() || '',
      state: formData.state!.trim(),
    };

    let updatedData: Implementation[];
    if (editingImpl) {
      updatedData = implementations.map(impl => 
        impl.sl_no === editingImpl.sl_no ? newImpl : impl
      );
    } else {
      updatedData = [...implementations, newImpl];
    }

    saveToLocalStorage(updatedData);
    setShowAddModal(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2000);
  };

  const handleDelete = (impl: Implementation) => {
    if (confirm(`Delete ${impl.organisation_name}?`)) {
      const updatedData = implementations.filter(i => i.sl_no !== impl.sl_no);
      saveToLocalStorage(updatedData);
    }
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

  const downloadMapAsPNG = async () => {
    if (!mapRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `avni-implementations-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download map:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareMap = () => {
    const url = `${window.location.origin}/leadership/implementations?view=map`;
    navigator.clipboard.writeText(url);
    alert('Map link copied to clipboard!');
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadershipNavigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Avni Implementations</h1>
          <p className="text-gray-600">
            Manage and visualize Avni implementations across India
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">Manage Implementation Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add implementations individually or upload CSV in bulk
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleAddNew}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  Add New Implementation
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
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
                <p className="text-xs text-blue-600 mt-2">✓ Data persists in browser</p>
              </div>
            </div>
          </div>

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
              <p className="text-green-900 font-semibold">Success! Data updated.</p>
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
                {viewMode === 'map' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareMap}
                      className="gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadMapAsPNG}
                      disabled={isDownloading}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloading ? 'Downloading...' : 'Download PNG'}
                    </Button>
                  </>
                )}
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
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
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(impl)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(impl)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
              <div ref={mapRef} className="bg-white rounded-lg border p-8">
                {/* Avni Logo Header */}
                <div className="flex items-center justify-center mb-6 pb-6 border-b">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Avni Implementations Across India</h2>
                    <p className="text-gray-600">Empowering communities through technology • {implementations.length} Active Implementations</p>
                    <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* State Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(stateStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([state, count]) => (
                      <div
                        key={state}
                        className="border-2 rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                        style={{ borderColor: STATE_COLORS[state] || '#6b7280' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{state}</h3>
                            <p className="text-sm text-gray-600 font-medium">
                              {count} implementation{count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                            style={{ backgroundColor: STATE_COLORS[state] || '#6b7280' }}
                          >
                            {count}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t space-y-1.5">
                          {implementations
                            .filter(impl => impl.state === state)
                            .slice(0, 3)
                            .map((impl, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div 
                                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                  style={{ backgroundColor: STATE_COLORS[state] || '#6b7280' }}
                                />
                                <div className="text-xs text-gray-700 leading-tight">
                                  <span className="font-semibold">{impl.organisation_name}</span>
                                  <span className="text-gray-500"> • {impl.sector}</span>
                                </div>
                              </div>
                            ))}
                          {implementations.filter(impl => impl.state === state).length > 3 && (
                            <div className="text-xs text-gray-500 italic pl-3.5">
                              +{implementations.filter(impl => impl.state === state).length - 3} more organizations
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Footer */}
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
            <p className="text-gray-600 mb-4">Add your first implementation or upload a CSV file</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleAddNew} className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Add New Implementation
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV File
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingImpl ? 'Edit Implementation' : 'Add New Implementation'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation Name *
                </label>
                <Input
                  value={formData.organisation_name || ''}
                  onChange={(e) => setFormData({ ...formData, organisation_name: e.target.value })}
                  placeholder="Enter organisation name"
                  className={formErrors.organisation_name ? 'border-red-500' : ''}
                />
                {formErrors.organisation_name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.organisation_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sector *
                  </label>
                  <Input
                    value={formData.sector || ''}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="e.g., Health, Education"
                    className={formErrors.sector ? 'border-red-500' : ''}
                  />
                  {formErrors.sector && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.sector}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    For
                  </label>
                  <select
                    value={formData.for_type || 'Self'}
                    onChange={(e) => setFormData({ ...formData, for_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Self">Self</option>
                    <option value="Government">Government</option>
                    <option value="State NGOs Partnership">State NGOs Partnership</option>
                    <option value="M.P. Government">M.P. Government</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name *
                </label>
                <Input
                  value={formData.project_name || ''}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="Enter program name"
                  className={formErrors.project_name ? 'border-red-500' : ''}
                />
                {formErrors.project_name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.project_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${formErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select a state</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {formErrors.state && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className={formErrors.website ? 'border-red-500' : ''}
                />
                {formErrors.website && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.website}</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                {editingImpl ? 'Update' : 'Add'} Implementation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
