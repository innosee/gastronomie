'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

type Props = {
  slug: string;
  orgId: string;
  mode: 'subscribe' | 'manage';
};

export function BillingActions({ slug, orgId, mode }: Props) {
  const [isPending, start] = useTransition();

  function handleSubscribe() {
    start(async () => {
      try {
        await authClient.subscription.upgrade({
          plan: 'standard',
          referenceId: orgId,
          successUrl: `/app/${slug}/billing?status=success`,
          cancelUrl: `/app/${slug}/billing`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Konnte Checkout nicht öffnen';
        toast.error(message);
      }
    });
  }

  function handlePortal() {
    start(async () => {
      try {
        await authClient.subscription.billingPortal({
          referenceId: orgId,
          returnUrl: `/app/${slug}/billing`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Konnte Portal nicht öffnen';
        toast.error(message);
      }
    });
  }

  if (mode === 'subscribe') {
    return (
      <Button onClick={handleSubscribe} disabled={isPending}>
        {isPending ? 'Wird geöffnet…' : 'Jetzt freischalten — 14 Tage gratis'}
      </Button>
    );
  }

  return (
    <Button onClick={handlePortal} disabled={isPending} variant="outline">
      {isPending ? 'Wird geöffnet…' : 'Zahlungsdaten verwalten / kündigen'}
    </Button>
  );
}
