-- CreateTable: Monthly Ticket Aggregates for 3-year retention
-- This table stores compressed historical data (months 13-36)
-- Full resolution data (last 12 months) stays in ytd_tickets

CREATE TABLE IF NOT EXISTS "monthly_ticket_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "partner_id" BIGINT,
    "partner_name" TEXT,
    
    -- Volume metrics
    "total_tickets" INTEGER NOT NULL DEFAULT 0,
    "open_tickets" INTEGER NOT NULL DEFAULT 0,
    "resolved_tickets" INTEGER NOT NULL DEFAULT 0,
    "closed_tickets" INTEGER NOT NULL DEFAULT 0,
    
    -- Resolution metrics
    "avg_resolution_hours" DOUBLE PRECISION,
    "median_resolution_hours" DOUBLE PRECISION,
    
    -- Priority breakdown
    "priority_urgent" INTEGER NOT NULL DEFAULT 0,
    "priority_high" INTEGER NOT NULL DEFAULT 0,
    "priority_medium" INTEGER NOT NULL DEFAULT 0,
    "priority_low" INTEGER NOT NULL DEFAULT 0,
    
    -- Risk signals
    "data_loss_tickets" INTEGER NOT NULL DEFAULT 0,
    "sync_failure_tickets" INTEGER NOT NULL DEFAULT 0,
    "how_to_tickets" INTEGER NOT NULL DEFAULT 0,
    "training_tickets" INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compressed_from_count" INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT "monthly_ticket_aggregates_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one row per year/month/partner combination
CREATE UNIQUE INDEX "monthly_ticket_aggregates_year_month_partner_key" 
ON "monthly_ticket_aggregates"("year", "month", "partner_id");

-- Indexes for efficient querying
CREATE INDEX "monthly_ticket_aggregates_year_month_idx" 
ON "monthly_ticket_aggregates"("year", "month");

CREATE INDEX "monthly_ticket_aggregates_partner_idx" 
ON "monthly_ticket_aggregates"("partner_id");

CREATE INDEX "monthly_ticket_aggregates_created_at_idx" 
ON "monthly_ticket_aggregates"("created_at");

-- Add comment
COMMENT ON TABLE "monthly_ticket_aggregates" IS 'Compressed historical ticket data for 3-year retention policy. Stores monthly aggregates for data older than 12 months.';
