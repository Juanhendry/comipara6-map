#!/usr/bin/env node
/**
 * Migration script: JSON files → Supabase
 *
 * Migrates users (with bcrypt password hashing) and fandoms from
 * data/users.json and data/fandoms.json into Supabase tables.
 *
 * Usage:
 *   node scripts/migrate-to-supabase.mjs
 *
 * Prerequisites:
 *   1. Supabase tables created via SQL (see _Tutorial2-Supabase.md)
 *   2. .env.local with Supabase keys
 */

import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase environment variables. Create .env.local first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const BCRYPT_ROUNDS = 10;
const DATA_DIR = path.join(process.cwd(), "data");

// ─── Helpers ────────────────────────────────────────────────────────────────
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}:`, err.message);
    return null;
  }
}

// ─── Migrate Users ──────────────────────────────────────────────────────────
async function migrateUsers() {
  const usersFile = path.join(DATA_DIR, "users.json");
  const users = readJSON(usersFile);
  if (!users) return;

  console.log(`\n📦 Migrating ${users.length} users...`);

  // Hash all passwords in parallel
  console.log("  🔐 Hashing passwords with bcrypt...");
  const hashedUsers = await Promise.all(
    users.map(async (u) => ({
      name: u.name,
      email: u.email.toLowerCase(),
      password: await bcrypt.hash(u.password, BCRYPT_ROUNDS),
      role: u.role || "user",
      booths: u.booths || [],
      fandoms: u.fandoms || [],
    }))
  );

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < hashedUsers.length; i += BATCH_SIZE) {
    const batch = hashedUsers.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("users")
      .upsert(batch, { onConflict: "email", ignoreDuplicates: true })
      .select();

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      // Try inserting one by one for this batch
      for (const user of batch) {
        const { error: singleErr } = await supabase
          .from("users")
          .upsert(user, { onConflict: "email", ignoreDuplicates: true });
        if (singleErr) {
          console.error(`    ⚠ Skipped "${user.email}": ${singleErr.message}`);
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data?.length || batch.length;
    }
    process.stdout.write(`  ✅ ${inserted} users processed (${errors} errors, ${skipped} skipped)\r`);
  }

  console.log(`\n  ✅ Users migration complete: ${inserted} inserted, ${errors} errors`);
}

// ─── Migrate Fandoms ────────────────────────────────────────────────────────
async function migrateFandoms() {
  const fandomsFile = path.join(DATA_DIR, "fandoms.json");
  const fandoms = readJSON(fandomsFile);
  if (!fandoms) return;

  console.log(`\n📦 Migrating ${fandoms.length} fandoms...`);

  const rows = fandoms.map((name) => ({ name }));

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("fandoms")
      .upsert(batch, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      console.error(`  ❌ Batch error:`, error.message);
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`  ✅ ${inserted}/${rows.length} fandoms processed\r`);
  }

  console.log(`\n  ✅ Fandoms migration complete: ${inserted} inserted`);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  Comipara 6 — Migrasi ke Supabase      ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n🔗 Supabase URL: ${SUPABASE_URL}`);

  // Test connection
  const { data, error } = await supabase.from("users").select("count", { count: "exact", head: true });
  if (error) {
    console.error("❌ Gagal konek ke Supabase:", error.message);
    console.error("   Pastikan tabel sudah dibuat di Supabase. Lihat _Tutorial2-Supabase.md");
    process.exit(1);
  }
  console.log("✅ Koneksi Supabase berhasil!\n");

  await migrateUsers();
  await migrateFandoms();

  console.log("\n══════════════════════════════════════════");
  console.log("✅ Migrasi selesai!");
  console.log("══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
