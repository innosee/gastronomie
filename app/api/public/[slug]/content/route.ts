import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { content, media, organization } from '@/lib/db/schema';
import { getContentSchema } from '@/lib/content-schema';
import type { ImageValue, RawContentValue } from '@/lib/content-schema';
import { collectMediaIds, mergeWithDefaults, resolveContent } from '@/lib/content';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Analog zu menus/route.ts: CDN cached 60 s, serviert 5 Min stale-while-
// revalidate → höchstens eine DB-Abfrage pro Minute, egal wie viele Clients.
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

// Öffentliche, read-only Daten → für alle Template-Domains freigegeben.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const ip = clientIp(request.headers);
  const limit = rateLimit(`content:${ip}:${slug}`, { capacity: 30, refillPerSecond: 0.5 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.resetInSeconds),
          'X-RateLimit-Remaining': '0',
          ...CORS_HEADERS,
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
      { status: 404, headers: { 'Cache-Control': 'public, s-maxage=300', ...CORS_HEADERS } },
    );
  }

  const schema = getContentSchema();

  const rows = await db
    .select({ key: content.key, data: content.data })
    .from(content)
    .where(eq(content.organizationId, org.id));

  const saved: Record<string, RawContentValue> = {};
  for (const row of rows) {
    saved[row.key] = (row.data as { v: RawContentValue }).v;
  }
  const merged = mergeWithDefaults(schema, saved);

  // Nur die tatsächlich referenzierten Bilder laden und zu ImageValue auflösen.
  const referencedIds = new Set<string>();
  for (const value of Object.values(merged)) {
    for (const id of collectMediaIds(value)) referencedIds.add(id);
  }

  const images = new Map<string, ImageValue>();
  if (referencedIds.size > 0) {
    const mediaRows = await db
      .select({
        id: media.id,
        url: media.blobUrl,
        alt: media.alt,
        width: media.width,
        height: media.height,
      })
      .from(media)
      .where(and(eq(media.organizationId, org.id), isNull(media.deletedAt)));
    for (const m of mediaRows) {
      if (referencedIds.has(m.id)) {
        images.set(m.id, { url: m.url, alt: m.alt, width: m.width, height: m.height });
      }
    }
  }

  return NextResponse.json(
    {
      restaurant: { name: org.name, slug: org.slug },
      content: resolveContent(schema, merged, images),
    },
    { headers: { 'Cache-Control': CACHE_CONTROL, ...CORS_HEADERS } },
  );
}
