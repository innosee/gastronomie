'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import {
  validateSlugFormat,
  type SlugCheckReason,
  SLUG_REASON_TEXT,
} from '@/lib/slug';

const SetupSchema = z.object({
  name: z.string().trim().min(2, 'Name fehlt').max(100),
  slug: z.string().trim().toLowerCase().min(3).max(50),
});

export type SetupState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function checkSlugAction(slug: string): Promise<{ status: SlugCheckReason; text: string }> {
  const trimmed = slug.trim().toLowerCase();
  const formatStatus = validateSlugFormat(trimmed);
  if (formatStatus !== 'ok') {
    return { status: formatStatus, text: SLUG_REASON_TEXT[formatStatus] };
  }

  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, trimmed))
    .limit(1);

  if (existing.length > 0) {
    return { status: 'taken', text: SLUG_REASON_TEXT.taken };
  }
  return { status: 'ok', text: SLUG_REASON_TEXT.ok };
}

export async function setupAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const parsed = SetupSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const slugCheck = await checkSlugAction(parsed.data.slug);
  if (slugCheck.status !== 'ok') {
    return { fieldErrors: { slug: slugCheck.text } };
  }

  try {
    await auth.api.createOrganization({
      body: {
        name: parsed.data.name,
        slug: parsed.data.slug,
      },
      headers: await headers(),
    });
  } catch (err) {
    const normalized = err instanceof Error ? err.message.toLowerCase() : '';
    if (
      normalized.includes('slug') &&
      (normalized.includes('unique') || normalized.includes('already') || normalized.includes('exists'))
    ) {
      return { fieldErrors: { slug: SLUG_REASON_TEXT.taken } };
    }
    console.error('Organization create failed:', err);
    return { error: 'Anlage fehlgeschlagen' };
  }

  redirect(`/app/${parsed.data.slug}`);
}
