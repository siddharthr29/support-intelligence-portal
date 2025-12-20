'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

interface IndiaMapLeafletProps {
  stateData: Record<string, number>;
  onStateClick?: (state: string) => void;
}

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// State coordinates for markers
const STATE_COORDINATES: Record<string, [number, number]> = {
  'Jammu and Kashmir': [34.0, 76.0],
  'Himachal Pradesh': [31.1, 77.2],
  'Punjab': [31.1, 75.3],
  'Uttarakhand': [30.1, 79.0],
  'Haryana': [29.0, 76.0],
  'Delhi': [28.7, 77.1],
  'Rajasthan': [27.0, 74.0],
  'Uttar Pradesh': [26.8, 80.9],
  'Bihar': [25.1, 85.3],
  'Sikkim': [27.5, 88.5],
  'Arunachal Pradesh': [28.2, 94.7],
  'Nagaland': [26.2, 94.6],
  'Manipur': [24.7, 93.9],
  'Mizoram': [23.2, 92.9],
  'Tripura': [23.8, 91.3],
  'Meghalaya': [25.5, 91.4],
  'Assam': [26.2, 92.9],
  'West Bengal': [22.9, 87.9],
  'Jharkhand': [23.6, 85.3],
  'Odisha': [20.9, 85.1],
  'Chhattisgarh': [21.3, 81.9],
  'Madhya Pradesh': [22.9, 78.7],
  'Gujarat': [22.3, 71.2],
  'Maharashtra': [19.8, 75.8],
  'Telangana': [18.1, 79.1],
  'Andhra Pradesh': [15.9, 79.7],
  'Karnataka': [15.3, 75.7],
  'Goa': [15.3, 74.1],
  'Kerala': [10.8, 76.3],
  'Tamil Nadu': [11.1, 78.7],
};

const COLOR_SCALE = [
  { threshold: 0, color: '#f3f4f6' },
  { threshold: 1, color: '#dbeafe' },
  { threshold: 3, color: '#93c5fd' },
  { threshold: 6, color: '#3b82f6' },
  { threshold: 11, color: '#1d4ed8' },
];

export function IndiaMapLeaflet({ stateData, onStateClick }: IndiaMapLeafletProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStateColor = (count: number): string => {
    for (let i = COLOR_SCALE.length - 1; i >= 0; i--) {
      if (count >= COLOR_SCALE[i].threshold) {
        return COLOR_SCALE[i].color;
      }
    }
    return COLOR_SCALE[0].color;
  };

  if (!mounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-[600px] rounded-lg overflow-hidden border relative" style={{ zIndex: 1 }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Markers for each state with implementations */}
          {Object.entries(stateData).map(([state, count]) => {
            if (count > 0 && STATE_COORDINATES[state]) {
              const position = STATE_COORDINATES[state];
              return (
                <Marker key={state} position={position}>
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900">{state}</h3>
                      <p className="text-sm text-gray-600">
                        {count} implementation{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <span className="text-sm font-medium text-gray-700">Implementations:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#f3f4f6' }} />
          <span className="text-xs text-gray-600">No data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#dbeafe' }} />
          <span className="text-xs text-gray-600">1-2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#93c5fd' }} />
          <span className="text-xs text-gray-600">3-5</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-xs text-gray-600">6-10</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#1d4ed8' }} />
          <span className="text-xs text-gray-600">11+</span>
        </div>
      </div>

      {/* State-wise summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
        {Object.entries(stateData)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([state, count]) => (
            <div key={state} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-700 font-medium">{state}</span>
              <span className="text-blue-600 font-semibold">{count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
