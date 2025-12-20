'use client';

import { lazy, Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Calendar, Loader2 } from "lucide-react";

// Lazy load the heavy MonthlyReport component
const MonthlyReport = lazy(() => import("@/components/dashboard/monthly-report").then(m => ({ default: m.MonthlyReport })));

export default function MonthlyReportPage() {
  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-7 w-7 text-purple-500" />
              Monthly Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive monthly metrics for deck presentations
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          }>
            <MonthlyReport />
          </Suspense>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
