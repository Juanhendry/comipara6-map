import { getCatalog, addCatalogItem, deleteCatalogItem } from "@/lib/dataStore";
import { writeFile, mkdir, unlink } from "fs/promises";
import sharp from "sharp";
import path from "path";
import { withUploadHardening } from "@/lib/security";

// GET /api/catalog?userId=X
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
  const catalog = await getCatalog(Number(userId));
  return Response.json(catalog);
}

// POST /api/catalog — upload images (FormData with files + userId)
async function RawPOST(request) {
  const formData = await request.formData();
  const userId = formData.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

  const numericUserId = Number(userId);
  const uploadDir = path.join(process.cwd(), "public", "uploads", String(numericUserId));
  await mkdir(uploadDir, { recursive: true });

  const files = formData.getAll("files");
  for (const file of files) {
    if (!(file instanceof File)) continue;

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${timestamp}_${safeName}.webp`;
      const filePath = path.join(uploadDir, filename);

      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(inputBuffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      await writeFile(filePath, webpBuffer);

      const url = `/uploads/${numericUserId}/${filename}`;
      const storagePath = `${numericUserId}/${filename}`;
      await addCatalogItem(numericUserId, file.name, url, storagePath);
    } catch (err) {
      console.error("Upload error for file:", file.name, err);
    }
  }

  const catalog = await getCatalog(numericUserId);
  return Response.json(catalog);
}

export const POST = withUploadHardening(RawPOST);

// DELETE /api/catalog — delete an image (body: { userId, catalogId })
export async function DELETE(request) {
  const { userId, catalogId } = await request.json();
  if (!userId || !catalogId) return Response.json({ error: "Missing fields" }, { status: 400 });

  try {
    const item = await deleteCatalogItem(catalogId);
    if (item?.storage_path) {
      const filePath = path.join(process.cwd(), "public", "uploads", item.storage_path);
      await unlink(filePath).catch(() => {});
    }
  } catch (err) {
    console.error("Delete catalog error:", err);
  }

  const catalog = await getCatalog(Number(userId));
  return Response.json(catalog);
}
