import { getFandoms, saveFandoms } from "@/lib/dataStore";

// GET /api/fandoms
export async function GET() {
  return Response.json(getFandoms());
}

// POST /api/fandoms — add fandoms (body: { fandoms: ["A","B"] })
export async function POST(request) {
  const { fandoms: newFandoms } = await request.json();
  const current = getFandoms();
  const merged = [...new Set([...current, ...newFandoms])];
  saveFandoms(merged);
  return Response.json(merged);
}

// DELETE /api/fandoms — remove a fandom (body: { fandom: "Name" })
export async function DELETE(request) {
  const { fandom } = await request.json();
  const current = getFandoms();
  const updated = current.filter(f => f !== fandom);
  saveFandoms(updated);
  return Response.json(updated);
}
