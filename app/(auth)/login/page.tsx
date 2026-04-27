'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loginAction } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <CardDescription>Mit deinem Konto einloggen.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required disabled={isPending} />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
            {state?.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Wird angemeldet…' : 'Anmelden'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Noch kein Konto?{' '}
            <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
              Registrieren
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
