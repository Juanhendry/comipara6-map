import { getUsers } from "@/lib/dataStore";

// POST /api/auth — login check
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

  const users = getUsers();
  const found = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!found) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Return user info (no password)
  const { password: _, ...safeUser } = found;
  return Response.json(safeUser);
}
