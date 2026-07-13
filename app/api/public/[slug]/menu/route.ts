// Öffentliche Speisekarte (à la carte) — die strukturierte, filterbare Karte.
//
// ACHTUNG, zwei ähnliche Routen:
//   /api/public/{slug}/menu   → DIESE hier: Kategorien + Gerichte + Preise (JSON)
//   /api/public/{slug}/menus  → die PDF-Karten zum Download (Mittagskarte, …)
//
// Die Antwort hat exakt die Form, die die Template-Site erwartet (MenuData):
//   { categories: [{ name, items: [{ name, description?, price }] }] }
// price ist entweder ein String ('15,70 €') oder ein Objekt mit benannten
// Varianten ({ klein: '6,90 €', groß: '8,20 €' }).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { menu, organization } from '@/lib/db/schema';
import { safeParseStoredMenu, toMenuData, EMPTY_MENU } from '@/lib/menu-data';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Kurzes CDN-Fenster und BEWUSST kein stale-while-revalidate.
//
// Hintergrund: Nach einer Freigabe stößt das CMS per Webhook sofort ein
// Revalidate der Website an. Die baut ihre Seite dann neu — und holt sich die
// Karte dabei über genau diese Route. Mit stale-while-revalidate würde das CDN
// in genau diesem Moment noch die ALTE Antwort ausliefern (und erst im
// Hintergrund auffrischen); die Site würde also den alten Stand einbacken und
// die Freigabe schlüge erst beim nächsten ISR-Fenster durch — der Webhook wäre
// wirkungslos. Ohne SWR revalidiert das CDN synchron → die Antwort ist frisch.
//
// DB-Last bleibt trotzdem gedeckelt: höchstens ~6 Origin-Anfragen pro Minute,
// egal wie viele Clients anfragen.
const CACHE_CONTROL = 'public, s-maxage=10';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const ip = clientIp(request.headers);
  const limit = rateLimit(`menu:${ip}:${slug}`, { capacity: 30, refillPerSecond: 0.5 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen' },
      {
        status: 429,
        headers: {
          // Sonst könnte das CDN die Rate-Limit-Antwort cachen und legitime
          // Clients bis zum Cache-Ablauf aussperren.
          'Cache-Control': 'no-store',
          'Retry-After': String(limit.resetInSeconds),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const orgRows = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  const org = orgRows[0];
  if (!org) {
    return NextResponse.json(
      { error: 'Restaurant nicht gefunden' },
      { status: 404, headers: { 'Cache-Control': 'public, s-maxage=300' } },
    );
  }

  // Bewusst NUR der veröffentlichte Stand — der Entwurf (menu.data) ist nicht
  // öffentlich. Erst eine Freigabe im Dashboard macht Änderungen hier sichtbar.
  const rows = await db
    .select({ publishedData: menu.publishedData })
    .from(menu)
    .where(eq(menu.organizationId, org.id))
    .limit(1);

  const published = rows[0]?.publishedData;
  const stored = published ? safeParseStoredMenu(published) : EMPTY_MENU;

  // Noch nichts freigegeben → leere categories. Die Template-Site fällt
  // darauf definiert auf ihre statische Karte zurück.
  return NextResponse.json(
    {
      restaurant: { name: org.name, slug: org.slug },
      ...toMenuData(stored),
    },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}
