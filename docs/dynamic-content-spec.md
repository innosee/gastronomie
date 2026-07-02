# Spec: Dynamische Inhalte (Bilder, Texte, Karten) — mit Redakteuren pro Site

> Referenz-Spezifikation für die Dynamisierung der Template-Sites (kaiser, haldenhof,
> sueden, valeron) über dieses CMS. Der visuelle Page-Builder ist **bewusst nicht**
> Teil dieses Schritts (kommt später, separat). Diese Datei ist die Handoff-Spec —
> untracked abgelegt, kann committet werden.

## Kontext
Multi-Tenant-CMS: Next.js 16, React 19, Drizzle ORM (Postgres/Neon), better-auth
mit Organizations + Members + Rollen + Invitations, shadcn/Radix, Tailwind,
pnpm-workspace. Speist mehrere fast identische Restaurant/Hotel-Template-Sites
(aktuell per Copy-Paste-Fork): `kaiser` (modern: Next 16/React 19), `haldenhof`,
`sueden` (noch Next 14/React 18), bald `valeron`. Gleiche Grundstruktur (Hero,
Masonry-Galerie, HomeContent-Sections, Menu, HotelRooms, Footer), je Site leichte
Abweichungen (haldenhof: events/webcam; sueden: haus37/terrasse).

## Zuerst lesen (bevor gebaut wird)
- `lib/db/schema.ts` — bestehendes Schema (user, session, organization, member,
  invitation, menuPdf). Multi-Tenancy + Rollen sind DA.
- `app/api/public/[slug]/menus/route.ts` — etabliertes öffentliches API-Muster
  (slug→org, rate-limit, Cache-Control s-maxage/swr, 404).
- `lib/menu-categories.ts`, `lib/rate-limit.ts`.
- `app/app/[slug]/menus/upload-card.tsx` + `app/app/[slug]/menus/actions.ts`
  — Upload/Dashboard/Server-Action-Muster.
- `app/app/[slug]/layout.tsx` + `page.tsx` — wie das Dashboard org-scoped & auth-gated ist.
- Im kaiser-Repo (`../kaiser`): `app/data/menuPdfs.ts` — Konsum-Muster (fetch +
  lokaler Fallback). Und `app/data/hotelData.ts`, `app/data/menuDataStatic.ts`,
  `app/sections/HomeContent.tsx`, `app/sections/Hero.tsx` — die HARTKODIERTEN
  Inhalte, die dynamisiert werden. Diese Werte werden Fallback-Defaults UND Seed.

## Ziel
Ein Redakteur editiert im CMS die Bilder & Texte SEINER Website. Jede Site hat
EIGENE Redakteure (org-scoped). Die Template-Sites lesen die Inhalte über eine
öffentliche API und fallen bei Nichterreichbarkeit auf ihre Defaults zurück.

## AUSDRÜCKLICH NICHT in Scope (später, separat)
- KEIN visueller Page-Builder / Puck / Drag-and-Drop. Kein freies Pages-Bauen.
- Schema-getriebener Content-Editor: feste, benannte Felder, die exakt der
  Template-Struktur entsprechen.

## Redakteure / Berechtigungen (WICHTIG — erste Anforderung)
- Content-, Media- und Menu-Editing ist strikt org-scoped: ein Nutzer sieht/ändert
  nur die Org(s), in denen er Member ist. Bestehende better-auth org/member-Guards nutzen.
- Rollen: neben 'owner'/'admin' eine 'editor'-Rolle, die Content/Media/Menus
  bearbeiten darf, aber KEINE Org-Settings/Billing/Mitglieder verwaltet.
- Einladungen: bestehendes invitation-System nutzen (Rolle 'editor').
- Jede schreibende Server Action / API-Route prüft org-Zugehörigkeit + Rolle.

## Content-Modell (Empfehlung — prüfen, ggf. begründet abweichen)
Drei org-scoped Bausteine:

1. **Media-Library** — Tabelle `media` (id, org_id, blob_key, blob_url, alt, width,
   height, uploaded_at, deleted_at). Upload nach Vercel Blob, analog PDF-Upload,
   mit Typ/Größen-Validierung. Dashboard: `app/app/[slug]/media`.
2. **Content (strukturiert, schema-getrieben)** — Tabelle `content` (org_id, key
   text, data jsonb, updated_at), unique(org_id, key). `data` hält je nach Feldtyp:
   String, {mediaId}, {mediaId}[] (Galerie) oder Objekt-Listen (Zimmer, Home-Sections).
   Ein CONTENT-SCHEMA (statische TS-Datei pro Template, z. B.
   `lib/content-schema/kaiser.ts`) definiert alle Felder: key, label, type
   ('text'|'richtext'|'image'|'gallery'|'list'), bei 'list' die Unterfelder, plus
   group (Seite). Das Dashboard rendert daraus automatisch das Formular. Dashboard:
   `app/app/[slug]/content`.
3. **Öffentliche API** — `GET /api/public/{slug}/content` → JSON-Map { key: value },
   Bilder aufgelöst zu { url, alt, width, height }, Listen als Arrays. Muster von
   `menus/route.ts` 1:1: slug→org, rate-limit, Cache-Control
   `public, s-maxage=60, stale-while-revalidate=300`, CORS für Template-Domains,
   404 wenn Org fehlt. `/menus` NICHT brechen. Optional: à-la-carte als neue
   `MENU_CATEGORIES`-Kategorie 'speisekarte'.

## Template-Struktur & Content-Schema (kaiser als Referenz — vollständig abbilden)
Leite `lib/content-schema/kaiser.ts` aus diesen echten Seiten/Feldern ab. Seed die
Default-Werte aus den hartkodierten Dateien im kaiser-Repo.

**GLOBAL**
- `footer.address` (richtext), `footer.phone` (text), `footer.email` (text)
- `announcement.enabled` (bool), `announcement.title` (text), `announcement.text` (richtext)

**STARTSEITE (/)**
- `home.hero.headline` (text), `home.hero.text` (richtext), `home.hero.image` (image)
- `home.gallery` (gallery, ~7 Bilder) ← Masonry
- `home.sections` (list of { headline, text, image, buttonLabel, buttonHref }) ← HomeContent

**RESTAURANT (/restaurant)**
- `restaurant.hero.headline/text/image`
- `restaurant.gallery` (gallery)
- `restaurant.intro.text` (richtext)
- (Karte via PDFs + optional 'speisekarte')

**HOTEL (/hotel)**
- `hotel.hero.headline/text/image`
- `hotel.gallery` (gallery)
- `hotel.booking.text` (richtext) ← "Buchungsanfragen"
- `hotel.rooms` (list of { name, description, price, images[] }) ← hotelData.ts

**KAISER-FRANZ (/kaiser-franz)**
- `kaiserFranz.hero.headline/text/image`, `.gallery`, `.text` (richtext), `.button{label,href}`

**KONTAKT (/kontakt)**
- `contact.address` (richtext), `contact.phone`, `contact.email`,
  `contact.hours` (list of { day, hours }), `contact.mapEmbed` (text)

**IMPRESSUM (/impressum)**
- `impressum.body` (richtext) ← selten geändert, aber editierbar

Hinweis: haldenhof/sueden bekommen EIGENE Schema-Dateien (mit events/webcam bzw.
haus37/terrasse). Erst kaiser vollständig, die anderen sind Kopien mit Deltas.

## Contract / Typen
Payload-Typen (ContentValue, ImageValue, ContentResponse) klar exportieren.
Template-Sites kopieren das Schema und validieren beim Empfang mit zod (defensiv →
Fallback). Kein geteiltes Paket in diesem Schritt.

## Guardrails
- Auf einem BRANCH arbeiten. main + echte Kundendaten NICHT anfassen; Test-Org/
  Staging-DB nutzen.
- Bestehende Konventionen strikt: Drizzle-Stil, Route-Muster (rate-limit/cache),
  shadcn, Server Actions in actions.ts, auth/org/rollen-Guards.
- Drizzle-Migration erzeugen (drizzle-kit), nicht nur Schema editieren.
- Bild-Upload validieren (Typ/Größe). Öffentliche Endpoints cache-freundlich halten.
- build + typecheck + lint müssen grün sein.

## Phasen (in Reihenfolge, je mit Checkpoint)
1. Redakteur-Rolle 'editor' + org/rollen-Guards + Invite-Flow (editor).
2. Media-Library: Tabelle + Migration + Blob-Upload + Dashboard.
3. Content: Tabelle + Migration + `lib/content-schema/kaiser.ts` (VOLLSTÄNDIG) +
   schema-getriebenes Dashboard-Formular + Persistenz + Seed aus kaiser-Defaults.
4. Öffentliche `GET /content`-Route (cached, CORS, rate-limited) + Payload-Typen.
5. (Optional) à-la-carte-PDF-Kategorie.
6. Kurzes README: wie eine Template-Site `/content` konsumiert (fetch + zod +
   Fallback) — Vorlage für den Anschluss im kaiser-Repo.

## Offene Fragen — am Anfang beantworten, dann loslegen
- Content-Schema als statische Datei pro Template (Empfehlung) ok?
- Bild-Storage = Vercel Blob (wie PDFs)? Bestätigen.
- jsonb-pro-Key-Modell (Empfehlung) ok, oder Gegenvorschlag mit Begründung?
- 'editor'-Rolle über better-auth-Rollen abbildbar prüfen (sonst Alternative).
