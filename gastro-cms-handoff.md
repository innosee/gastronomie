# Gastro CMS — Handoff

Kontext und Architektur-Entscheidungen aus dem Planungsgespräch. Leg diese Datei beim Start ins neue Repo oder nimm sie als Briefing für die erste Claude-Session.

---

## Kontext

Du pflegst die Website [freiburgerkaiser.de](https://freiburgerkaiser.de) (Next.js, Repo: `benjaminkonopka/kaiser`). Aktuell hängt sie an einem externen V0/Supabase-CMS (`v0-supabase-frontend-forms.vercel.app`), das du ablösen willst. Parallel gibt es drei PDF-Karten (Mittag, Getränke, Alternative Mittag), die aktuell über Google Drive-Links eingebunden sind — unschön und für wöchentliche Updates (Mittagskarte wechselt jede Woche) zu umständlich.

Ziel: ein eigenes, mandantenfähiges **SaaS-CMS für Gastronomie**, das initial genau diese beiden Probleme löst: (a) Menüdaten verwalten, (b) PDF-Karten hochladen mit stabilen URLs.

Das aktuelle `kaiser`-Repo hat bereits einen sauberen Fallback-Mechanismus eingebaut:
- `app/data/menuData.ts` — Orchestrator (API → statischer Fallback)
- `app/data/menuApi.ts` — API-Client mit `MENU_API_BASE_URL`-Env-Var
- `app/data/menuDataStatic.ts` — statische 2026er-Karte als Fallback

Aktuell (Stand PR #4) ist der API-Call temporär gebypassed und die statische Karte wird live gerendert. Sobald das neue CMS steht, wird der Bypass in `menuData.ts` wieder entfernt und `MENU_API_BASE_URL` zeigt auf das neue CMS.

---

## Locked-in Entscheidungen

| Thema | Entscheidung |
|---|---|
| Repo | `innosee/gastronomie` auf GitHub |
| Framework | Next.js 16 (App Router, Turbopack) — `create-next-app` zieht 16.x als latest |
| DB | Neon Postgres |
| ORM | **Drizzle** (erstklassiger Support in Better Auth + Neon) |
| Auth | **Better Auth** mit `organization`-Plugin für Multi-Tenancy |
| Registrierung | Self-Signup — Restaurant-Owner registrieren sich selbst |
| Storage | **Vercel Blob** (über Cloudflare R2 nachgedacht, aber schnellster Setup) |
| SaaS-Monetarisierung | Stripe, **15 € pro Account/Monat**, **Phase 2** (nach Upload-MVP) |
| Multi-Tenancy-Modell | `organization` = Restaurant. Ein User kann in mehreren Organisationen Mitglied sein (Kunde hat 2 Restaurants) |
| Menu-Kategorien | Start 1:1 wie bei Kaiser: Mittagskarte, Getränkekarte, Alternative Mittagskarte |

---

## Architektur

### Domänen-Modell (Skizze)

```
user (Better Auth)
  └─ member → organization (= Restaurant)
                ├─ slug (URL-Segment, z. B. "restaurant-kaiser")
                ├─ name
                └─ menuPdfs
                    ├─ category: 'mittagskarte' | 'getraenkekarte' | 'alternative-mittagskarte'
                    ├─ blobKey ({orgSlug}/{category}.pdf)
                    ├─ blobUrl (stable, von Vercel Blob)
                    ├─ version (timestamp für Cache-Busting)
                    ├─ uploadedBy (userId)
                    └─ uploadedAt
```

Später kommt `menuCategories`/`menuItems` dazu (strukturierte Speisekarte wie in `menuDataStatic.ts`). Phase 1 nur PDFs.

### Storage-Strategie: Overwrite-in-Place

Der Clou gegen das „ständig neue URLs"-Problem:

- Blob-Key ist **fest pro Kategorie**: `{orgSlug}/mittagskarte.pdf`
- Beim Upload wird die Datei überschrieben, **Blob-URL bleibt identisch**
- Frontend hardcodet die URL nur einmal
- Cache-Busting: Timestamp-Version aus DB, Frontend hängt `?v={ts}` an

```typescript
// Beispielhaftes Upload-Handler-Fragment
await put(`${orgSlug}/${category}.pdf`, file, {
  access: 'public',
  addRandomSuffix: false, // wichtig — sonst ist die URL nicht stabil
});
await db.update(menuPdfs).set({ version: Date.now() }).where(...);
```

### Öffentliche API

```
GET /api/public/{orgSlug}/menus
→ {
    restaurant: { name, slug },
    menus: [
      { category: 'mittagskarte', url: '...', version: 1234567890, updatedAt: '...' },
      { category: 'getraenkekarte', url: '...', version: ..., updatedAt: '...' },
      { category: 'alternative-mittagskarte', url: '...', version: ..., updatedAt: '...' }
    ]
  }
```

Auf `freiburgerkaiser.de` ruft das `Menu.tsx` diese API bei Build/Request auf und baut die Download-Buttons damit.

---

## Phase 1 — Roadmap

| # | Task | Schätzung |
|---|---|---|
| 1 | Repo-Setup: Next.js 15 + Tailwind + shadcn/ui + TS | 30 min |
| 2 | Neon-DB-Verbindung + Drizzle-Schema initial | 1 h |
| 3 | Better Auth installieren, Email/Password + `organization`-Plugin, Migrations | 2 h |
| 4 | Self-Signup-Flow + Restaurant-Anlage (Name + Slug-Wahl mit Uniqueness-Check **+ Reserved-Words-Liste**) | 2–3 h |
| 5 | Dashboard-UI: List aller Organisationen des Users, Switch-Organisation | 1 h |
| 6 | Vercel Blob Setup + Upload-Component (PDF only **+ Magic-Bytes-Check**, Max-Size, 3 feste Kategorien) | 3 h |
| 7 | Öffentliche API `GET /api/public/{orgSlug}/menus` mit CORS für `freiburgerkaiser.de` | 1 h |
| 8 | Integration im `kaiser`-Repo: `Menu.tsx` auf neue API umstellen, PR | 30 min |

**Summe:** ca. 1–2 Tage Fokusarbeit.

---

## Detail-Hinweise zur Phase 1

### Slug-Validierung — Reserved Words

Bevor ein User seinen Org-Slug speichert, gegen eine Sperrliste prüfen, sonst kollidiert er mit App-Routen:

```ts
const RESERVED_SLUGS = new Set([
  'api', 'admin', 'dashboard', 'login', 'signup', 'logout',
  'settings', 'account', 'billing', 'pricing', 'about',
  'docs', 'help', 'support', 'public', 'static', '_next',
  'auth', 'organization', 'organizations', 'user', 'users',
]);
```

Plus Format-Regex: nur `[a-z0-9-]`, 3–50 Zeichen, nicht mit Bindestrich beginnen/enden.

### Upload-Validierung — Magic Bytes

Mimetype und Endung sind clientseitig fälschbar. PDFs starten immer mit `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Erste 5 Bytes serverseitig prüfen, bevor in Blob hochgeladen wird:

```ts
const header = Buffer.from(await file.slice(0, 5).arrayBuffer());
if (header.toString('ascii') !== '%PDF-') {
  throw new Error('Keine gültige PDF-Datei');
}
```

Zusätzlich: Max-Size 10 MB (Mittagskarten sind klein, größer = Verdacht).

### Better Auth `organization`-Plugin + Drizzle

Stand prüfen, ob das Plugin sein Schema selbst exportiert (z. B. `from 'better-auth/plugins/organization/schema'`) oder ob man die Tables manuell ins Drizzle-Schema mergen muss. War in früheren Versionen ein Reibungspunkt — die offizielle Doku unbedingt vor dem Migration-Lauf checken, sonst doppelte Tables oder fehlende Foreign Keys.

**Stand Setup (April 2026):** Schema in `lib/db/schema.ts` manuell gepflegt — die Better-Auth-Tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) plus die App-Table `menu_pdf`. `pnpm db:push` hat alles in einem Rutsch nach Neon migriert.

### Next.js 16 — Stolpersteine (in unsere Setup eingebaut)

- **Middleware heißt `proxy.ts`** (nicht mehr `middleware.ts`), Export-Funktion `proxy()`. Default-Runtime ist Node.js — Better Auth läuft also problemlos drin.
- **`cookies()` und `headers()` sind async** — überall `await` davor. Better-Auth-Calls daher als `auth.api.getSession({ headers: await headers() })`.
- **Cache Components / `use cache`** sind in 16.2 nicht default-on. Auth-Reads triggern automatisch Dynamic Rendering, wir müssen nichts opt-out-en.
- **Drizzle-Config braucht `@next/env`**, um `.env.local` zu laden — `drizzle-kit` läuft außerhalb der Next-Runtime und sieht die Vars sonst nicht.

### Typ-Sharing zwischen CMS und Kaiser

Zwei Repos, kein Monorepo — also kein direktes Imports. Pragmatischer Weg ohne npm-Package:

- **Single Source of Truth: Zod-Schema** im CMS für die API-Response definieren.
- API gibt das parsed Objekt zurück; Kaiser definiert dasselbe Schema (kopiert) und parst beim Empfang.
- Bei Schema-Drift fliegt ein Runtime-Error mit klarer Meldung — besser als TypeScript-Lüge.
- Wenn das wächst: später `@innosee/gastro-types` als privates npm-Package extrahieren.

Die bestehenden Typen aus `app/types/types.ts` (`MenuData`, `MenuCategory`, `MenuItem`) sind erst für Phase 2 (strukturierte Karte) relevant. Phase 1 hat nur das schmale `menus`-Array aus der API.

---

## Datenmodell-Details und DSGVO

### `uploadedBy` darf nicht hart referenzieren

Wenn ein User aus einer Org entfernt oder gelöscht wird, soll die PDF-Historie nicht brechen. Foreign Key auf `user.id` mit `ON DELETE SET NULL`, dazu optional ein `uploadedByEmail`-Snapshot-Feld für Audit-Logs:

```ts
uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
uploadedByEmail: text('uploaded_by_email'), // Snapshot zum Zeitpunkt des Uploads
```

### Lösch-Flows (DSGVO-Pflicht)

Drei Lösch-Szenarien sauber definieren — sonst gibt's beim ersten Account-Löschwunsch Stress:

1. **PDF löschen** — Soft-Delete in DB (`deletedAt`-Spalte) + Blob-Datei via `del()` aus Vercel Blob entfernen. Öffentliche API filtert `deletedAt IS NULL`.
2. **Restaurant/Org löschen** — Cascade: alle PDFs aus Blob entfernen, dann Org-Record. Memberships werden via FK-Cascade geräumt. Vorher Confirmation-Dialog mit Slug-Eingabe als Sicherheitsabfrage.
3. **User-Account löschen** — Wenn User letzter Owner einer Org ist: entweder Ownership-Transfer erzwingen oder Org mitlöschen (User entscheidet im Lösch-Dialog). Better Auth liefert keinen Default-Flow dafür — selber bauen.

Plus: **Datenexport** (Art. 20 DSGVO) — minimal als JSON-Download aller User-Daten und Org-Memberships. Ein simpler Endpoint reicht für Phase 1.

### Neon Backups

- Free-Tier: 24 h PITR (Point-in-Time-Recovery). Reicht zum Start.
- Pro-Tier: 7–30 Tage PITR. Für eine bezahlende Kundschaft (sobald Stripe live) auf Pro upgraden — Risiko von Datenverlust bei Account-Hijack o.ä. ist sonst zu hoch.
- Zusätzlich: wöchentlicher `pg_dump` per GitHub Action in einen privaten R2/S3-Bucket. Kosten: cents/Monat, Schutz gegen "Neon ist down/Account weg".
- **Vercel Blob hat keine Versionierung** — wenn jemand versehentlich überschreibt, ist die alte PDF weg. Falls Restore-Szenarien wichtig werden: vor Overwrite die alte Datei nach `{orgSlug}/_archive/{category}-{timestamp}.pdf` kopieren (Cronjob räumt nach 30 Tagen).

---

## Phase 2 — Stripe (SaaS, 15 €/Account)

- Better Auth hat einen **Stripe-Plugin** (Subscriptions + Checkout + Webhook-Handling). Das ist der direkte Weg.
- Paywall: Upload-Button disablen, wenn `subscription.status !== 'active'` auf der Organisation.
- Trial-Zeit: 14 Tage empfohlen (optional).
- Geschätzt: ½–1 Tag.

Öffne nicht nebenher — erst Phase 1 stabil, dann Phase 2.

---

## Frontend-Integration (Kaiser-Site)

Zwei Änderungen im `kaiser`-Repo, wenn das CMS läuft:

1. **PDF-Buttons in `app/components/Menu.tsx`**: Die drei hardcoded Google-Drive-Links raus, stattdessen Props/Fetch von der neuen API:
   ```tsx
   // Statt: link='https://drive.google.com/...'
   // Neu: link={menus.mittagskarte.url + '?v=' + menus.mittagskarte.version}
   ```

2. **Bypass in `app/data/menuData.ts` entfernen** (siehe Kommentare dort — try/catch wieder einkommentieren, `void fetchMenuFromApi` raus), und `MENU_API_BASE_URL` in Vercel-Env-Vars auf die neue CMS-URL setzen.

---

## Deployment-Hinweise

- **2 separate Vercel-Projekte** sind kein Problem, sondern sauber:
  - Projekt A: `kaiser` (freiburgerkaiser.de)
  - Projekt B: `gastro-cms` (z. B. `cms.gastrocms.app` + `api.gastrocms.app`)
- CORS im CMS auf der `/api/public/*`-Route: erlauben
  - `https://freiburgerkaiser.de` (Production)
  - `https://*.vercel.app` (Vercel Preview-Deployments — sonst funktionieren PR-Previews nicht)
  - `http://localhost:3000` / lokale Dev-Hosts
  - Praktischer Ansatz: Allowlist als Env-Var pflegen, in der Middleware regex-matchen
- Neon: Connection-String gehört in Vercel-Env-Vars (`DATABASE_URL`). Lokal in `.env.local`, **niemals committen**
- Vercel Blob: Token über Vercel-Dashboard generieren, als `BLOB_READ_WRITE_TOKEN` in Env-Vars

---

## Offene Punkte für Tag 1

- [ ] GitHub-Repo `innosee/gastro-cms` anlegen
- [ ] Neon-Projekt/-DB anlegen, Connection-String in `.env.local`
- [ ] Vercel-Projekt verknüpfen, Vercel Blob aktivieren, Token holen
- [ ] Domain-Entscheidung: `cms.deinedomain.de` + `api.deinedomain.de`? Oder beides auf einer Domain mit `/admin` und `/api/public`?
- [ ] Logo/Branding fürs CMS (kann später)
- [ ] CORS-Allowlist als Env-Var (`ALLOWED_ORIGINS`) konzeptionell festhalten — nicht hardcoden
- [ ] Reserved-Slug-Liste committen, bevor der erste Self-Signup live geht
- [ ] Neon-Plan-Entscheidung: Free reicht für MVP, vor Stripe-Launch auf Pro upgraden

---

## Kontextpointer (damit Claude im neuen Repo schnell reinkommt)

- Aktuelles `kaiser`-Repo: `https://github.com/benjaminkonopka/kaiser` (privat, benjaminkonopka-Account)
- Hardcoded PDF-URLs zum Ablösen: in `app/components/Menu.tsx` nach `drive.google.com` suchen (Zeilennummern können sich verschieben)
- Datenlayer-Skelett, an dem sich die CMS-API orientieren kann: `app/data/menuApi.ts`, `app/data/menuData.ts`
- Aktueller Fallback-Datenstand: `app/data/menuDataStatic.ts` (2026er Karte)
- Menu-TypeScript-Typen: `app/types/types.ts` — `MenuData`, `MenuCategory`, `MenuItem`. Die gleichen Typen **auch im CMS** verwenden, damit die API-Response direkt passt.

---

## Entscheidungen, die ich unterwegs für dich getroffen habe (check + verwerf wenn nicht passt)

1. **Drizzle statt Prisma** — schlanker, bessere Query-Performance, Better-Auth-Primärempfehlung.
2. **shadcn/ui** als UI-Baseline — kein Vendor-Lock-in, Tailwind-nativ, leicht customizable.
3. **Email/Password statt OAuth** zum Start — ein Anbieter weniger, Self-Signup ohne Google-Freigabe, Passwort-Reset-Flow kommt mit Better Auth out-of-the-box. OAuth kannst du später dazuschalten.
4. **Slug-basierte Org-URLs** (`/restaurant-kaiser`) statt UUIDs in der öffentlichen API — lesbar und SEO-freundlich.
5. **Overwrite-in-Place statt Versionierung im Storage** — wenn doch Versionshistorie gewünscht ist: in der DB loggen, nicht im Blob.
