import { getPrices, savePrices } from "@/lib/dataStore";

// GET /api/prices?userId=X
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  return Response.json(getPrices(userId));
}

// POST /api/prices — add a price item (body: { userId, item, price })
export async function POST(request) {
  const { userId, item, price } = await request.json();
  if (!userId || !item || !price) return Response.json({ error: "Missing fields" }, { status: 400 });
  const prices = getPrices(userId);
  prices.push({ id: Date.now(), item, price });
  savePrices(userId, prices);
  return Response.json(prices);
}

// DELETE /api/prices — delete a price (body: { userId, priceId })
export async function DELETE(request) {
  const { userId, priceId } = await request.json();
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  const prices = getPrices(userId).filter(p => p.id !== priceId);
  savePrices(userId, prices);
  return Response.json(prices);
}
