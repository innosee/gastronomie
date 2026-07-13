import 'server-only';

// Sagt der Template-Site Bescheid, dass eine neue Speisekarte freigegeben wurde,
// damit sie ihre Seite sofort neu baut — statt bis zu ~60 s auf das nächste
// ISR-Fenster zu warten.
//
// Konfiguration über die Env-Var REVALIDATE_HOOKS: eine JSON-Map org-slug →
// { url, secret }. Orgs ohne Eintrag werden schlicht übersprungen — das CMS ist
// multi-tenant, aber nicht jede Site hat (oder braucht) einen Hook.
//
//   REVALIDATE_HOOKS={"freiburger-kaiser":{"url":"https://www.freiburgerkaiser.de/api/revalidate","secret":"…"}}

type Hook = { url: string; secret: string };

function loadHooks(): Record<string, Hook> {
  const raw = process.env.REVALIDATE_HOOKS;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const hooks: Record<string, Hook> = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const { url, secret } = value as { url?: unknown; secret?: unknown };
      if (typeof url === 'string' && typeof secret === 'string' && url && secret) {
        hooks[slug] = { url, secret };
      }
    }
    return hooks;
  } catch {
    console.error('REVALIDATE_HOOKS ist kein gültiges JSON — Hooks deaktiviert');
    return {};
  }
}

// Bewusst "best effort": schlägt der Hook fehl, ist das KEIN Fehler der Freigabe.
// Die Karte ist in der DB veröffentlicht und die Site zieht sie spätestens beim
// nächsten ISR-Fenster (~60 s). Ein kaputter Webhook darf den Redakteur nicht
// blockieren — deshalb wird hier nur geloggt, nie geworfen.
export async function revalidateSite(slug: string): Promise<void> {
  const hook = loadHooks()[slug];
  if (!hook) return;

  try {
    const response = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${hook.secret}`,
      },
      body: JSON.stringify({ slug }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`Revalidate-Hook für ${slug} antwortete mit ${response.status}`);
    }
  } catch (error) {
    console.warn(`Revalidate-Hook für ${slug} fehlgeschlagen:`, error);
  }
}
