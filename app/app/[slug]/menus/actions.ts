'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { member, menuPdf, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { canManageMenus, getActiveSubscription } from '@/lib/billing';
import {
  MAX_PDF_SIZE_BYTES,
  PDF_MAGIC_BYTES,
  isMenuCategory,
  type MenuCategory,
} from '@/lib/menu-categories';

export type UploadState = { error?: string; success?: boolean } | null;

async function loadMembership(slug: string, userId: string) {
  const rows = await db
    .select({ orgId: organization.id, orgSlug: organization.slug })
    .from(organization)
    .innerJoin(
      member,
      and(eq(member.organizationId, organization.id), eq(member.userId, userId)),
    )
    .where(eq(organization.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function uploadMenuAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const slug = formData.get('slug')?.toString() ?? '';
  const category = formData.get('category')?.toString() ?? '';
  const file = formData.get('file');

  if (!isMenuCategory(category)) {
    return { error: 'Unbekannte Kategorie' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Keine Datei ausgewählt' };
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { error: `Datei zu groß (max. ${Math.round(MAX_PDF_SIZE_BYTES / 1024 / 1024)} MB)` };
  }

  const headerBuf = Buffer.from(await file.slice(0, 5).arrayBuffer());
  if (headerBuf.toString('ascii') !== PDF_MAGIC_BYTES) {
    return { error: 'Keine gültige PDF-Datei' };
  }

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const sub = await getActiveSubscription(org.orgId);
  if (!canManageMenus(sub)) {
    return { error: 'Bitte schließe ein Abo ab, um Karten zu verwalten.' };
  }

  const blobKey = `${org.orgSlug}/${category}.pdf`;
  let blobUrl: string;
  try {
    const result = await put(blobKey, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/pdf',
    });
    blobUrl = result.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
    return { error: `Blob-Upload fehlgeschlagen: ${message}` };
  }

  const version = Date.now();
  await db
    .insert(menuPdf)
    .values({
      id: crypto.randomUUID(),
      organizationId: org.orgId,
      category,
      blobKey,
      blobUrl,
      version,
      fileSize: file.size,
      uploadedBy: session.user.id,
      uploadedByEmail: session.user.email,
    })
    .onConflictDoUpdate({
      target: [menuPdf.organizationId, menuPdf.category],
      set: {
        blobKey,
        blobUrl,
        version,
        fileSize: file.size,
        uploadedBy: session.user.id,
        uploadedByEmail: session.user.email,
        uploadedAt: new Date(),
        deletedAt: null,
      },
    });

  revalidatePath(`/app/${slug}`);
  return { success: true };
}

export async function deleteMenuAction(
  slug: string,
  category: MenuCategory,
): Promise<UploadState> {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!isMenuCategory(category)) {
    return { error: 'Unbekannte Kategorie' };
  }

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const sub = await getActiveSubscription(org.orgId);
  if (!canManageMenus(sub)) {
    return { error: 'Bitte schließe ein Abo ab, um Karten zu verwalten.' };
  }

  const existing = await db
    .select({ id: menuPdf.id, blobUrl: menuPdf.blobUrl })
    .from(menuPdf)
    .where(and(eq(menuPdf.organizationId, org.orgId), eq(menuPdf.category, category)))
    .limit(1);

  const row = existing[0];
  if (!row) return { success: true };

  try {
    await del(row.blobUrl);
  } catch (err) {
    console.error('Blob delete failed for', row.blobUrl, err);
    return { error: 'Blob-Löschung fehlgeschlagen — bitte erneut versuchen' };
  }

  await db.delete(menuPdf).where(eq(menuPdf.id, row.id));
  revalidatePath(`/app/${slug}`);
  return { success: true };
}
