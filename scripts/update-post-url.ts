import { prisma } from "../src/core/database.js";

async function main() {
  // 1. SELECT * em produção
  const selectPosts = await prisma.post.updateMany({
    where: {
      topic: {
        contains: "SELECT *",
        mode: "insensitive",
      },
    },
    data: {
      instagramUrl: "https://www.instagram.com/p/DcEKnqOIFFy/",
    },
  });

  const selectSlots = await prisma.editorialScheduleSlot.updateMany({
    where: {
      topic: {
        contains: "SELECT *",
        mode: "insensitive",
      },
    },
    data: {
      instagramUrl: "https://www.instagram.com/p/DcEKnqOIFFy/",
    },
  });

  // 2. Docker gigantescas
  const dockerPosts = await prisma.post.updateMany({
    where: {
      topic: {
        contains: "Docker",
        mode: "insensitive",
      },
    },
    data: {
      instagramUrl: "https://www.instagram.com/p/DcDVjvHFvbx/?img_index=1",
    },
  });

  const dockerSlots = await prisma.editorialScheduleSlot.updateMany({
    where: {
      topic: {
        contains: "Docker",
        mode: "insensitive",
      },
    },
    data: {
      instagramUrl: "https://www.instagram.com/p/DcDVjvHFvbx/?img_index=1",
    },
  });

  console.log(`Updated SELECT *: ${selectPosts.count} posts, ${selectSlots.count} slots`);
  console.log(`Updated Docker: ${dockerPosts.count} posts, ${dockerSlots.count} slots`);

  // Lista todos os posts cadastrados para verificação
  const allPosts = await prisma.post.findMany({
    select: { id: true, topic: true, format: true, status: true, instagramUrl: true },
  });
  console.log("Current posts in DB:", JSON.stringify(allPosts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
