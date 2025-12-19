-- AlterTable
ALTER TABLE "group_resolutions" ALTER COLUMN "group_id" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ticket_snapshots" ALTER COLUMN "freshdesk_ticket_id" SET DATA TYPE BIGINT,
ALTER COLUMN "group_id" SET DATA TYPE BIGINT,
ALTER COLUMN "company_id" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "weekly_snapshots" ALTER COLUMN "customer_max_tickets_company_id" SET DATA TYPE BIGINT;
