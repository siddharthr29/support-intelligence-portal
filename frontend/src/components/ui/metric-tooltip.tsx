/**
 * METRIC TOOLTIP COMPONENT
 * 
 * Reusable tooltip component that displays metric explanations
 * from the centralized configuration
 */

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getMetricTooltip, type MetricTooltip } from '@/config/metric-tooltips';

interface MetricTooltipProps {
  metricKey: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showIcon?: boolean;
}

export function MetricTooltip({ 
  metricKey, 
  side = 'top', 
  className = '',
  showIcon = true 
}: MetricTooltipProps) {
  const tooltip = getMetricTooltip(metricKey);

  if (!tooltip) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {showIcon ? (
            <Info className={`h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors ${className}`} />
          ) : (
            <span className={`cursor-help ${className}`}>ⓘ</span>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="max-w-[320px] p-4 space-y-2 bg-gray-900 text-white border-gray-700"
        >
          <div className="font-semibold text-sm">{tooltip.title}</div>
          <div className="text-xs text-gray-200">{tooltip.description}</div>
          <div className="pt-2 border-t border-gray-700 space-y-1">
            <div className="text-[10px] text-gray-400 font-medium">CALCULATION</div>
            <div className="text-xs text-gray-300">{tooltip.calculation}</div>
          </div>
          <div className="pt-1 space-y-1">
            <div className="text-[10px] text-gray-400 font-medium">DATA SOURCE</div>
            <div className="text-xs text-gray-300">{tooltip.dataSource}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline tooltip variant - shows tooltip text inline without icon
 */
interface InlineMetricTooltipProps {
  metricKey: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InlineMetricTooltip({ 
  metricKey, 
  children, 
  side = 'top' 
}: InlineMetricTooltipProps) {
  const tooltip = getMetricTooltip(metricKey);

  if (!tooltip) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help border-b border-dashed border-gray-400">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="max-w-[320px] p-4 space-y-2 bg-gray-900 text-white border-gray-700"
        >
          <div className="font-semibold text-sm">{tooltip.title}</div>
          <div className="text-xs text-gray-200">{tooltip.description}</div>
          <div className="pt-2 border-t border-gray-700 space-y-1">
            <div className="text-[10px] text-gray-400 font-medium">CALCULATION</div>
            <div className="text-xs text-gray-300">{tooltip.calculation}</div>
          </div>
          <div className="pt-1 space-y-1">
            <div className="text-[10px] text-gray-400 font-medium">DATA SOURCE</div>
            <div className="text-xs text-gray-300">{tooltip.dataSource}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
