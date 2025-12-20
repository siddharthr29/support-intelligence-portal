'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DateFilterProps {
  onDateChange: (range: { from: Date; to: Date }) => void;
  defaultPreset?: '30d' | '90d' | '6m' | '12m';
}

export function LeadershipDateFilter({ onDateChange, defaultPreset = '12m' }: DateFilterProps) {
  const [preset, setPreset] = useState<'30d' | '90d' | '6m' | '12m'>(defaultPreset);
  
  const handlePreset = (p: '30d' | '90d' | '6m' | '12m') => {
    setPreset(p);
    const to = new Date();
    const from = new Date();
    
    if (p === '30d') {
      from.setDate(from.getDate() - 30);
    } else if (p === '90d') {
      from.setDate(from.getDate() - 90);
    } else if (p === '6m') {
      from.setMonth(from.getMonth() - 6);
    } else {
      from.setFullYear(from.getFullYear() - 1);
    }
    
    const newRange = { from, to };
    console.log('LeadershipDateFilter: Preset clicked', p, newRange);
    onDateChange(newRange);
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        variant={preset === '30d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('30d')}
        className={preset === '30d' ? 'bg-black text-white hover:bg-gray-800' : ''}
      >
        Last 30 Days
      </Button>
      <Button 
        variant={preset === '90d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('90d')}
        className={preset === '90d' ? 'bg-black text-white hover:bg-gray-800' : ''}
      >
        Last 90 Days
      </Button>
      <Button 
        variant={preset === '6m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('6m')}
        className={preset === '6m' ? 'bg-black text-white hover:bg-gray-800' : ''}
      >
        Last 6 Months
      </Button>
      <Button 
        variant={preset === '12m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('12m')}
        className={preset === '12m' ? 'bg-black text-white hover:bg-gray-800' : ''}
      >
        Last 12 Months
      </Button>
    </div>
  );
}
