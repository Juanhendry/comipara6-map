import { getPrices, addPrice, deletePrice } from "@/lib/dataStore";

// GET /api/prices?userId=X
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  const prices = await getPrices(Number(userId));
  return Response.json(prices);
}

// POST /api/prices — add a price item (body: { userId, item, price })
export async function POST(request) {
  const { userId, item, price } = await request.json();
  if (!userId || !item || !price) return Response.json({ error: "Missing fields" }, { status: 400 });
  try {
    await addPrice(Number(userId), item, price);
    const prices = await getPrices(Number(userId));
    return Response.json(prices);
  } catch (err) {
    return Response.json({ error: err.message || "Failed" }, { status: 400 });
  }
}

// DELETE /api/prices — delete a price (body: { userId, priceId })
export async function DELETE(request) {
  const { userId, priceId } = await request.json();
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  await deletePrice(priceId);
  const prices = await getPrices(Number(userId));
  return Response.json(prices);
}
