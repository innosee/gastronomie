import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { invitation, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { ROLE_LABELS } from '@/lib/permissions';
import { AcceptInvitationClient } from './accept-client';

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select({
      status: invitation.status,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      orgName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, id))
    .limit(1);

  const invite = rows[0];
  const session = await getSession();

  const now = new Date();
  const invalid =
    !invite || invite.status !== 'pending' || invite.expiresAt.getTime() < now.getTime();

  if (invalid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einladung ungültig</CardTitle>
          <CardDescription>
            Diese Einladung existiert nicht, wurde bereits verwendet oder ist abgelaufen.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="secondary">
            <Link href="/">Zur Startseite</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const roleLabel = ROLE_LABELS[invite.role ?? 'member'] ?? invite.role;

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einladung zu {invite.orgName}</CardTitle>
          <CardDescription>
            Melde dich mit <strong>{invite.email}</strong> an oder registriere dich, um als{' '}
            {roleLabel} beizutreten. Öffne anschließend diesen Link erneut.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-3">
          <Button asChild>
            <Link href="/login">Anmelden</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/signup">Registrieren</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const emailMismatch = session.user.email.toLowerCase() !== invite.email.toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Einladung zu {invite.orgName}</CardTitle>
        <CardDescription>
          Du wurdest als {roleLabel} für {invite.orgName} eingeladen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {emailMismatch && (
          <p className="text-sm text-destructive">
            Diese Einladung ist an <strong>{invite.email}</strong> gerichtet, du bist aber als{' '}
            {session.user.email} angemeldet. Melde dich mit der eingeladenen Adresse an.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <AcceptInvitationClient invitationId={id} disabled={emailMismatch} />
      </CardFooter>
    </Card>
  );
}
