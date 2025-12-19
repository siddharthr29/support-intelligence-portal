'use client';

import { useYearStore } from '@/stores/year-store';
import { useAppDataStore } from '@/stores/app-data-store';
import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function YearSelector() {
  const { selectedYear, availableYears, setYear, fetchAvailableYears } = useYearStore();
  const { fetchAppData } = useAppDataStore();
  
  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);
  
  const handleYearChange = async (year: string) => {
    const yearNum = parseInt(year);
    setYear(yearNum);
    // Refetch data for new year
    await fetchAppData(yearNum);
  };
  
  if (availableYears.length === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Year:</span>
      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
