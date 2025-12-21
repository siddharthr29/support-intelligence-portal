/**
 * UNIFIED STAT CARD COMPONENT
 * 
 * Standardized metric card with consistent styling across the platform.
 * Follows design system tokens and visual hierarchy principles.
 */

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricTooltip } from '@/components/ui/metric-tooltip';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tooltipKey?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    value: 'text-gray-900',
  },
  primary: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
    border: 'border-green-200',
    icon: 'text-green-600',
    value: 'text-green-900',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    value: 'text-emerald-900',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    value: 'text-amber-900',
  },
  error: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
    border: 'border-red-200',
    icon: 'text-red-600',
    value: 'text-red-900',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    value: 'text-blue-900',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tooltipKey,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'hover:shadow-md',
        styles.bg,
        styles.border,
        className
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-600 truncate">
              {title}
            </span>
            {tooltipKey && <MetricTooltip metricKey={tooltipKey} />}
          </div>
          <div className={cn('p-2 rounded-lg bg-white/50', styles.border)}>
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div className={cn('text-3xl font-bold tracking-tight', styles.value)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>

          {/* Subtitle or Trend */}
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-sm text-gray-600 truncate">{subtitle}</p>
            )}
            
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md',
                  trend.isPositive
                    ? 'text-green-700 bg-green-100'
                    : 'text-red-700 bg-red-100'
                )}
              >
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
                {trend.label && (
                  <span className="text-xs text-gray-600 ml-1">{trend.label}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
