'use client';

import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WeeklyReport } from "@/components/dashboard/weekly-report";
import { fetchRftData } from "@/lib/api";
import { FileText } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WeeklyReportPage() {
  const snapshotId = `snapshot_${format(new Date(), 'yyyyMMdd')}`;
  const effectiveEnd = new Date();

  const { data: rftResponse } = useQuery({
    queryKey: ['rft'],
    queryFn: () => fetchRftData(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const rftData = rftResponse?.data;

  // Company names lookup - fetch all company names
  const { data: companyNamesData } = useQuery({
    queryKey: ['allCompanyNames'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/companies/all`);
      if (!res.ok) return {};
      const json = await res.json();
      return json.data || {};
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-7 w-7 text-green-500" />
              Weekly Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and export weekly support reports
            </p>
          </div>

          <WeeklyReport 
            rftData={rftData}
            companyNames={companyNamesData || {}}
            weekEndDate={effectiveEnd}
            snapshotId={snapshotId}
          />
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
