'use client';

import { Button } from '@/components/ui/button';
import { useLeadership } from '@/contexts/leadership-context';

interface DateFilterProps {
  onDateChange: (range: { from: Date; to: Date }) => void;
}

export function LeadershipDateFilter({ onDateChange }: DateFilterProps) {
  const { selectedPreset, setSelectedPreset } = useLeadership();
  
  const handlePreset = (p: '30d' | '90d' | '6m' | '12m') => {
    setSelectedPreset(p);
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
    onDateChange(newRange);
  };
  
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
      <Button 
        variant={selectedPreset === '30d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('30d')}
        className={`min-h-[40px] ${selectedPreset === '30d' ? 'bg-black text-white hover:bg-gray-800' : ''}`}
      >
        Last 30 Days
      </Button>
      <Button 
        variant={selectedPreset === '90d' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('90d')}
        className={`min-h-[40px] ${selectedPreset === '90d' ? 'bg-black text-white hover:bg-gray-800' : ''}`}
      >
        Last 90 Days
      </Button>
      <Button 
        variant={selectedPreset === '6m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('6m')}
        className={`min-h-[40px] ${selectedPreset === '6m' ? 'bg-black text-white hover:bg-gray-800' : ''}`}
      >
        Last 6 Months
      </Button>
      <Button 
        variant={selectedPreset === '12m' ? 'default' : 'outline'} 
        size="sm" 
        onClick={() => handlePreset('12m')}
        className={`min-h-[40px] ${selectedPreset === '12m' ? 'bg-black text-white hover:bg-gray-800' : ''}`}
      >
        Last 12 Months
      </Button>
    </div>
  );
}
