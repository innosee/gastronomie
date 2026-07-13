'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  emptyCategory,
  emptyItem,
  type StoredCategory,
  type StoredItem,
  type StoredMenu,
} from '@/lib/menu-data';
import { saveMenuAction, seedMenuAction } from './actions';

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
  hasSavedMenu,
}: {
  slug: string;
  initialMenu: StoredMenu;
  hasSavedMenu: boolean;
}) {
  const [menu, setMenu] = useState<StoredMenu>(initialMenu);
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());
  const [isSaving, startSave] = useTransition();
  const [isSeeding, startSeed] = useTransition();

  const categories = menu.categories;

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
      else toast.success('Speisekarte gespeichert');
    });
  }

  function handleSeed() {
    startSeed(async () => {
      const result = await seedMenuAction(slug);
      if (result?.error) toast.error(result.error);
      else toast.success('Vorlage geladen — Seite wird aktualisiert');
    });
  }

  const isEmpty = categories.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {categories.length} Kategorien ·{' '}
          {categories.reduce((sum, c) => sum + c.items.length, 0)} Gerichte
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCategories([...categories, emptyCategory()])}
            disabled={isSaving}
          >
            Kategorie hinzufügen
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Speichert…' : 'Speichern'}
          </Button>
        </div>
      </div>

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
