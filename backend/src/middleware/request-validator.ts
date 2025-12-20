import type { FastifyRequest, FastifyReply } from 'fastify';

// Sanitize string inputs to prevent XSS
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Validate date strings
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Validate implementation data
export function validateImplementationData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.organisationName || typeof data.organisationName !== 'string') {
    errors.push('Organisation name is required and must be a string');
  } else if (data.organisationName.length > 200) {
    errors.push('Organisation name must be less than 200 characters');
  }

  if (!data.sector || typeof data.sector !== 'string') {
    errors.push('Sector is required and must be a string');
  } else if (data.sector.length > 100) {
    errors.push('Sector must be less than 100 characters');
  }

  if (!data.projectName || typeof data.projectName !== 'string') {
    errors.push('Project name is required and must be a string');
  } else if (data.projectName.length > 300) {
    errors.push('Project name must be less than 300 characters');
  }

  if (!data.state || typeof data.state !== 'string') {
    errors.push('State is required and must be a string');
  } else if (data.state.length > 100) {
    errors.push('State must be less than 100 characters');
  }

  if (data.website && typeof data.website === 'string') {
    if (data.website.length > 500) {
      errors.push('Website URL must be less than 500 characters');
    }
    // Basic URL validation
    if (data.website && !data.website.match(/^https?:\/\/.+/)) {
      errors.push('Website must be a valid URL starting with http:// or https://');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate date range parameters
export function validateDateRange(startDate?: string, endDate?: string): { valid: boolean; error?: string } {
  if (startDate && !isValidDate(startDate)) {
    return { valid: false, error: 'Invalid start date format' };
  }

  if (endDate && !isValidDate(endDate)) {
    return { valid: false, error: 'Invalid end date format' };
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    // Prevent queries for more than 3 years
    const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > threeYears) {
      return { valid: false, error: 'Date range cannot exceed 3 years' };
    }
  }

  return { valid: true };
}
