import { getPrismaClient } from '../../persistence/prisma-client';
import { logger } from '../../utils/logger';

/**
 * Year Manager Service
 * Handles year-based data filtering and retention logic
 */

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get the previous year
 */
export function getPreviousYear(): number {
  return getCurrentYear() - 1;
}

/**
 * Get available years for the dropdown
 * Business Rule: Only show the immediately previous completed year
 * - In 2025, show only 2025
 * - In 2026, show only 2025
 * - In 2027, show only 2026
 * This ensures the dropdown always shows exactly ONE valid year
 */
export async function getAvailableYears(): Promise<number[]> {
  // Calculate the valid retention year (current year)
  const validYear = getCurrentYear();
  
  logger.info({ validYear }, 'Returning single valid year for dropdown');
  
  // Return only the current year - no DB query needed
  return [validYear];
}

/**
 * Check if a year is available in the database
 */
export async function isYearAvailable(year: number): Promise<boolean> {
  const availableYears = await getAvailableYears();
  return availableYears.includes(year);
}

/**
 * Get year boundaries (Jan 1 - Dec 31)
 */
export function getYearBoundaries(year: number): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0), // Jan 1, 00:00:00
    end: new Date(year, 11, 31, 23, 59, 59, 999), // Dec 31, 23:59:59
  };
}

/**
 * Validate year parameter with explicit sanitization
 * Ensures year is within reasonable bounds and prevents SQL injection
 */
export function validateYear(year: number): boolean {
  const currentYear = getCurrentYear();
  const minYear = 2025; // Application start year
  const maxYear = currentYear;
  
  // Check if it's a valid integer
  if (!Number.isInteger(year) || isNaN(year)) {
    return false;
  }
  
  // Check bounds
  return year >= minYear && year <= maxYear;
}

/**
 * Sanitize and validate year string input
 * Prevents SQL injection and validates format
 */
export function sanitizeYearInput(yearInput: string): number | null {
  // Remove any non-numeric characters
  const sanitized = yearInput.replace(/[^\d]/g, '');
  
  // Check if it's a valid 4-digit year
  if (!/^\d{4}$/.test(sanitized)) {
    return null;
  }
  
  const year = parseInt(sanitized, 10);
  
  // Validate the year
  if (!validateYear(year)) {
    return null;
  }
  
  return year;
}

/**
 * Get years to keep (current + previous)
 */
export function getYearsToKeep(): number[] {
  const currentYear = getCurrentYear();
  const previousYear = getPreviousYear();
  return [currentYear, previousYear];
}

/**
 * Get years to delete (older than 2 years)
 */
export async function getYearsToDelete(): Promise<number[]> {
  const availableYears = await getAvailableYears();
  const yearsToKeep = getYearsToKeep();
  
  return availableYears.filter(year => !yearsToKeep.includes(year));
}

/**
 * Get ticket count by year
 */
export async function getTicketCountByYear(year: number): Promise<number> {
  const prisma = getPrismaClient();
  
  const count = await prisma.ytdTicket.count({
    where: { year },
  });
  
  return count;
}

/**
 * Get year statistics
 */
export async function getYearStats(year: number): Promise<{
  year: number;
  ticketCount: number;
  dateRange: { start: string; end: string };
  storageEstimateMB: number;
}> {
  const ticketCount = await getTicketCountByYear(year);
  const boundaries = getYearBoundaries(year);
  const storageEstimateMB = (ticketCount * 500) / (1024 * 1024); // 500 bytes per ticket
  
  return {
    year,
    ticketCount,
    dateRange: {
      start: boundaries.start.toISOString(),
      end: boundaries.end.toISOString(),
    },
    storageEstimateMB: parseFloat(storageEstimateMB.toFixed(2)),
  };
}
