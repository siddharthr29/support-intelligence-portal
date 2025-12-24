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
}

export function ProductSupportCard({
  assignedCount,
  closedCount,
  assignedTickets,
  closedTickets,
  getCompanyName,
  isLoading = false,
}: ProductSupportCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <StatCard
        title="Product Team Support"
        value="--"
        subtitle="Loading..."
        icon={Users}
        variant="info"
      />
    );
  }

  return (
    <>
      <StatCard
        title="Product Team Support"
        value={assignedCount}
        subtitle={`${assignedCount} assigned, ${closedCount} closed`}
        icon={Users}
        tooltipKey="product_support.overview"
        variant="info"
        onClick={() => setModalOpen(true)}
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
