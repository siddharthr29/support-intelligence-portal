# Comprehensive Implementation Plan

## Issues to Fix

### 1. Skeleton Loading Not Showing in Support Engineer Portal ❌
**Problem:** Support engineer dashboard shows spinner instead of skeleton cards
**Solution:** Replace ChartSkeleton spinner with proper Skeleton components matching MetricCard layout

### 2. Date Filters Missing in Leadership Pages ❌
**Problem:** No date range filters on Partners, Metrics, Trends, Summary pages
**Solution:** Add DateRangePicker component to all leadership pages with state management

### 3. Trends Charts Are Blank ❌
**Problem:** Charts not rendering data
**Solution:** Debug API responses, check data format, verify Recharts compatibility

### 4. Partners Page Shows No Entries ❌
**Problem:** No partner data displayed
**Solution:** Check database has data, verify API query, check frontend rendering

### 5. Embed Metabase Dashboard ⚠️
**Problem:** Need to embed https://reporting.avniproject.org/question/816-all-avni-implementations
**Solution:** Create iframe embed with proper authentication handling

### 6. Last 30 Tickets History Table ❌
**Problem:** Need CSV-like table showing last 30 tickets, auto-updates after Friday sync
**Solution:** 
- Create backend API endpoint for last 30 tickets
- Create frontend table component with sorting/filtering
- Add CSV download functionality
- Implement in both leadership and support portals

---

## Implementation Order

### Phase 1: Critical Fixes (Immediate)
1. Fix skeleton loading in support engineer portal
2. Fix blank charts in trends page
3. Fix partners page showing no entries

### Phase 2: Feature Additions
4. Add date filters to all leadership pages
5. Create last 30 tickets history table
6. Add CSV download functionality

### Phase 3: Integration
7. Embed Metabase dashboard (if feasible)

---

## Detailed Implementation

### 1. Fix Skeleton Loading in Support Portal

**File:** `/frontend/src/app/page.tsx`

**Current:**
```tsx
const ChartSkeleton = () => (
  <div className="h-[300px] bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);
```

**Replace with:**
```tsx
const ChartSkeleton = () => (
  <div className="h-[300px] bg-white rounded-lg border p-6">
    <Skeleton className="h-6 w-48 mb-4" />
    <Skeleton className="h-[200px] w-full" />
  </div>
);

const MetricCardSkeleton = () => (
  <div className="bg-white rounded-lg border p-6">
    <Skeleton className="h-4 w-24 mb-2" />
    <Skeleton className="h-8 w-16 mb-2" />
    <Skeleton className="h-3 w-32" />
  </div>
);
```

**Add loading state for metric cards:**
```tsx
{isStatsLoading ? (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
    {[1, 2, 3, 4].map((i) => <MetricCardSkeleton key={i} />)}
  </div>
) : (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
    {/* Existing metric cards */}
  </div>
)}
```

---

### 2. Add Date Filters to Leadership Pages

**Create shared component:** `/frontend/src/components/leadership/date-filter.tsx`

```tsx
'use client';

import { useState } from 'react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { Button } from '@/components/ui/button';

export function LeadershipDateFilter({ onDateChange }: { onDateChange: (range: { from: Date; to: Date }) => void }) {
  const [preset, setPreset] = useState<'30d' | '90d' | '12m' | 'custom'>('12m');
  
  const handlePreset = (p: '30d' | '90d' | '12m') => {
    setPreset(p);
    const to = new Date();
    const from = new Date();
    
    if (p === '30d') from.setDate(from.getDate() - 30);
    else if (p === '90d') from.setDate(from.getDate() - 90);
    else from.setFullYear(from.getFullYear() - 1);
    
    onDateChange({ from, to });
  };
  
  return (
    <div className="flex gap-2">
      <Button variant={preset === '30d' ? 'default' : 'outline'} size="sm" onClick={() => handlePreset('30d')}>
        Last 30 Days
      </Button>
      <Button variant={preset === '90d' ? 'default' : 'outline'} size="sm" onClick={() => handlePreset('90d')}>
        Last 90 Days
      </Button>
      <Button variant={preset === '12m' ? 'default' : 'outline'} size="sm" onClick={() => handlePreset('12m')}>
        Last 12 Months
      </Button>
      <DateRangePicker onSelect={(range) => {
        setPreset('custom');
        if (range) onDateChange(range);
      }} />
    </div>
  );
}
```

**Add to each leadership page:**
- Partners page
- Metrics page
- Trends page
- Summary page

---

### 3. Fix Blank Charts in Trends Page

**Debug steps:**
1. Check API responses in browser console
2. Verify data format matches Recharts requirements
3. Add console.log to see actual data
4. Check for TypeScript errors
5. Verify chart dimensions

**Potential fixes:**
- Ensure data is not empty array
- Check date formatting for timeline
- Verify numeric values are numbers, not strings
- Add fallback for empty data

---

### 4. Fix Partners Page No Entries

**Debug steps:**
1. Check if database has partner data
2. Verify API endpoint returns data
3. Check frontend filtering logic
4. Verify company_cache table has entries

**SQL to verify:**
```sql
SELECT COUNT(*) FROM company_cache;
SELECT COUNT(*) FROM ytd_tickets WHERE created_at >= NOW() - INTERVAL '12 months';
```

---

### 5. Last 30 Tickets History Table

**Backend API:** `/backend/src/routes/leadership/tickets.ts`

```typescript
// Get last 30 tickets
fastify.get('/api/leadership/tickets/recent', {
  preHandler: [authMiddleware, requireLeadership],
}, async (request, reply) => {
  const prisma = getPrismaClient();
  
  const tickets = await prisma.ytdTicket.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      company: true,
    },
  });
  
  return reply.send({
    success: true,
    data: { tickets },
  });
});
```

**Frontend Component:** `/frontend/src/components/tickets/recent-tickets-table.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api-client';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RecentTicketsTable() {
  const [tickets, setTickets] = useState([]);
  
  const downloadCSV = () => {
    // Convert to CSV and download
  };
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Last 30 Tickets</h2>
        <Button onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
      <table className="w-full">
        {/* Table implementation */}
      </table>
    </div>
  );
}
```

**CSV Download Function:**
```typescript
function downloadCSV(data: any[]) {
  const headers = ['Ticket ID', 'Subject', 'Status', 'Priority', 'Company', 'Created', 'Tags'];
  const rows = data.map(t => [
    t.freshdeskTicketId,
    t.subject,
    t.status,
    t.priority,
    t.company?.name || '',
    new Date(t.createdAt).toLocaleString(),
    t.tags.join(', '),
  ]);
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tickets_${new Date().toISOString()}.csv`;
  a.click();
}
```

---

### 6. Metabase Dashboard Embed

**Component:** `/frontend/src/components/leadership/metabase-embed.tsx`

```tsx
'use client';

export function MetabaseEmbed() {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">All Avni Implementations</h2>
      <iframe
        src="https://reporting.avniproject.org/public/question/816-all-avni-implementations"
        width="100%"
        height="600"
        frameBorder="0"
        allowTransparency
      />
    </div>
  );
}
```

**Note:** May require Metabase public link or authentication token

---

## Testing Checklist

- [ ] Skeleton loading shows proper cards in support portal
- [ ] Date filters work on all leadership pages
- [ ] Trends charts display data correctly
- [ ] Partners page shows partner entries
- [ ] Last 30 tickets table displays data
- [ ] CSV download works correctly
- [ ] Table updates after Friday sync
- [ ] Metabase embed loads (if implemented)

---

## Timeline

- **Phase 1:** 30 minutes (critical fixes)
- **Phase 2:** 45 minutes (features)
- **Phase 3:** 15 minutes (integration)

**Total:** ~90 minutes
