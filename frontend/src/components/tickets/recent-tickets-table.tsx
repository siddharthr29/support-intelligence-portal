'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api-client';
import { Download, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Ticket {
  ticket_id: number;
  subject: string;
  status: string;
  priority: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export function RecentTicketsTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await apiGet('/api/tickets/recent');
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Failed to load recent tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const downloadCSV = () => {
    const headers = ['Ticket ID', 'Subject', 'Status', 'Priority', 'Company Name', 'Created Time', 'Updated Time', 'Tags'];
    const rows = tickets.map(t => [
      t.ticket_id,
      t.subject,
      t.status,
      t.priority,
      t.company_name,
      new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      new Date(t.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      t.tags.join(', '),
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recent_tickets_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Last 30 Tickets History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Auto-updates after every Friday 4:30 PM IST sync • {tickets.length} tickets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTickets}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={downloadCSV} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Ticket ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Subject</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No tickets found. Data will be available after the next Friday sync.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.ticket_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.ticket_id}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={ticket.subject}>
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                      ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={ticket.company_name}>
                    {ticket.company_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', { 
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'Asia/Kolkata'
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={ticket.tags.join(', ')}>
                    {ticket.tags.length > 0 ? ticket.tags.slice(0, 2).join(', ') : '-'}
                    {ticket.tags.length > 2 && ` +${ticket.tags.length - 2}`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Data automatically updates after every Friday 4:30 PM IST sync
      </div>
    </div>
  );
}
