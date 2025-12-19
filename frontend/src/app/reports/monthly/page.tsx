'use client';

import { Shell } from "@/components/layout/shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MonthlyReport } from "@/components/dashboard/monthly-report";
import { Calendar } from "lucide-react";

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

          <MonthlyReport />
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
