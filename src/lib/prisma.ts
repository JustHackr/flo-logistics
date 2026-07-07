import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  if (process.env.VERCEL) {
    const tmpPath = "/tmp/dev.db";
    if (!fs.existsSync(tmpPath)) {
      const candidates = [
        path.join(process.cwd(), "dev.db"),
        path.join(process.cwd(), "prisma", "dev.db"),
      ];
      const source = candidates.find((candidate) => fs.existsSync(candidate));
      if (source) {
        fs.copyFileSync(source, tmpPath);
      }
    }
    return `file:${tmpPath}`;
  }

  return process.env.DATABASE_URL ?? "file:./dev.db";
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
