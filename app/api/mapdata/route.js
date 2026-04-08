import { supabase } from "@/lib/supabase";

export const revalidate = 60;

/**
 * GET /api/mapdata
 * Returns all public map data in a single batched request:
 * { users: [...], fandoms: [...], catalog: {...}, prices: {...} }
 *
 * Only fetches users who have at least one booth assigned.
 * Cached for 60 seconds via ISR revalidation + Cache-Control headers.
 */
export async function GET() {
  const [usersRes, fandomsRes, catalogRes, pricesRes] = await Promise.all([
    supabase.from("users").select("id, name, booths, fandoms").order("id"),
    supabase.from("fandoms").select("name").order("name"),
    supabase.from("catalog").select("id, user_id, name, url"),
    supabase.from("prices").select("id, user_id, item, price"),
  ]);

  const users = (usersRes.data || []).filter((u) => u.booths?.length > 0);
  const fandoms = (fandomsRes.data || []).map((r) => r.name);

  const boothUserIds = new Set(users.map((u) => String(u.id)));

  const catalog = {};
  for (const item of catalogRes.data || []) {
    const uid = String(item.user_id);
    if (!boothUserIds.has(uid)) continue;
    if (!catalog[uid]) catalog[uid] = [];
    catalog[uid].push({ id: item.id, name: item.name, url: item.url });
  }

  const prices = {};
  for (const item of pricesRes.data || []) {
    const uid = String(item.user_id);
    if (!boothUserIds.has(uid)) continue;
    if (!prices[uid]) prices[uid] = [];
    prices[uid].push({ id: item.id, item: item.item, price: item.price });
  }

  return Response.json(
    { users, fandoms, catalog, prices },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
