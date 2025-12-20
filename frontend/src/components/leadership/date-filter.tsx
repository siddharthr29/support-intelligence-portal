'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';

interface DateFilterProps {
  onDateChange: (range: { from: Date; to: Date }) => void;
  defaultPreset?: '30d' | '90d' | '6m' | '12m';
}

export function LeadershipDateFilter({ onDateChange, defaultPreset = '12m' }: DateFilterProps) {
  const [preset, setPreset] = useState<'30d' | '90d' | '6m' | '12m' | 'custom'>(defaultPreset);
  
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
    
    console.log('LeadershipDateFilter: Preset clicked', p, { from, to });
    onDateChange({ from, to });
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        variant={preset === '30d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('30d')}
      >
        Last 30 Days
      </Button>
      <Button 
        variant={preset === '90d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('90d')}
      >
        Last 90 Days
      </Button>
      <Button 
        variant={preset === '6m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('6m')}
      >
        Last 6 Months
      </Button>
      <Button 
        variant={preset === '12m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('12m')}
      >
        Last 12 Months
      </Button>
      <DateRangePicker 
        startDate={undefined}
        endDate={undefined}
        onSelect={(range) => {
          setPreset('custom');
          if (range?.from && range?.to) {
            onDateChange({ from: range.from, to: range.to });
          }
        }} 
      />
    </div>
  );
}
