-- Action Playbooks System
-- Automated signal detection with recommended interventions

CREATE TABLE IF NOT EXISTS "action_playbooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "signal_name" TEXT NOT NULL,
    "signal_description" TEXT NOT NULL,
    "severity" TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    "threshold_config" JSONB NOT NULL,
    "recommended_intervention" TEXT NOT NULL,
    "owner" TEXT NOT NULL CHECK (owner IN ('Support', 'Product', 'Leadership')),
    "sla_hours" INTEGER NOT NULL,
    "escalation_path" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "action_playbooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "playbook_triggers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "playbook_id" UUID NOT NULL,
    "partner_id" BIGINT,
    "partner_name" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signal_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    
    CONSTRAINT "playbook_triggers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "playbook_triggers_playbook_fkey" FOREIGN KEY ("playbook_id") REFERENCES "action_playbooks"("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX "playbook_triggers_playbook_id_idx" ON "playbook_triggers"("playbook_id");
CREATE INDEX "playbook_triggers_partner_id_idx" ON "playbook_triggers"("partner_id");
CREATE INDEX "playbook_triggers_status_idx" ON "playbook_triggers"("status");
CREATE INDEX "playbook_triggers_triggered_at_idx" ON "playbook_triggers"("triggered_at");

-- Insert default playbooks
INSERT INTO "action_playbooks" (signal_name, signal_description, severity, threshold_config, recommended_intervention, owner, sla_hours, escalation_path) VALUES
('data_loss_pattern', 'Partner has >3 data-loss tickets in 30 days', 'critical', '{"ticket_count": 3, "days": 30, "tag": "data-loss"}', '1. Support: Immediate partner outreach call\n2. Product: Root cause analysis within 24h\n3. Leadership: Escalation if not resolved in 48h', 'Support', 24, ARRAY['Support', 'Product', 'Leadership']),

('high_how_to_volume', 'Partner has >10 how-to tickets in 30 days', 'medium', '{"ticket_count": 10, "days": 30, "tag": "how-to"}', '1. Support: Schedule training session\n2. Product: Review onboarding documentation\n3. Leadership: Consider dedicated success manager', 'Support', 168, ARRAY['Support', 'Product']),

('long_unresolved_blocker', 'Urgent/high priority ticket unresolved >7 days', 'high', '{"priority_min": 3, "days_unresolved": 7}', '1. Support: Immediate status check\n2. Product: Escalate to engineering if needed\n3. Leadership: Partner communication', 'Support', 48, ARRAY['Support', 'Product', 'Leadership']),

('sync_failure_pattern', 'Partner has >2 sync-failure tickets in 30 days', 'high', '{"ticket_count": 2, "days": 30, "tag": "sync-failure"}', '1. Support: Check sync logs and partner configuration\n2. Product: Review sync infrastructure\n3. Leadership: Assess impact on program delivery', 'Support', 48, ARRAY['Support', 'Product']),

('silent_dropoff', 'No ticket reply >48 hours on open ticket', 'medium', '{"hours_no_reply": 48, "status": ["open", "pending"]}', '1. Support: Follow up with partner\n2. Check if partner needs assistance\n3. Update ticket status', 'Support', 24, ARRAY['Support']),

('sla_breach', 'Urgent ticket unresolved >24 hours', 'critical', '{"priority": 4, "hours_unresolved": 24}', '1. Support: Immediate escalation\n2. Product: Emergency response if technical\n3. Leadership: Partner communication', 'Support', 4, ARRAY['Support', 'Product', 'Leadership']),

('training_spike', 'Partner has >5 training requests in 7 days', 'medium', '{"ticket_count": 5, "days": 7, "tag": "training"}', '1. Support: Schedule comprehensive training\n2. Product: Review training materials\n3. Leadership: Assess onboarding process', 'Support', 72, ARRAY['Support', 'Product']),

('ticket_volume_spike', 'Partner ticket volume >3x average in 7 days', 'high', '{"spike_ratio": 3, "days": 7}', '1. Support: Check for systemic issues\n2. Product: Investigate platform changes\n3. Leadership: Partner health check', 'Support', 24, ARRAY['Support', 'Product', 'Leadership']);

-- Comments
COMMENT ON TABLE "action_playbooks" IS 'Defines automated signal detection rules and recommended interventions';
COMMENT ON TABLE "playbook_triggers" IS 'Tracks when playbooks are triggered and their resolution status';
