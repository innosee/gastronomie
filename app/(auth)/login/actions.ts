'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Keine gültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort fehlt'),
});

export type LoginState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
      asResponse: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('invalid')) {
      return { error: 'E-Mail oder Passwort stimmt nicht' };
    }
    console.error('Login failed:', err);
    return { error: 'Anmeldung fehlgeschlagen' };
  }

  redirect('/');
}
