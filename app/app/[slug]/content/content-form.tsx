'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  ContentField,
  ContentSchema,
  MediaRef,
  RawContentValue,
  RawListItem,
  SubField,
  SubFieldType,
} from '@/lib/content-schema';
import { saveContentGroupAction } from './actions';

export type MediaLite = { id: string; url: string; alt: string | null };

type PickerRequest = { onPick: (mediaId: string) => void };

function isMediaRef(v: unknown): v is MediaRef {
  return !!v && typeof v === 'object' && typeof (v as MediaRef).mediaId === 'string';
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function emptyListItem(fields: SubField[]): RawListItem {
  const item: RawListItem = {};
  for (const f of fields) {
    item[f.key] = f.type === 'boolean' ? false : f.type === 'gallery' ? [] : f.type === 'image' ? null : '';
  }
  return item;
}

export function ContentForm({
  slug,
  schema,
  initialValues,
  media,
}: {
  slug: string;
  schema: ContentSchema;
  initialValues: Record<string, RawContentValue>;
  media: MediaLite[];
}) {
  const [values, setValues] = useState<Record<string, RawContentValue>>(initialValues);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const mediaMap = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);

  function setValue(key: string, value: RawContentValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const openPicker = (onPick: (mediaId: string) => void) => setPicker({ onPick });

  return (
    <div className="space-y-6">
      {schema.groups.map((group) => {
        const fields = schema.fields.filter((f) => f.group === group.key);
        if (fields.length === 0) return null;
        return (
          <GroupSection
            key={group.key}
            slug={slug}
            groupKey={group.key}
            title={group.label}
            fields={fields}
            values={values}
            setValue={setValue}
            mediaMap={mediaMap}
            openPicker={openPicker}
          />
        );
      })}

      {picker && (
        <MediaPickerModal
          media={media}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            picker.onPick(id);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function GroupSection({
  slug,
  groupKey,
  title,
  fields,
  values,
  setValue,
  mediaMap,
  openPicker,
}: {
  slug: string;
  groupKey: string;
  title: string;
  fields: ContentField[];
  values: Record<string, RawContentValue>;
  setValue: (key: string, value: RawContentValue) => void;
  mediaMap: Map<string, MediaLite>;
  openPicker: (onPick: (mediaId: string) => void) => void;
}) {
  const [isSaving, startSave] = useTransition();

  function handleSave() {
    const payload: Record<string, RawContentValue> = {};
    for (const field of fields) payload[field.key] = values[field.key] ?? null;
    startSave(async () => {
      const result = await saveContentGroupAction(slug, groupKey, JSON.stringify(payload));
      if (result?.error) toast.error(result.error);
      else toast.success(`${title} gespeichert`);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Speichert…' : 'Speichern'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => setValue(field.key, v)}
            mediaMap={mediaMap}
            openPicker={openPicker}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  mediaMap,
  openPicker,
}: {
  field: ContentField;
  value: RawContentValue;
  onChange: (value: RawContentValue) => void;
  mediaMap: Map<string, MediaLite>;
  openPicker: (onPick: (mediaId: string) => void) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {field.type === 'list' && field.fields ? (
        <ListControl
          fields={field.fields}
          itemLabel={field.itemLabel ?? 'Eintrag'}
          value={Array.isArray(value) ? (value as RawListItem[]) : []}
          onChange={(v) => onChange(v)}
          mediaMap={mediaMap}
          openPicker={openPicker}
        />
      ) : (
        <FieldControl
          type={field.type as SubFieldType}
          value={value}
          onChange={onChange}
          mediaMap={mediaMap}
          openPicker={openPicker}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

// Steuerelement für alle nicht-Listen-Typen (auch in Listen-Einträgen wiederverwendet).
function FieldControl({
  type,
  value,
  onChange,
  mediaMap,
  openPicker,
  placeholder,
}: {
  type: SubFieldType;
  value: RawContentValue;
  onChange: (value: RawContentValue) => void;
  mediaMap: Map<string, MediaLite>;
  openPicker: (onPick: (mediaId: string) => void) => void;
  placeholder?: string;
}) {
  if (type === 'text') {
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (type === 'richtext') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    );
  }
  if (type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4"
        />
        Aktiv
      </label>
    );
  }
  if (type === 'image') {
    const ref = isMediaRef(value) ? value : null;
    const item = ref ? mediaMap.get(ref.mediaId) : null;
    return (
      <div className="flex items-center gap-3">
        {item ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt ?? ''} className="h-16 w-16 rounded-md border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            leer
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => openPicker((id) => onChange({ mediaId: id }))}
        >
          {ref ? 'Ändern' : 'Auswählen'}
        </Button>
        {ref && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            Entfernen
          </Button>
        )}
      </div>
    );
  }
  // gallery
  const refs: MediaRef[] = Array.isArray(value) ? (value as MediaRef[]).filter(isMediaRef) : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {refs.map((ref, index) => {
          const item = mediaMap.get(ref.mediaId);
          return (
            <div key={`${ref.mediaId}-${index}`} className="group relative">
              {item ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.alt ?? ''} className="h-16 w-16 rounded-md border object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md border text-xs text-muted-foreground">
                  ?
                </div>
              )}
              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  aria-label="Nach links"
                  onClick={() => onChange(move(refs, index, index - 1))}
                  className="rounded px-1 text-xs hover:bg-muted"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Entfernen"
                  onClick={() => onChange(refs.filter((_, i) => i !== index))}
                  className="rounded px-1 text-xs text-destructive hover:bg-muted"
                >
                  ×
                </button>
                <button
                  type="button"
                  aria-label="Nach rechts"
                  onClick={() => onChange(move(refs, index, index + 1))}
                  className="rounded px-1 text-xs hover:bg-muted"
                >
                  →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => openPicker((id) => onChange([...refs, { mediaId: id }]))}
      >
        Bild hinzufügen
      </Button>
    </div>
  );
}

function ListControl({
  fields,
  itemLabel,
  value,
  onChange,
  mediaMap,
  openPicker,
}: {
  fields: SubField[];
  itemLabel: string;
  value: RawListItem[];
  onChange: (value: RawListItem[]) => void;
  mediaMap: Map<string, MediaLite>;
  openPicker: (onPick: (mediaId: string) => void) => void;
}) {
  function updateItem(index: number, key: string, subValue: RawContentValue) {
    // Unterfelder sind nie vom Typ 'list' → der Wert passt in RawListItem.
    const narrowed = subValue as RawListItem[string];
    onChange(value.map((item, i) => (i === index ? { ...item, [key]: narrowed } : item)));
  }

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={index} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {itemLabel} {index + 1}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Nach oben"
                onClick={() => onChange(move(value, index, index - 1))}
                className="rounded px-1.5 text-xs hover:bg-muted"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Nach unten"
                onClick={() => onChange(move(value, index, index + 1))}
                className="rounded px-1.5 text-xs hover:bg-muted"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Entfernen"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="rounded px-1.5 text-xs text-destructive hover:bg-muted"
              >
                Entfernen
              </button>
            </div>
          </div>
          {fields.map((sub) => (
            <div key={sub.key} className="space-y-1.5">
              <Label className="text-xs">{sub.label}</Label>
              <FieldControl
                type={sub.type}
                value={item[sub.key] ?? null}
                onChange={(v) => updateItem(index, sub.key, v)}
                mediaMap={mediaMap}
                openPicker={openPicker}
                placeholder={sub.placeholder}
              />
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onChange([...value, emptyListItem(fields)])}
      >
        {itemLabel} hinzufügen
      </Button>
    </div>
  );
}

function MediaPickerModal({
  media,
  onClose,
  onSelect,
}: {
  media: MediaLite[];
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Bild auswählen</h2>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Schließen
          </Button>
        </div>
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Bilder. Lade zuerst unter „Medien“ welche hoch.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className="overflow-hidden rounded-md border hover:ring-2 hover:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt ?? ''} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
