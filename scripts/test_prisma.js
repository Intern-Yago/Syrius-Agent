import { prisma } from "../src/core/database.js";

async function test() {
  const count = await prisma.pendingRecommendedTopic.count();
  console.log("Pending count in PostgreSQL:", count);
}

test().catch(console.error).finally(() => process.exit(0));
