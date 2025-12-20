'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IndiaMapLeaflet } from '@/components/leadership/india-map-leaflet';
import { Loader2 } from 'lucide-react';

interface Implementation {
  state: string;
}

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [implementations, setImplementations] = useState<Implementation[]>([]);

  useEffect(() => {
    const verifyAndLoadMap = async () => {
      try {
        // Verify share link
        const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/share/verify/${token}`);
        
        if (!verifyRes.ok) {
          setError('This share link has expired or is invalid.');
          setLoading(false);
          return;
        }

        // Load implementations data
        const implRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/implementations`);
        
        if (implRes.ok) {
          const data = await implRes.json();
          setImplementations(data.data.implementations || []);
        }
      } catch (err) {
        console.error('Failed to load shared map:', err);
        setError('Failed to load map data.');
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoadMap();
  }, [token]);

  const stateStats = implementations.reduce((stats, impl) => {
    const state = impl.state || 'Unknown';
    stats[state] = (stats[state] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading shared map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Share links expire after 24 hours for security.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg border p-8">
          <div className="flex items-center justify-center mb-6 pb-6 border-b">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl font-bold text-green-600">AVNI</div>
                <div className="text-sm text-gray-600">by Samanvay Foundation</div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Implementations Across India</h1>
              <p className="text-gray-600">Empowering communities through technology • {implementations.length} Active Implementations</p>
              <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="mb-8">
            <IndiaMapLeaflet 
              stateData={stateStats}
              onStateClick={(state) => console.log('State clicked:', state)}
            />
          </div>

          <div className="mt-8 pt-6 border-t">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Implementation Details by State</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stateStats)
                .sort((a, b) => b[1] - a[1])
                .map(([state, count]) => (
                  <div
                    key={state}
                    className="border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{state}</h3>
                      <span className="text-sm font-medium text-blue-600">{count} impl.</span>
                    </div>
                    <div className="space-y-1">
                      {implementations
                        .filter(impl => impl.state === state)
                        .slice(0, 3)
                        .map((impl, idx) => (
                          <div key={idx} className="text-xs text-gray-600">
                            • Implementation {idx + 1}
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
            <p className="text-xs text-gray-400 mt-2">This is a shared view. Link expires 24 hours after creation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
