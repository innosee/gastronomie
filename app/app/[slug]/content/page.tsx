import { notFound, redirect } from 'next/navigation';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { content, media } from '@/lib/db/schema';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canEditContent } from '@/lib/permissions';
import { mergeWithDefaults } from '@/lib/content';
import { getContentSchema } from '@/lib/content-schema';
import type { RawContentValue } from '@/lib/content-schema';
import { ContentForm, type MediaLite } from './content-form';

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership) notFound();
  if (!canEditContent(membership.role)) notFound();

  const schema = getContentSchema();

  const rows = await db
    .select({ key: content.key, data: content.data })
    .from(content)
    .where(eq(content.organizationId, membership.orgId));

  // data ist als Envelope { v } gespeichert (siehe actions.ts).
  const saved: Record<string, RawContentValue> = {};
  for (const row of rows) {
    saved[row.key] = (row.data as { v: RawContentValue }).v;
  }
  const values = mergeWithDefaults(schema, saved);

  const mediaRows = await db
    .select({ id: media.id, url: media.blobUrl, alt: media.alt })
    .from(media)
    .where(and(eq(media.organizationId, membership.orgId), isNull(media.deletedAt)))
    .orderBy(desc(media.uploadedAt));

  const mediaList: MediaLite[] = mediaRows.map((m) => ({ id: m.id, url: m.url, alt: m.alt }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inhalte</h1>
        <p className="text-sm text-muted-foreground">
          Texte und Bilder für {membership.orgName}. Speichern erfolgt pro Abschnitt.
        </p>
      </div>
      <ContentForm slug={slug} schema={schema} initialValues={values} media={mediaList} />
    </div>
  );
}
