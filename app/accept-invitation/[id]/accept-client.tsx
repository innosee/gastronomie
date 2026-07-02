'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function AcceptInvitationClient({
  invitationId,
  disabled,
}: {
  invitationId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const { error } = await authClient.organization.acceptInvitation({ invitationId });
      if (error) {
        toast.error(error.message ?? 'Einladung konnte nicht angenommen werden');
        return;
      }
      toast.success('Einladung angenommen');
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={handleAccept} disabled={disabled || isPending}>
      {isPending ? 'Wird angenommen…' : 'Einladung annehmen'}
    </Button>
  );
}
