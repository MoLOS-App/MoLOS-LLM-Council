import { defineConfig } from "drizzle-kit";

/**
 * Module Drizzle Configuration
 *
 * This config uses an INTERNAL TRACKING DATABASE (.drizzle/tracking.db)
 * instead of main application database.
 *
 * WHY:
 * - drizzle-kit introspects database to generate migrations
 * - If connected to main DB, it sees ALL tables (not just this module's)
 * - This causes it to generate CREATE TABLE for existing tables
 *
 * SOLUTION:
 * - tracking.db only knows about this module's migrations
 * - drizzle-kit generates proper ALTER TABLE for new columns
 * - Main migration runner (packages/database) applies to real DB
 *
 * ⚠️ CRITICAL SAFETY RULE: NEVER RUN drizzle-kit generate
 *
 * FORBIDDEN: Do not run `drizzle-kit generate` or `bun run db:generate`
 * These commands are explicitly removed from the codebase for safety reasons.
 * They create journal/SQL desync and generate random migration names.
 *
 * CORRECT WORKFLOW:
 * 1. bun run db:migration:create --name <name> --module MoLOS-LLM-Council --reversible
 * 2. Manually edit the generated migration SQL file
 * 3. bun run db:migrate:improved (from root) - Applies to main DB via migrate-improved.ts
 *
 * See documentation/adr/003-migration-auto-generation-ban.md for details.
 */
export default defineConfig({
  schema: "./src/server/database/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  // Use internal tracking database for migration generation
  dbCredentials: { url: "file:./.drizzle/tracking.db" },
  verbose: true,
  strict: true,
});
