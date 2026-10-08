import type { CollectionItemDetailsPreview, ItemCondition, PackagingType } from '../types/collectionDetails';

export const conditionLabels: Record<ItemCondition, string> = {
  SEALED: 'Lacrado', LIKE_NEW: 'Como novo', VERY_GOOD: 'Muito bom', GOOD: 'Bom', FAIR: 'Regular',
};
export const packagingLabels: Record<PackagingType, string> = {
  STANDARD: 'Padrão', STEELBOOK: 'SteelBook', DIGIPAK: 'Digipak', BOX: 'Box',
};

export function findCollectionItemDetails(items: readonly CollectionItemDetailsPreview[], id: string | string[] | undefined) {
  return typeof id === 'string' ? items.find((item) => item.id === id) : undefined;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const calendar = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function formatPurchasePrice(value: number | null): string {
  return value === null ? '—' : currency.format(value);
}

export function formatPurchaseDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? '—' : calendar.format(date);
}

export function formatRuntime(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${remainder}min`;
}
