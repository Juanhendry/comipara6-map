import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { readFileSync, existsSync } from "fs";

const DB_PATH = path.join(process.cwd(), "data", "cp6.db");

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  seedIfEmpty(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT NOT NULL,
      email   TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      role    TEXT NOT NULL DEFAULT 'user',
      booths  TEXT NOT NULL DEFAULT '[]',
      fandoms TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS fandoms (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS catalog (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      name         TEXT NOT NULL,
      url          TEXT NOT NULL,
      storage_path TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS prices (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item    TEXT NOT NULL,
      price   TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(db) {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    const usersPath = path.join(process.cwd(), "data", "users.json");
    if (existsSync(usersPath)) {
      const users = JSON.parse(readFileSync(usersPath, "utf8"));
      const insert = db.prepare(
        "INSERT OR IGNORE INTO users (name, email, password, role, booths, fandoms) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const insertMany = db.transaction((rows) => {
        for (const u of rows) {
          const hash = bcrypt.hashSync(u.password || "user123", 10);
          insert.run(
            u.name || "",
            (u.email || "").toLowerCase(),
            hash,
            u.role || "user",
            JSON.stringify(u.booths || []),
            JSON.stringify(u.fandoms || [])
          );
        }
      });
      insertMany(users);
      console.log(`[db] Seeded ${users.length} users from users.json`);
    }
  }

  const fandomCount = db.prepare("SELECT COUNT(*) as c FROM fandoms").get().c;
  if (fandomCount === 0) {
    const fandomsPath = path.join(process.cwd(), "data", "fandoms.json");
    if (existsSync(fandomsPath)) {
      const fandoms = JSON.parse(readFileSync(fandomsPath, "utf8"));
      const insert = db.prepare("INSERT OR IGNORE INTO fandoms (name) VALUES (?)");
      const insertMany = db.transaction((rows) => {
        for (const f of rows) insert.run(f);
      });
      insertMany(fandoms);
      console.log(`[db] Seeded ${fandoms.length} fandoms from fandoms.json`);
    }
  }
}

export default getDb;
