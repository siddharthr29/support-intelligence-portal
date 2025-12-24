'use client';

import { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { ProductSupportModal, ProductSupportTicket } from './product-support-modal';
import { Users, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductSupportCardProps {
  totalCount: number;
  openCount: number;
  pendingCount: number;
  resolvedCount: number;
  closedCount: number;
  allTickets: ProductSupportTicket[];
  getCompanyName: (companyId: number) => string;
  isLoading?: boolean;
  trend?: {
    currentMonthTotal: number;
    previousMonthTotal: number;
    totalChange: number;
  };
}

export function ProductSupportCard({
  totalCount,
  openCount,
  pendingCount,
  resolvedCount,
  closedCount,
  allTickets,
  getCompanyName,
  isLoading = false,
  trend,
}: ProductSupportCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <StatCard
        title="Product Support Group"
        value="--"
        subtitle="Loading..."
        icon={Users}
        variant="info"
      />
    );
  }

  // Build subtitle with status breakdown and trend
  let subtitle = `${openCount} open, ${pendingCount} pending, ${resolvedCount} resolved, ${closedCount} closed`;
  if (trend && trend.totalChange !== 0) {
    const trendDirection = trend.totalChange > 0 ? '↑' : '↓';
    subtitle += ` (${trendDirection}${Math.abs(trend.totalChange)}% MoM)`;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            WORK IN PROGRESS
          </Badge>
        </div>
        <StatCard
          title="👥 Product Support Group (Last 12 Months)"
          value={totalCount}
          subtitle={subtitle}
          icon={Users}
          tooltipKey="product_support.overview"
          variant="info"
          onClick={() => setModalOpen(true)}
          trend={trend ? {
            value: trend.totalChange,
            isPositive: trend.totalChange < 0, // For support tickets, decrease is positive
            label: 'vs last month'
          } : undefined}
        />
      </div>
      
      <ProductSupportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        allTickets={allTickets}
        getCompanyName={getCompanyName}
      />
    </>
  );
}
