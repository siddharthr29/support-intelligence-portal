import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface YearState {
  selectedYear: number;
  availableYears: number[];
  currentYear: number;
  isLoading: boolean;
  
  setYear: (year: number) => void;
  fetchAvailableYears: () => Promise<void>;
}

export const useYearStore = create<YearState>()(
  persist(
    (set, get) => ({
      selectedYear: new Date().getFullYear(),
      availableYears: [],
      currentYear: new Date().getFullYear(),
      isLoading: false,
      
      setYear: (year: number) => {
        set({ selectedYear: year });
      },
      
      fetchAvailableYears: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_BASE_URL}/api/years`);
          const json = await res.json();
          
          if (json.success) {
            set({
              availableYears: json.data.years,
              currentYear: json.data.currentYear,
            });
          }
        } catch (error) {
          console.error('Failed to fetch available years:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'year-storage',
    }
  )
);
