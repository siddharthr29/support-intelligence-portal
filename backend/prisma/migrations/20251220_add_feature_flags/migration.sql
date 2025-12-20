-- Feature Flags System
-- Safe rollout with zero blast radius

CREATE TABLE IF NOT EXISTS "feature_flags" (
    "flag_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "environments" TEXT[] NOT NULL DEFAULT ARRAY['production']::TEXT[],
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("flag_name")
);

-- Insert default feature flags (all OFF by default)
INSERT INTO "feature_flags" (flag_name, enabled, roles, environments, description) VALUES
('leadership_dashboard', false, ARRAY['founder', 'leadership'], ARRAY['production'], 'Main leadership intelligence dashboard'),
('partner_risk_view', false, ARRAY['founder', 'leadership'], ARRAY['production'], 'Partner risk metrics and insights'),
('program_health_view', false, ARRAY['founder', 'leadership'], ARRAY['production'], 'Program-level health metrics'),
('action_playbooks', false, ARRAY['founder', 'leadership'], ARRAY['production'], 'Automated signal detection and playbooks'),
('weekly_summary', false, ARRAY['founder'], ARRAY['production'], 'Weekly founder intelligence summary'),
('historical_3y_data', false, ARRAY['founder'], ARRAY['production'], '3-year historical data access'),
('data_retention_compression', false, ARRAY['founder'], ARRAY['production'], 'Automatic data compression (12m+)');

-- Comments
COMMENT ON TABLE "feature_flags" IS 'Feature flags for safe rollout of leadership intelligence features';
