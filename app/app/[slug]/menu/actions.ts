'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { member, menu, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { storedMenuSchema, type StoredMenu } from '@/lib/menu-data';
import { kaiserMenuSeed } from '@/lib/menu-seed/kaiser';

export type MenuState = { error?: string; success?: boolean } | null;

// Die Seed-Action gibt die geladene Karte zurück, damit der Editor sie direkt
// in seinen State übernehmen kann. revalidatePath allein reicht nicht: die
// Client-Komponente bleibt gemountet und behielte ihren alten (leeren) State.
export type SeedState = { error?: string; menu?: StoredMenu } | null;

// Guard wie in menus/actions.ts: der User muss Mitglied dieser Org sein.
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

async function upsertMenu(orgId: string, userId: string, data: unknown) {
  await db
    .insert(menu)
    .values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      data,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: menu.organizationId,
      set: { data, updatedBy: userId, updatedAt: new Date() },
    });
}

export async function saveMenuAction(slug: string, json: string): Promise<MenuState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { error: 'Ungültige Daten' };
  }

  const parsed = storedMenuSchema.safeParse(payload);
  if (!parsed.success) {
    // Erste verständliche Fehlermeldung zurückgeben statt einer Zod-Wüste.
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? 'Speisekarte ist unvollständig' };
  }

  await upsertMenu(org.orgId, session.user.id, parsed.data);
  revalidatePath(`/app/${slug}/menu`);
  return { success: true };
}

// Lädt die aktuelle Kaiser-Karte als Startvorlage — nur gedacht, solange die
// Org noch keine Speisekarte hat (das Dashboard blendet den Button sonst aus).
export async function seedMenuAction(slug: string): Promise<SeedState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const existing = await db
    .select({ id: menu.id })
    .from(menu)
    .where(eq(menu.organizationId, org.orgId))
    .limit(1);

  if (existing[0]) {
    return { error: 'Es ist bereits eine Speisekarte vorhanden' };
  }

  await upsertMenu(org.orgId, session.user.id, kaiserMenuSeed);
  revalidatePath(`/app/${slug}/menu`);
  return { menu: kaiserMenuSeed };
}
