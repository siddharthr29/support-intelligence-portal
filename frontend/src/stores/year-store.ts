import { create } from 'zustand';

/**
 * Year Store - Manages year selection for data viewing
 * Business Rule: Only ONE year is available at a time (current year)
 * No persistence needed - year is always calculated from current date
 */

interface YearState {
  selectedYear: number;
  availableYears: number[];
  currentYear: number;
  isLoading: boolean;
  
  setYear: (year: number) => void;
  fetchAvailableYears: () => Promise<void>;
}

/**
 * Get the valid year for data viewing
 * Always returns current year (which represents the data being viewed)
 */
function getValidYear(): number {
  return new Date().getFullYear();
}

export const useYearStore = create<YearState>((set) => ({
  selectedYear: getValidYear(),
  availableYears: [getValidYear()],
  currentYear: getValidYear(),
  isLoading: false,
  
  setYear: (year: number) => {
    // Only allow setting the valid year
    const validYear = getValidYear();
    if (year === validYear) {
      set({ selectedYear: year });
    }
  },
  
  fetchAvailableYears: async () => {
    // No API call needed - year is always calculated from current date
    // This ensures the dropdown always shows exactly ONE valid year
    const validYear = getValidYear();
    set({
      availableYears: [validYear],
      currentYear: validYear,
      selectedYear: validYear,
      isLoading: false,
    });
  },
}));
