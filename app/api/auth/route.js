import { getUserByEmail, verifyPassword } from "@/lib/dataStore";

// POST /api/auth — login check with bcrypt
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

  const user = await getUserByEmail(email);
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Return user info (no password)
  const { password: _, ...safeUser } = user;
  return Response.json(safeUser);
}
