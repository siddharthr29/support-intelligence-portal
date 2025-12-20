'use client';

import { useYearStore } from '@/stores/year-store';
import { useEffect } from 'react';

/**
 * Year Selector Component
 * Business Rule: Only ONE year is available at a time (current year)
 * Since there's only one year, we display it as static text instead of a dropdown
 */
export function YearSelector() {
  const { selectedYear, fetchAvailableYears } = useYearStore();
  
  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Year:</span>
      <span className="text-sm font-medium px-3 py-1.5 bg-secondary rounded-md">
        {selectedYear}
      </span>
    </div>
  );
}
