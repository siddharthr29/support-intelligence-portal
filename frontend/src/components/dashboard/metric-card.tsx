'use client';

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  infoText?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
  infoText,
}: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden bg-white", className)}>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Icon - compact on mobile */}
          <div
            className={cn(
              "rounded-lg p-2 sm:p-2.5 bg-gradient-to-br flex-shrink-0",
              iconClassName || "from-blue-500/20 to-blue-600/10"
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70" />
          </div>
          
          {/* Content - minimal and clean */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <h3 className="text-lg sm:text-2xl font-bold tracking-tight">{value}</h3>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          
          {/* Trend indicator - only on desktop */}
          {trend && (
            <span
              className={cn(
                "text-xs font-medium hidden sm:block",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "↑" : "↓"}{Math.abs(trend.value)}%
            </span>
          )}
          
          {/* Info tooltip */}
          {infoText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {infoText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
