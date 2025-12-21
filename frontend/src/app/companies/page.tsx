'use client';

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { SectionHeader } from "@/components/ui/section-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { TopCompaniesCard } from "@/components/dashboard/top-companies-card";
import { fetchLiveStats } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, TrendingUp, CheckCircle2 } from "lucide-react";

export default function CompaniesPage() {
  // Only fetch data when this page is visited
  const { data: liveStatsResponse, isLoading } = useQuery({
    queryKey: ['liveStats'],
    queryFn: fetchLiveStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  const liveStats = liveStatsResponse?.data;

  const companyBreakdown = useMemo(() => {
    if (!liveStats?.companyBreakdown) return [];
    return liveStats.companyBreakdown.map((c: { companyId: number; ytdCount: number; weekCount: number }) => ({
      companyId: c.companyId,
      ticketCount: c.ytdCount,
      weekCount: c.weekCount,
    }));
  }, [liveStats?.companyBreakdown]);

  return (
    <ProtectedRoute>
      <Shell>
        <div className="space-y-6">
          {/* Header */}
          <SectionHeader
            title="Companies"
            description="Top companies by ticket volume and renewal insights"
            icon={Building2}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl border">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading companies...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <TopCompaniesCard 
                data={companyBreakdown} 
                isLoading={isLoading} 
              />
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 rounded-xl">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-900">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                      Renewal Insights
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Companies with high ticket volumes may need:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        Additional training or onboarding support
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        Review of implementation quality
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        Proactive check-ins before renewal
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        Consider premium support tier upsell
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 rounded-xl">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Low Ticket Companies
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Companies with few tickets are likely satisfied customers. 
                      Consider them for case studies, testimonials, or referral programs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
