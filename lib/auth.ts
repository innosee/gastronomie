import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { member } from './db/schema';
import { validateSlugFormat, SLUG_REASON_TEXT } from './slug';

const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;
const stripeClient = STRIPE_ENABLED
  ? new Stripe(process.env.STRIPE_SECRET_KEY!)
  : null;
const STRIPE_PRICE_ID = process.env.STRIPE_STANDARD_PRICE_ID;

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
    ...(stripeClient && STRIPE_PRICE_ID
      ? [
          stripe({
            stripeClient,
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
            createCustomerOnSignUp: true,
            organization: { enabled: true },
            subscription: {
              enabled: true,
              plans: [
                {
                  name: 'standard',
                  priceId: STRIPE_PRICE_ID,
                  freeTrial: { days: 14 },
                },
              ],
              authorizeReference: async ({
                user,
                referenceId,
              }: {
                user: { id: string };
                referenceId: string;
              }) => {
                const rows = await db
                  .select({ role: member.role })
                  .from(member)
                  .where(
                    and(
                      eq(member.organizationId, referenceId),
                      eq(member.userId, user.id),
                    ),
                  )
                  .limit(1);
                return rows[0]?.role === 'owner';
              },
            },
          }),
        ]
      : []),
    // MUSS das letzte Plugin sein — sorgt dafür, dass Better Auth in Server
    // Actions die Session-Cookie automatisch setzt. Ohne dieses Plugin
    // bekommen signUp/signIn keine Cookie und der User landet sofort wieder
    // auf /login.
    nextCookies(),
  ],
});

export { STRIPE_ENABLED };
