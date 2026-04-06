import { getFandoms, addFandoms, deleteFandom } from "@/lib/dataStore";

// GET /api/fandoms
export async function GET() {
  const fandoms = await getFandoms();
  return Response.json(fandoms);
}

// POST /api/fandoms — add fandoms (body: { fandoms: ["A","B"] })
export async function POST(request) {
  const { fandoms: newFandoms } = await request.json();
  const merged = await addFandoms(newFandoms);
  return Response.json(merged);
}

// DELETE /api/fandoms — remove a fandom (body: { fandom: "Name" })
export async function DELETE(request) {
  const { fandom } = await request.json();
  const updated = await deleteFandom(fandom);
  return Response.json(updated);
}
