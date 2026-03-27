/**
 * Server-side authentication helper for API routes.
 * Validates the session cookie/header to protect admin-only endpoints.
 */
import { getUsers } from "@/lib/dataStore";

/**
 * Extract the logged-in user from the request.
 * The client stores session in localStorage and sends it via X-CP6-Session header.
 * Returns null if not authenticated.
 */
export function getSessionUser(request) {
  try {
    const sessionHeader = request.headers.get("x-cp6-session");
    if (!sessionHeader) return null;

    const session = JSON.parse(sessionHeader);
    if (!session?.email) return null;

    // Verify user still exists in database
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === session.email.toLowerCase());
    if (!user) return null;

    return { id: user.id, email: user.email, role: user.role, name: user.name };
  } catch {
    return null;
  }
}

/**
 * Check if request is from an admin or super_admin.
 */
export function requireAdmin(request) {
  const user = getSessionUser(request);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (user.role !== "admin" && user.role !== "super_admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, user };
}

/**
 * Check if request is from a logged-in user (any role).
 */
export function requireAuth(request) {
  const user = getSessionUser(request);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, user };
}

/**
 * Return a 401/403 error response.
 */
export function authError(check) {
  return Response.json({ error: check.error }, { status: check.status });
}
