export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'dashboard', 'login', 'signup', 'logout',
  'settings', 'account', 'billing', 'pricing', 'about',
  'docs', 'help', 'support', 'public', 'static', '_next',
  'auth', 'organization', 'organizations', 'user', 'users',
  'app', 'www', 'mail', 'cms', 'setup', 'onboarding',
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export type SlugCheckReason = 'invalid_format' | 'too_short' | 'reserved' | 'taken' | 'ok';

export function validateSlugFormat(slug: string): SlugCheckReason {
  if (slug.length < 3) return 'too_short';
  if (!SLUG_REGEX.test(slug)) return 'invalid_format';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  return 'ok';
}

export const SLUG_REASON_TEXT: Record<SlugCheckReason, string> = {
  ok: 'verfügbar',
  too_short: 'Mindestens 3 Zeichen',
  invalid_format: 'Nur a-z, 0-9 und Bindestrich; Anfang/Ende keine Bindestriche',
  reserved: 'Dieser Name ist reserviert',
  taken: 'Bereits vergeben',
};
