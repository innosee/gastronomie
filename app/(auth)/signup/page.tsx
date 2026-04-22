'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { signupAction } from './actions';

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konto erstellen</CardTitle>
        <CardDescription>Lege deinen Account an, um Karten zu verwalten.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dein Name</Label>
            <Input id="name" name="name" autoComplete="name" required disabled={isPending} />
            {state?.fieldErrors?.name && (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>
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
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
            {state?.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Wird angelegt…' : 'Konto erstellen'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Schon registriert?{' '}
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
