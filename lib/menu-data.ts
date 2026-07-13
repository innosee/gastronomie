// Die strukturierte Speisekarte (à la carte) — Datenmodell, Validierung und
// Mapping auf den öffentlichen Contract.
//
// Zwei Formen:
//  - StoredMenu: was in menu.data (jsonb) liegt. Editor-freundlich — Preis als
//    Modus + Felder statt Union, plus `visible` je Kategorie (damit Saisonkarten
//    aus- statt weggeblendet werden können).
//  - MenuData: was die öffentliche Route ausliefert. Exakt die Form, die die
//    Template-Site (kaiser: app/types/types.ts) heute schon erwartet — dadurch
//    muss dort weder Menu.tsx noch der Typ angefasst werden.

import { z } from 'zod';

// --- Gespeicherte Form -----------------------------------------------------

export type PriceVariant = { label: string; price: string };

export type StoredItem = {
  name: string;
  description: string; // '' = keine Beschreibung
  priceMode: 'single' | 'variants';
  price: string; // bei priceMode 'single'
  variants: PriceVariant[]; // bei priceMode 'variants'; Reihenfolge = Anzeigereihenfolge
};

export type StoredCategory = {
  name: string;
  visible: boolean;
  items: StoredItem[];
};

export type StoredMenu = { categories: StoredCategory[] };

export const EMPTY_MENU: StoredMenu = { categories: [] };

// --- Öffentlicher Contract (= MenuData der Template-Site) -------------------

export type MenuItemPublic = {
  name: string;
  description?: string;
  price: string | Record<string, string>;
};

export type MenuCategoryPublic = { name: string; items: MenuItemPublic[] };

export type MenuDataPublic = { categories: MenuCategoryPublic[] };

// --- Validierung -----------------------------------------------------------

const priceVariantSchema = z.object({
  label: z.string().trim().min(1, 'Varianten-Bezeichnung fehlt').max(120),
  price: z.string().trim().max(60),
});

const storedItemSchema = z.object({
  name: z.string().trim().min(1, 'Gericht braucht einen Namen').max(300),
  description: z.string().trim().max(1000).default(''),
  priceMode: z.enum(['single', 'variants']),
  price: z.string().trim().max(60).default(''),
  variants: z.array(priceVariantSchema).max(10).default([]),
});

const storedCategorySchema = z.object({
  name: z.string().trim().min(1, 'Kategorie braucht einen Namen').max(200),
  visible: z.boolean(),
  items: z.array(storedItemSchema).max(200),
});

export const storedMenuSchema = z.object({
  categories: z.array(storedCategorySchema).max(50),
});

export function parseStoredMenu(value: unknown): StoredMenu {
  return storedMenuSchema.parse(value);
}

// Toleranter Parser fürs Lesen aus der DB: liefert bei kaputten/alten Daten ein
// leeres Menü statt zu werfen, damit das Dashboard nicht komplett bricht.
export function safeParseStoredMenu(value: unknown): StoredMenu {
  const result = storedMenuSchema.safeParse(value);
  return result.success ? result.data : EMPTY_MENU;
}

// --- Mapping StoredMenu → öffentlicher Contract -----------------------------

function toPublicPrice(item: StoredItem): string | Record<string, string> {
  if (item.priceMode === 'single') return item.price;
  // Object.fromEntries erhält die Array-Reihenfolge → die Site rendert die
  // Varianten in genau der Reihenfolge, in der sie eingegeben wurden.
  return Object.fromEntries(item.variants.map((v) => [v.label, v.price]));
}

export function toMenuData(stored: StoredMenu): MenuDataPublic {
  return {
    categories: stored.categories
      .filter((category) => category.visible)
      .map((category) => ({
        name: category.name,
        items: category.items.map((item) => ({
          name: item.name,
          // Leere Beschreibung weglassen — die Site prüft auf `item.description &&`.
          ...(item.description ? { description: item.description } : {}),
          price: toPublicPrice(item),
        })),
      })),
  };
}

// --- Helfer fürs Formular ---------------------------------------------------

export const emptyItem = (): StoredItem => ({
  name: '',
  description: '',
  priceMode: 'single',
  price: '',
  variants: [],
});

export const emptyCategory = (): StoredCategory => ({
  name: '',
  visible: true,
  items: [],
});
