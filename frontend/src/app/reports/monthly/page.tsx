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

          {/* Auto-generation Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">📅 Automated Monthly Report Generation</p>
                <p className="text-blue-700">
                  Reports are automatically regenerated on the <strong>last day of every month at 9:00 PM IST</strong> with the latest data. 
                  All tickets are refetched to ensure accuracy. Only <strong>Product Support</strong> and <strong>Support Engineer</strong> group tickets are included.
                </p>
              </div>
            </div>
          </div>

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
