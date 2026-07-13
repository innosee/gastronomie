'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  diffMenus,
  emptyCategory,
  emptyItem,
  type MenuChange,
  type StoredCategory,
  type StoredItem,
  type StoredMenu,
} from '@/lib/menu-data';
import {
  discardDraftAction,
  publishMenuAction,
  saveMenuAction,
  seedMenuAction,
} from './actions';

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

const CHANGE_STYLES: Record<MenuChange['kind'], { label: string; className: string }> = {
  added: { label: 'Neu', className: 'bg-emerald-100 text-emerald-900' },
  removed: { label: 'Entfernt', className: 'bg-red-100 text-red-900' },
  changed: { label: 'Geändert', className: 'bg-amber-100 text-amber-900' },
  visibility: { label: 'Sichtbarkeit', className: 'bg-blue-100 text-blue-900' },
  order: { label: 'Reihenfolge', className: 'bg-muted text-muted-foreground' },
};

// Der finale Check vor dem Livegang: zeigt genau das, was sich gegenüber der
// veröffentlichten Karte ändert — erst danach geht es auf die Website.
function PublishDialog({
  changes,
  isFirstPublish,
  isPublishing,
  onCancel,
  onConfirm,
}: {
  changes: MenuChange[];
  isFirstPublish: boolean;
  isPublishing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">Änderungen prüfen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFirstPublish
              ? 'Die Speisekarte war noch nie live. Damit geht sie zum ersten Mal auf die Website.'
              : `Das geht auf die Website — ${changes.length} ${
                  changes.length === 1 ? 'Änderung' : 'Änderungen'
                } gegenüber der aktuell veröffentlichten Karte.`}
          </p>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto px-5 py-4">
          {changes.map((change, index) => {
            const style = CHANGE_STYLES[change.kind];
            return (
              <div
                key={index}
                className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                >
                  {style.label}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{change.scope}</p>
                  {change.detail && (
                    <p className="text-xs text-muted-foreground">{change.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPublishing}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPublishing}>
            {isPublishing ? 'Wird veröffentlicht…' : 'Ja, jetzt live stellen'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function MenuEditor({
  slug,
  initialMenu,
  publishedMenu,
  publishedAt,
  hasSavedMenu,
}: {
  slug: string;
  initialMenu: StoredMenu;
  publishedMenu: StoredMenu | null;
  publishedAt: string | null;
  hasSavedMenu: boolean;
}) {
  const [menu, setMenu] = useState<StoredMenu>(initialMenu);
  // Der zuletzt veröffentlichte Stand — lokal mitgeführt, damit die
  // Änderungsliste nach einer Freigabe sofort wieder leer ist.
  const [published, setPublished] = useState<StoredMenu | null>(publishedMenu);
  const [publishedOn, setPublishedOn] = useState<string | null>(publishedAt);
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());
  const [showPublish, setShowPublish] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isSeeding, startSeed] = useTransition();
  const [isPublishing, startPublish] = useTransition();
  const [isDiscarding, startDiscard] = useTransition();

  const categories = menu.categories;

  // Was würde durch eine Freigabe live gehen?
  const changes = useMemo(() => diffMenus(published, menu), [published, menu]);
  const hasChanges = changes.length > 0;

  function handlePublish() {
    startPublish(async () => {
      const result = await publishMenuAction(slug, JSON.stringify(menu));
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      // Entwurf ist jetzt der veröffentlichte Stand → Änderungsliste ist leer.
      setPublished(menu);
      setPublishedOn(new Date().toISOString());
      setShowPublish(false);
      toast.success('Speisekarte ist live');
    });
  }

  function handleDiscard() {
    if (!confirm('Alle unveröffentlichten Änderungen verwerfen?')) return;
    startDiscard(async () => {
      const result = await discardDraftAction(slug);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.menu) {
        setMenu(result.menu);
        toast.success('Entwurf verworfen — zurück auf den Live-Stand');
      }
    });
  }

  function setCategories(next: StoredCategory[]) {
    setMenu({ categories: next });
  }

  function updateCategory(index: number, patch: Partial<StoredCategory>) {
    setCategories(categories.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function toggleOpen(index: number) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleSave() {
    startSave(async () => {
      const result = await saveMenuAction(slug, JSON.stringify(menu));
      if (result?.error) toast.error(result.error);
      else toast.success('Entwurf gespeichert — noch nicht live');
    });
  }

  function handleSeed() {
    startSeed(async () => {
      const result = await seedMenuAction(slug);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.menu) {
        // Direkt in den State übernehmen — die Komponente bleibt gemountet,
        // ein revalidatePath allein würde den alten (leeren) State stehen lassen.
        setMenu(result.menu);
        toast.success('Vorlage geladen');
      }
    });
  }

  const isEmpty = categories.length === 0;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm">
        <div className="space-y-0.5">
          <p className="text-sm">
            {hasChanges ? (
              <span className="font-medium text-foreground">
                {changes.length} {changes.length === 1 ? 'Änderung' : 'Änderungen'} noch nicht
                live
              </span>
            ) : (
              <span className="font-medium text-muted-foreground">
                {published ? 'Alles veröffentlicht' : 'Noch nichts veröffentlicht'}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {categories.length} Kategorien ·{' '}
            {categories.reduce((sum, c) => sum + c.items.length, 0)} Gerichte
            {publishedOn && ` · zuletzt live: ${formatDateTime(publishedOn)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCategories([...categories, emptyCategory()])}
            disabled={isSaving || isPublishing}
          >
            Kategorie hinzufügen
          </Button>
          {published && hasChanges && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDiscard}
              disabled={isDiscarding || isPublishing}
            >
              Entwurf verwerfen
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving || isPublishing}
          >
            {isSaving ? 'Speichert…' : 'Entwurf speichern'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowPublish(true)}
            disabled={!hasChanges || isPublishing}
          >
            Prüfen &amp; veröffentlichen
          </Button>
        </div>
      </div>

      {showPublish && (
        <PublishDialog
          changes={changes}
          isFirstPublish={!published}
          isPublishing={isPublishing}
          onCancel={() => setShowPublish(false)}
          onConfirm={handlePublish}
        />
      )}

      {isEmpty && !hasSavedMenu && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Noch keine Speisekarte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Du kannst die aktuelle Karte des Freiburger Kaiser als Startvorlage laden und
              von dort aus anpassen — inklusive der ausgeblendeten Spargelkarte.
            </p>
            <Button type="button" size="sm" onClick={handleSeed} disabled={isSeeding}>
              {isSeeding ? 'Lädt…' : 'Aktuelle Karte als Vorlage laden'}
            </Button>
          </CardContent>
        </Card>
      )}

      {categories.map((category, index) => (
        <CategoryCard
          key={index}
          category={category}
          index={index}
          isOpen={openCategories.has(index)}
          isLast={index === categories.length - 1}
          onToggleOpen={() => toggleOpen(index)}
          onChange={(patch) => updateCategory(index, patch)}
          onMove={(dir) => setCategories(move(categories, index, index + dir))}
          onRemove={() => {
            if (!confirm(`Kategorie „${category.name || 'ohne Namen'}“ wirklich löschen?`)) return;
            setCategories(categories.filter((_, i) => i !== index));
          }}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category,
  index,
  isOpen,
  isLast,
  onToggleOpen,
  onChange,
  onMove,
  onRemove,
}: {
  category: StoredCategory;
  index: number;
  isOpen: boolean;
  isLast: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<StoredCategory>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  function updateItem(itemIndex: number, patch: Partial<StoredItem>) {
    onChange({
      items: category.items.map((it, i) => (i === itemIndex ? { ...it, ...patch } : it)),
    });
  }

  return (
    <Card className={category.visible ? undefined : 'opacity-60'}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={category.name}
            placeholder="Kategoriename (z. B. Vorspeisen)"
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-8 max-w-xs"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={category.visible}
              onChange={(e) => onChange({ visible: e.target.checked })}
              className="size-4"
            />
            Sichtbar
          </label>
          <span className="text-xs text-muted-foreground">
            {category.items.length} Gerichte
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Nach oben"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              className="rounded px-1.5 text-xs hover:bg-muted disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Nach unten"
              disabled={isLast}
              onClick={() => onMove(1)}
              className="rounded px-1.5 text-xs hover:bg-muted disabled:opacity-30"
            >
              ↓
            </button>
            <Button type="button" size="sm" variant="ghost" onClick={onToggleOpen}>
              {isOpen ? 'Zuklappen' : 'Gerichte'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
              Löschen
            </Button>
          </div>
        </div>
        {!category.visible && (
          <CardTitle className="text-xs font-normal text-muted-foreground">
            Ausgeblendet — wird nicht an die Website ausgespielt.
          </CardTitle>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-3">
          {category.items.map((item, itemIndex) => (
            <ItemRow
              key={itemIndex}
              item={item}
              isLast={itemIndex === category.items.length - 1}
              onChange={(patch) => updateItem(itemIndex, patch)}
              onMove={(dir) =>
                onChange({ items: move(category.items, itemIndex, itemIndex + dir) })
              }
              onRemove={() =>
                onChange({ items: category.items.filter((_, i) => i !== itemIndex) })
              }
            />
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChange({ items: [...category.items, emptyItem()] })}
          >
            Gericht hinzufügen
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function ItemRow({
  item,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  item: StoredItem;
  isLast: boolean;
  onChange: (patch: Partial<StoredItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-start gap-2">
        <Input
          value={item.name}
          placeholder="Name des Gerichts"
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Nach oben"
            onClick={() => onMove(-1)}
            className="rounded px-1.5 text-xs hover:bg-muted"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Nach unten"
            disabled={isLast}
            onClick={() => onMove(1)}
            className="rounded px-1.5 text-xs hover:bg-muted disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Gericht entfernen"
            onClick={onRemove}
            className="rounded px-1.5 text-xs text-destructive hover:bg-muted"
          >
            ×
          </button>
        </div>
      </div>

      <textarea
        value={item.description}
        placeholder="Beschreibung (optional)"
        rows={2}
        onChange={(e) => onChange({ description: e.target.value })}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">Preis:</span>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={item.priceMode === 'single'}
            onChange={() => onChange({ priceMode: 'single' })}
            className="size-3.5"
          />
          Einzelpreis
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={item.priceMode === 'variants'}
            onChange={() =>
              onChange({
                priceMode: 'variants',
                variants: item.variants.length > 0 ? item.variants : [{ label: '', price: '' }],
              })
            }
            className="size-3.5"
          />
          Varianten (z. B. klein / groß)
        </label>
      </div>

      {item.priceMode === 'single' ? (
        <Input
          value={item.price}
          placeholder="z. B. 15,70 €"
          onChange={(e) => onChange({ price: e.target.value })}
          className="h-8 max-w-40"
        />
      ) : (
        <div className="space-y-2">
          {item.variants.map((variant, vIndex) => (
            <div key={vIndex} className="flex items-center gap-2">
              <Input
                value={variant.label}
                placeholder="Bezeichnung (z. B. klein)"
                onChange={(e) =>
                  onChange({
                    variants: item.variants.map((v, i) =>
                      i === vIndex ? { ...v, label: e.target.value } : v,
                    ),
                  })
                }
                className="h-8"
              />
              <Input
                value={variant.price}
                placeholder="z. B. 6,90 €"
                onChange={(e) =>
                  onChange({
                    variants: item.variants.map((v, i) =>
                      i === vIndex ? { ...v, price: e.target.value } : v,
                    ),
                  })
                }
                className="h-8 max-w-40"
              />
              <button
                type="button"
                aria-label="Variante entfernen"
                onClick={() =>
                  onChange({ variants: item.variants.filter((_, i) => i !== vIndex) })
                }
                className="rounded px-1.5 text-xs text-destructive hover:bg-muted"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ variants: [...item.variants, { label: '', price: '' }] })}
          >
            Variante hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}
