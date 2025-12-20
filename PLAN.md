# Leadership Support Intelligence System - Implementation Plan

**Status**: AWAITING USER VERIFICATION  
**Created**: Dec 20, 2025  
**Objective**: Build separate leadership intelligence system using existing Support Intelligence Portal database

---

## Phase 0: Codebase Audit Results ✅

### Existing System Boundaries (DO NOT TOUCH)

**Authentication**:
- Firebase Auth with email/password
- Backend: `authMiddleware` verifies ID tokens
- No role-based access control (all authenticated users have same access)
- Location: `/backend/src/middleware/auth.ts`

**Support Engineer Surfaces (UNTOUCHABLE)**:
- Dashboard: `/frontend/src/app/page.tsx`
- Companies View: `/frontend/src/app/companies/`
- RFT Metrics: `/frontend/src/app/rft/`
- Reports: `/frontend/src/app/reports/`
- Settings: `/frontend/src/app/settings/`
- Error Logs: `/frontend/src/app/error-logs/`

**Freshdesk Ingestion (CONFIRMED)**:
- **Schedule**: Friday 4:30 PM IST (cron: `30 16 * * 5`)
- **Type**: Incremental sync (only tickets updated since last sync)
- **Location**: `/backend/src/jobs/weekly-ingestion.ts`
- **Storage**: `ytd_tickets` table (year-based partitioning already exists)
- **Last Sync Tracking**: `system_config` table with key `ytd_last_sync_timestamp`

**Database Schema (Supabase)**:
```
Core Tables:
- ytd_tickets (2,311 rows, 1.70 MB) - Main ticket data with year field
- company_cache (56 rows) - Company lookup
- group_cache (0 rows) - Group lookup
- weekly_snapshots - Weekly aggregated data
- ticket_snapshots (40 rows) - Historical snapshots
- error_logs (6,236 rows, 1.82 MB) - System errors
- audit_logs (0 rows) - Audit trail
- activity_logs (10 rows) - Activity tracking

Total DB Size: 4.35 MB (0.87% of 500 MB free tier)
```

**Safe Extension Zones**:
- New routes under `/api/leadership/*`
- New frontend pages under `/app/leadership/*`
- New database views (read-only)
- New RLS policies
- Firebase custom claims for roles

---

## Phase 1: Separate Login & Access Model

### Objective
Create leadership intelligence surface without duplicating data or touching existing support engineer UI.

### Implementation

**1.1 Firebase Custom Claims (Role-Based Access)**
```typescript
// Add to Firebase users via Admin SDK
roles: {
  support_engineer: true,  // Existing users
  product_manager: false,
  leadership: false,
  founder: false
}
```

**1.2 Backend Role Middleware**
```typescript
// /backend/src/middleware/role-check.ts (NEW FILE)
export async function requireLeadership(request, reply) {
  if (!request.user?.customClaims?.leadership && 
      !request.user?.customClaims?.founder) {
    return reply.status(403).send({ error: 'Leadership access required' });
  }
}
```

**1.3 Supabase RLS Policies**
```sql
-- Enable RLS on ytd_tickets (read-only for all authenticated users)
ALTER TABLE ytd_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_ytd_tickets" 
ON ytd_tickets FOR SELECT 
TO authenticated 
USING (true);
```

**1.4 Frontend Route Isolation**
```
/app/leadership/          (NEW - Leadership dashboard)
/app/leadership/partners/ (NEW - Partner risk view)
/app/leadership/summary/  (NEW - Weekly founder summary)

Existing routes remain unchanged
```

**Deliverables**:
- [ ] Firebase custom claims schema
- [ ] Role-check middleware
- [ ] RLS policies for all tables
- [ ] Leadership route structure
- [ ] Role-based navigation guard

---

## Phase 2: Data Retention & Storage Strategy

### Objective
Implement rolling 3-year retention with automatic pruning and compressed historical data.

### Current State
- **ytd_tickets**: Has `year` field (already partitioned by year)
- **Current data**: 2025 only (2,311 tickets, 1.70 MB)
- **Retention**: No automatic cleanup (manual trigger exists)

### Implementation

**2.1 Retention Policy**
```
Full Resolution (Last 12 months):
- All ticket fields
- Individual ticket queries allowed
- Used for: Operational dashboards, detailed analysis

Compressed Resolution (Months 13-36):
- Aggregated to weekly/monthly summaries
- No individual ticket access
- Used for: Trend analysis, year-over-year comparisons

Hard Delete (>36 months):
- Complete removal from database
- Audit log entry created
```

**2.2 Compressed Data Tables**
```sql
-- NEW TABLE: Monthly aggregated data for historical analysis
CREATE TABLE monthly_ticket_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INT NOT NULL,
  month INT NOT NULL,
  partner_id BIGINT,
  partner_name TEXT,
  
  total_tickets INT,
  open_tickets INT,
  resolved_tickets INT,
  avg_resolution_hours FLOAT,
  
  priority_urgent INT,
  priority_high INT,
  priority_medium INT,
  priority_low INT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(year, month, partner_id)
);

CREATE INDEX idx_monthly_agg_year_month ON monthly_ticket_aggregates(year, month);
CREATE INDEX idx_monthly_agg_partner ON monthly_ticket_aggregates(partner_id);
```

**2.3 Scheduled Pruning Job**
```sql
-- Supabase pg_cron extension
SELECT cron.schedule(
  'monthly-data-retention',
  '0 2 1 * *', -- 2 AM on 1st of every month
  $$
  BEGIN
    -- Step 1: Compress data older than 12 months into monthly aggregates
    INSERT INTO monthly_ticket_aggregates (...)
    SELECT ... FROM ytd_tickets 
    WHERE created_at < NOW() - INTERVAL '12 months'
    AND created_at >= NOW() - INTERVAL '36 months'
    ON CONFLICT DO NOTHING;
    
    -- Step 2: Delete individual tickets older than 12 months
    DELETE FROM ytd_tickets 
    WHERE created_at < NOW() - INTERVAL '12 months';
    
    -- Step 3: Delete aggregates older than 36 months
    DELETE FROM monthly_ticket_aggregates
    WHERE (year * 12 + month) < EXTRACT(YEAR FROM NOW() - INTERVAL '36 months') * 12 
                                + EXTRACT(MONTH FROM NOW() - INTERVAL '36 months');
  END;
  $$
);
```

**2.4 Storage Estimates**
```
Current (1 year): 1.70 MB
With 3-year retention:
- Last 12 months (full): 1.70 MB
- Months 13-36 (compressed): ~0.5 MB (70% compression)
Total: 2.20 MB (0.44% of free tier)
```

**Deliverables**:
- [ ] `monthly_ticket_aggregates` table
- [ ] Compression SQL function
- [ ] pg_cron scheduled job
- [ ] Retention audit logging
- [ ] Dry-run mode for testing

---

## Phase 3: Query Loading & Performance Rules

### Objective
Prevent slow dashboards with smart default scopes and explicit historical data loading.

### Implementation

**3.1 Default Views (Last 12 Months)**
```sql
-- Leadership dashboard default view
CREATE VIEW leadership_recent_tickets AS
SELECT * FROM ytd_tickets
WHERE created_at >= NOW() - INTERVAL '12 months';

-- Partner risk metrics (recent only)
CREATE VIEW partner_risk_recent AS
SELECT 
  company_id,
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status IN (2, 3)) as unresolved_tickets,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_resolution_hours
FROM ytd_tickets
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY company_id;
```

**3.2 Extended Views (3-Year Range)**
```sql
-- Historical trend analysis (uses compressed data)
CREATE VIEW leadership_historical_trends AS
SELECT 
  year, month, partner_id, partner_name,
  total_tickets, resolved_tickets, avg_resolution_hours
FROM monthly_ticket_aggregates
WHERE (year * 12 + month) >= EXTRACT(YEAR FROM NOW() - INTERVAL '36 months') * 12 
                            + EXTRACT(MONTH FROM NOW() - INTERVAL '36 months')
ORDER BY year DESC, month DESC;
```

**3.3 Query Guardrails**
```typescript
// Backend API: Default to 12 months, require explicit flag for full range
app.get('/api/leadership/tickets', async (req, reply) => {
  const range = req.query.range || '12m'; // Default: 12 months
  
  if (range === '3y' && !req.user?.customClaims?.founder) {
    return reply.status(403).send({ 
      error: '3-year range requires founder access' 
    });
  }
  
  // Use appropriate view based on range
  const view = range === '3y' ? 'leadership_historical_trends' : 'leadership_recent_tickets';
  // ...
});
```

**Deliverables**:
- [ ] Default 12-month views
- [ ] Extended 3-year views
- [ ] Query guardrails in API
- [ ] Frontend range selector
- [ ] Performance benchmarks

---

## Phase 4: Partner & Program Intelligence

### Objective
Expose NGO/partner-level operational risk using company_id as partner identifier.

### Implementation

**4.1 Partner Risk Metrics**
```sql
CREATE VIEW partner_risk_metrics AS
SELECT 
  c.freshdesk_company_id as partner_id,
  c.name as partner_name,
  
  -- Volume metrics
  COUNT(t.id) as total_tickets_12m,
  COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days') as tickets_last_30d,
  
  -- Resolution metrics
  AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_resolution_hours,
  COUNT(*) FILTER (WHERE t.status IN (2, 3)) as unresolved_count,
  
  -- Risk signals
  COUNT(*) FILTER (WHERE t.priority = 4) as urgent_tickets,
  COUNT(*) FILTER (WHERE t.tags @> ARRAY['data-loss']) as data_loss_tickets,
  COUNT(*) FILTER (WHERE t.tags @> ARRAY['sync-failure']) as sync_failure_tickets,
  
  -- Adoption signals
  COUNT(*) FILTER (WHERE t.tags @> ARRAY['how-to']) as how_to_tickets,
  COUNT(*) FILTER (WHERE t.tags @> ARRAY['training']) as training_tickets,
  
  -- Trend (compare to previous period)
  (COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days')::FLOAT /
   NULLIF(COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '60 days' 
                                AND t.created_at < NOW() - INTERVAL '30 days'), 0)) as trend_ratio

FROM company_cache c
LEFT JOIN ytd_tickets t ON t.company_id = c.freshdesk_company_id
WHERE t.created_at >= NOW() - INTERVAL '12 months'
GROUP BY c.freshdesk_company_id, c.name
HAVING COUNT(t.id) > 0
ORDER BY unresolved_count DESC, urgent_tickets DESC;
```

**4.2 Program Health Indicators**
```typescript
// Derive program/deployment from tags or company name patterns
interface ProgramHealth {
  program_name: string;
  partner_count: number;
  total_tickets: number;
  critical_issues: number;
  adoption_risk_score: number; // 0-100
  platform_reliability_score: number; // 0-100
}
```

**Deliverables**:
- [ ] Partner risk metrics view
- [ ] Program health aggregation
- [ ] Risk scoring algorithm
- [ ] Partner dashboard UI
- [ ] Drill-down to ticket details

---

## Phase 5: Social Sector Support Metrics

### Objective
Define metrics that matter for NGO/social-sector deployments.

### Metrics

**Program Risk**:
- Long-unresolved operational blockers (>7 days, priority urgent/high)
- Repeated data loss tickets (same partner, >2 in 30 days)
- Compliance/reporting escalations (tags: compliance, reporting)

**Adoption & Training**:
- High how-to ticket volume (>5 per partner per month)
- Repeated onboarding questions (same partner, similar subjects)
- Silent drop-offs (no ticket replies >48 hours)

**Platform Reliability**:
- Incident-like spikes (>3x average daily tickets)
- Critical SLA breaches (urgent tickets >24h unresolved)

**Support Capacity**:
- Backlog growth rate (unresolved tickets trend)
- Resolution time trends (week-over-week)
- Reopen frequency (tickets reopened >1 time)

**Implementation**:
```sql
CREATE VIEW leadership_metrics AS
SELECT 
  -- Program Risk
  COUNT(*) FILTER (WHERE status IN (2,3) AND priority >= 3 
                   AND updated_at < NOW() - INTERVAL '7 days') as long_unresolved_blockers,
  
  -- Adoption Risk
  COUNT(*) FILTER (WHERE tags @> ARRAY['how-to']) as how_to_volume,
  
  -- Platform Reliability
  COUNT(*) FILTER (WHERE priority = 4 AND updated_at < NOW() - INTERVAL '24 hours') as sla_breaches,
  
  -- Support Capacity
  COUNT(*) FILTER (WHERE status IN (2,3)) as current_backlog
  
FROM ytd_tickets
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Deliverables**:
- [ ] Metrics SQL views
- [ ] Metric definitions document
- [ ] Dashboard widgets
- [ ] Alert thresholds
- [ ] Action playbooks

---

## Phase 6: Action Playbooks

### Objective
Convert intelligence into concrete interventions.

### Playbook Structure
```typescript
interface ActionPlaybook {
  signal: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: string;
  recommended_intervention: string;
  owner: 'Support' | 'Product' | 'Leadership';
  sla: string; // Response time
}
```

### Example Playbooks

**High Severity**:
```
Signal: Partner has >3 data-loss tickets in 30 days
Severity: Critical
Intervention: 
  1. Support: Immediate partner outreach call
  2. Product: Root cause analysis within 24h
  3. Leadership: Escalation to founder if not resolved in 48h
Owner: Support → Product → Leadership
SLA: 24h response, 48h resolution
```

**Medium Severity**:
```
Signal: Partner has >10 how-to tickets in 30 days
Severity: Medium
Intervention:
  1. Support: Schedule training session
  2. Product: Review onboarding documentation
  3. Leadership: Consider dedicated success manager
Owner: Support
SLA: 7 days
```

**Deliverables**:
- [ ] Playbook database table
- [ ] Automated signal detection
- [ ] Intervention tracking
- [ ] Escalation workflow
- [ ] Playbook UI

---

## Phase 7: Weekly Founder Intelligence Summary

### Objective
Low-noise, high-signal weekly summary for founders.

### Implementation

**7.1 Summary Generation**
```sql
CREATE FUNCTION generate_weekly_founder_summary()
RETURNS JSON AS $$
DECLARE
  summary JSON;
BEGIN
  SELECT json_build_object(
    'week_ending', CURRENT_DATE,
    'data_coverage', '2025-01-01 to ' || CURRENT_DATE,
    
    'top_risks', (
      SELECT json_agg(json_build_object(
        'partner', partner_name,
        'risk_type', CASE 
          WHEN data_loss_tickets > 2 THEN 'Data Loss'
          WHEN urgent_tickets > 5 THEN 'Critical Volume'
          ELSE 'Unresolved Backlog'
        END,
        'severity', 'high'
      ))
      FROM partner_risk_metrics
      WHERE data_loss_tickets > 2 OR urgent_tickets > 5
      LIMIT 5
    ),
    
    'partners_to_watch', (
      SELECT json_agg(partner_name)
      FROM partner_risk_metrics
      WHERE trend_ratio > 1.5 -- 50% increase
      LIMIT 3
    ),
    
    'recommended_actions', ARRAY[
      'Schedule call with Partner X re: data loss pattern',
      'Review onboarding docs - 3 partners struggling',
      'Consider capacity planning - backlog +20%'
    ]
  ) INTO summary;
  
  RETURN summary;
END;
$$ LANGUAGE plpgsql;
```

**7.2 Weekly Email/Slack Notification**
```typescript
// Scheduled job: Friday 5:30 PM IST
cron.schedule('30 17 * * 5', async () => {
  const summary = await db.query('SELECT generate_weekly_founder_summary()');
  await sendSlackMessage(summary);
});
```

**Deliverables**:
- [ ] Summary generation function
- [ ] Email/Slack integration
- [ ] Summary UI page
- [ ] Historical summaries archive
- [ ] Customizable thresholds

---

## Phase 8: Feature Flags & Safe Rollout

### Objective
Zero blast radius to existing systems.

### Implementation

**8.1 Feature Flag Schema**
```sql
CREATE TABLE feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  roles TEXT[], -- ['founder', 'leadership']
  environments TEXT[], -- ['production', 'staging']
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO feature_flags VALUES
('leadership_dashboard', FALSE, ARRAY['founder', 'leadership'], ARRAY['production']),
('partner_risk_view', FALSE, ARRAY['founder', 'leadership'], ARRAY['production']),
('weekly_summary', FALSE, ARRAY['founder'], ARRAY['production']);
```

**8.2 Backend Flag Check**
```typescript
export async function checkFeatureFlag(
  flagName: string, 
  user: DecodedIdToken
): Promise<boolean> {
  const flag = await db.featureFlags.findUnique({ where: { flag_name: flagName } });
  
  if (!flag || !flag.enabled) return false;
  
  const userRole = user.customClaims?.role;
  return flag.roles.includes(userRole);
}
```

**8.3 Rollout Sequence**
```
1. Enable in staging for founder only
2. Test all features end-to-end
3. Enable in production for founder only
4. Verify no impact on support engineer dashboards
5. Enable for leadership role
6. Monitor for 1 week
7. Full rollout
```

**Deliverables**:
- [ ] Feature flags table
- [ ] Flag check middleware
- [ ] Admin UI for flag management
- [ ] Rollout checklist
- [ ] Rollback procedure

---

## Phase 9: Data Availability & Immutability Guards

### Objective
Handle partial historical data correctly and protect existing implementations.

### Implementation

**9.1 Data Availability Strategy**
```typescript
// Always query for actual data range, never assume
const getAvailableDataRange = async () => {
  const result = await db.query(`
    SELECT 
      MIN(created_at) as earliest_date,
      MAX(created_at) as latest_date,
      COUNT(DISTINCT year) as year_count
    FROM ytd_tickets
  `);
  
  return {
    earliest: result.earliest_date,
    latest: result.latest_date,
    years: result.year_count,
    coverage: `${result.earliest_date} to ${result.latest_date}`
  };
};
```

**9.2 Dynamic Time Range Logic**
```typescript
// Frontend: Adjust chart scales to actual data
const chartConfig = {
  xAxis: {
    min: actualDataRange.earliest,
    max: actualDataRange.latest,
    // Never show empty periods as zero
  }
};
```

**9.3 Immutability Checklist**
```
MUST NOT MODIFY:
✓ /frontend/src/app/page.tsx (Support dashboard)
✓ /frontend/src/app/companies/* (Companies view)
✓ /frontend/src/app/rft/* (RFT metrics)
✓ /frontend/src/app/reports/* (Reports)
✓ /frontend/src/app/settings/* (Settings)
✓ /backend/src/routes/* (Existing API routes)
✓ /backend/src/jobs/weekly-ingestion.ts (Freshdesk sync)
✓ Database tables (only ADD new tables/views, never ALTER existing)

SAFE TO ADD:
✓ /frontend/src/app/leadership/* (New routes)
✓ /backend/src/routes/leadership/* (New API routes)
✓ /backend/src/middleware/role-check.ts (New middleware)
✓ Database views (read-only)
✓ Database tables (new only)
```

**Deliverables**:
- [ ] Data range detection
- [ ] Dynamic chart scaling
- [ ] Missing data handling
- [ ] Immutability tests
- [ ] Pre-deployment checklist

---

## Implementation Checklist

### Pre-Implementation
- [ ] User verification of this plan
- [ ] Backup current database
- [ ] Create staging environment
- [ ] Set up feature flags (all OFF)

### Phase 1: Authentication & Access (Week 1)
- [ ] Add Firebase custom claims
- [ ] Create role-check middleware
- [ ] Implement RLS policies
- [ ] Create leadership route structure
- [ ] Test role isolation

### Phase 2: Data Retention (Week 2)
- [ ] Create monthly aggregates table
- [ ] Write compression function
- [ ] Set up pg_cron job
- [ ] Test dry-run mode
- [ ] Verify storage estimates

### Phase 3: Query Performance (Week 2)
- [ ] Create default 12m views
- [ ] Create extended 3y views
- [ ] Add query guardrails
- [ ] Benchmark performance
- [ ] Test with large datasets

### Phase 4: Partner Intelligence (Week 3)
- [ ] Create partner risk view
- [ ] Implement risk scoring
- [ ] Build partner dashboard UI
- [ ] Add drill-down capability
- [ ] Test with real data

### Phase 5: Metrics (Week 3)
- [ ] Define all metrics
- [ ] Create metrics views
- [ ] Build dashboard widgets
- [ ] Set alert thresholds
- [ ] Document metric definitions

### Phase 6: Action Playbooks (Week 4)
- [ ] Create playbook table
- [ ] Implement signal detection
- [ ] Build intervention tracking
- [ ] Create escalation workflow
- [ ] Test playbook execution

### Phase 7: Weekly Summary (Week 4)
- [ ] Write summary function
- [ ] Set up Slack integration
- [ ] Create summary UI
- [ ] Archive historical summaries
- [ ] Test notification delivery

### Phase 8: Feature Flags (Week 5)
- [ ] Create flags table
- [ ] Implement flag checks
- [ ] Build admin UI
- [ ] Execute rollout sequence
- [ ] Verify zero impact

### Phase 9: Final Validation (Week 5)
- [ ] Test data availability handling
- [ ] Verify immutability (no existing code touched)
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation

### Post-Implementation
- [ ] Monitor for 1 week
- [ ] Gather founder feedback
- [ ] Iterate on metrics
- [ ] Full production rollout

---

## Success Criteria

**Zero Disruption**:
- [ ] All existing support engineer dashboards work unchanged
- [ ] No performance degradation on existing queries
- [ ] No changes to Freshdesk ingestion job
- [ ] No breaking changes to database schema

**Separation of Concerns**:
- [ ] Leadership users cannot access support engineer tools by default
- [ ] Support engineers cannot access leadership intelligence by default
- [ ] Data remains shared (single source of truth)
- [ ] UI surfaces are completely separate

**Partner-Aware Intelligence**:
- [ ] Partner risk metrics accurately reflect operational health
- [ ] Program-level aggregations work correctly
- [ ] Action playbooks trigger appropriately
- [ ] Weekly summaries are actionable

**Free Forever Sustainability**:
- [ ] 3-year retention stays under 5 MB (1% of free tier)
- [ ] Query performance <500ms p95
- [ ] No paid SaaS dependencies
- [ ] Automated pruning works reliably

**Founder-Grade Usefulness**:
- [ ] Weekly summary takes <2 minutes to review
- [ ] Top 3 risks are immediately clear
- [ ] Recommended actions are specific and actionable
- [ ] Historical trends show program health trajectory

---

## Risk Mitigation

**Risk**: Accidentally modify existing support engineer code  
**Mitigation**: 
- Pre-deployment diff check
- Automated tests for existing routes
- Feature flags OFF by default
- Separate Git branch until verified

**Risk**: Database performance degradation  
**Mitigation**:
- Read-only views only
- Indexed queries
- Query guardrails
- Performance benchmarks before/after

**Risk**: Data retention job deletes wrong data  
**Mitigation**:
- Dry-run mode mandatory
- Audit logging
- Manual approval for first 3 runs
- Database backup before execution

**Risk**: Free tier limits exceeded  
**Mitigation**:
- Storage monitoring
- Compression validation
- Query cost analysis
- Automatic alerts at 50% usage

---

## Timeline

**Total Duration**: 5 weeks  
**Effort**: ~80 hours (16 hours/week)

**Week 1**: Authentication & Access  
**Week 2**: Data Retention & Performance  
**Week 3**: Partner Intelligence & Metrics  
**Week 4**: Playbooks & Weekly Summary  
**Week 5**: Feature Flags & Validation

---

## Next Steps

**AWAITING USER VERIFICATION**

Please review this plan and confirm:
1. ✅ Approach aligns with AVNI mission
2. ✅ Zero-touch guarantee for existing systems
3. ✅ 3-year retention policy is correct
4. ✅ Partner-level intelligence meets needs
5. ✅ Timeline and effort are acceptable

Once verified, I will begin Phase 1 implementation.
