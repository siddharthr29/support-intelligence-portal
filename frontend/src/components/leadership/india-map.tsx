'use client';

import { useMemo } from 'react';

interface IndiaMapProps {
  stateData: Record<string, number>;
  onStateClick?: (state: string) => void;
}

// SVG path data for Indian states (simplified)
const STATE_PATHS: Record<string, string> = {
  'Jammu and Kashmir': 'M 150 50 L 180 45 L 200 60 L 190 80 L 160 85 L 145 70 Z',
  'Himachal Pradesh': 'M 160 85 L 190 80 L 200 95 L 180 100 L 165 95 Z',
  'Punjab': 'M 145 95 L 165 95 L 180 100 L 170 115 L 150 110 Z',
  'Uttarakhand': 'M 180 100 L 200 95 L 220 110 L 210 120 L 190 115 Z',
  'Haryana': 'M 150 110 L 170 115 L 180 130 L 160 135 L 145 125 Z',
  'Delhi': 'M 160 125 L 165 125 L 165 130 L 160 130 Z',
  'Rajasthan': 'M 100 120 L 145 125 L 160 135 L 155 180 L 120 190 L 90 170 Z',
  'Uttar Pradesh': 'M 180 130 L 220 125 L 250 140 L 260 160 L 240 175 L 200 170 L 180 155 Z',
  'Bihar': 'M 240 175 L 260 160 L 290 165 L 300 180 L 280 190 L 260 185 Z',
  'Sikkim': 'M 295 155 L 305 155 L 305 165 L 295 165 Z',
  'Arunachal Pradesh': 'M 310 140 L 350 135 L 365 150 L 355 170 L 320 165 L 310 155 Z',
  'Nagaland': 'M 320 165 L 335 165 L 340 175 L 330 180 L 320 175 Z',
  'Manipur': 'M 330 180 L 340 180 L 340 190 L 330 190 Z',
  'Mizoram': 'M 325 190 L 335 190 L 335 205 L 325 205 Z',
  'Tripura': 'M 315 185 L 325 185 L 325 195 L 315 195 Z',
  'Meghalaya': 'M 305 175 L 320 175 L 320 185 L 305 185 Z',
  'Assam': 'M 290 165 L 320 165 L 320 175 L 305 175 L 290 180 Z',
  'West Bengal': 'M 260 185 L 280 190 L 290 210 L 280 230 L 260 225 L 250 210 Z',
  'Jharkhand': 'M 240 190 L 260 185 L 260 210 L 245 215 L 235 205 Z',
  'Odisha': 'M 245 215 L 260 210 L 270 235 L 260 255 L 240 250 L 235 230 Z',
  'Chhattisgarh': 'M 200 190 L 235 205 L 240 230 L 220 245 L 200 235 L 190 210 Z',
  'Madhya Pradesh': 'M 155 180 L 200 170 L 220 190 L 220 220 L 190 230 L 160 220 L 140 200 Z',
  'Gujarat': 'M 80 190 L 120 190 L 140 210 L 135 245 L 100 255 L 75 235 L 70 210 Z',
  'Maharashtra': 'M 135 245 L 180 240 L 200 260 L 190 290 L 150 295 L 120 280 L 110 260 Z',
  'Telangana': 'M 180 260 L 200 260 L 210 280 L 200 295 L 185 290 Z',
  'Andhra Pradesh': 'M 185 290 L 210 280 L 230 300 L 225 330 L 200 335 L 180 320 Z',
  'Karnataka': 'M 150 295 L 185 290 L 200 310 L 190 345 L 160 350 L 140 330 Z',
  'Goa': 'M 130 295 L 145 295 L 145 310 L 130 310 Z',
  'Kerala': 'M 140 350 L 160 350 L 165 385 L 150 390 L 140 375 Z',
  'Tamil Nadu': 'M 160 350 L 200 345 L 210 370 L 200 395 L 170 395 L 165 385 Z',
};

// State coordinates for labels
const STATE_CENTERS: Record<string, { x: number; y: number }> = {
  'Jammu and Kashmir': { x: 170, y: 65 },
  'Himachal Pradesh': { x: 180, y: 92 },
  'Punjab': { x: 158, y: 105 },
  'Uttarakhand': { x: 200, y: 108 },
  'Haryana': { x: 158, y: 125 },
  'Delhi': { x: 162, y: 127 },
  'Rajasthan': { x: 125, y: 155 },
  'Uttar Pradesh': { x: 215, y: 150 },
  'Bihar': { x: 270, y: 177 },
  'Sikkim': { x: 300, y: 160 },
  'Arunachal Pradesh': { x: 335, y: 152 },
  'Nagaland': { x: 330, y: 172 },
  'Manipur': { x: 335, y: 185 },
  'Mizoram': { x: 330, y: 197 },
  'Tripura': { x: 320, y: 190 },
  'Meghalaya': { x: 312, y: 180 },
  'Assam': { x: 305, y: 172 },
  'West Bengal': { x: 270, y: 207 },
  'Jharkhand': { x: 247, y: 200 },
  'Odisha': { x: 252, y: 235 },
  'Chhattisgarh': { x: 215, y: 215 },
  'Madhya Pradesh': { x: 180, y: 200 },
  'Gujarat': { x: 105, y: 220 },
  'Maharashtra': { x: 155, y: 270 },
  'Telangana': { x: 195, y: 277 },
  'Andhra Pradesh': { x: 202, y: 312 },
  'Karnataka': { x: 165, y: 322 },
  'Goa': { x: 137, y: 302 },
  'Kerala': { x: 150, y: 370 },
  'Tamil Nadu': { x: 185, y: 372 },
};

const COLOR_SCALE = [
  { threshold: 0, color: '#f3f4f6', label: 'No data' },
  { threshold: 1, color: '#dbeafe', label: '1-2' },
  { threshold: 3, color: '#93c5fd', label: '3-5' },
  { threshold: 6, color: '#3b82f6', label: '6-10' },
  { threshold: 11, color: '#1d4ed8', label: '11+' },
];

export function IndiaMap({ stateData, onStateClick }: IndiaMapProps) {
  const getStateColor = (state: string): string => {
    const count = stateData[state] || 0;
    for (let i = COLOR_SCALE.length - 1; i >= 0; i--) {
      if (count >= COLOR_SCALE[i].threshold) {
        return COLOR_SCALE[i].color;
      }
    }
    return COLOR_SCALE[0].color;
  };

  const maxCount = useMemo(() => Math.max(...Object.values(stateData)), [stateData]);

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 450 450"
        className="w-full h-auto"
        style={{ maxHeight: '600px' }}
      >
        {/* State paths */}
        {Object.entries(STATE_PATHS).map(([state, path]) => {
          const count = stateData[state] || 0;
          const color = getStateColor(state);
          
          return (
            <g key={state}>
              <path
                d={path}
                fill={color}
                stroke="#64748b"
                strokeWidth="1"
                className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                onClick={() => onStateClick?.(state)}
              >
                <title>{`${state}: ${count} implementation${count !== 1 ? 's' : ''}`}</title>
              </path>
              
              {/* State labels for states with data */}
              {count > 0 && STATE_CENTERS[state] && (
                <text
                  x={STATE_CENTERS[state].x}
                  y={STATE_CENTERS[state].y}
                  textAnchor="middle"
                  className="text-xs font-bold pointer-events-none"
                  fill={count >= 6 ? '#ffffff' : '#1f2937'}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <span className="text-sm font-medium text-gray-700">Implementations:</span>
        {COLOR_SCALE.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
