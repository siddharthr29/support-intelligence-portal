-- CreateTable: AuditLog for immutable audit trail
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add year column to ytd_tickets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ytd_tickets' AND column_name='year') THEN
        ALTER TABLE "ytd_tickets" ADD COLUMN "year" INTEGER;
    END IF;
END $$;

-- Populate year from createdAt for existing records
UPDATE "ytd_tickets" SET "year" = EXTRACT(YEAR FROM "created_at") WHERE "year" IS NULL;

-- Make year NOT NULL after population
ALTER TABLE "ytd_tickets" ALTER COLUMN "year" SET NOT NULL;

-- Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "ytd_tickets_year_idx" ON "ytd_tickets"("year");
