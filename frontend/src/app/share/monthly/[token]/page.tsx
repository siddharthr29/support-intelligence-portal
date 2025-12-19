'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Users, 
  Building2, 
  Tag,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

async function fetchPublicReport(token: string): Promise<{ data: MonthlyReportData; expiresAt: string } | null> {
  const res = await fetch(`${API_BASE_URL}/api/monthly-report/public/${token}`);
  if (!res.ok) return null;
  const json = await res.json();
  return { data: json.data, expiresAt: json.expiresAt };
}

export default function PublicMonthlyReportPage() {
  const params = useParams();
  const token = params.token as string;

  const { data: reportResponse, isLoading, isError } = useQuery({
    queryKey: ['publicMonthlyReport', token],
    queryFn: () => fetchPublicReport(token),
    enabled: !!token,
    retry: false,
  });

  const reportData = reportResponse?.data;
  const expiresAt = reportResponse?.expiresAt;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (isError || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Invalid or Expired</h2>
            <p className="text-muted-foreground">
              This share link is no longer valid. It may have expired or been revoked.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <Badge variant="outline" className="text-xs">Public View</Badge>
          </div>
          <h1 className="text-2xl font-bold">
            Monthly Support Report - {reportData.monthName} {reportData.year}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Generated: {new Date(reportData.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              Link expires: {new Date(expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          )}
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
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{reportData.avgResolutionTimePerTicket.toFixed(1)} hrs</div>
                <div className="text-sm text-muted-foreground">Avg time per ticket</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{reportData.estimatedResolutionTime.toFixed(0)} hrs</div>
                <div className="text-sm text-muted-foreground">Total resolution time</div>
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
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-700">{reportData.supportEngineersTickets}</div>
                <div className="text-sm text-indigo-600">Support Engineers</div>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-cyan-700">{reportData.productSupportTickets}</div>
                <div className="text-sm text-cyan-600">Product Support</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Companies & Tags */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                Top Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.topCompanies.map((company, idx) => (
                  <div key={company.companyId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">
                      {idx + 1}. {company.companyName}
                    </span>
                    <Badge variant="secondary">{company.ticketCount}</Badge>
                  </div>
                ))}
                {reportData.topCompanies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No company data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-pink-500" />
                Top Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.topTags.map((tag, idx) => (
                  <div key={tag.tag} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">
                      {idx + 1}. {tag.tag}
                    </span>
                    <Badge variant="secondary">{tag.count}</Badge>
                  </div>
                ))}
                {reportData.topTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tag data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>This is a read-only public view of the monthly report.</p>
          <p>© {new Date().getFullYear()} Support Intelligence Dashboard</p>
        </div>
      </div>
    </div>
  );
}
