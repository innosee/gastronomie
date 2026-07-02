import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { ac, roles } from './permissions';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  // ac/roles identisch zum Server (lib/auth.ts), damit der Client die
  // 'editor'-Rolle kennt und Berechtigungen korrekt inferiert.
  plugins: [organizationClient({ ac, roles })],
});

export const { signIn, signUp, signOut, useSession, organization } = authClient;
