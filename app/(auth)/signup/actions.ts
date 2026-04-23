'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const SignupSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib deinen Namen an').max(100),
  email: z.string().trim().toLowerCase().email('Keine gültige E-Mail-Adresse'),
  password: z.string().min(8, 'Mindestens 8 Zeichen').max(128),
});

export type SignupState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get('name'),
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
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
      asResponse: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('already')) {
      return { fieldErrors: { email: 'Diese E-Mail ist bereits registriert' } };
    }
    console.error('Signup failed:', err);
    return { error: 'Registrierung fehlgeschlagen' };
  }

  redirect('/setup');
}
