'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanyBreakdown } from "@/lib/types";
import { Building2 } from "lucide-react";

interface TopCompaniesProps {
  data: CompanyBreakdown[] | undefined;
  isLoading: boolean;
}

export function TopCompanies({ data, isLoading }: TopCompaniesProps) {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  return (
    <Card className="col-span-3 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Top Companies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data?.slice(0, 5).map((company, index) => (
            <div key={company.companyId} className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {/* In a real app, we'd look up the name from ID or API would provide it */}
                    Company {company.companyId}
                  </p>
                </div>
              </div>
              <div className="font-bold text-sm">{company.ticketCount} tickets</div>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
              No company data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
