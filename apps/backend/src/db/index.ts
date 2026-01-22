import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// Create database file if it doesn't exist
const sqlite = new Database("poker.db");

// Enable foreign keys
sqlite.exec("PRAGMA foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in other files
export * from "./schema";
export { schema };
