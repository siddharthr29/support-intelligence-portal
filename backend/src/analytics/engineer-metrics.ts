import type { EngineerHoursInput, DerivedEngineerMetrics } from './types';
import { logger } from '../utils/logger';

export function computeEngineerMetrics(
  engineerHours: EngineerHoursInput,
  ticketsResolvedByEngineer: number
): DerivedEngineerMetrics {
  logger.info({
    engineerName: engineerHours.engineerName,
    hoursWorked: engineerHours.totalHoursWorked,
    ticketsResolved: ticketsResolvedByEngineer,
  }, 'Computing engineer metrics');

  const averageTimePerTicketHours =
    ticketsResolvedByEngineer > 0
      ? engineerHours.totalHoursWorked / ticketsResolvedByEngineer
      : null;

  return {
    engineerName: engineerHours.engineerName,
    totalHoursWorked: engineerHours.totalHoursWorked,
    ticketsResolved: ticketsResolvedByEngineer,
    averageTimePerTicketHours,
  };
}

export function validateEngineerHoursInput(input: unknown): EngineerHoursInput | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.engineerName !== 'string' || obj.engineerName.trim() === '') {
    return null;
  }

  if (typeof obj.totalHoursWorked !== 'number' || obj.totalHoursWorked < 0) {
    return null;
  }

  if (typeof obj.weekSnapshotId !== 'string' || obj.weekSnapshotId.trim() === '') {
    return null;
  }

  return {
    engineerName: obj.engineerName.trim(),
    totalHoursWorked: obj.totalHoursWorked,
    weekSnapshotId: obj.weekSnapshotId.trim(),
  };
}
