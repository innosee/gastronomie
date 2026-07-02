'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/lib/permissions';
import {
  cancelInvitationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type InviteState,
} from './actions';

export type MemberRow = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type Props = {
  slug: string;
  currentUserId: string;
  members: MemberRow[];
  invitations: InviteRow[];
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(iso));

const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

export function MembersClient({ slug, currentUserId, members, invitations }: Props) {
  return (
    <div className="space-y-6">
      <InviteCard slug={slug} />
      <PendingInvitations slug={slug} invitations={invitations} />
      <MemberList slug={slug} currentUserId={currentUserId} members={members} />
    </div>
  );
}

function InviteCard({ slug }: { slug: string }) {
  const [state, formAction, isPending] = useActionState<InviteState, FormData>(
    inviteMemberAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Origin einmalig beim Mount bestimmen (window ist erst clientseitig da),
  // damit wir den Link während des Renders ableiten können statt via setState.
  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  );

  useEffect(() => {
    if (!state) return;
    if (state.success && state.invitationId) {
      toast.success('Einladung erstellt');
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const inviteLink =
    state?.success && state.invitationId
      ? `${origin}/accept-invitation/${state.invitationId}`
      : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Redakteur einladen</CardTitle>
        <CardDescription>
          Lade per E-Mail ein. Ein Redakteur darf Inhalte, Medien und Karten pflegen,
          aber keine Einstellungen oder Mitglieder verwalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-Mail</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="redakteur@beispiel.de"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rolle</Label>
              <select
                id="invite-role"
                name="role"
                defaultValue="editor"
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sendet…' : 'Einladen'}
            </Button>
          </div>
        </form>

        {inviteLink && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="mb-2 text-muted-foreground">
              Einladungs-Link (aktuell wird noch keine E-Mail versendet — Link manuell teilen):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                {inviteLink}
              </code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success('Link kopiert');
                }}
              >
                Kopieren
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingInvitations({ slug, invitations }: { slug: string; invitations: InviteRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelInvitationAction(slug, id);
      if (result?.error) toast.error(result.error);
      else toast.success('Einladung zurückgezogen');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Offene Einladungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabel(invite.role)} · läuft ab {formatDate(invite.expiresAt)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleCancel(invite.id)}
            >
              Zurückziehen
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MemberList({
  slug,
  currentUserId,
  members,
}: {
  slug: string;
  currentUserId: string;
  members: MemberRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mitglieder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => (
          <MemberItem
            key={m.memberId}
            slug={slug}
            member={m}
            isSelf={m.userId === currentUserId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MemberItem({
  slug,
  member,
  isSelf,
}: {
  slug: string;
  member: MemberRow;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Owner-Rolle wird nicht über dieses UI geändert; nur editor/admin sind
  // umstellbar. Der Inhaber und man selbst bleiben unangetastet.
  const canModify = !isSelf && member.role !== 'owner';

  function handleRoleChange(role: string) {
    if (role === member.role) return;
    startTransition(async () => {
      const result = await updateMemberRoleAction(slug, member.memberId, role);
      if (result?.error) toast.error(result.error);
      else toast.success('Rolle aktualisiert');
    });
  }

  function handleRemove() {
    if (!confirm(`${member.email} wirklich entfernen?`)) return;
    startTransition(async () => {
      const result = await removeMemberAction(slug, member.memberId);
      if (result?.error) toast.error(result.error);
      else toast.success('Mitglied entfernt');
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {member.name || member.email}
          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(du)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex items-center gap-2">
        {canModify ? (
          <select
            aria-label="Rolle"
            defaultValue={ASSIGNABLE_ROLES.includes(member.role as never) ? member.role : 'editor'}
            disabled={isPending}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {roleLabel(member.role)}
          </span>
        )}
        {canModify && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={handleRemove}
          >
            Entfernen
          </Button>
        )}
      </div>
    </div>
  );
}
