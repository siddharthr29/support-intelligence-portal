'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CompanyBreakdown {
  companyId: number;
  ticketCount: number;
  weekCount?: number;
}

interface TopCompaniesCardProps {
  data: CompanyBreakdown[] | undefined;
  isLoading?: boolean;
}

async function fetchCompanyNames(companyIds: number[]): Promise<Record<number, string>> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const res = await fetch(`${API_BASE_URL}/api/companies/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyIds }),
  });
  if (!res.ok) return {};
  const json = await res.json();
  return json.data || {};
}

// Companies to exclude from the list (internal/test companies)
const EXCLUDED_COMPANY_IDS = [
  36000989803, // Healthchecks
];

export function TopCompaniesCard({ data, isLoading }: TopCompaniesCardProps) {
  // Filter out excluded companies and take top 10
  const filteredData = data?.filter(c => !EXCLUDED_COMPANY_IDS.includes(c.companyId)) || [];
  const topCompanies = filteredData.slice(0, 10);
  const companyIds = topCompanies.map(c => c.companyId);
  
  const { data: companyNames } = useQuery({
    queryKey: ['companyNames', companyIds],
    queryFn: () => fetchCompanyNames(companyIds),
    enabled: companyIds.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Top Companies by Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Top Companies by Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No company data available
        </CardContent>
      </Card>
    );
  }

  const maxTickets = Math.max(...topCompanies.map(c => c.ticketCount));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Top Companies by Tickets
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Companies with most support requests - key for renewal discussions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {topCompanies.map((company, index) => {
          const companyName = companyNames?.[company.companyId] || `Company ${company.companyId}`;
          const percentage = (company.ticketCount / maxTickets) * 100;
          
          return (
            <div key={company.companyId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[140px]" title={companyName}>
                    {companyName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-sm font-bold">{company.ticketCount}</span>
                    <span className="text-xs text-muted-foreground ml-1">YTD</span>
                  </div>
                  {company.weekCount !== undefined && company.weekCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                      +{company.weekCount} wk
                    </span>
                  )}
                  {index === 0 && (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className="h-1.5"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
