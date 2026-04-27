import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { menuPdf, organization } from '@/lib/db/schema';
import { MENU_CATEGORIES, type MenuCategory } from '@/lib/menu-categories';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const ip = clientIp(request.headers);
  const limit = rateLimit(`menus:${ip}:${slug}`, { capacity: 30, refillPerSecond: 0.5 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen' },
      {
        status: 429,
        headers: {
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
    return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 });
  }

  const pdfs = await db
    .select({
      category: menuPdf.category,
      blobUrl: menuPdf.blobUrl,
      version: menuPdf.version,
      uploadedAt: menuPdf.uploadedAt,
    })
    .from(menuPdf)
    .where(and(eq(menuPdf.organizationId, org.id), isNull(menuPdf.deletedAt)));

  const byCategory = new Map(pdfs.map((p) => [p.category as MenuCategory, p]));

  return NextResponse.json({
    restaurant: { name: org.name, slug: org.slug },
    menus: MENU_CATEGORIES.map((category) => {
      const row = byCategory.get(category);
      return row
        ? {
            category,
            url: row.blobUrl,
            version: row.version,
            updatedAt: row.uploadedAt.toISOString(),
          }
        : { category, url: null, version: null, updatedAt: null };
    }),
  });
}
