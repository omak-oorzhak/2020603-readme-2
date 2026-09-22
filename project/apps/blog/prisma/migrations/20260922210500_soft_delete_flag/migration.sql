-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- Записи, удалённые до появления флага, помечаются по дате удаления.
UPDATE "comments" SET "is_deleted" = true WHERE "deleted_at" IS NOT NULL;
UPDATE "posts" SET "is_deleted" = true WHERE "deleted_at" IS NOT NULL;
