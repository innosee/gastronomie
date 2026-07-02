import { notFound, redirect } from 'next/navigation';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invitation, member, user } from '@/lib/db/schema';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canManageOrg } from '@/lib/permissions';
import { MembersClient, type InviteRow, type MemberRow } from './members-client';

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership) notFound();
  // Mitgliederverwaltung ist Owner/Admin vorbehalten.
  if (!canManageOrg(membership.role)) notFound();

  const memberRows = await db
    .select({
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, membership.orgId))
    .orderBy(asc(member.createdAt));

  const inviteRows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(eq(invitation.organizationId, membership.orgId), eq(invitation.status, 'pending')),
    );

  const members: MemberRow[] = memberRows.map((m) => ({
    memberId: m.memberId,
    userId: m.userId,
    name: m.name,
    email: m.email,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  }));

  const invitations: InviteRow[] = inviteRows.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role ?? 'member',
    expiresAt: i.expiresAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Lade Redakteure für {membership.orgName} ein und verwalte Rollen.
        </p>
      </div>
      <MembersClient
        slug={slug}
        currentUserId={session.user.id}
        members={members}
        invitations={invitations}
      />
    </div>
  );
}
