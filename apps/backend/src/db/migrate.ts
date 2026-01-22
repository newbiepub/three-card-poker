import Database from "bun:sqlite";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Get all migration files
const migrationsDir = join(process.cwd(), "drizzle");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

// Create database connection
const db = new Database("poker.db");

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON");

// Create migrations table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    executed_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Get already applied migrations
const appliedMigrations = db
  .prepare("SELECT filename FROM __drizzle_migrations")
  .all() as { filename: string }[];
const appliedFiles = new Set(appliedMigrations.map((m) => m.filename));

// Run pending migrations
for (const file of migrationFiles) {
  if (!appliedFiles.has(file)) {
    const filePath = join(migrationsDir, file);
    const migrationSQL = readFileSync(filePath, "utf-8");

    db.exec(migrationSQL);

    // Mark as applied
    db.prepare("INSERT INTO __drizzle_migrations (filename) VALUES (?)").run(
      file,
    );
  } else {
  }
}


// Close connection
db.close();
