-- AlterTable
ALTER TABLE "configuracoes_globais" ADD COLUMN     "onboarding_video_url" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_video_watched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_video_watched_at" TIMESTAMP(3);
