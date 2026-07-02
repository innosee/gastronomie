'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canEditContent } from '@/lib/permissions';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_ALT_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  isAllowedImageType,
  sniffImageType,
} from '@/lib/media';

export type MediaState = { error?: string; success?: boolean } | null;

// Guard: eingeloggt + Inhalts-Bearbeitungsrecht (owner/admin/editor) in der Org.
async function requireEditor(slug: string) {
  const session = await getSession();
  if (!session) redirect('/login');
  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership || !canEditContent(membership.role)) return null;
  return { membership, session };
}

function parseDimension(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 100000 ? n : null;
}

export async function uploadMediaAction(
  _prev: MediaState,
  formData: FormData,
): Promise<MediaState> {
  const slug = formData.get('slug')?.toString() ?? '';
  const ctx = await requireEditor(slug);
  if (!ctx) return { error: 'Kein Zugriff auf diese Website' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Keine Datei ausgewählt' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { error: `Datei zu groß (max. ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)} MB)` };
  }

  // Magic-Byte-Erkennung statt Vertrauen auf den client-seitigen MIME-Typ.
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = sniffImageType(header);
  if (!detected || !isAllowedImageType(detected)) {
    return { error: 'Nicht unterstütztes Bildformat (JPEG, PNG, WebP, AVIF, GIF)' };
  }

  const alt = formData.get('alt')?.toString().trim().slice(0, MAX_ALT_LENGTH) || null;
  const width = parseDimension(formData.get('width'));
  const height = parseDimension(formData.get('height'));

  const id = crypto.randomUUID();
  const ext = ALLOWED_IMAGE_TYPES[detected];
  const blobKey = `${ctx.membership.orgSlug}/media/${id}.${ext}`;

  let blobUrl: string;
  try {
    const result = await put(blobKey, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: detected,
    });
    blobUrl = result.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
    return { error: `Blob-Upload fehlgeschlagen: ${message}` };
  }

  await db.insert(media).values({
    id,
    organizationId: ctx.membership.orgId,
    blobKey,
    blobUrl,
    alt,
    width,
    height,
    fileSize: file.size,
    contentType: detected,
    uploadedBy: ctx.session.user.id,
    uploadedByEmail: ctx.session.user.email,
  });

  revalidatePath(`/app/${slug}/media`);
  return { success: true };
}

export async function updateMediaAltAction(
  slug: string,
  id: string,
  alt: string,
): Promise<MediaState> {
  const ctx = await requireEditor(slug);
  if (!ctx) return { error: 'Kein Zugriff' };

  const trimmed = alt.trim().slice(0, MAX_ALT_LENGTH);
  const updated = await db
    .update(media)
    .set({ alt: trimmed || null })
    .where(and(eq(media.id, id), eq(media.organizationId, ctx.membership.orgId)))
    .returning({ id: media.id });

  if (updated.length === 0) return { error: 'Bild nicht gefunden' };
  revalidatePath(`/app/${slug}/media`);
  return { success: true };
}

export async function deleteMediaAction(slug: string, id: string): Promise<MediaState> {
  const ctx = await requireEditor(slug);
  if (!ctx) return { error: 'Kein Zugriff' };

  // Soft-Delete: Blob bleibt erhalten, damit bereits verlinkte Inhalte nicht
  // sofort brechen. Ein späterer Purge-Job kann verwaiste Blobs aufräumen.
  const deleted = await db
    .update(media)
    .set({ deletedAt: new Date() })
    .where(and(eq(media.id, id), eq(media.organizationId, ctx.membership.orgId)))
    .returning({ id: media.id });

  if (deleted.length === 0) return { error: 'Bild nicht gefunden' };
  revalidatePath(`/app/${slug}/media`);
  return { success: true };
}
