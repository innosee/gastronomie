export const MENU_CATEGORIES = ['mittagskarte', 'getraenkekarte', 'alternative-mittagskarte'] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  mittagskarte: 'Mittagskarte',
  getraenkekarte: 'Getränkekarte',
  'alternative-mittagskarte': 'Alternative Mittagskarte',
};

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const PDF_MAGIC_BYTES = '%PDF-';

export function isMenuCategory(value: string): value is MenuCategory {
  return (MENU_CATEGORIES as readonly string[]).includes(value);
}
