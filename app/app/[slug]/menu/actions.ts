'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { member, menu, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { storedMenuSchema, type StoredMenu } from '@/lib/menu-data';
import { kaiserMenuSeed } from '@/lib/menu-seed/kaiser';
import { revalidateSite, type RevalidateResult } from '@/lib/revalidate';

export type MenuState = { error?: string; success?: boolean } | null;

// Bei der Freigabe zusätzlich: hat die Website den Anstoß bekommen? 'ok' heißt
// in Sekunden sichtbar, sonst greift erst das ISR-Netz (~1 Min).
export type PublishState =
  | { error?: string; success?: boolean; revalidated?: RevalidateResult }
  | null;

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

function validate(json: string): { menu: StoredMenu } | { error: string } {
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { error: 'Ungültige Daten' };
  }

  const parsed = storedMenuSchema.safeParse(payload);
  if (!parsed.success) {
    // Erste verständliche Fehlermeldung statt einer Zod-Wüste.
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? 'Speisekarte ist unvollständig' };
  }
  return { menu: parsed.data };
}

// Speichert NUR den Entwurf. Die Website sieht davon nichts, bis freigegeben wird.
export async function saveMenuAction(slug: string, json: string): Promise<MenuState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const result = validate(json);
  if ('error' in result) return { error: result.error };

  await db
    .insert(menu)
    .values({
      id: crypto.randomUUID(),
      organizationId: org.orgId,
      data: result.menu,
      updatedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: menu.organizationId,
      set: { data: result.menu, updatedBy: session.user.id, updatedAt: new Date() },
    });

  revalidatePath(`/app/${slug}/menu`);
  return { success: true };
}

// Freigabe: speichert den Entwurf UND setzt ihn in einem Rutsch live. Dadurch
// ist ausgeschlossen, dass etwas anderes live geht als das, was der Redakteur
// im Freigabe-Dialog gesehen hat.
export async function publishMenuAction(slug: string, json: string): Promise<PublishState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const result = validate(json);
  if ('error' in result) return { error: result.error };

  const now = new Date();
  await db
    .insert(menu)
    .values({
      id: crypto.randomUUID(),
      organizationId: org.orgId,
      data: result.menu,
      updatedBy: session.user.id,
      publishedData: result.menu,
      publishedBy: session.user.id,
      publishedAt: now,
    })
    .onConflictDoUpdate({
      target: menu.organizationId,
      set: {
        data: result.menu,
        updatedBy: session.user.id,
        updatedAt: now,
        publishedData: result.menu,
        publishedBy: session.user.id,
        publishedAt: now,
      },
    });

  revalidatePath(`/app/${slug}/menu`);

  // Der Website Bescheid sagen, damit die Änderung sofort erscheint statt erst
  // beim nächsten ISR-Fenster. Best effort — schlägt der Hook fehl, ist die
  // Karte trotzdem veröffentlicht und wird spätestens in ~60 s ausgespielt.
  // Das Ergebnis geht an den Editor, damit ein stiller Fehlschlag auffällt.
  const revalidated = await revalidateSite(slug);

  return { success: true, revalidated };
}

// Entwurf verwerfen: zurück auf den zuletzt veröffentlichten Stand.
export async function discardDraftAction(slug: string): Promise<SeedState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await loadMembership(slug, session.user.id);
  if (!org) return { error: 'Kein Zugriff auf dieses Restaurant' };

  const rows = await db
    .select({ publishedData: menu.publishedData })
    .from(menu)
    .where(eq(menu.organizationId, org.orgId))
    .limit(1);

  const published = rows[0]?.publishedData;
  if (!published) return { error: 'Es gibt noch keinen veröffentlichten Stand' };

  const parsed = storedMenuSchema.safeParse(published);
  if (!parsed.success) return { error: 'Veröffentlichter Stand ist beschädigt' };

  await db
    .update(menu)
    .set({ data: parsed.data, updatedBy: session.user.id, updatedAt: new Date() })
    .where(eq(menu.organizationId, org.orgId));

  revalidatePath(`/app/${slug}/menu`);
  return { menu: parsed.data };
}

// Lädt die aktuelle Kaiser-Karte als Startvorlage in den ENTWURF — sie geht
// erst mit einer Freigabe live. Nur, solange die Org noch keine Karte hat.
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

  await db.insert(menu).values({
    id: crypto.randomUUID(),
    organizationId: org.orgId,
    data: kaiserMenuSeed,
    updatedBy: session.user.id,
  });

  revalidatePath(`/app/${slug}/menu`);
  return { menu: kaiserMenuSeed };
}
