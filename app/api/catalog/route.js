import { getCatalog, addCatalogItem, deleteCatalogItem, uploadCatalogFile } from "@/lib/dataStore";
import sharp from "sharp";
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
  const results = [];

  const files = formData.getAll("files");
  for (const file of files) {
    if (!(file instanceof File)) continue;

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${timestamp}_${safeName}.webp`;

      // Convert to WebP using sharp (server-side guarantee)
      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(inputBuffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      // Upload to Supabase Storage
      const { url, storagePath } = await uploadCatalogFile(numericUserId, filename, webpBuffer);

      // Save metadata in database
      const item = await addCatalogItem(numericUserId, file.name, url, storagePath);
      results.push(item);
    } catch (err) {
      console.error("Upload error for file:", file.name, err);
    }
  }

  // Return full catalog after all uploads
  const catalog = await getCatalog(numericUserId);
  return Response.json(catalog);
}

export const POST = withUploadHardening(RawPOST);

// DELETE /api/catalog — delete an image (body: { userId, catalogId })
export async function DELETE(request) {
  const { userId, catalogId } = await request.json();
  if (!userId || !catalogId) return Response.json({ error: "Missing fields" }, { status: 400 });

  try {
    await deleteCatalogItem(catalogId);
  } catch (err) {
    console.error("Delete catalog error:", err);
  }

  const catalog = await getCatalog(Number(userId));
  return Response.json(catalog);
}
