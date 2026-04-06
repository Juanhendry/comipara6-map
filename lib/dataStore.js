/**
 * Server-side data store — Supabase edition.
 * Replaces the old JSON file-based storage with Supabase Postgres + Storage.
 *
 * All functions are async. API routes must `await` them.
 */
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════

/** Get all users (including password hash — API routes strip it as needed). */
export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("id");
  if (error) { console.error("getUsers error:", error); return []; }
  return data || [];
}

/** Get a single user by email (case-insensitive). */
export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) { console.error("getUserByEmail error:", error); return null; }
  return data;
}

/** Create a new user. Password will be hashed before storage. */
export async function createUser({ name, email, password, role = "user", booths = [], fandoms = [] }) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { data, error } = await supabase
    .from("users")
    .insert({ name, email: email.toLowerCase(), password: hash, role, booths, fandoms })
    .select()
    .single();
  if (error) { console.error("createUser error:", error); throw error; }
  return data;
}

/** Update a user. If `updates.password` is truthy, it will be hashed. */
export async function updateUser(id, updates) {
  const payload = { ...updates };
  delete payload.id; // don't overwrite PK

  // Hash password only when a new plaintext password is supplied
  if (payload.password && payload.password.trim()) {
    payload.password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
  } else {
    delete payload.password; // keep existing hash
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateUser error:", error); throw error; }
  return data;
}

/** Delete a user by id. */
export async function deleteUser(id) {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) { console.error("deleteUser error:", error); throw error; }
}

/** Verify a plaintext password against the stored hash. */
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// ════════════════════════════════════════════════════════════════════════════
// FANDOMS
// ════════════════════════════════════════════════════════════════════════════

/** Get all fandom names (sorted). */
export async function getFandoms() {
  const { data, error } = await supabase.from("fandoms").select("name").order("name");
  if (error) { console.error("getFandoms error:", error); return []; }
  return (data || []).map((r) => r.name);
}

/** Add multiple fandoms (upsert — duplicates are ignored). */
export async function addFandoms(names) {
  const rows = names.map((n) => ({ name: n.trim() })).filter((r) => r.name);
  if (!rows.length) return await getFandoms();

  const { error } = await supabase.from("fandoms").upsert(rows, { onConflict: "name", ignoreDuplicates: true });
  if (error) console.error("addFandoms error:", error);
  return await getFandoms();
}

/** Delete a fandom by name. */
export async function deleteFandom(name) {
  const { error } = await supabase.from("fandoms").delete().eq("name", name);
  if (error) console.error("deleteFandom error:", error);
  return await getFandoms();
}

// ════════════════════════════════════════════════════════════════════════════
// CATALOG
// ════════════════════════════════════════════════════════════════════════════

/** Get catalog items for a user. */
export async function getCatalog(userId) {
  const { data, error } = await supabase
    .from("catalog")
    .select("*")
    .eq("user_id", userId)
    .order("id");
  if (error) { console.error("getCatalog error:", error); return []; }
  return data || [];
}

/** Add a catalog item (metadata only — file upload handled separately). */
export async function addCatalogItem(userId, name, url, storagePath) {
  const { data, error } = await supabase
    .from("catalog")
    .insert({ user_id: userId, name, url, storage_path: storagePath })
    .select()
    .single();
  if (error) { console.error("addCatalogItem error:", error); throw error; }
  return data;
}

/** Delete a catalog item and its file from storage. */
export async function deleteCatalogItem(catalogId) {
  // Get the item first to know the storage path
  const { data: item } = await supabase
    .from("catalog")
    .select("storage_path")
    .eq("id", catalogId)
    .single();

  // Delete from storage
  if (item?.storage_path) {
    await supabase.storage.from("catalog").remove([item.storage_path]);
  }

  // Delete from database
  const { error } = await supabase.from("catalog").delete().eq("id", catalogId);
  if (error) console.error("deleteCatalogItem error:", error);
}

/** Upload a file to Supabase Storage bucket "catalog". Returns { url, storagePath }. */
export async function uploadCatalogFile(userId, filename, buffer, contentType = "image/webp") {
  const storagePath = `${userId}/${filename}`;

  const { error } = await supabase.storage
    .from("catalog")
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (error) { console.error("uploadCatalogFile error:", error); throw error; }

  const { data: urlData } = supabase.storage.from("catalog").getPublicUrl(storagePath);
  return { url: urlData.publicUrl, storagePath };
}

// ════════════════════════════════════════════════════════════════════════════
// PRICES
// ════════════════════════════════════════════════════════════════════════════

/** Get price list for a user. */
export async function getPrices(userId) {
  const { data, error } = await supabase
    .from("prices")
    .select("*")
    .eq("user_id", userId)
    .order("id");
  if (error) { console.error("getPrices error:", error); return []; }
  return data || [];
}

/** Add a price item. */
export async function addPrice(userId, item, price) {
  const { data, error } = await supabase
    .from("prices")
    .insert({ user_id: userId, item, price })
    .select()
    .single();
  if (error) { console.error("addPrice error:", error); throw error; }
  return data;
}

/** Delete a price item. */
export async function deletePrice(priceId) {
  const { error } = await supabase.from("prices").delete().eq("id", priceId);
  if (error) console.error("deletePrice error:", error);
}
