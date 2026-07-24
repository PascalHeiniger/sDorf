import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:sdorf.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  } as any,
});
