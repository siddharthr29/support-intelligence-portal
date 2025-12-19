'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/layout/shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  RefreshCcw, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ErrorLog {
  id: number;
  message: string;
  source: string;
  statusCode: number;
  metadata: {
    method?: string;
    ip?: string;
    userAgent?: string;
  } | null;
  timestamp: string;
}

interface ErrorLogsResponse {
  success: boolean;
  data: {
    logs: ErrorLog[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

interface ErrorStatsResponse {
  success: boolean;
  data: {
    totalErrors: number;
    errorsByStatusCode: Record<number, number>;
    errorsBySource: Record<string, number>;
  };
}

async function fetchErrorLogs(limit: number, offset: number, days: number): Promise<ErrorLogsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/error-logs?limit=${limit}&offset=${offset}&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch error logs');
  return res.json();
}

async function fetchErrorStats(days: number): Promise<ErrorStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/error-logs/stats?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch error stats');
  return res.json();
}

function getStatusBadge(statusCode: number) {
  if (statusCode >= 500) {
    return <Badge variant="destructive" className="font-mono">{statusCode}</Badge>;
  } else if (statusCode >= 400) {
    return <Badge variant="outline" className="font-mono text-orange-600 border-orange-300">{statusCode}</Badge>;
  }
  return <Badge variant="secondary" className="font-mono">{statusCode}</Badge>;
}

export default function ErrorLogsPage() {
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const limit = 20;

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all error logs? This action cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/error-logs/clear-all`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cleared ${data.data.deletedCount} error logs`);
        refetchLogs();
      } else {
        toast.error('Failed to clear error logs');
      }
    } catch {
      toast.error('Failed to clear error logs');
    } finally {
      setIsClearing(false);
    }
  };

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['errorLogs', limit, page * limit, days],
    queryFn: () => fetchErrorLogs(limit, page * limit, days),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['errorStats', days],
    queryFn: () => fetchErrorStats(days),
    refetchInterval: 30000,
  });

  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination;
  const stats = statsData?.data;

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Error Logs</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor application errors (last {days} days)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={days.toString()} onValueChange={(v) => { setDays(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLogs()}
                disabled={logsLoading}
              >
                <RefreshCcw className={`h-4 w-4 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {(stats?.totalErrors || 0) > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Errors</p>
                    <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.totalErrors || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <XCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">5xx Errors</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '-' : Object.entries(stats?.errorsByStatusCode || {})
                        .filter(([code]) => parseInt(code) >= 500)
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Server className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">4xx Errors</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '-' : Object.entries(stats?.errorsByStatusCode || {})
                        .filter(([code]) => parseInt(code) >= 400 && parseInt(code) < 500)
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">System Status</p>
                    <p className="text-lg font-bold text-green-600">
                      {(stats?.totalErrors || 0) === 0 ? 'Healthy' : 'Issues Found'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Errors</CardTitle>
              <CardDescription>
                {pagination?.total || 0} errors in the last {days} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium text-green-600">No errors found!</p>
                  <p className="text-sm text-muted-foreground">Your system is running smoothly.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Timestamp</TableHead>
                          <TableHead className="w-[80px]">Status</TableHead>
                          <TableHead className="w-[150px]">Source</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="w-[100px]">Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.statusCode)}</TableCell>
                            <TableCell className="font-mono text-xs truncate max-w-[150px]" title={log.source}>
                              {log.source}
                            </TableCell>
                            <TableCell className="text-sm max-w-[300px]">
                              <p className="truncate" title={log.message}>{log.message}</p>
                            </TableCell>
                            <TableCell>
                              {log.metadata?.method && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {log.metadata.method}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={!pagination?.hasMore}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
