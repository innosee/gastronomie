import { NextResponse } from 'next/server';

// Diagnose-Route: Kommt REVALIDATE_HOOKS zur Laufzeit an und parst es?
//
// Hintergrund: Ein fehlkonfigurierter Hook wird bewusst still übersprungen
// (die Freigabe darf nie am Webhook scheitern). Genau das macht ihn aber
// unmöglich zu debuggen — man sieht von außen nicht, ob er greift.
//
// Gibt AUSSCHLIESSLICH Metadaten zurück: ob die Variable gesetzt ist, ob sie
// parst, für welche Slugs ein Hook existiert und ob URL/Secret gefüllt sind.
// Niemals das Secret selbst, niemals die volle URL — nur der Host.

export const dynamic = 'force-dynamic';

export function GET() {
  const raw = process.env.REVALIDATE_HOOKS;

  if (!raw) {
    return NextResponse.json({
      hooksEnvPresent: false,
      hint: 'REVALIDATE_HOOKS ist zur Laufzeit nicht gesetzt — Hooks werden übersprungen.',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return NextResponse.json({
      hooksEnvPresent: true,
      parsed: false,
      length: raw.length,
      startsWith: raw.slice(0, 2),
      hint: `REVALIDATE_HOOKS ist kein gültiges JSON: ${
        error instanceof Error ? error.message : 'unbekannt'
      }`,
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({
      hooksEnvPresent: true,
      parsed: true,
      validShape: false,
      hint: 'REVALIDATE_HOOKS muss ein Objekt sein: { "<slug>": { url, secret } }',
    });
  }

  const hooks = Object.entries(parsed as Record<string, unknown>).map(([slug, value]) => {
    const v = (value ?? {}) as { url?: unknown; secret?: unknown };
    let host: string | null = null;
    if (typeof v.url === 'string') {
      try {
        host = new URL(v.url).host;
      } catch {
        host = 'ungültige URL';
      }
    }
    return {
      slug,
      hasUrl: typeof v.url === 'string' && v.url.length > 0,
      host, // nur der Host, nicht der ganze Pfad
      hasSecret: typeof v.secret === 'string' && v.secret.length > 0,
      secretLength: typeof v.secret === 'string' ? v.secret.length : 0,
    };
  });

  return NextResponse.json({ hooksEnvPresent: true, parsed: true, validShape: true, hooks });
}
