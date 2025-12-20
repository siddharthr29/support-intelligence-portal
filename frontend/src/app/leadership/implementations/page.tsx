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
  Loader2
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
    const cacheKey = 'implementations-all';
    
    // Check cache first
    if (cachedData[cacheKey]) {
      setImplementations(cachedData[cacheKey]);
      setLoading(false);
      return;
    }

    // Only show loading on initial load
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiGet('/api/implementations');
      const data = response.data.implementations || [];
      setImplementations(data);
      setCachedData(cacheKey, data);
    } catch (error) {
      console.error('Failed to load implementations:', error);
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
      const { default: jsPDF } = await import('jspdf');
      
      // Step 1: Capture Leaflet map as static image using leaflet-image or manual canvas capture
      let mapSnapshotDataUrl: string | null = null;
      const leafletMapContainer = mapRef.current.querySelector('.leaflet-container');
      
      if (leafletMapContainer) {
        try {
          // Use Leaflet's built-in canvas rendering if available
          // @ts-ignore - Leaflet map instance
          const leafletMap = (leafletMapContainer as any)._leaflet_map;
          
          if (leafletMap) {
            // Create a temporary canvas to capture the map tiles
            const mapCanvas = document.createElement('canvas');
            const mapSize = leafletMap.getSize();
            mapCanvas.width = mapSize.x;
            mapCanvas.height = mapSize.y;
            const ctx = mapCanvas.getContext('2d');
            
            if (ctx) {
              // Fill with background
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
              
              // Get all tile images from the map
              const tiles = leafletMapContainer.querySelectorAll('.leaflet-tile-pane img');
              const tilePromises: Promise<void>[] = [];
              
              tiles.forEach((tile: any) => {
                if (tile.complete && tile.naturalWidth > 0) {
                  const promise = new Promise<void>((resolve) => {
                    try {
                      const tileStyle = window.getComputedStyle(tile);
                      const transform = tileStyle.transform;
                      
                      // Parse transform matrix to get position
                      if (transform && transform !== 'none') {
                        const matrix = transform.match(/matrix\((.+)\)/);
                        if (matrix) {
                          const values = matrix[1].split(', ');
                          const x = parseFloat(values[4]);
                          const y = parseFloat(values[5]);
                          ctx.drawImage(tile, x, y, tile.width, tile.height);
                        }
                      }
                    } catch (e) {
                      // Skip tiles that fail to draw
                    }
                    resolve();
                  });
                  tilePromises.push(promise);
                }
              });
              
              await Promise.all(tilePromises);
              
              // Draw markers on top
              const markers = leafletMapContainer.querySelectorAll('.leaflet-marker-icon');
              markers.forEach((marker: any) => {
                try {
                  const markerStyle = window.getComputedStyle(marker);
                  const transform = markerStyle.transform;
                  
                  if (transform && transform !== 'none') {
                    const matrix = transform.match(/matrix\((.+)\)/);
                    if (matrix) {
                      const values = matrix[1].split(', ');
                      const x = parseFloat(values[4]);
                      const y = parseFloat(values[5]);
                      
                      // Draw a simple marker circle
                      ctx.fillStyle = '#3b82f6';
                      ctx.beginPath();
                      ctx.arc(x + 12, y + 12, 8, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.strokeStyle = '#ffffff';
                      ctx.lineWidth = 2;
                      ctx.stroke();
                    }
                  }
                } catch (e) {
                  // Skip markers that fail to draw
                }
              });
              
              mapSnapshotDataUrl = mapCanvas.toDataURL('image/png');
            }
          }
        } catch (mapError) {
          console.warn('Failed to capture Leaflet map, using placeholder:', mapError);
        }
      }
      
      // Step 2: Clone the container and replace map with snapshot
      const mapContainer = mapRef.current;
      const clonedContainer = mapContainer.cloneNode(true) as HTMLElement;
      
      // Find and replace Leaflet map with static snapshot
      const leafletContainers = clonedContainer.querySelectorAll('.leaflet-container');
      leafletContainers.forEach(container => {
        const parent = container.parentElement;
        if (parent) {
          const placeholder = document.createElement('div');
          placeholder.style.cssText = 'width: 100%; height: 600px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px; overflow: hidden;';
          
          if (mapSnapshotDataUrl) {
            // Use captured map snapshot
            const snapshotImg = document.createElement('img');
            snapshotImg.src = mapSnapshotDataUrl;
            snapshotImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            placeholder.appendChild(snapshotImg);
          } else {
            // Fallback to text placeholder
            placeholder.innerHTML = '<div style="text-align: center; color: #6b7280;"><h3 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Avni Implementations Map</h3><p style="font-size: 14px;">Interactive map view - see legend and state details below</p></div>';
          }
          
          parent.replaceChild(placeholder, container);
        }
      });
      
      // Step 3: Remove lab() colors
      const allElements = clonedContainer.querySelectorAll('*');
      allElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        try {
          const computedStyle = window.getComputedStyle(htmlElement);
          
          const hasLabColor = 
            computedStyle.color?.includes('lab(') ||
            computedStyle.backgroundColor?.includes('lab(') ||
            computedStyle.borderColor?.includes('lab(') ||
            computedStyle.outlineColor?.includes('lab(');
          
          if (hasLabColor) {
            if (computedStyle.color?.includes('lab(')) htmlElement.style.color = '#000000';
            if (computedStyle.backgroundColor?.includes('lab(')) htmlElement.style.backgroundColor = '#ffffff';
            if (computedStyle.borderColor?.includes('lab(')) htmlElement.style.borderColor = '#e5e7eb';
            if (computedStyle.outlineColor?.includes('lab(')) htmlElement.style.outlineColor = '#e5e7eb';
          }
        } catch (e) {
          // Skip elements that cause errors
        }
      });
      
      // Step 4: Add Avni logo
      const logoDiv = document.createElement('div');
      logoDiv.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 1000; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
      const logoImg = document.createElement('img');
      logoImg.src = '/avni-logo.png';
      logoImg.style.cssText = 'height: 40px; width: auto;';
      logoDiv.appendChild(logoImg);
      
      clonedContainer.style.position = 'relative';
      clonedContainer.style.backgroundColor = '#ffffff';
      clonedContainer.style.padding = '20px';
      clonedContainer.insertBefore(logoDiv, clonedContainer.firstChild);
      
      // Step 5: Render off-screen
      clonedContainer.style.position = 'absolute';
      clonedContainer.style.left = '-9999px';
      clonedContainer.style.top = '0';
      document.body.appendChild(clonedContainer);
      
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 6: Capture with html2canvas
      const canvas = await html2canvas(clonedContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        windowWidth: clonedContainer.scrollWidth,
        windowHeight: clonedContainer.scrollHeight,
      });
      
      // Step 7: Cleanup
      document.body.removeChild(clonedContainer);
      
      // Step 8: Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`avni-implementations-map-${new Date().toISOString().split('T')[0]}.pdf`);
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
              <h2 className="text-lg font-semibold mb-2">Manage Implementation Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add, edit, or delete implementations
              </p>
              <Button
                onClick={handleAddNew}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Add New Implementation
              </Button>
            </div>
            <div className="text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-1">Current Data:</p>
                <p className="text-blue-700">{implementations.length} implementations</p>
                <p className="text-blue-700">{Object.keys(stateStats).length} states</p>
                <p className="text-xs text-blue-600 mt-2">✓ Data stored in database</p>
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
                      onClick={downloadMapAsPDF}
                      disabled={isDownloading}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloading ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  </>
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
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

            {viewMode === 'table' && false && (
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
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
              </ResponsiveTable>
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
                  value={formData.organisationName || ''}
                  onChange={(e) => setFormData({ ...formData, organisationName: e.target.value })}
                  placeholder="Enter organisation name"
                  className={formErrors.organisationName ? 'border-red-500' : ''}
                />
                {formErrors.organisationName && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.organisationName}</p>
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
                    value={formData.forType || 'Self'}
                    onChange={(e) => setFormData({ ...formData, forType: e.target.value })}
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
                  value={formData.projectName || ''}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Enter program name"
                  className={formErrors.projectName ? 'border-red-500' : ''}
                />
                {formErrors.projectName && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.projectName}</p>
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
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingImpl ? 'Update' : 'Add'} Implementation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}
