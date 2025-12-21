'use client';

import { lazy, Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { SectionHeader } from "@/components/ui/section-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CalendarDays, Loader2 } from "lucide-react";

// Lazy load the heavy MonthlyReport component
const MonthlyReport = lazy(() => import("@/components/dashboard/monthly-report").then(m => ({ default: m.MonthlyReport })));

export default function MonthlyReportPage() {
  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <SectionHeader
            title="Monthly Report"
            description="Comprehensive monthly metrics and trends for presentations"
            icon={CalendarDays}
          />

          <Suspense fallback={
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading monthly data...</p>
              </div>
            </div>
          }>
            <MonthlyReport />
          </Suspense>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
