'use client';

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Tag,
  Building2,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2,
  Link,
  Trash2,
  Copy,
  Info
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShareLink {
  token: string;
  month: string;
  expiresAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface MonthOption {
  value: string;
  label: string;
  year: number;
  month: number;
}

interface MonthlyReportData {
  month: string;
  year: number;
  monthName: string;
  openingBalance: number;
  closingBalance: number;
  totalTicketsCreated: number;
  totalTicketsResolved: number;
  totalTicketsClosed: number;
  avgResolutionTimePerTicket: number;
  totalEngineerHours: number;
  estimatedResolutionTime: number;
  productSupportTickets: number;
  supportEngineersTickets: number;
  topCompanies: { companyId: number; companyName: string; ticketCount: number }[];
  topTags: { tag: string; count: number }[];
  generatedAt: string;
}

async function fetchAvailableMonths(): Promise<MonthOption[]> {
  const res = await fetch(`${API_BASE_URL}/api/monthly-report/available-months`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchMonthlyReport(year: number, month: number): Promise<MonthlyReportData | null> {
  const res = await fetch(`${API_BASE_URL}/api/monthly-report?year=${year}&month=${month}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export function MonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: availableMonths = [] } = useQuery({
    queryKey: ['availableMonths'],
    queryFn: fetchAvailableMonths,
  });

  // Fetch active share links
  const { refetch: refetchShares } = useQuery({
    queryKey: ['monthlyReportShares'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/monthly-report/shares`);
      if (!res.ok) return [];
      const json = await res.json();
      setShareLinks(json.data || []);
      return json.data || [];
    },
  });

  // Auto-select current month if available
  const currentMonthValue = availableMonths.length > 0 && !selectedMonth 
    ? availableMonths[0].value 
    : selectedMonth;

  const selectedMonthData = availableMonths.find(m => m.value === currentMonthValue);

  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['monthlyReport', selectedMonthData?.year, selectedMonthData?.month],
    queryFn: () => selectedMonthData 
      ? fetchMonthlyReport(selectedMonthData.year, selectedMonthData.month) 
      : null,
    enabled: !!selectedMonthData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleCreateShareLink = async () => {
    if (!selectedMonthData) return;
    
    setIsSharing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/monthly-report/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          year: selectedMonthData.year, 
          month: selectedMonthData.month,
          expiresInHours: 24 
        }),
      });
      
      if (res.ok) {
        const json = await res.json();
        // Use current domain for production-ready URL
        const fullUrl = `${window.location.origin}/share/monthly/${json.data.token}`;
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Share link created and copied to clipboard!');
        refetchShares();
      } else {
        toast.error('Failed to create share link');
      }
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShareLink = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/monthly-report/share/${token}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Share link revoked');
        refetchShares();
      } else {
        toast.error('Failed to revoke share link');
      }
    } catch {
      toast.error('Failed to revoke share link');
    }
  };

  const handleDownload = () => {
    if (!reportData) return;

    const content = generateDownloadContent(reportData);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${reportData.month}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleCopyToClipboard = () => {
    if (!reportData) return;

    const content = generateDownloadContent(reportData);
    navigator.clipboard.writeText(content);
    toast.success('Report copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={currentMonthValue}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {reportData && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                <FileText className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateShareLink} disabled={isSharing}>
                {isSharing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
                Share
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Share Links */}
      {shareLinks.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link className="h-4 w-4 text-blue-500" />
              Active Share Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shareLinks.map((link) => (
              <div key={link.token} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{link.month}</span>
                  <span className="text-muted-foreground text-xs">
                    Expires: {new Date(link.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/monthly/${link.token}`);
                      toast.success('Link copied');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeShareLink(link.token)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">Failed to load monthly report</p>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Calculation Explanations */}
          <div className="flex flex-wrap gap-2 text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded cursor-help">
                    <Info className="h-3 w-3" />
                    Opening Balance
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                  <p><strong>Unresolved tickets on 1st of month</strong></p>
                  <p>All tickets that were Open or Pending at the start of the month.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded cursor-help">
                    <Info className="h-3 w-3" />
                    Closing Balance
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                  <p><strong>Unresolved tickets at end of month</strong></p>
                  <p>All tickets still Open or Pending at the last day of the month.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded cursor-help">
                    <Info className="h-3 w-3" />
                    Resolved Tickets
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                  <p><strong>Tickets resolved THIS month</strong></p>
                  <p>Only counts tickets that were resolved/closed during this specific month.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded cursor-help">
                    <Info className="h-3 w-3" />
                    Avg Resolution Time
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                  <p><strong>Formula: Engineer Hours ÷ Resolved</strong></p>
                  <p>Uses entered engineer hours. Default 2.5 hrs if not entered.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Opening/Closing Balance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Opening Balance (1st {reportData.monthName})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData.openingBalance}</div>
                <p className="text-xs text-muted-foreground">Unresolved tickets at start of month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-purple-500" />
                  Closing Balance (End of {reportData.monthName})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData.closingBalance}</div>
                <p className="text-xs text-muted-foreground">Unresolved tickets at end of month</p>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Ticket Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{reportData.totalTicketsCreated}</div>
                  <div className="text-sm text-blue-600">Created</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{reportData.totalTicketsResolved}</div>
                  <div className="text-sm text-green-600">Resolved</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{reportData.totalTicketsClosed}</div>
                  <div className="text-sm text-purple-600">Closed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Resolution Time Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">
                    {reportData.avgResolutionTimePerTicket} hrs
                  </div>
                  <div className="text-sm text-amber-600">Avg. Resolution Time per Ticket</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Based on {reportData.totalEngineerHours > 0 ? 'logged engineer hours' : 'standard 2.5 hrs/ticket'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-700">
                    {reportData.totalEngineerHours > 0 ? reportData.totalEngineerHours : reportData.estimatedResolutionTime} hrs
                  </div>
                  <div className="text-sm text-slate-600">
                    {reportData.totalEngineerHours > 0 ? 'Total Engineer Hours Logged' : 'Estimated Total Hours'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Group Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                  <div>
                    <div className="font-medium text-indigo-700">Product Support</div>
                    <div className="text-xs text-indigo-600">Tickets handled</div>
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">{reportData.productSupportTickets}</div>
                </div>
                <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg">
                  <div>
                    <div className="font-medium text-cyan-700">Support Engineers</div>
                    <div className="text-xs text-cyan-600">Tickets handled</div>
                  </div>
                  <div className="text-2xl font-bold text-cyan-700">{reportData.supportEngineersTickets}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-rose-500" />
                Top 3 Companies by Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.topCompanies.length > 0 ? (
                <div className="space-y-3">
                  {reportData.topCompanies.map((company, index) => (
                    <div key={company.companyId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                          {index + 1}
                        </span>
                        <span className="font-medium">{company.companyName}</span>
                      </div>
                      <Badge variant="secondary">{company.ticketCount} tickets</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No company data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-500" />
                Top 3 Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.topTags.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {reportData.topTags.map((tag) => (
                    <div key={tag.tag} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
                      <span className="font-medium text-emerald-700">{tag.tag}</span>
                      <Badge className="bg-emerald-600">{tag.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No tag data available</p>
              )}
            </CardContent>
          </Card>

          {/* Generated At */}
          <p className="text-xs text-muted-foreground text-center">
            Report generated at {new Date(reportData.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && !reportData && availableMonths.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-1">No Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Monthly reports will be available once ticket data is ingested.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function generateDownloadContent(data: MonthlyReportData): string {
  const lines = [
    `=== MONTHLY SUPPORT REPORT - ${data.monthName} ${data.year} ===`,
    '',
    '📊 TICKET BALANCE',
    `Opening Balance (1st ${data.monthName}): ${data.openingBalance} open tickets`,
    `Closing Balance (End of ${data.monthName}): ${data.closingBalance} open tickets`,
    '',
    '📈 TICKET STATISTICS',
    `Total Tickets Created: ${data.totalTicketsCreated}`,
    `Total Tickets Resolved: ${data.totalTicketsResolved}`,
    `Total Tickets Closed: ${data.totalTicketsClosed}`,
    '',
    '⏱️ RESOLUTION TIME',
    `Average Resolution Time per Ticket: ${data.avgResolutionTimePerTicket} hours`,
    `Total Engineer Hours: ${data.totalEngineerHours > 0 ? data.totalEngineerHours : 'Not logged'}`,
    `Estimated Total Hours (@ 2.5 hrs/ticket): ${data.estimatedResolutionTime} hours`,
    '',
    '👥 GROUP BREAKDOWN',
    `Product Support Tickets: ${data.productSupportTickets}`,
    `Support Engineers Tickets: ${data.supportEngineersTickets}`,
    '',
    '🏢 TOP 3 COMPANIES',
    ...data.topCompanies.map((c, i) => `${i + 1}. ${c.companyName}: ${c.ticketCount} tickets`),
    '',
    '🏷️ TOP 3 TAGS',
    ...data.topTags.map(t => `• ${t.tag}: ${t.count}`),
    '',
    `Generated: ${new Date(data.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
  ];

  return lines.join('\n');
}
