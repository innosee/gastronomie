import { notFound, redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { member, menu, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { safeParseStoredMenu, EMPTY_MENU } from '@/lib/menu-data';
import { MenuEditor } from './menu-editor';

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const orgRows = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .innerJoin(
      member,
      and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)),
    )
    .where(eq(organization.slug, slug))
    .limit(1);

  const org = orgRows[0];
  if (!org) notFound();

  const rows = await db
    .select({ data: menu.data, updatedAt: menu.updatedAt })
    .from(menu)
    .where(eq(menu.organizationId, org.id))
    .limit(1);

  const row = rows[0];
  const stored = row ? safeParseStoredMenu(row.data) : EMPTY_MENU;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Speisekarte</h1>
        <p className="text-sm text-muted-foreground">
          Die à-la-carte-Karte, die auf der Website als filterbare Karte erscheint.
          Ausgeblendete Kategorien (z. B. Saisonkarten) bleiben erhalten, werden aber
          nicht ausgespielt.
        </p>
      </div>
      <MenuEditor slug={slug} initialMenu={stored} hasSavedMenu={!!row} />
    </div>
  );
}
