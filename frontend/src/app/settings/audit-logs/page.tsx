'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const res = await fetch(`${API_BASE_URL}/api/audit-logs?limit=${pageSize}&offset=${offset}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
      } else {
        toast.error('Failed to fetch audit logs');
      }
    } catch (error) {
      toast.error('Failed to fetch audit logs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleDownload = async () => {
    try {
      toast.loading('Downloading audit logs...');
      const res = await fetch(`${API_BASE_URL}/api/audit-logs/export`);
      const json = await res.json();

      if (json.success) {
        const blob = new Blob([JSON.stringify(json.logs, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Downloaded ${json.totalLogs} audit logs`);
      } else {
        toast.error('Failed to download audit logs');
      }
    } catch (error) {
      toast.error('Failed to download audit logs');
      console.error(error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Immutable system activity logs</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Total: {total.toLocaleString()} logs | Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Timestamp</th>
                      <th className="pb-2 font-medium">Action</th>
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-3 text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {log.userEmail || log.userId || 'System'}
                        </td>
                        <td className="py-3">
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">View</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Immutable:</strong> Audit logs cannot be modified or deleted</p>
          <p>• <strong>Comprehensive:</strong> Tracks all system actions including config changes, data cleanup, and year switches</p>
          <p>• <strong>Downloadable:</strong> Export complete audit trail as JSON for compliance and debugging</p>
          <p>• <strong>Permanent:</strong> Logs are never automatically deleted and persist forever</p>
        </CardContent>
      </Card>
    </div>
  );
}
