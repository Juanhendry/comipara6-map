import FloorMap from "@/components/FloorMap";
import { getUsers, getFandoms, getCatalog, getPrices } from "@/lib/dataStore";

// ISR: serve a cached static page, revalidate server-side every 60 seconds.
// Most visitors get an instant static response with no server CPU cost.
export const revalidate = 60;

export const metadata = {
  title: "Interactive Floor Map",
  description: "Jelajahi denah booth artist dan lingkaran kreator (cirles) yang hadir di ajang Comipara 6. Klik pada booth spesifik untuk melihat katalog karya dan detail kreator.",
};

async function buildMapData() {
  try {
    const [allUsers, fandoms] = await Promise.all([getUsers(), getFandoms()]);

    // Strip passwords — never send hashes to the client
    const users = allUsers.map(({ password, ...u }) => u);

    // Fetch catalog + prices only for users who have booths
    const withBooths = users.filter(u => u.booths?.length > 0);
    const [catalogResults, priceResults] = await Promise.all([
      Promise.all(withBooths.map(u => getCatalog(u.id).catch(() => []))),
      Promise.all(withBooths.map(u => getPrices(u.id).catch(() => []))),
    ]);

    const catalogMap = {};
    const pricesMap = {};
    withBooths.forEach((u, i) => {
      catalogMap[u.id] = catalogResults[i];
      pricesMap[u.id] = priceResults[i];
    });

    // Build tenants map (same shape FloorMap expects)
    const tenants = {};
    users.forEach(u => {
      if (!u.booths?.length) return;
      const catalog = catalogMap[u.id] || [];
      const prices  = pricesMap[u.id]  || [];
      u.booths.forEach(b => {
        tenants[b] = { userId: u.id, user: u.name, fandoms: u.fandoms, catalog, prices, allBooths: u.booths };
      });
    });

    return { users, fandoms, tenants };
  } catch (err) {
    console.error("[page] Failed to build map data:", err);
    return { users: [], fandoms: [], tenants: {} };
  }
}

export default async function Home() {
  const { users, fandoms, tenants } = await buildMapData();
  return (
    <FloorMap
      initialUsers={users}
      initialFandoms={fandoms}
      initialTenants={tenants}
    />
  );
}
