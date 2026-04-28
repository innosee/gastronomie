import 'server-only';
import { headers } from 'next/headers';
import { auth, STRIPE_ENABLED } from './auth';

export type ActiveSubscription = {
  id: string;
  status: string;
  plan: string;
  trialEnd?: Date | null;
  periodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
};

export async function getActiveSubscription(orgId: string): Promise<ActiveSubscription | null> {
  if (!STRIPE_ENABLED) return null;
  try {
    const subs = await auth.api.listActiveSubscriptions({
      query: { referenceId: orgId },
      headers: await headers(),
    });
    const active = subs.find(
      (s: { status: string }) => s.status === 'active' || s.status === 'trialing',
    );
    if (!active) return null;
    return {
      id: active.id,
      status: active.status,
      plan: active.plan,
      trialEnd: active.trialEnd,
      periodEnd: active.periodEnd,
      cancelAtPeriodEnd: active.cancelAtPeriodEnd ?? false,
    };
  } catch (err) {
    console.error('listActiveSubscriptions failed:', err);
    return null;
  }
}

export function canManageMenus(sub: ActiveSubscription | null): boolean {
  if (!STRIPE_ENABLED) return true;
  return !!sub && (sub.status === 'active' || sub.status === 'trialing');
}

export { STRIPE_ENABLED };
