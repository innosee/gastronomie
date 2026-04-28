import { notFound, redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { member, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { getActiveSubscription, STRIPE_ENABLED } from '@/lib/billing';
import { BillingActions } from './billing-actions';

const formatDate = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(d),
      )
    : '—';

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktiv',
  trialing: 'Test-Phase',
  past_due: 'Zahlung überfällig',
  canceled: 'Gekündigt',
  incomplete: 'Unvollständig',
  incomplete_expired: 'Abgelaufen',
  unpaid: 'Unbezahlt',
};

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const rows = await db
    .select({
      orgId: organization.id,
      orgName: organization.name,
      role: member.role,
    })
    .from(organization)
    .innerJoin(
      member,
      and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)),
    )
    .where(eq(organization.slug, slug))
    .limit(1);

  const org = rows[0];
  if (!org) notFound();

  const isOwner = org.role === 'owner';
  const sub = await getActiveSubscription(org.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abo</h1>
        <p className="text-sm text-muted-foreground">Verwalte das Abonnement für {org.orgName}.</p>
      </div>

      {!STRIPE_ENABLED && (
        <Card>
          <CardHeader>
            <CardTitle>Abrechnung nicht konfiguriert</CardTitle>
            <CardDescription>
              Stripe ist auf diesem Deployment noch nicht aktiviert. Karten-Verwaltung ist
              uneingeschränkt nutzbar.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {STRIPE_ENABLED && sub && (
        <Card>
          <CardHeader>
            <CardTitle>Aktuelles Abo</CardTitle>
            <CardDescription>
              Status: <span className="font-medium">{STATUS_LABEL[sub.status] ?? sub.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Plan:</span> {sub.plan}
            </p>
            {sub.status === 'trialing' && (
              <p>
                <span className="text-muted-foreground">Test-Phase bis:</span>{' '}
                {formatDate(sub.trialEnd)}
              </p>
            )}
            {sub.status === 'active' && (
              <p>
                <span className="text-muted-foreground">Nächste Abrechnung:</span>{' '}
                {formatDate(sub.periodEnd)}
              </p>
            )}
            {sub.cancelAtPeriodEnd && (
              <p className="text-amber-700">
                Wird zum {formatDate(sub.periodEnd)} gekündigt.
              </p>
            )}
            {isOwner && (
              <div className="pt-3">
                <BillingActions slug={slug} orgId={org.orgId} mode="manage" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {STRIPE_ENABLED && !sub && (
        <Card>
          <CardHeader>
            <CardTitle>Karten-Verwaltung freischalten</CardTitle>
            <CardDescription>
              15 € pro Monat · 14 Tage gratis testen · jederzeit kündbar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1 text-muted-foreground">
              <li>· PDF-Karten unbegrenzt hochladen und ersetzen</li>
              <li>· Stabile URLs für die Einbindung auf der Website</li>
              <li>· Automatischer Cache-Refresh (60 s)</li>
            </ul>
            {isOwner ? (
              <BillingActions slug={slug} orgId={org.orgId} mode="subscribe" />
            ) : (
              <p className="text-amber-700">
                Nur der Restaurant-Inhaber kann ein Abo abschließen.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
