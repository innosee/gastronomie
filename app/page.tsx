import { redirect } from 'next/navigation';
import { getSession, getActiveOrganization } from '@/lib/auth-helpers';

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await getActiveOrganization(session.user.id);
  if (!org) redirect('/setup');

  redirect(`/app/${org.slug}`);
}
