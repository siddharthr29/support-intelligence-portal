'use client';

import { useState, useMemo } from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, FileText, Upload, Loader2, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import type { DateRangeMetrics, RftData } from "@/lib/types";
import { format, subWeeks } from "date-fns";
import { 
  getNowIST, 
  getDayOfWeekIST, 
  getHourIST, 
  getMinuteIST,
  getMostRecentFriday5pmIST,
  getNextFriday5pmIST,
  getWeekOptionsIST,
  WEEK_END_DAY,
  WEEK_END_HOUR,
} from "@/lib/datetime";
import { EngineerHoursModal } from "./engineer-hours-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppDataStore } from "@/stores/app-data-store";
import { getCompanyName } from "@/lib/constants";

// Healthchecks company ID - excluded from "Customer showed us most love" as it's system health monitoring
const HEALTHCHECKS_COMPANY_ID = 36000989803;

interface EngineerHour {
  id: string;
  engineerName: string;
  totalHoursWorked: number;
  ticketsResolved: number;
  avgTimePerTicket: number | null;
}

interface WeeklyReportProps {
  rftData: RftData | undefined;
  companyNames: Record<number, string>;
  weekEndDate: Date | undefined;
  snapshotId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Use centralized datetime utilities from @/lib/datetime
// All local implementations have been replaced with the centralized system

export function WeeklyReport({ rftData, companyNames, weekEndDate, snapshotId }: WeeklyReportProps) {
  const [copied, setCopied] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  
  // Use centralized app data store (data already loaded in Shell)
  const { getWeekStats, getCompanyName, isLoaded, getAllTimeUnresolvedByGroup, getMarkedReleaseVersions, fetchAppData, clearData } = useAppDataStore();
  
  // Force fresh data load by clearing cache and reloading
  useEffect(() => {
    console.log('[WeeklyReport] useEffect triggered, isLoaded:', isLoaded);
    // Always force refresh to bypass any caching issues
    console.log('WeeklyReport: Forcing data refresh regardless of loaded state...');
    clearData(); // Clear any cached data
    console.log('WeeklyReport: About to call fetchAppData...');
    fetchAppData(2025, true); // Force fresh data load
    console.log('WeeklyReport: fetchAppData called');
  }, [fetchAppData, clearData]);
  
  const weekOptions = getWeekOptionsIST(2);
  const currentWeekValue = selectedWeek || weekOptions[0]?.value || '';
  const selectedWeekData = weekOptions.find(w => w.value === currentWeekValue);
  const effectiveWeekEndDate = selectedWeekData?.weekEnd || weekEndDate || getNowIST();
  const effectiveWeekStartDate = selectedWeekData?.weekStart || subWeeks(effectiveWeekEndDate, 1);
  const effectiveSnapshotId = `snapshot_${format(effectiveWeekEndDate, 'yyyyMMdd')}`;

  // Compute week stats from store (NO API call - uses cached data)
  const weekStats = useMemo(() => {
    if (!isLoaded) return null;
    return getWeekStats(effectiveWeekStartDate, effectiveWeekEndDate);
  }, [isLoaded, effectiveWeekStartDate, effectiveWeekEndDate, getWeekStats]);
  
  const isWeekStatsLoading = !isLoaded;
  const weekStatsError = null;

  const { data: engineerHours = [], refetch: refetchHours } = useQuery({
    queryKey: ['engineerHours', effectiveSnapshotId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/engineer-hours?snapshotId=${effectiveSnapshotId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as EngineerHour[];
    },
  });

  // Check if report has been pushed
  const { data: pushStatus } = useQuery({
    queryKey: ['pushStatus', effectiveSnapshotId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/weekly-report/push-status?snapshotId=${effectiveSnapshotId}`);
      if (!res.ok) return { isPushed: false, pushedBy: null };
      const json = await res.json();
      return json.data || { isPushed: false, pushedBy: null };
    },
  });

  const generateReport = (): string => {
    if (weekStatsError) return `Error loading data: ${String(weekStatsError)}`;
    if (!weekStats) return isWeekStatsLoading ? 'Loading week data...' : 'No data available. Check console for errors.';

    // Week runs Friday 5pm to Friday 5pm
    const weekStartDate = effectiveWeekStartDate;
    const weekEndDateLocal = effectiveWeekEndDate;
    
    // Format: "Friday, Dec 13, 2024 5:00 PM to Friday, Dec 20, 2024 5:00 PM"
    const weekEnd = format(weekEndDateLocal, 'EEEE, dd-MM-yyyy');
    
    // Format date range: Friday 5pm to Friday 5pm
    const formattedDateRange = `${format(weekStartDate, 'EEEE, MMM d, yyyy')} 5:00 PM to ${format(weekEndDateLocal, 'EEEE, MMM d, yyyy')} 5:00 PM`;
    
    // Find top company from week stats (excluding Healthchecks - system health monitoring)
    const filteredCompanies = weekStats.companyBreakdown?.filter(
      (c: { companyId: number }) => c.companyId !== HEALTHCHECKS_COMPANY_ID
    ) || [];
    const topCompany = filteredCompanies.length > 0 
      ? filteredCompanies.reduce((max, c) => c.ticketCount > max.ticketCount ? c : max, filteredCompanies[0])
      : null;
    const topCompanyName = topCompany 
      ? getCompanyName(topCompany.companyId)
      : '-';

    // Calculate group stats (Support Engineers vs Product Support) from week data
    const seGroup = weekStats.groupBreakdown?.find((g: { groupId: number }) => g.groupId === 36000098156); // Support Engineers
    const psGroup = weekStats.groupBreakdown?.find((g: { groupId: number }) => g.groupId === 36000247508); // Product Support
    
    const seResolved = seGroup?.resolved || 0;
    const psResolved = psGroup?.resolved || 0;
    
    // Get ALL TIME unresolved stats (not week-specific)
    const allTimeUnresolved = getAllTimeUnresolvedByGroup();
    const seAllTime = allTimeUnresolved.find(g => g.groupId === 36000098156);
    const psAllTime = allTimeUnresolved.find(g => g.groupId === 36000247508);
    
    const seUnresolved = seAllTime?.total || 0;
    const seOpen = seAllTime?.open || 0;
    const sePending = seAllTime?.pending || 0;
    
    const psUnresolved = psAllTime?.total || 0;
    const psOpen = psAllTime?.open || 0;
    const psPending = psAllTime?.pending || 0;

    // RFT data
    const totalOpenRfts = rftData?.totals?.totalOpenRfts?.toLocaleString() || 'N/A';
    const rftClosuresThisWeek = rftData?.totals?.closuresThisWeek ?? 0;
    const rftClosuresText = ` (${rftClosuresThisWeek.toLocaleString()} closed this week)`;

    // Engineer hours - ONLY calculate when hours are entered
    const totalHours = engineerHours.reduce((sum, e) => sum + e.totalHoursWorked, 0);
    
    // Time per ticket: Entered Hours / SE Group Resolved (not all resolved)
    let avgTimePerTicket: string;
    if (engineerHours.length === 0) {
      avgTimePerTicket = '[Enter hours first]';
    } else if (seResolved === 0) {
      avgTimePerTicket = 'N/A (no SE tickets resolved)';
    } else {
      avgTimePerTicket = (totalHours / seResolved).toFixed(1);
    }
    
    const capacityLine = engineerHours.length > 0
      ? `Capacity allocated hours: ${totalHours} (${engineerHours.map(e => `${e.engineerName}: ${e.totalHoursWorked}hrs`).join(', ')})`
      : 'Capacity allocated hours: [Click "Enter Support Hours" to add]';

    // Tags analysis from week stats
    const ticketsWithTags = weekStats.ticketsWithTags || 0;
    const ticketsWithoutTags = weekStats.ticketsWithoutTags || 0;
    const tagsStatus = ticketsWithoutTags === 0 
      ? '✅ All tickets have tags' 
      : `⚠️ ${ticketsWithoutTags} tickets missing tags (${ticketsWithTags} have tags)`;

    // Marked release: Count of tickets with version tags in Product Support group
    const psGroupId = 36000247508; // Product Support group
    const markedReleaseVersions = getMarkedReleaseVersions(psGroupId);
    const markedReleaseCount = markedReleaseVersions[0]?.count || 0;

    const report = `Week ending on: ${weekEnd}

Total open RFTs: ${totalOpenRfts}${rftClosuresText}
${capacityLine}
Time taken per ticket (SE group): ${avgTimePerTicket} hrs

Tickets created: ${weekStats.ticketsCreated} (Time Period: ${formattedDateRange})
Urgent: ${weekStats.urgentTickets || 0}
High: ${weekStats.highTickets || 0}
Customer showed us most love: ${topCompanyName}

Tickets resolved: ${weekStats.ticketsResolved}
Support engineers group: ${seResolved}
Product support group: ${psResolved}

Tags Status: ${tagsStatus}

Total Unresolved on support engineers group: ${seUnresolved}
Pending: ${sePending}
Open: ${seOpen}

Total Unresolved on product support group: ${psUnresolved}
Marked release: ${markedReleaseCount}
Open: ${psOpen}
Pending: ${psPending}`;

    return report;
  };

  const handleCopy = async () => {
    const report = generateReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success('Report copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy report');
    }
  };

  const handlePushToGoogleSheet = async () => {
    if (engineerHours.length === 0) {
      toast.error('Please add engineer hours first before pushing to Google Sheet');
      return;
    }

    setIsPushing(true);
    try {
      // Get group stats for Discord notification
      const seGroupId = 36000098156;
      const psGroupId = 36000247508;
      const seGroup = weekStats?.groupBreakdown?.find(g => g.groupId === seGroupId);
      const psGroup = weekStats?.groupBreakdown?.find(g => g.groupId === psGroupId);
      
      const allTimeUnresolved = getAllTimeUnresolvedByGroup();
      const seAllTime = allTimeUnresolved.find(g => g.groupId === seGroupId);
      const psAllTime = allTimeUnresolved.find(g => g.groupId === psGroupId);
      
      const markedReleaseVersions = getMarkedReleaseVersions(psGroupId);
      const markedReleaseCount = markedReleaseVersions[0]?.count || 0;

      // Get top company name (excluding Healthchecks)
      const HEALTHCHECKS_COMPANY_ID = 36000989803;
      const filteredCompanies = weekStats?.companyBreakdown?.filter(c => c.companyId !== HEALTHCHECKS_COMPANY_ID) || [];
      const topCompanyData = filteredCompanies.length > 0 
        ? filteredCompanies.reduce((max, c) => c.ticketCount > max.ticketCount ? c : max, filteredCompanies[0])
        : null;
      const topCompanyName = topCompanyData ? getCompanyName(topCompanyData.companyId) : 'N/A';

      const reportData = {
        snapshotId: effectiveSnapshotId,
        weekEndDate: effectiveWeekEndDate.toISOString(),
        ticketsCreated: weekStats?.ticketsCreated || 0,
        ticketsResolved: weekStats?.ticketsResolved || 0,
        urgent: weekStats?.urgentTickets || 0,
        high: weekStats?.highTickets || 0,
        engineerHours: engineerHours.map(e => ({
          name: e.engineerName,
          hours: e.totalHoursWorked,
        })),
        totalHours: engineerHours.reduce((sum, e) => sum + e.totalHoursWorked, 0),
        // Additional fields for Discord notification
        totalOpenRfts: rftData?.totals?.totalOpenRfts?.toLocaleString() || 'N/A',
        rftClosuresThisWeek: rftData?.totals?.closuresThisWeek || 0,
        topCompany: topCompanyName,
        seResolved: seGroup?.resolved || 0,
        psResolved: psGroup?.resolved || 0,
        seUnresolved: seAllTime?.total || 0,
        seOpen: seAllTime?.open || 0,
        sePending: seAllTime?.pending || 0,
        psUnresolved: psAllTime?.total || 0,
        psOpen: psAllTime?.open || 0,
        psPending: psAllTime?.pending || 0,
        markedReleaseCount,
      };

      const res = await fetch(`${API_BASE_URL}/api/google-sheets/push-weekly-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.discordNotificationSent) {
          toast.success('Report pushed to Google Sheet & Discord notification sent!');
        } else {
          toast.success('Report pushed to Google Sheet successfully!');
        }
        
        // Auto-advance to next week after successful push
        if (json.weeklyReportPushed) {
          // Move to next week (previous week in dropdown)
          const weekOpts = getWeekOptionsIST(2);
          if (weekOpts.length > 1) {
            // Select the second option (previous week)
            setSelectedWeek(weekOpts[1].value);
            toast.info('Week dropdown moved to next week');
          }
        }
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to push to Google Sheet');
      }
    } catch {
      toast.error('Failed to push to Google Sheet');
    } finally {
      setIsPushing(false);
    }
  };

  const hasEngineerHours = engineerHours.length > 0;
  
  // Check if selected week is the "current week" option (first in list with "now" label)
  const isCurrentWeekSelected = selectedWeekData?.label.includes('now') || false;
  
  // Check if this is current week (can push to sheet) - use IST
  // Current week is defined as the week that includes "now" in its label
  const isCurrentWeek = isCurrentWeekSelected;
  
  // Check if scheduler has run (after 4:30 PM IST on Friday)
  const isAfterSchedulerTime = () => {
    const now = getNowIST();
    const dayOfWeek = getDayOfWeekIST(now);
    const hour = getHourIST(now);
    const minute = getMinuteIST(now);
    
    // Only allow pushing after Friday 4:30 PM IST when scheduler has run
    return dayOfWeek === WEEK_END_DAY && (hour > WEEK_END_HOUR - 1 || (hour === WEEK_END_HOUR - 1 && minute >= 30));
  };
  
  const report = generateReport();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Weekly Report (Copy-Paste Format)
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Week Selector */}
            <Select value={currentWeekValue} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[280px] text-xs">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week.value} value={week.value} className="text-xs">
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <EngineerHoursModal snapshotId={effectiveSnapshotId} onHoursUpdated={() => refetchHours()} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Report
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handlePushToGoogleSheet}
              disabled={!hasEngineerHours || isPushing || !isCurrentWeek || pushStatus?.isPushed || !isAfterSchedulerTime()}
              className="gap-2"
              title={
                pushStatus?.isPushed 
                  ? `Already pushed by ${pushStatus.pushedBy}` 
                  : !isCurrentWeek 
                  ? 'Only current week can be pushed' 
                  : !hasEngineerHours 
                  ? 'Add engineer hours first' 
                  : !isAfterSchedulerTime() 
                  ? 'Push to Sheets available after Friday 4:30 PM IST (when data is updated)' 
                  : 'Push report to Google Sheet'
              }
            >
              {isPushing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pushing...
                </>
              ) : pushStatus?.isPushed ? (
                <>
                  <Lock className="h-4 w-4" />
                  Already Pushed
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Push to Sheet
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ready-to-paste format for weekly notes and statistics. Enter support hours to auto-calculate time per ticket.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calculation Explanations */}
        <div className="flex flex-wrap gap-2 text-xs">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded cursor-help">
                  <Info className="h-3 w-3" />
                  Time Period
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                <p><strong>Friday 5pm to Friday 5pm</strong></p>
                <p>Weekly cycle runs from Friday 5:00 PM to next Friday 5:00 PM. Working hours are Mon-Fri (40hrs).</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded cursor-help">
                  <Info className="h-3 w-3" />
                  Capacity Hours
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                <p><strong>Working hours: Mon-Fri (40hrs/week)</strong></p>
                <p>Actual hours spent on support. Engineers multitask and take leaves, so enter actual hours worked.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded cursor-help">
                  <Info className="h-3 w-3" />
                  Time per Ticket
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                <p><strong>Formula: Entered Hours ÷ SE Resolved</strong></p>
                <p>Only calculated when hours are entered. Uses Support Engineers group resolved count only.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded cursor-help">
                  <Info className="h-3 w-3" />
                  Marked Release
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                <p><strong>Auto-detected from tags</strong></p>
                <p>Matches version patterns like 15.2 or 16.2.0 from ticket tags.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Stats Content - Always visible, Push to Sheets locked until engineer hours filled */}
        <div className="relative">
          <Textarea
            value={report}
            readOnly
            className="font-mono text-xs h-[400px] resize-none bg-muted/50"
          />
          {isCurrentWeekSelected && (
            <>
              {pushStatus?.isPushed ? (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-800 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span><strong>Report pushed to Google Sheets</strong> by {pushStatus.pushedBy} on {new Date(pushStatus.pushedAt).toLocaleString()}.</span>
                  </p>
                </div>
              ) : !hasEngineerHours ? (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-800 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span><strong>Push to Sheets is locked.</strong> Please add engineer hours to unlock.</span>
                  </p>
                </div>
              ) : !isAfterSchedulerTime() ? (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span><strong>Push to Sheets available after Friday 4:30 PM IST</strong> (when weekly data is updated).</span>
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
