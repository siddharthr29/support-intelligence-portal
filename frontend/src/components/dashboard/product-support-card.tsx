'use client';

import { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { ProductSupportModal, ProductSupportTicket } from './product-support-modal';
import { Users } from 'lucide-react';

interface ProductSupportCardProps {
  assignedCount: number;
  closedCount: number;
  assignedTickets: ProductSupportTicket[];
  closedTickets: ProductSupportTicket[];
  getCompanyName: (companyId: number) => string;
  isLoading?: boolean;
  trend?: {
    currentMonthAssigned: number;
    previousMonthAssigned: number;
    currentMonthClosed: number;
    previousMonthClosed: number;
    assignedChange: number;
    closedChange: number;
  };
}

export function ProductSupportCard({
  assignedCount,
  closedCount,
  assignedTickets,
  closedTickets,
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

  // Build subtitle with trend
  let subtitle = `${assignedCount} assigned, ${closedCount} closed`;
  if (trend && trend.assignedChange !== 0) {
    const trendDirection = trend.assignedChange > 0 ? '↑' : '↓';
    subtitle += ` (${trendDirection}${Math.abs(trend.assignedChange)}% MoM)`;
  }

  return (
    <>
      <StatCard
        title="Product Support Group"
        value={assignedCount}
        subtitle={subtitle}
        icon={Users}
        tooltipKey="product_support.overview"
        variant="info"
        onClick={() => setModalOpen(true)}
        trend={trend ? {
          value: trend.assignedChange,
          isPositive: trend.assignedChange < 0, // For support tickets, decrease is positive
          label: 'vs last month'
        } : undefined}
      />
      
      <ProductSupportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        assignedTickets={assignedTickets}
        closedTickets={closedTickets}
        getCompanyName={getCompanyName}
      />
    </>
  );
}
