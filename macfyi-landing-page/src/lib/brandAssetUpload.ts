import { getSupabaseBrowserClient, isSupabaseUserAdmin } from "./supabase";

const BUCKET = "macfyi_brand";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function uploadBrandLogoFromAdmin(file: File): Promise<{ publicUrl: string } | { error: string }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { error: "Upload sementara tidak tersedia." };

  const { data: sess } = await client.auth.getSession();
  const user = sess.session?.user;
  if (!user || !isSupabaseUserAdmin(user)) {
    return { error: "Hanya admin yang dapat mengunggah logo. Masuk lalu coba lagi." };
  }

  const mime = (file.type || "").toLowerCase();
  if (mime && !ALLOWED.has(mime)) {
    return { error: "Gunakan PNG, JPEG, WebP, atau SVG." };
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase();
  const ext =
    rawExt && /^[a-z0-9]{1,8}$/.test(rawExt)
      ? rawExt
      : mime === "image/jpeg"
        ? "jpg"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/svg+xml"
            ? "svg"
            : "png";

  const path = `logo/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: "86400",
    upsert: false,
    contentType: mime || undefined,
  });
  if (upErr) return { error: upErr.message };

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
