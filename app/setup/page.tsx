import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { getSession, getActiveOrganization } from '@/lib/auth-helpers';
import { SetupForm } from './setup-form';

export default async function SetupPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const existing = await getActiveOrganization(session.user.id);
  if (existing) redirect(`/app/${existing.slug}`);

  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Karten-Verwaltung</span>
        <span className="text-sm text-muted-foreground">{session.user.email}</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <SetupForm />
        </div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
