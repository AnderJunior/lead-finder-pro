import { prisma } from "../lib/prisma.js";

async function main() {
  const r = await prisma.user.updateMany({
    where: { onboarding_video_watched: false },
    data: { onboarding_video_watched: true, onboarding_video_watched_at: new Date() },
  });
  console.log(`✓ Backfilled ${r.count} usuário(s) existentes como já tendo visto o onboarding`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
