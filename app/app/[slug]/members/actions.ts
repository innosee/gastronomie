'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getSession, loadOrgMembership } from '@/lib/auth-helpers';
import { canManageOrg, isAssignableRole } from '@/lib/permissions';

export type InviteState =
  | { error?: string; success?: boolean; invitationId?: string }
  | null;
export type ActionState = { error?: string; success?: boolean } | null;

// Gemeinsamer Guard: eingeloggt + Owner/Admin der Org mit diesem Slug.
// Editoren und reine Mitglieder haben hier bewusst KEINEN Zugriff — Mitglieder-
// und Rollenverwaltung ist Verwaltung, keine Redaktion.
async function requireManager(slug: string) {
  const session = await getSession();
  if (!session) redirect('/login');
  const membership = await loadOrgMembership(slug, session.user.id);
  if (!membership || !canManageOrg(membership.role)) return null;
  return membership;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as { body?: { message?: string } }).body;
    if (body?.message) return body.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export async function inviteMemberAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const slug = formData.get('slug')?.toString() ?? '';
  const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
  const role = formData.get('role')?.toString() ?? '';

  const manager = await requireManager(slug);
  if (!manager) return { error: 'Keine Berechtigung, Mitglieder einzuladen' };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'Bitte eine gültige E-Mail-Adresse angeben' };
  }
  if (!isAssignableRole(role)) {
    return { error: 'Ungültige Rolle' };
  }

  try {
    const invitation = await auth.api.createInvitation({
      headers: await headers(),
      body: { email, role, organizationId: manager.orgId },
    });
    revalidatePath(`/app/${slug}/members`);
    return { success: true, invitationId: invitation.id };
  } catch (err) {
    return { error: errorMessage(err, 'Einladung fehlgeschlagen') };
  }
}

export async function cancelInvitationAction(
  slug: string,
  invitationId: string,
): Promise<ActionState> {
  const manager = await requireManager(slug);
  if (!manager) return { error: 'Keine Berechtigung' };

  try {
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    revalidatePath(`/app/${slug}/members`);
    return { success: true };
  } catch (err) {
    return { error: errorMessage(err, 'Einladung konnte nicht zurückgezogen werden') };
  }
}

export async function updateMemberRoleAction(
  slug: string,
  memberId: string,
  role: string,
): Promise<ActionState> {
  const manager = await requireManager(slug);
  if (!manager) return { error: 'Keine Berechtigung' };
  if (!isAssignableRole(role)) return { error: 'Ungültige Rolle' };

  try {
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId, role, organizationId: manager.orgId },
    });
    revalidatePath(`/app/${slug}/members`);
    return { success: true };
  } catch (err) {
    return { error: errorMessage(err, 'Rolle konnte nicht geändert werden') };
  }
}

export async function removeMemberAction(
  slug: string,
  memberIdOrEmail: string,
): Promise<ActionState> {
  const manager = await requireManager(slug);
  if (!manager) return { error: 'Keine Berechtigung' };

  try {
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail, organizationId: manager.orgId },
    });
    revalidatePath(`/app/${slug}/members`);
    return { success: true };
  } catch (err) {
    return { error: errorMessage(err, 'Mitglied konnte nicht entfernt werden') };
  }
}
