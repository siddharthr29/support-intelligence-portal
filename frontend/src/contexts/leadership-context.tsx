'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DateRange {
  from: Date;
  to: Date;
}

interface LeadershipContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  selectedPreset: '30d' | '90d' | '6m' | '12m';
  setSelectedPreset: (preset: '30d' | '90d' | '6m' | '12m') => void;
  isInitialLoad: boolean;
  setIsInitialLoad: (value: boolean) => void;
  cachedData: Record<string, any>;
  setCachedData: (key: string, data: any) => void;
}

const LeadershipContext = createContext<LeadershipContextType | undefined>(undefined);

export function LeadershipProvider({ children }: { children: ReactNode }) {
  const [selectedPreset, setSelectedPreset] = useState<'30d' | '90d' | '6m' | '12m'>('12m');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    return { from, to };
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cachedData, setCachedDataState] = useState<Record<string, any>>({});

  const setCachedData = useCallback((key: string, data: any) => {
    setCachedDataState(prev => ({ ...prev, [key]: data }));
  }, []);

  return (
    <LeadershipContext.Provider
      value={{
        dateRange,
        setDateRange,
        selectedPreset,
        setSelectedPreset,
        isInitialLoad,
        setIsInitialLoad,
        cachedData,
        setCachedData,
      }}
    >
      {children}
    </LeadershipContext.Provider>
  );
}

export function useLeadership() {
  const context = useContext(LeadershipContext);
  if (!context) {
    throw new Error('useLeadership must be used within LeadershipProvider');
  }
  return context;
}
