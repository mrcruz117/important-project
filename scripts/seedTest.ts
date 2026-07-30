import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "database.db");

// deterministic seed data
const SEED_ROWS = [
  {
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    message: "Hello from Alice!"
  },
  {
    name: "Bob Smith",
    email: "bob.smith@example.com",
    message: "Testing the list UI."
  },
  {
    name: "Charlie Brown",
    email: "charlie.brown@example.com",
    message: "Seed record for development."
  }
];

function ensureDevContext() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production database.");
  }

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}`);
  }
}

function rowExists(email: string): boolean {
  // Query SQLite via CLI
  const result = execSync(
    `sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM record WHERE email='${email}'"`,
    { encoding: "utf8" }
  ).trim();

  return result !== "0";
}

function insertRow(row: { name: string; email: string; message: string }) {
  execSync(
    `sqlite3 "${DB_PATH}" "INSERT INTO record (name, email, message)
     SELECT '${row.name}', '${row.email}', '${row.message}'
     WHERE NOT EXISTS (SELECT 1 FROM record WHERE email='${row.email}')"`,
    { stdio: "inherit" }
  );
}

function main() {
  ensureDevContext();

  for (const row of SEED_ROWS) {
    if (rowExists(row.email)) {
      continue; // idempotent
    }

    insertRow(row);
  }

  console.log("Seed complete (idempotent, safe, no duplicates)");
}

main();