'use client';

import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { SectionHeader } from "@/components/ui/section-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { fetchRftData } from "@/lib/api-client";
import { Calendar, Loader2 } from "lucide-react";

// Lazy load the heavy WeeklyReport component
const WeeklyReport = lazy(() => import("@/components/dashboard/weekly-report").then(m => ({ default: m.WeeklyReport })));

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
          <SectionHeader
            title="Weekly Report"
            description="Generate and export weekly support reports for team updates"
            icon={Calendar}
          />

          <Suspense fallback={
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading report...</p>
              </div>
            </div>
          }>
            <WeeklyReport 
              rftData={rftData}
              companyNames={companyNamesData || {}}
              weekEndDate={effectiveEnd}
              snapshotId={snapshotId}
            />
          </Suspense>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
