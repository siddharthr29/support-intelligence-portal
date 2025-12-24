'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Search, 
  ExternalLink,
  Filter,
  X
} from 'lucide-react';
import { FRESHDESK_STATUS, FRESHDESK_PRIORITY } from '@/lib/constants';

export interface ProductSupportTicket {
  id: number;
  subject: string;
  status: number;
  priority: number;
  company_id: number | null;
  company_name: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface ProductSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTickets: ProductSupportTicket[];
  getCompanyName: (companyId: number) => string;
}

type StatusFilter = 'all' | 'open' | 'pending' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';

const getStatusLabel = (status: number): string => {
  switch (status) {
    case FRESHDESK_STATUS.OPEN: return 'Open';
    case FRESHDESK_STATUS.PENDING: return 'Pending';
    case FRESHDESK_STATUS.RESOLVED: return 'Resolved';
    case FRESHDESK_STATUS.CLOSED: return 'Closed';
    default: return 'Unknown';
  }
};

const getPriorityLabel = (priority: number): string => {
  switch (priority) {
    case FRESHDESK_PRIORITY.URGENT: return 'Urgent';
    case FRESHDESK_PRIORITY.HIGH: return 'High';
    case FRESHDESK_PRIORITY.MEDIUM: return 'Medium';
    case FRESHDESK_PRIORITY.LOW: return 'Low';
    default: return 'Unknown';
  }
};

const getStatusBadgeClass = (status: number): string => {
  switch (status) {
    case FRESHDESK_STATUS.OPEN: return 'bg-blue-100 text-blue-800';
    case FRESHDESK_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800';
    case FRESHDESK_STATUS.RESOLVED: return 'bg-green-100 text-green-800';
    case FRESHDESK_STATUS.CLOSED: return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityBadgeClass = (priority: number): string => {
  switch (priority) {
    case FRESHDESK_PRIORITY.URGENT: return 'bg-red-100 text-red-800';
    case FRESHDESK_PRIORITY.HIGH: return 'bg-orange-100 text-orange-800';
    case FRESHDESK_PRIORITY.MEDIUM: return 'bg-yellow-100 text-yellow-800';
    case FRESHDESK_PRIORITY.LOW: return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function ProductSupportModal({
  open,
  onOpenChange,
  allTickets,
  getCompanyName,
}: ProductSupportModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const currentTickets = allTickets;

  const filteredTickets = useMemo(() => {
    let filtered = [...currentTickets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.id.toString().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        getCompanyName(ticket.company_id || 0).toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      const statusMap: Record<StatusFilter, number> = {
        all: -1,
        open: FRESHDESK_STATUS.OPEN,
        pending: FRESHDESK_STATUS.PENDING,
        resolved: FRESHDESK_STATUS.RESOLVED,
        closed: FRESHDESK_STATUS.CLOSED,
      };
      filtered = filtered.filter(ticket => ticket.status === statusMap[statusFilter]);
    }

    if (priorityFilter !== 'all') {
      const priorityMap: Record<PriorityFilter, number> = {
        all: -1,
        urgent: FRESHDESK_PRIORITY.URGENT,
        high: FRESHDESK_PRIORITY.HIGH,
        medium: FRESHDESK_PRIORITY.MEDIUM,
        low: FRESHDESK_PRIORITY.LOW,
      };
      filtered = filtered.filter(ticket => ticket.priority === priorityMap[priorityFilter]);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [currentTickets, searchQuery, statusFilter, priorityFilter, getCompanyName]);

  const downloadCSV = () => {
    const headers = ['Ticket ID', 'Subject', 'Status', 'Priority', 'Company', 'Created Date', 'Updated Date', 'Tags', 'Link'];
    const rows = filteredTickets.map(ticket => [
      ticket.id,
      ticket.subject,
      getStatusLabel(ticket.status),
      getPriorityLabel(ticket.priority),
      getCompanyName(ticket.company_id || 0),
      new Date(ticket.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      new Date(ticket.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      ticket.tags.join('; '),
      `https://avni.freshdesk.com/a/tickets/${ticket.id}`,
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product_support_tickets_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Product Support Group Tickets (Last 12 Months)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Ticket Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredTickets.length} of {allTickets.length} tickets
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID, subject, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filters</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto py-1 px-2 text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No tickets found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ticket.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-md">
                        <div className="truncate" title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusBadgeClass(ticket.status)} border-0`}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${getPriorityBadgeClass(ticket.priority)} border-0`}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <div className="truncate" title={getCompanyName(ticket.company_id || 0)}>
                          {getCompanyName(ticket.company_id || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Asia/Kolkata'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://avni.freshdesk.com/a/tickets/${ticket.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
