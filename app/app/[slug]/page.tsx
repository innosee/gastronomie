import { notFound, redirect } from 'next/navigation';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { member, menuPdf, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { MENU_CATEGORIES, type MenuCategory } from '@/lib/menu-categories';
import { UploadCard } from './menus/upload-card';

export default async function OrgHomePage({ params }: { params: Promise<{ slug: string }> }) {
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

  const pdfs = await db
    .select({
      category: menuPdf.category,
      blobUrl: menuPdf.blobUrl,
      version: menuPdf.version,
      fileSize: menuPdf.fileSize,
      uploadedAt: menuPdf.uploadedAt,
    })
    .from(menuPdf)
    .where(and(eq(menuPdf.organizationId, org.id), isNull(menuPdf.deletedAt)));

  const byCategory = new Map(pdfs.map((p) => [p.category as MenuCategory, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Karten</h1>
        <p className="text-sm text-muted-foreground">
          Lade PDF-Karten hoch. Die Download-Links auf der Website bleiben stabil — Cache wird automatisch aufgefrischt.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {MENU_CATEGORIES.map((category) => {
          const current = byCategory.get(category);
          return (
            <UploadCard
              key={category}
              slug={slug}
              category={category}
              current={
                current
                  ? {
                      url: current.blobUrl,
                      version: current.version,
                      fileSize: current.fileSize,
                      uploadedAt: current.uploadedAt,
                    }
                  : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}
