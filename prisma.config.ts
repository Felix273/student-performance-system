import "dotenv/config";
import { defineConfig } from "prisma/config";

const runtimeUrl = process.env.DATABASE_URL ?? "";
const migrationUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  runtimeUrl;

export default defineConfig({
  engine: "classic",
  schema: "./prisma/schema.prisma",
  datasource: {
    url: runtimeUrl,
    directUrl: migrationUrl,
  },
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
