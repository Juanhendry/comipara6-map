import { getUsers, createUser, updateUser, deleteUser } from "@/lib/dataStore";
import { withSanitization } from "@/lib/security";
import { revalidatePath } from "next/cache";

// GET /api/users — returns all users
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeAuth = searchParams.get("auth") === "1";
  const users = await getUsers();

  if (includeAuth) {
    // Dashboard/admin — include email & role but NEVER password
    return Response.json(users.map(({ password, ...u }) => u));
  }

  // Public map only needs: id, name, booths, fandoms
  const publicUsers = users.map(({ id, name, booths, fandoms }) => ({ id, name, booths, fandoms }));
  return Response.json(publicUsers);
}

// POST /api/users — add a new user (password will be hashed by dataStore)
async function RawPOST(request) {
  try {
    const body = await request.json();
    const newUser = await createUser({
      name: body.name,
      email: body.email,
      password: body.password || "user123",
      role: body.role || "user",
      booths: body.booths || [],
      fandoms: body.fandoms || [],
    });
    // Don't return password hash
    const { password: _, ...safeUser } = newUser;
    revalidatePath("/api/mapdata");
    return Response.json(safeUser, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to create user" }, { status: 400 });
  }
}

export const POST = withSanitization(RawPOST);

// PUT /api/users — update a user
async function RawPUT(request) {
  try {
    const body = await request.json();
    if (!body.id) return Response.json({ error: "Missing id" }, { status: 400 });
    await updateUser(body.id, body);
    revalidatePath("/api/mapdata");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to update user" }, { status: 400 });
  }
}
export const PUT = withSanitization(RawPUT);

// DELETE /api/users — delete a user
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  try {
    await deleteUser(id);
    revalidatePath("/api/mapdata");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to delete user" }, { status: 400 });
  }
}
