import { getCatalog, saveCatalog, ensureUploadsDir } from "@/lib/dataStore";
import path from "path";
import fs from "fs";

// GET /api/catalog?userId=X
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  return Response.json(getCatalog(userId));
}

// POST /api/catalog — upload images (FormData with files + userId)
export async function POST(request) {
  const formData = await request.formData();
  const userId = formData.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

  const dir = ensureUploadsDir(userId);
  const catalog = getCatalog(userId);

  const files = formData.getAll("files");
  for (const file of files) {
    if (!(file instanceof File)) continue;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}_${safeName}`;
    const filePath = path.join(dir, filename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    catalog.push({
      id: timestamp + Math.random(),
      name: file.name,
      url: `/uploads/${userId}/${filename}`,
    });
  }

  saveCatalog(userId, catalog);
  return Response.json(catalog);
}

// DELETE /api/catalog — delete an image (body: { userId, catalogId, url })
export async function DELETE(request) {
  const { userId, catalogId, url } = await request.json();
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

  // Remove file from disk
  if (url) {
    const filePath = path.join(process.cwd(), "public", url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  const catalog = getCatalog(userId).filter(c => c.id !== catalogId);
  saveCatalog(userId, catalog);
  return Response.json(catalog);
}
