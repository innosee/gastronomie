import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db } from './db';

const RESERVED_SLUGS = new Set([
  'api', 'admin', 'dashboard', 'login', 'signup', 'logout',
  'settings', 'account', 'billing', 'pricing', 'about',
  'docs', 'help', 'support', 'public', 'static', '_next',
  'auth', 'organization', 'organizations', 'user', 'users',
  'app', 'www', 'mail', 'cms',
]);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: 'owner',
      schema: {
        organization: {
          additionalFields: {},
        },
      },
      organizationCreation: {
        beforeCreate: async ({ organization: org }: { organization: { name: string; slug: string } }) => {
          const slug = org.slug?.toLowerCase().trim() ?? '';
          if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(slug)) {
            throw new Error('Ungültiger Slug — nur a-z, 0-9, Bindestrich (3–50 Zeichen)');
          }
          if (RESERVED_SLUGS.has(slug)) {
            throw new Error(`Slug "${slug}" ist reserviert`);
          }
          return { data: { ...org, slug } };
        },
      },
    }),
  ],
});
