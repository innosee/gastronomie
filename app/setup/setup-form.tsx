'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { suggestSlug } from '@/lib/slug';
import { checkSlugAction, setupAction, type SetupState } from './actions';

type SlugStatus = 'idle' | 'checking' | 'ok' | 'error';

export function SetupForm() {
  const [state, formAction, isPending] = useActionState<SetupState, FormData>(setupAction, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');
  const [, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase());
    setSlugTouched(true);
  }

  useEffect(() => {
    let cancelled = false;
    if (slug.length < 3) {
      const reset = setTimeout(() => {
        if (cancelled) return;
        setSlugStatus('idle');
        setSlugMessage('');
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(reset);
      };
    }
    const handle = setTimeout(() => {
      if (cancelled) return;
      setSlugStatus('checking');
      startTransition(async () => {
        const result = await checkSlugAction(slug);
        if (cancelled) return;
        setSlugStatus(result.status === 'ok' ? 'ok' : 'error');
        setSlugMessage(result.text);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [slug]);

  const slugStatusColor =
    slugStatus === 'ok'
      ? 'text-emerald-600'
      : slugStatus === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restaurant anlegen</CardTitle>
        <CardDescription>
          Wie heißt dein Restaurant? Aus dem Namen leiten wir eine kurze URL-Kennung ab — du kannst sie editieren.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name des Restaurants</Label>
            <Input
              id="name"
              name="name"
              autoComplete="organization"
              required
              disabled={isPending}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="z. B. Restaurant Kaiser"
            />
            {state?.fieldErrors?.name && (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL-Kennung</Label>
            <Input
              id="slug"
              name="slug"
              required
              minLength={3}
              maxLength={50}
              disabled={isPending}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
            />
            <p className={`text-xs ${slugStatusColor}`}>
              {slugStatus === 'checking'
                ? 'Wird geprüft…'
                : slugStatus === 'idle'
                  ? 'Mindestens 3 Zeichen, nur a-z, 0-9 und Bindestrich'
                  : slugMessage}
            </p>
            {state?.fieldErrors?.slug && (
              <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || slugStatus !== 'ok'}
          >
            {isPending ? 'Wird angelegt…' : 'Restaurant anlegen'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
