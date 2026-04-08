/**
 * Server-side data store — SQLite edition.
 * Uses better-sqlite3 (synchronous) wrapped in async functions for API compatibility.
 */
import getDb from "./db.js";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

function rowToUser(row) {
  if (!row) return null;
  return {
    ...row,
    booths: JSON.parse(row.booths || "[]"),
    fandoms: JSON.parse(row.fandoms || "[]"),
  };
}

export async function getUsers() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users ORDER BY id").all();
  return rows.map(rowToUser);
}

export async function getUserByEmail(email) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email);
  return rowToUser(row);
}

export async function createUser({ name, email, password, role = "user", booths = [], fandoms = [] }) {
  const db = getDb();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const stmt = db.prepare(
    "INSERT INTO users (name, email, password, role, booths, fandoms) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(name, email.toLowerCase(), hash, role, JSON.stringify(booths), JSON.stringify(fandoms));
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  return rowToUser(row);
}

export async function updateUser(id, updates) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!existing) throw new Error("User not found");

  const payload = { ...updates };
  delete payload.id;

  if (payload.password && payload.password.trim()) {
    payload.password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
  } else {
    delete payload.password;
  }

  if (payload.booths !== undefined) payload.booths = JSON.stringify(payload.booths);
  if (payload.fandoms !== undefined) payload.fandoms = JSON.stringify(payload.fandoms);

  const fields = Object.keys(payload).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(payload);
  if (!fields) return rowToUser(existing);

  db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values, id);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return rowToUser(row);
}

export async function deleteUser(id) {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// ════════════════════════════════════════════════════════════════════════════
// FANDOMS
// ════════════════════════════════════════════════════════════════════════════

export async function getFandoms() {
  const db = getDb();
  const rows = db.prepare("SELECT name FROM fandoms ORDER BY name COLLATE NOCASE").all();
  return rows.map((r) => r.name);
}

export async function addFandoms(names) {
  const db = getDb();
  const insert = db.prepare("INSERT OR IGNORE INTO fandoms (name) VALUES (?)");
  const insertMany = db.transaction((list) => {
    for (const n of list) {
      const trimmed = n.trim();
      if (trimmed) insert.run(trimmed);
    }
  });
  insertMany(names);
  return getFandoms();
}

export async function deleteFandom(name) {
  const db = getDb();
  db.prepare("DELETE FROM fandoms WHERE name = ? COLLATE NOCASE").run(name);
  return getFandoms();
}

// ════════════════════════════════════════════════════════════════════════════
// CATALOG
// ════════════════════════════════════════════════════════════════════════════

export async function getCatalog(userId) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM catalog WHERE user_id = ? ORDER BY id").all(userId);
  return rows;
}

export async function addCatalogItem(userId, name, url, storagePath) {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO catalog (user_id, name, url, storage_path) VALUES (?, ?, ?, ?)"
  ).run(userId, name, url, storagePath || "");
  return db.prepare("SELECT * FROM catalog WHERE id = ?").get(result.lastInsertRowid);
}

export async function deleteCatalogItem(catalogId) {
  const db = getDb();
  const item = db.prepare("SELECT * FROM catalog WHERE id = ?").get(catalogId);
  db.prepare("DELETE FROM catalog WHERE id = ?").run(catalogId);
  return item;
}

// ════════════════════════════════════════════════════════════════════════════
// PRICES
// ════════════════════════════════════════════════════════════════════════════

export async function getPrices(userId) {
  const db = getDb();
  return db.prepare("SELECT * FROM prices WHERE user_id = ? ORDER BY id").all(userId);
}

export async function addPrice(userId, item, price) {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO prices (user_id, item, price) VALUES (?, ?, ?)"
  ).run(userId, item, price);
  return db.prepare("SELECT * FROM prices WHERE id = ?").get(result.lastInsertRowid);
}

export async function deletePrice(priceId) {
  const db = getDb();
  db.prepare("DELETE FROM prices WHERE id = ?").run(priceId);
}
