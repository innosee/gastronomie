import { notFound, redirect } from 'next/navigation';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canEditContent } from '@/lib/permissions';
import { MediaClient, type MediaItem } from './media-client';

export default async function MediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership) notFound();
  if (!canEditContent(membership.role)) notFound();

  const rows = await db
    .select({
      id: media.id,
      url: media.blobUrl,
      alt: media.alt,
      width: media.width,
      height: media.height,
      fileSize: media.fileSize,
      contentType: media.contentType,
      uploadedAt: media.uploadedAt,
    })
    .from(media)
    .where(and(eq(media.organizationId, membership.orgId), isNull(media.deletedAt)))
    .orderBy(desc(media.uploadedAt));

  const items: MediaItem[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    alt: r.alt,
    width: r.width,
    height: r.height,
    fileSize: r.fileSize,
    contentType: r.contentType,
    uploadedAt: r.uploadedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Medien</h1>
        <p className="text-sm text-muted-foreground">
          Bilder für {membership.orgName}. Lade Fotos hoch und pflege Alt-Texte — sie
          stehen später im Inhalts-Editor als Bild-Auswahl bereit.
        </p>
      </div>
      <MediaClient slug={slug} items={items} />
    </div>
  );
}
