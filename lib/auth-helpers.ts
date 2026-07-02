import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from './auth';
import { db } from './db';
import { member, organization } from './db/schema';
import { eq, asc, and } from 'drizzle-orm';

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type OrgMembership = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
};

// Lädt die Mitgliedschaft des Users in der Org mit diesem Slug — oder null,
// wenn die Org nicht existiert oder der User dort kein Member ist. Zentraler
// org-scoped Guard: jede Server Action / Page filtert darüber, sodass ein
// Nutzer strikt nur seine eigene(n) Org(s) sieht und bearbeitet.
export const loadOrgMembership = cache(
  async (slug: string, userId: string): Promise<OrgMembership | null> => {
    const rows = await db
      .select({
        orgId: organization.id,
        orgSlug: organization.slug,
        orgName: organization.name,
        role: member.role,
      })
      .from(organization)
      .innerJoin(
        member,
        eq(member.organizationId, organization.id),
      )
      .where(and(eq(organization.slug, slug), eq(member.userId, userId)))
      .limit(1);

    return rows[0] ?? null;
  },
);

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
