# Database Migration Instructions

**CRITICAL:** Apply this migration to Supabase before the app will work in production.

---

## 🚨 Apply Migration to Supabase

### Step 1: Go to Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `tvckhedkcosjvdyafzia`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Paste This SQL

```sql
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
```

### Step 3: Run the Query

1. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for "Success" message
3. Verify the migration:

```sql
-- Verify audit_logs table exists
SELECT * FROM audit_logs LIMIT 1;

-- Verify year column exists
SELECT id, year, created_at FROM ytd_tickets LIMIT 5;
```

---

## ✅ After Migration Applied

Once the migration is applied in Supabase:

1. **Render will auto-deploy** and build successfully
2. **Prisma will generate** the correct types
3. **App will work** in production

---

## 🔍 Verification

After applying the migration, verify:

```sql
-- Check audit_logs table structure
\d audit_logs

-- Check ytd_tickets has year column
\d ytd_tickets

-- Check indexes
\di
```

Expected results:
- ✅ `audit_logs` table exists with 8 columns
- ✅ `ytd_tickets` has `year` column (INTEGER NOT NULL)
- ✅ 3 new indexes created

---

## 🚀 Next Steps

1. ✅ Apply this migration in Supabase SQL Editor
2. ✅ Add Firebase Admin credentials to Render
3. ✅ Wait for Render to auto-deploy
4. ✅ Verify production app works

---

**Status:** Migration ready to apply  
**Time Required:** 2 minutes  
**Risk:** Low (migration is idempotent - safe to run multiple times)
