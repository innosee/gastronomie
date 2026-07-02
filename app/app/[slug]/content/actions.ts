'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { content, media } from '@/lib/db/schema';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canEditContent } from '@/lib/permissions';
import { collectMediaIds, normalizeFieldValue } from '@/lib/content';
import { getContentSchema } from '@/lib/content-schema';

export type ContentState = { error?: string; success?: boolean } | null;

async function requireEditor(slug: string) {
  const session = await getSession();
  if (!session) redirect('/login');
  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership || !canEditContent(membership.role)) return null;
  return { membership, session };
}

// Speichert alle Felder einer Gruppe/Seite auf einmal. `valuesJson` ist ein
// JSON-Objekt { [fieldKey]: rohWert }. Werte werden strikt gegen das Schema
// normalisiert und referenzierte Bilder auf org-Zugehörigkeit geprüft.
export async function saveContentGroupAction(
  slug: string,
  groupKey: string,
  valuesJson: string,
): Promise<ContentState> {
  const ctx = await requireEditor(slug);
  if (!ctx) return { error: 'Kein Zugriff auf diese Website' };

  let incoming: Record<string, unknown>;
  try {
    const parsed = JSON.parse(valuesJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'Ungültige Daten' };
    }
    incoming = parsed as Record<string, unknown>;
  } catch {
    return { error: 'Ungültige Daten' };
  }

  const schema = getContentSchema();
  const groupFields = schema.fields.filter((f) => f.group === groupKey);
  if (groupFields.length === 0) return { error: 'Unbekannte Gruppe' };

  // Werte normalisieren + alle referenzierten Bilder einsammeln.
  const normalized = new Map<string, ReturnType<typeof normalizeFieldValue>>();
  const referencedMediaIds = new Set<string>();
  for (const field of groupFields) {
    const value = normalizeFieldValue(field, incoming[field.key]);
    normalized.set(field.key, value);
    for (const id of collectMediaIds(value)) referencedMediaIds.add(id);
  }

  // Sicherheit: nur Bilder DIESER Org dürfen referenziert werden.
  if (referencedMediaIds.size > 0) {
    const ids = [...referencedMediaIds];
    const owned = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(
          eq(media.organizationId, ctx.membership.orgId),
          isNull(media.deletedAt),
          inArray(media.id, ids),
        ),
      );
    if (owned.length !== ids.length) {
      return { error: 'Referenziertes Bild gehört nicht zu dieser Website' };
    }
  }

  const now = new Date();
  // data wird als Envelope { v } gespeichert, damit auch JSON-null (leeres
  // Bild) in der NOT-NULL-jsonb-Spalte gültig bleibt.
  const rows = groupFields.map((field) => ({
    id: crypto.randomUUID(),
    organizationId: ctx.membership.orgId,
    key: field.key,
    data: { v: normalized.get(field.key) ?? null },
    updatedBy: ctx.session.user.id,
    updatedAt: now,
  }));

  await db
    .insert(content)
    .values(rows)
    .onConflictDoUpdate({
      target: [content.organizationId, content.key],
      set: {
        data: sql`excluded.data`,
        updatedBy: sql`excluded.updated_by`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  revalidatePath(`/app/${slug}/content`);
  return { success: true };
}
