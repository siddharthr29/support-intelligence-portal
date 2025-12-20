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
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    return { from, to };
  });
  
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
    setDateRange(newRange);
    console.log('LeadershipDateFilter: Preset clicked', p, newRange);
    onDateChange(newRange);
  };
  
  const handleCustomRange = (range: any) => {
    setPreset('custom');
    if (range?.from && range?.to) {
      const newRange = { from: range.from, to: range.to };
      setDateRange(newRange);
      console.log('LeadershipDateFilter: Custom range selected', newRange);
      onDateChange(newRange);
    }
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
        startDate={dateRange.from}
        endDate={dateRange.to}
        onSelect={handleCustomRange} 
      />
    </div>
  );
}
