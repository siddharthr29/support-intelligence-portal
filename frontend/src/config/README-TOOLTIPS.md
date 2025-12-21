# Metric Tooltips System

## Overview

This system provides centralized tooltip explanations for all metrics across the Support Intelligence Platform. Every metric card now has a tooltip icon (ⓘ) that explains:
- What the metric represents
- How it is calculated
- The data source and logic

## Files

### 1. Configuration File
**Location**: `src/config/metric-tooltips.ts`

Contains all tooltip definitions with:
- `title`: Metric name
- `description`: What it represents
- `calculation`: Exact calculation logic
- `dataSource`: Database table and query logic

### 2. Tooltip Component
**Location**: `src/components/ui/metric-tooltip.tsx`

Two variants:
- `MetricTooltip`: Icon-based tooltip (default)
- `InlineMetricTooltip`: Inline text with underline

## Usage

### Basic Usage (Icon Tooltip)

```tsx
import { MetricTooltip } from '@/components/ui/metric-tooltip';

<div className="flex items-center gap-2">
  <h3>Total Tickets</h3>
  <MetricTooltip metricKey="dashboard.total_tickets" />
</div>
```

### Inline Usage (Underlined Text)

```tsx
import { InlineMetricTooltip } from '@/components/ui/metric-tooltip';

<InlineMetricTooltip metricKey="weekly.tickets_created">
  Tickets Created
</InlineMetricTooltip>
```

### In Card Components

```tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricTooltip } from '@/components/ui/metric-tooltip';

<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <CardTitle>Resolved Tickets</CardTitle>
      <MetricTooltip metricKey="dashboard.resolved" />
    </div>
  </CardHeader>
  {/* ... */}
</Card>
```

## Available Metric Keys

### Dashboard (Support Engineer Module)
- `dashboard.total_tickets`
- `dashboard.resolved`
- `dashboard.urgent_high`
- `dashboard.pending`

### Weekly Report
- `weekly.tickets_created`
- `weekly.tickets_resolved`
- `weekly.urgent`
- `weekly.high`
- `weekly.avg_time_per_ticket`
- `weekly.unresolved_se`
- `weekly.unresolved_ps`

### Monthly Report
- `monthly.opening_balance`
- `monthly.closing_balance`
- `monthly.tickets_created`
- `monthly.tickets_resolved`
- `monthly.tickets_closed`
- `monthly.resolution_rate`
- `monthly.avg_resolution_time`
- `monthly.product_support`
- `monthly.support_engineers`

### Yearly Report
- `yearly.total_tickets`
- `yearly.resolution_rate`
- `yearly.open`
- `yearly.pending`
- `yearly.resolved`
- `yearly.closed`

### RFT (Ready for Testing)
- `rft.total_organisations`
- `rft.total_tickets`
- `rft.avg_per_org`

### Leadership Module
- `leadership.total_implementations`
- `leadership.active_partners`
- `leadership.implementations_by_state`
- `leadership.implementations_by_partner`

### Companies
- `companies.total_tickets`
- `companies.resolved`
- `companies.resolution_rate`

### Error Logs
- `errors.total_errors`
- `errors.by_service`

## Adding New Tooltips

1. **Add to config** (`src/config/metric-tooltips.ts`):

```typescript
export const METRIC_TOOLTIPS: Record<string, MetricTooltip> = {
  // ... existing tooltips
  
  'your_module.your_metric': {
    title: 'Your Metric Name',
    description: 'What this metric represents',
    calculation: 'Exact formula: COUNT of X WHERE Y',
    dataSource: 'TableName where condition',
  },
};
```

2. **Use in component**:

```tsx
<MetricTooltip metricKey="your_module.your_metric" />
```

## Tooltip Styling

The tooltip displays:
- **Dark background** (gray-900)
- **White text** for readability
- **Structured sections**:
  - Title (bold)
  - Description
  - Calculation (with label)
  - Data Source (with label)
- **Max width**: 320px
- **Delay**: 200ms

## Helper Functions

```typescript
import { 
  getMetricTooltip,
  getShortTooltip,
  getFullTooltip 
} from '@/config/metric-tooltips';

// Get full tooltip object
const tooltip = getMetricTooltip('dashboard.total_tickets');

// Get description only
const desc = getShortTooltip('dashboard.total_tickets');

// Get formatted full text
const full = getFullTooltip('dashboard.total_tickets');
```

## Examples

### Example 1: Stats Cards (Dashboard)
See: `src/components/dashboard/stats-cards.tsx`

### Example 2: Monthly Report
See: `src/components/dashboard/monthly-report.tsx`

### Example 3: Weekly Report
See: `src/components/dashboard/weekly-report.tsx`

## Best Practices

1. **Always add tooltips** to metric cards
2. **Use consistent naming**: `module.metric_name`
3. **Be specific** in calculations (include exact SQL/logic)
4. **Reference actual tables** in dataSource
5. **Keep descriptions concise** but complete
6. **Test tooltips** on mobile (touch-friendly)

## Maintenance

When adding new metrics:
1. Add tooltip to `metric-tooltips.ts`
2. Use `MetricTooltip` component in UI
3. Update this README with new keys
4. Test on desktop and mobile

## Future Enhancements

- [ ] Add tooltip search/filter
- [ ] Export tooltip documentation
- [ ] Add tooltip analytics
- [ ] Multi-language support
