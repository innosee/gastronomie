// Reine Helfer für den Content-Editor: Normalisierung/Validierung der rohen
// Werte gegen das Schema, Merge mit Defaults und Einsammeln referenzierter
// mediaIds (für die org-Eigentümer-Prüfung beim Speichern).
// Keine DB-Zugriffe hier — die machen page.tsx / actions.ts.

import type {
  ContentField,
  ContentSchema,
  MediaRef,
  RawContentValue,
  RawListItem,
  SubField,
} from './content-schema/types';

export function isMediaRef(value: unknown): value is MediaRef {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { mediaId?: unknown }).mediaId === 'string'
  );
}

function emptyForType(field: ContentField): RawContentValue {
  switch (field.type) {
    case 'boolean':
      return false;
    case 'image':
      return null;
    case 'gallery':
    case 'list':
      return [];
    default:
      return '';
  }
}

function normalizeSubValue(sub: SubField, raw: unknown): RawListItem[string] {
  switch (sub.type) {
    case 'boolean':
      return raw === true || raw === 'true';
    case 'image':
      return isMediaRef(raw) ? { mediaId: raw.mediaId } : null;
    case 'gallery':
      return Array.isArray(raw)
        ? raw.filter(isMediaRef).map((r) => ({ mediaId: r.mediaId }))
        : [];
    default:
      return typeof raw === 'string' ? raw : '';
  }
}

function normalizeListItem(subs: SubField[], item: unknown): RawListItem {
  const out: RawListItem = {};
  const obj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  for (const sub of subs) out[sub.key] = normalizeSubValue(sub, obj[sub.key]);
  return out;
}

// Bringt einen eingehenden (unsicheren) Wert in die exakte Form, die der
// Feldtyp erlaubt — unbekannte Felder/Extras fallen weg.
export function normalizeFieldValue(field: ContentField, raw: unknown): RawContentValue {
  switch (field.type) {
    case 'boolean':
      return raw === true || raw === 'true';
    case 'image':
      return isMediaRef(raw) ? { mediaId: raw.mediaId } : null;
    case 'gallery':
      return Array.isArray(raw)
        ? raw.filter(isMediaRef).map((r) => ({ mediaId: r.mediaId }))
        : [];
    case 'list':
      return Array.isArray(raw) && field.fields
        ? raw.map((item) => normalizeListItem(field.fields as SubField[], item))
        : [];
    default:
      return typeof raw === 'string' ? raw : '';
  }
}

// Sammelt alle referenzierten mediaIds aus einem rohen Wert (rekursiv).
export function collectMediaIds(value: RawContentValue): string[] {
  const ids: string[] = [];
  const visit = (v: unknown): void => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    const obj = v as Record<string, unknown>;
    if (typeof obj.mediaId === 'string') {
      ids.push(obj.mediaId);
      return;
    }
    for (const key of Object.keys(obj)) visit(obj[key]);
  };
  visit(value);
  return ids;
}

// Legt für jeden Schema-Key den aktuell zu editierenden Wert fest:
// gespeicherter Wert, sonst Default, sonst leer je nach Typ.
export function mergeWithDefaults(
  schema: ContentSchema,
  saved: Record<string, RawContentValue>,
): Record<string, RawContentValue> {
  const out: Record<string, RawContentValue> = {};
  for (const field of schema.fields) {
    if (field.key in saved) out[field.key] = saved[field.key];
    else if (field.key in schema.defaults) out[field.key] = schema.defaults[field.key];
    else out[field.key] = emptyForType(field);
  }
  return out;
}
