-- CreateTable
CREATE TABLE "weekly_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "version" INTEGER NOT NULL DEFAULT 1,
    "tickets_created" INTEGER NOT NULL,
    "tickets_resolved" INTEGER NOT NULL,
    "tickets_closed" INTEGER NOT NULL,
    "priority_urgent" INTEGER NOT NULL,
    "priority_high" INTEGER NOT NULL,
    "priority_medium" INTEGER NOT NULL,
    "priority_low" INTEGER NOT NULL,
    "average_resolution_time_hours" DOUBLE PRECISION,
    "customer_max_tickets_company_id" INTEGER,
    "customer_max_tickets_company_name" TEXT,
    "customer_max_tickets_count" INTEGER,
    "se_unresolved_open" INTEGER NOT NULL DEFAULT 0,
    "se_unresolved_pending" INTEGER NOT NULL DEFAULT 0,
    "ps_unresolved_open" INTEGER NOT NULL DEFAULT 0,
    "ps_unresolved_pending" INTEGER NOT NULL DEFAULT 0,
    "ps_unresolved_marked_for_release" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "weekly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_resolutions" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    "group_name" TEXT NOT NULL,
    "tickets_resolved" INTEGER NOT NULL,
    "tickets_open" INTEGER NOT NULL,
    "tickets_pending" INTEGER NOT NULL,

    CONSTRAINT "group_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "freshdesk_ticket_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "group_id" INTEGER,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_escalated" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ticket_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineer_hours" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "engineer_name" TEXT NOT NULL,
    "total_hours_worked" DOUBLE PRECISION NOT NULL,
    "tickets_resolved" INTEGER NOT NULL DEFAULT 0,
    "avg_time_per_ticket" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engineer_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "snapshot_id" TEXT,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error" TEXT,
    "tickets_ingested" INTEGER NOT NULL DEFAULT 0,
    "groups_ingested" INTEGER NOT NULL DEFAULT 0,
    "companies_ingested" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_audit_logs" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "retention_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rft_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "question_id" INTEGER NOT NULL,
    "total_newly_reported" INTEGER NOT NULL,
    "total_closures_this_week" INTEGER NOT NULL,
    "total_closed_so_far" INTEGER NOT NULL,
    "total_open_rfts" INTEGER NOT NULL,
    "weekly_snapshot_id" TEXT,

    CONSTRAINT "rft_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rft_organisation_snapshots" (
    "id" TEXT NOT NULL,
    "rft_snapshot_id" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "newly_reported_current_week" INTEGER NOT NULL,
    "closures_this_week" INTEGER NOT NULL,
    "closed_rfts_so_far" INTEGER NOT NULL,
    "total_open_rfts" INTEGER NOT NULL,

    CONSTRAINT "rft_organisation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_notes" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "note_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_snapshots_snapshot_id_key" ON "weekly_snapshots"("snapshot_id");

-- CreateIndex
CREATE INDEX "weekly_snapshots_week_start_date_idx" ON "weekly_snapshots"("week_start_date");

-- CreateIndex
CREATE INDEX "weekly_snapshots_week_end_date_idx" ON "weekly_snapshots"("week_end_date");

-- CreateIndex
CREATE INDEX "weekly_snapshots_created_at_idx" ON "weekly_snapshots"("created_at");

-- CreateIndex
CREATE INDEX "weekly_snapshots_expires_at_idx" ON "weekly_snapshots"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "group_resolutions_snapshot_id_group_id_key" ON "group_resolutions"("snapshot_id", "group_id");

-- CreateIndex
CREATE INDEX "ticket_snapshots_snapshot_id_idx" ON "ticket_snapshots"("snapshot_id");

-- CreateIndex
CREATE INDEX "ticket_snapshots_status_idx" ON "ticket_snapshots"("status");

-- CreateIndex
CREATE INDEX "ticket_snapshots_priority_idx" ON "ticket_snapshots"("priority");

-- CreateIndex
CREATE INDEX "ticket_snapshots_group_id_idx" ON "ticket_snapshots"("group_id");

-- CreateIndex
CREATE INDEX "ticket_snapshots_company_id_idx" ON "ticket_snapshots"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_snapshots_snapshot_id_freshdesk_ticket_id_key" ON "ticket_snapshots"("snapshot_id", "freshdesk_ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "engineer_hours_snapshot_id_engineer_name_key" ON "engineer_hours"("snapshot_id", "engineer_name");

-- CreateIndex
CREATE UNIQUE INDEX "job_executions_job_id_key" ON "job_executions"("job_id");

-- CreateIndex
CREATE INDEX "job_executions_snapshot_id_idx" ON "job_executions"("snapshot_id");

-- CreateIndex
CREATE INDEX "job_executions_status_idx" ON "job_executions"("status");

-- CreateIndex
CREATE INDEX "job_executions_started_at_idx" ON "job_executions"("started_at");

-- CreateIndex
CREATE INDEX "retention_audit_logs_snapshot_id_idx" ON "retention_audit_logs"("snapshot_id");

-- CreateIndex
CREATE INDEX "retention_audit_logs_executed_at_idx" ON "retention_audit_logs"("executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "rft_snapshots_snapshot_id_key" ON "rft_snapshots"("snapshot_id");

-- CreateIndex
CREATE INDEX "rft_snapshots_fetched_at_idx" ON "rft_snapshots"("fetched_at");

-- CreateIndex
CREATE INDEX "rft_snapshots_weekly_snapshot_id_idx" ON "rft_snapshots"("weekly_snapshot_id");

-- CreateIndex
CREATE INDEX "rft_organisation_snapshots_organisation_idx" ON "rft_organisation_snapshots"("organisation");

-- CreateIndex
CREATE UNIQUE INDEX "rft_organisation_snapshots_rft_snapshot_id_organisation_key" ON "rft_organisation_snapshots"("rft_snapshot_id", "organisation");

-- CreateIndex
CREATE INDEX "weekly_notes_snapshot_id_idx" ON "weekly_notes"("snapshot_id");

-- CreateIndex
CREATE INDEX "weekly_notes_note_type_idx" ON "weekly_notes"("note_type");

-- AddForeignKey
ALTER TABLE "group_resolutions" ADD CONSTRAINT "group_resolutions_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_snapshots" ADD CONSTRAINT "ticket_snapshots_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineer_hours" ADD CONSTRAINT "engineer_hours_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rft_snapshots" ADD CONSTRAINT "rft_snapshots_weekly_snapshot_id_fkey" FOREIGN KEY ("weekly_snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rft_organisation_snapshots" ADD CONSTRAINT "rft_organisation_snapshots_rft_snapshot_id_fkey" FOREIGN KEY ("rft_snapshot_id") REFERENCES "rft_snapshots"("snapshot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_notes" ADD CONSTRAINT "weekly_notes_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "weekly_snapshots"("snapshot_id") ON DELETE CASCADE ON UPDATE CASCADE;
