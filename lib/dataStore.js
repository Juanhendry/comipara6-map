/**
 * Server-side data store using JSON files.
 * Thread-safe enough for low-write, high-read workloads.
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// ─── Ensure data directory ─────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Generic JSON read/write ────────────────────────────────────────────────
function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ─── Default data ──────────────────────────────────────────────────────────
const DEFAULT_FANDOMS = [
];

const DEFAULT_USERS = [
  { id: 1, name: "Admin", email: "admin@comipara.com", password: "admin123", role: "admin", booths: [], fandoms: [] },
  { id: 2, name: "SuperAdmin", email: "super@comipara.com", password: "super123", role: "super_admin", booths: [], fandoms: [] },
];

// ─── Users ─────────────────────────────────────────────────────────────────
const USERS_FILE = path.join(DATA_DIR, "users.json");

export function getUsers() {
  return readJSON(USERS_FILE, DEFAULT_USERS);
}

export function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

// ─── Fandoms ───────────────────────────────────────────────────────────────
const FANDOMS_FILE = path.join(DATA_DIR, "fandoms.json");

export function getFandoms() {
  return readJSON(FANDOMS_FILE, DEFAULT_FANDOMS);
}

export function saveFandoms(fandoms) {
  writeJSON(FANDOMS_FILE, fandoms);
}

// ─── Prices ────────────────────────────────────────────────────────────────
const PRICES_DIR = path.join(DATA_DIR, "prices");

export function getPrices(userId) {
  return readJSON(path.join(PRICES_DIR, `${userId}.json`), []);
}

export function savePrices(userId, prices) {
  writeJSON(path.join(PRICES_DIR, `${userId}.json`), prices);
}

// ─── Catalog (image metadata only – actual files live in public/uploads) ──
const CATALOG_DIR = path.join(DATA_DIR, "catalog");

export function getCatalog(userId) {
  return readJSON(path.join(CATALOG_DIR, `${userId}.json`), []);
}

export function saveCatalog(userId, catalog) {
  writeJSON(path.join(CATALOG_DIR, `${userId}.json`), catalog);
}

// ─── Uploads directory ────────────────────────────────────────────────────
export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export function ensureUploadsDir(userId) {
  const dir = path.join(UPLOADS_DIR, String(userId));
  ensureDir(dir);
  return dir;
}
