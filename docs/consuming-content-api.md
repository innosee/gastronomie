# Öffentliche Content-API in einer Template-Site konsumieren

Vorlage für den Anschluss im kaiser-Repo (und haldenhof/sueden/valeron). Muster
wie bei `app/data/menuPdfs.ts`: **fetch → zod-validieren → bei Fehler lokaler
Fallback**. Die Site funktioniert also weiter, wenn das CMS nicht erreichbar ist
oder unerwartete Daten liefert.

## Endpoint

```
GET {CMS_BASE_URL}/api/public/{slug}/content
```

- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (CDN-cached)
- CORS offen (`Access-Control-Allow-Origin: *`) — read-only, öffentliche Daten
- `404`, wenn es die Org/den Slug nicht gibt · `429` bei Rate-Limit

## Antwort-Form (Contract)

```jsonc
{
  "restaurant": { "name": "…", "slug": "kaiser" },
  "content": {
    "home.hero.headline": "Willkommen im Freiburger Kaiser",
    "home.hero.text": "…",
    "home.hero.image": { "url": "https://…", "alt": "…", "width": 1600, "height": 900 },
    "home.gallery": [ { "url": "…", "alt": "…", "width": 1200, "height": 800 } ],
    "home.sections": [
      { "headline": "…", "text": "…", "image": { "url": "…", "alt": null, "width": 600, "height": 400 },
        "buttonLabel": "Zum Restaurant", "buttonHref": "/restaurant" }
    ],
    "announcement.enabled": false
  }
}
```

- Bilder sind zu `{ url, alt, width, height }` aufgelöst (oder `null` bei Einzelbild).
- Galerien und Listen sind Arrays. Gelöschte Bilder fallen aus Galerien heraus.
- Nicht gepflegte Felder kommen als Schema-Default (Text) bzw. leer (`null`/`[]`)
  zurück — trotzdem defensiv einen Fallback vorhalten.

## Beispiel-Client (`app/data/siteContent.ts`)

```ts
import { z } from 'zod';

const ImageValue = z.object({
  url: z.string().url(),
  alt: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

// Nur die Felder validieren, die die Site tatsächlich nutzt — der Rest darf da
// sein, stört aber nicht (kein .strict()).
const ContentSchema = z.object({
  'home.hero.headline': z.string(),
  'home.hero.text': z.string(),
  'home.hero.image': ImageValue.nullable(),
  'home.gallery': z.array(ImageValue),
  'home.sections': z.array(
    z.object({
      headline: z.string(),
      text: z.string(),
      image: ImageValue.nullable(),
      buttonLabel: z.string(),
      buttonHref: z.string(),
    }),
  ),
});

export type SiteContent = z.infer<typeof ContentSchema>;

// Lokaler Fallback = die bisher hartkodierten Werte der Site.
const FALLBACK: SiteContent = {
  'home.hero.headline': 'Willkommen im Freiburger Kaiser',
  'home.hero.text': '…',
  'home.hero.image': null,
  'home.gallery': [],
  'home.sections': [],
};

export async function getSiteContent(): Promise<SiteContent> {
  const base = process.env.CMS_API_BASE_URL;
  const slug = process.env.CMS_API_ORG_SLUG;
  if (!base || !slug) return FALLBACK;

  try {
    const res = await fetch(`${base}/api/public/${slug}/content`, {
      next: { revalidate: 60 }, // deckt sich mit s-maxage des CMS
    });
    if (!res.ok) throw new Error(`Content-API antwortete mit ${res.status}`);

    const json = await res.json();
    const parsed = ContentSchema.safeParse(json.content);
    if (!parsed.success) throw new Error('Unerwartetes Content-Format');

    // Feldweise über den Fallback legen: fehlt/leert ein Feld, greift der Default.
    return { ...FALLBACK, ...parsed.data };
  } catch (error) {
    console.warn('CMS-Content nicht erreichbar, nutze Fallback:', error);
    return FALLBACK;
  }
}
```

## Env-Variablen der Template-Site

```
CMS_API_BASE_URL=https://<cms-domain>
CMS_API_ORG_SLUG=kaiser
```

## Hinweise

- **Bilder:** `next/image` braucht die CMS-Blob-Domain in `images.remotePatterns`
  (Vercel-Blob: `*.public.blob.vercel-storage.com`).
- **Keys:** Die Feld-Keys sind der Contract. Sie stammen aus dem Schema im CMS
  (`lib/content-schema/kaiser.ts`); beim Anlegen weiterer Templates dort spiegeln.
- **Kein geteiltes Paket:** Schema/Typen werden bewusst kopiert und beim Empfang
  validiert (defensiv → Fallback), nicht als npm-Dependency geteilt.
```
