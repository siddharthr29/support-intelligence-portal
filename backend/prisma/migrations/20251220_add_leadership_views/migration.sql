-- Leadership Intelligence Views
-- Default views (last 12 months) for fast queries
-- Extended views (3 years) for historical analysis

-- View 1: Recent tickets (last 12 months) - Default for all leadership queries
CREATE OR REPLACE VIEW leadership_recent_tickets AS
SELECT 
    id,
    freshdesk_ticket_id,
    subject,
    status,
    priority,
    group_id,
    company_id,
    created_at,
    updated_at,
    tags,
    year
FROM ytd_tickets
WHERE created_at >= NOW() - INTERVAL '12 months';

-- View 2: Partner risk metrics (recent 12 months)
CREATE OR REPLACE VIEW partner_risk_recent AS
SELECT 
    c.freshdesk_company_id as partner_id,
    c.name as partner_name,
    
    -- Volume metrics
    COUNT(t.id) as total_tickets_12m,
    COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days') as tickets_last_30d,
    COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '60 days' AND t.created_at < NOW() - INTERVAL '30 days') as tickets_prev_30d,
    
    -- Resolution metrics
    AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_resolution_hours,
    COUNT(*) FILTER (WHERE t.status IN (2, 3)) as unresolved_count,
    
    -- Risk signals
    COUNT(*) FILTER (WHERE t.priority = 4) as urgent_tickets,
    COUNT(*) FILTER (WHERE t.priority = 3) as high_tickets,
    COUNT(*) FILTER (WHERE 'data-loss' = ANY(t.tags)) as data_loss_tickets,
    COUNT(*) FILTER (WHERE 'sync-failure' = ANY(t.tags)) as sync_failure_tickets,
    
    -- Adoption signals
    COUNT(*) FILTER (WHERE 'how-to' = ANY(t.tags)) as how_to_tickets,
    COUNT(*) FILTER (WHERE 'training' = ANY(t.tags)) as training_tickets,
    
    -- Trend calculation (30d vs previous 30d)
    CASE 
        WHEN COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '60 days' AND t.created_at < NOW() - INTERVAL '30 days') > 0
        THEN COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days')::FLOAT /
             COUNT(t.id) FILTER (WHERE t.created_at >= NOW() - INTERVAL '60 days' AND t.created_at < NOW() - INTERVAL '30 days')
        ELSE NULL
    END as trend_ratio

FROM company_cache c
LEFT JOIN ytd_tickets t ON t.company_id = c.freshdesk_company_id
WHERE t.created_at >= NOW() - INTERVAL '12 months' OR t.created_at IS NULL
GROUP BY c.freshdesk_company_id, c.name
HAVING COUNT(t.id) > 0
ORDER BY unresolved_count DESC, urgent_tickets DESC;

-- View 3: Historical trends (3 years) - Uses compressed data
CREATE OR REPLACE VIEW leadership_historical_trends AS
SELECT 
    year,
    month,
    partner_id,
    partner_name,
    total_tickets,
    resolved_tickets,
    avg_resolution_hours,
    priority_urgent,
    priority_high,
    data_loss_tickets,
    sync_failure_tickets,
    how_to_tickets,
    training_tickets
FROM monthly_ticket_aggregates
WHERE (year * 12 + month) >= EXTRACT(YEAR FROM NOW() - INTERVAL '36 months')::INTEGER * 12 
                            + EXTRACT(MONTH FROM NOW() - INTERVAL '36 months')::INTEGER
ORDER BY year DESC, month DESC;

-- View 4: Leadership metrics summary (last 30 days)
CREATE OR REPLACE VIEW leadership_metrics_summary AS
SELECT 
    -- Program Risk
    COUNT(*) FILTER (WHERE status IN (2,3) AND priority >= 3 
                     AND updated_at < NOW() - INTERVAL '7 days') as long_unresolved_blockers,
    COUNT(*) FILTER (WHERE 'data-loss' = ANY(tags)) as data_loss_incidents,
    
    -- Adoption Risk
    COUNT(*) FILTER (WHERE 'how-to' = ANY(tags)) as how_to_volume,
    COUNT(*) FILTER (WHERE 'training' = ANY(tags)) as training_requests,
    
    -- Platform Reliability
    COUNT(*) FILTER (WHERE priority = 4 AND status IN (2,3) 
                     AND updated_at < NOW() - INTERVAL '24 hours') as sla_breaches,
    
    -- Support Capacity
    COUNT(*) FILTER (WHERE status IN (2,3)) as current_backlog,
    COUNT(*) as total_tickets_30d,
    
    -- Averages
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_resolution_hours
    
FROM ytd_tickets
WHERE created_at >= NOW() - INTERVAL '30 days';

-- View 5: Top partners by ticket volume (last 12 months)
CREATE OR REPLACE VIEW top_partners_by_volume AS
SELECT 
    c.freshdesk_company_id as partner_id,
    c.name as partner_name,
    COUNT(t.id) as total_tickets,
    COUNT(*) FILTER (WHERE t.status IN (2,3)) as unresolved_tickets,
    COUNT(*) FILTER (WHERE t.priority = 4) as urgent_tickets,
    AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_resolution_hours
FROM company_cache c
INNER JOIN ytd_tickets t ON t.company_id = c.freshdesk_company_id
WHERE t.created_at >= NOW() - INTERVAL '12 months'
GROUP BY c.freshdesk_company_id, c.name
ORDER BY total_tickets DESC
LIMIT 20;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ytd_tickets_created_at_12m 
ON ytd_tickets(created_at) 
WHERE created_at >= NOW() - INTERVAL '12 months';

CREATE INDEX IF NOT EXISTS idx_ytd_tickets_company_created 
ON ytd_tickets(company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ytd_tickets_status_priority 
ON ytd_tickets(status, priority);

CREATE INDEX IF NOT EXISTS idx_ytd_tickets_tags_gin 
ON ytd_tickets USING GIN(tags);

-- Comments
COMMENT ON VIEW leadership_recent_tickets IS 'Default view for leadership queries - last 12 months only';
COMMENT ON VIEW partner_risk_recent IS 'Partner risk metrics calculated from last 12 months of data';
COMMENT ON VIEW leadership_historical_trends IS 'Historical trends using compressed monthly aggregates (3 years)';
COMMENT ON VIEW leadership_metrics_summary IS 'Key leadership metrics for last 30 days';
COMMENT ON VIEW top_partners_by_volume IS 'Top 20 partners by ticket volume in last 12 months';
