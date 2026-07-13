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

// 'ok'      → Website wurde angestoßen, Änderung ist in Sekunden sichtbar
// 'skipped' → für diese Org ist kein Hook konfiguriert
// 'failed'  → Hook konfiguriert, aber nicht erreichbar/abgelehnt
export type RevalidateResult = 'ok' | 'skipped' | 'failed';

// Bewusst "best effort": schlägt der Hook fehl, ist das KEIN Fehler der Freigabe.
// Die Karte ist in der DB veröffentlicht und die Site zieht sie spätestens beim
// nächsten ISR-Fenster (~60 s). Ein kaputter Webhook darf den Redakteur nicht
// blockieren — deshalb wird hier nie geworfen.
//
// Das Ergebnis wird aber zurückgegeben und dem Redakteur angezeigt. Ein still
// scheiternder Hook ist die schlimmste Variante: das Feature sieht funktionsfähig
// aus, tut aber nichts.
export async function revalidateSite(slug: string): Promise<RevalidateResult> {
  const hook = loadHooks()[slug];
  if (!hook) {
    console.info(`Kein Revalidate-Hook für "${slug}" konfiguriert — übersprungen`);
    return 'skipped';
  }

  try {
    const response = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${hook.secret}`,
      },
      body: JSON.stringify({ slug }),
      cache: 'no-store',
      // KEINEN Redirects folgen. Node/undici entfernt den Authorization-Header
      // beim Cross-Origin-Redirect (Fetch-Standard, gegen Credential-Leaks) —
      // und freiburgerkaiser.de leitet per 308 auf www. um, was eine andere
      // Origin ist. Eine URL ohne 'www' würde also ohne Token ankommen, 401
      // kassieren und STILL scheitern. Mit 'error' knallt es stattdessen sicht-
      // bar im Log, statt ein totes Feature vorzutäuschen.
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(
        `Revalidate-Hook für ${slug} antwortete mit ${response.status} — ` +
          `zeigt die URL auf den finalen Host (inkl. www)?`,
      );
      return 'failed';
    }
    return 'ok';
  } catch (error) {
    console.warn(
      `Revalidate-Hook für ${slug} fehlgeschlagen (Redirect? Timeout?):`,
      error,
    );
    return 'failed';
  }
}
