import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { member, organization } from '@/lib/db/schema';
import { getSession } from '@/lib/auth-helpers';
import { getActiveSubscription, STRIPE_ENABLED } from '@/lib/billing';
import { logoutAction } from './actions';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const rows = await db
    .select({
      orgId: organization.id,
      orgName: organization.name,
      orgSlug: organization.slug,
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

  const sub = STRIPE_ENABLED ? await getActiveSubscription(org.orgId) : null;
  const showUpgradeBanner = STRIPE_ENABLED && !sub;
  const showTrialBanner = STRIPE_ENABLED && sub?.status === 'trialing';

  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-base font-semibold">{org.orgName}</span>
          <span className="text-xs text-muted-foreground">Karten-Verwaltung</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-muted-foreground">{session.user.email}</span>
          {STRIPE_ENABLED && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/app/${org.orgSlug}/billing`}>Abo</Link>
            </Button>
          )}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Abmelden
            </Button>
          </form>
        </div>
      </header>
      {showUpgradeBanner && (
        <div className="border-b bg-amber-50 text-amber-900 px-6 py-3 text-sm flex items-center justify-between">
          <span>
            Kein aktives Abo — Karten können angesehen, aber nicht hochgeladen oder gelöscht werden.
          </span>
          {org.role === 'owner' && (
            <Button asChild size="sm" variant="default">
              <Link href={`/app/${org.orgSlug}/billing`}>Jetzt freischalten</Link>
            </Button>
          )}
        </div>
      )}
      {showTrialBanner && sub?.trialEnd && (
        <div className="border-b bg-blue-50 text-blue-900 px-6 py-2 text-xs text-center">
          Test-Phase läuft bis{' '}
          {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(sub.trialEnd))}
        </div>
      )}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
