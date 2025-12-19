'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  Download,
  RefreshCcw,
  Calendar,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2,
  Users,
} from 'lucide-react';
import { getCompanyName } from '@/lib/constants';
import { Activity } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Healthchecks company ID - excluded from company list as it's system health monitoring
const HEALTHCHECKS_COMPANY_ID = 36000989803;

interface YtdStats {
  yearStart: string;
  fetchedAt: string;
  totalTickets: number;
  ticketsOpen: number;
  ticketsPending: number;
  ticketsResolved: number;
  ticketsClosed: number;
  resolutionRate: number;
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  statusBreakdown: {
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  monthlyBreakdown: Record<string, { created: number; resolved: number }>;
  companyBreakdown: Array<{ companyId: number; ticketCount: number }>;
  groupBreakdown: Array<{ groupId: number; ticketCount: number; resolved: number }>;
}

interface IngestionStatus {
  isRunning: boolean;
  lastIngestion: string | null;
  ytdTicketCount: number;
  yearStart: string;
}

export default function YearlyReportPage() {
  const [stats, setStats] = useState<YtdStats | null>(null);
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ytd-ingestion/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
    return null;
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ytd-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch YTD stats:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStatus(), fetchStats()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll for status while ingesting
  useEffect(() => {
    if (!isIngesting) return;

    const interval = setInterval(async () => {
      const newStatus = await fetchStatus();
      if (newStatus && !newStatus.isRunning) {
        setIsIngesting(false);
        await fetchStats();
        toast.success('YTD data ingestion completed!');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isIngesting]);

  const triggerIngestion = async () => {
    try {
      setIsIngesting(true);
      const res = await fetch(`${API_BASE_URL}/api/ytd-ingestion/trigger`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.info('YTD ingestion started. This may take several minutes...');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to start ingestion');
        setIsIngesting(false);
      }
    } catch (error) {
      toast.error('Failed to trigger ingestion');
      setIsIngesting(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Yearly Report {currentYear}</h1>
              <p className="text-sm text-muted-foreground">
                Year-to-date ticket analytics from Jan 1, {currentYear}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Status Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Year Start: Jan 1, {currentYear}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span>Tickets in DB: <strong>{status?.ytdTicketCount || 0}</strong></span>
                </div>
                {status?.lastIngestion && (
                  <Badge variant="secondary">
                    Last fetched: {new Date(status.lastIngestion).toLocaleString()}
                  </Badge>
                )}
                {(isIngesting || status?.isRunning) && (
                  <Badge variant="default" className="bg-yellow-500">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Ingestion in progress...
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stats || stats.totalTickets === 0 ? (
            <Card>
              <CardContent className="py-20 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No YTD Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  Data is synced automatically every Friday at 4:30 PM. Please wait for the next sync.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Ticket className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Tickets</p>
                        <p className="text-2xl font-bold">{stats.totalTickets}</p>
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
                        <p className="text-xs text-muted-foreground">Resolved + Closed</p>
                        <p className="text-2xl font-bold">{stats.ticketsResolved + stats.ticketsClosed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Urgent + High</p>
                        <p className="text-2xl font-bold">
                          {stats.priorityBreakdown.urgent + stats.priorityBreakdown.high}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Resolution Rate</p>
                        <p className="text-2xl font-bold">{stats.resolutionRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority & Status Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Priority Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Urgent</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${(stats.priorityBreakdown.urgent / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.priorityBreakdown.urgent}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">High</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(stats.priorityBreakdown.high / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.priorityBreakdown.high}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Medium</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full"
                              style={{ width: `${(stats.priorityBreakdown.medium / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.priorityBreakdown.medium}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Low</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(stats.priorityBreakdown.low / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.priorityBreakdown.low}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Open</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(stats.statusBreakdown.open / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.statusBreakdown.open}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pending</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(stats.statusBreakdown.pending / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.statusBreakdown.pending}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Resolved</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(stats.statusBreakdown.resolved / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.statusBreakdown.resolved}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Closed</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-500 rounded-full"
                              style={{ width: `${(stats.statusBreakdown.closed / stats.totalTickets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{stats.statusBreakdown.closed}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Month</th>
                          <th className="text-right py-2 font-medium">Created</th>
                          <th className="text-right py-2 font-medium">Resolved</th>
                          <th className="text-right py-2 font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.monthlyBreakdown)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([month, data]) => (
                            <tr key={month} className="border-b last:border-0">
                              <td className="py-2">{month}</td>
                              <td className="text-right py-2">{data.created}</td>
                              <td className="text-right py-2">{data.resolved}</td>
                              <td className="text-right py-2">
                                {data.created > 0 ? Math.round((data.resolved / data.created) * 100) : 0}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* System Health (Healthchecks) */}
              {(() => {
                const healthchecks = stats.companyBreakdown.find(c => c.companyId === HEALTHCHECKS_COMPANY_ID);
                if (!healthchecks) return null;
                return (
                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        System Health Monitoring
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-3 bg-blue-100/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Healthcheck Tickets (YTD)</p>
                          <p className="text-xs text-muted-foreground">Automated system health status checks</p>
                        </div>
                        <Badge variant="outline" className="text-lg px-4 py-1 bg-blue-500 text-white border-blue-500">
                          {healthchecks.ticketCount}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Top Companies */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Top Companies by Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.companyBreakdown
                      .filter(c => c.companyId !== HEALTHCHECKS_COMPANY_ID)
                      .slice(0, 12)
                      .map((company, i) => (
                      <div key={company.companyId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                          <span className="text-sm font-medium truncate">{getCompanyName(company.companyId)}</span>
                        </div>
                        <Badge variant="secondary">{company.ticketCount}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
