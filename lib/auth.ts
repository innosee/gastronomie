import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db } from './db';
import { validateSlugFormat, SLUG_REASON_TEXT } from './slug';

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
          const status = validateSlugFormat(slug);
          if (status !== 'ok') {
            throw new Error(SLUG_REASON_TEXT[status]);
          }
          return { data: { ...org, slug } };
        },
      },
    }),
  ],
});
