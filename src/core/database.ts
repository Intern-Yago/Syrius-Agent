import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

let prismaInstance: PrismaClient | null = null;

export function getDatabase(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  prismaInstance = new PrismaClient({
    adapter,
  });

  return prismaInstance;
}

export const prisma = getDatabase();
