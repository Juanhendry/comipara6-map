import { getUsers, saveUsers } from "@/lib/dataStore";
import { getCatalog } from "@/lib/dataStore";
import { getPrices } from "@/lib/dataStore";

// GET /api/users — returns all users (without passwords for public, with passwords for admin)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeAuth = searchParams.get("auth") === "1";
  const users = getUsers();

  if (includeAuth) {
    // Dashboard/admin needs passwords for auth check
    return Response.json(users);
  }

  // Public map only needs: id, name, booths, fandoms
  const publicUsers = users.map(({ id, name, booths, fandoms }) => ({ id, name, booths, fandoms }));
  return Response.json(publicUsers);
}

// POST /api/users — add a new user
export async function POST(request) {
  const body = await request.json();
  const users = getUsers();
  const newUser = { id: Date.now() + Math.random(), ...body, booths: body.booths || [], fandoms: body.fandoms || [] };
  users.push(newUser);
  saveUsers(users);
  return Response.json(newUser, { status: 201 });
}

// PUT /api/users — update a user
export async function PUT(request) {
  const body = await request.json();
  let users = getUsers();
  users = users.map(u => u.id === body.id ? { ...u, ...body } : u);
  saveUsers(users);
  return Response.json({ ok: true });
}

// DELETE /api/users — delete a user
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  let users = getUsers();
  users = users.filter(u => u.id !== id);
  saveUsers(users);
  return Response.json({ ok: true });
}
