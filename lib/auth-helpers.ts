import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from './auth';
import { db } from './db';
import { member, organization } from './db/schema';
import { eq, asc } from 'drizzle-orm';

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export const getActiveOrganization = cache(async (userId: string) => {
  const memberships = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt), asc(organization.id))
    .limit(1);

  return memberships[0] ?? null;
});
