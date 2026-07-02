// Typen für den schema-getriebenen Content-Editor.
//
// Zwei Welten:
//  - ROH (Raw*): so, wie Werte in content.data (jsonb) liegen. Bilder als
//    { mediaId }, damit ein Bild an mehreren Stellen referenziert werden kann.
//  - AUFGELÖST (ImageValue/ContentValue/ContentResponse): der öffentliche
//    Contract der GET /content-Route. Bilder sind hier zu { url, alt, ... }
//    aufgelöst. Template-Sites kopieren DIESE Typen und validieren defensiv
//    mit zod (bei Fehlschlag → lokaler Fallback).

// ---------------------------------------------------------------------------
// Feld-Definitionen (statisches Schema pro Template)
// ---------------------------------------------------------------------------

export type ScalarFieldType = 'text' | 'richtext' | 'boolean';
export type FieldType = ScalarFieldType | 'image' | 'gallery' | 'list';

// In Listen-Einträgen erlaubte Feldtypen (keine verschachtelten Listen).
export type SubFieldType = ScalarFieldType | 'image' | 'gallery';

export type SubField = {
  key: string;
  label: string;
  type: SubFieldType;
  placeholder?: string;
};

export type ContentField = {
  key: string; // z. B. "home.hero.headline"
  label: string;
  type: FieldType;
  group: string; // Gruppen-/Seiten-Key (siehe ContentGroup)
  help?: string;
  placeholder?: string;
  fields?: SubField[]; // nur bei type === 'list'
  itemLabel?: string; // Label pro Listen-Eintrag, z. B. "Zimmer"
};

export type ContentGroup = { key: string; label: string };

export type ContentSchema = {
  template: string;
  groups: ContentGroup[];
  fields: ContentField[];
  // Default-/Seed-Werte je Feld-Key (roh). Bilder bleiben leer — dafür fällt
  // die Template-Site auf ihre lokalen Assets zurück.
  defaults: Record<string, RawContentValue>;
};

// ---------------------------------------------------------------------------
// Rohe (gespeicherte) Werte
// ---------------------------------------------------------------------------

export type MediaRef = { mediaId: string };
export type RawScalar = string | boolean;
export type RawListItem = Record<string, RawScalar | MediaRef | MediaRef[] | null>;
export type RawContentValue =
  | string
  | boolean
  | MediaRef
  | MediaRef[]
  | RawListItem[]
  | null;

// ---------------------------------------------------------------------------
// Aufgelöste (öffentliche) Werte — Contract für Template-Sites
// ---------------------------------------------------------------------------

export type ImageValue = {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type ResolvedListItem = Record<
  string,
  string | boolean | ImageValue | ImageValue[] | null
>;

export type ContentValue =
  | string
  | boolean
  | ImageValue
  | ImageValue[]
  | ResolvedListItem[]
  | null;

export type ContentResponse = {
  restaurant: { name: string; slug: string };
  content: Record<string, ContentValue>;
};
