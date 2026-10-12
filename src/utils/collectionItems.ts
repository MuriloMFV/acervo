import type { CollectionRecord } from '../services/collection/types';
import type { CollectionBoxRecord } from '../services/boxes/types';
import type { CollectionSort } from '../types/collectionFilters';
import { mapCollectionCard } from '../services/collection/mappers.ts';
import { mapBoxCard } from '../services/boxes/mappers.ts';
import { compareCollectionItems } from './collectionFilters.ts';
import { packagingLabels } from './collectionDetails.ts';

// Both views receive one ordered list. A box has no release year of its own.
export function mergeCollectionItems(movies: readonly CollectionRecord[], boxes: readonly CollectionBoxRecord[], sort: CollectionSort) {
  const entries = [
    ...movies.map(item => ({
      card: { ...mapCollectionCard(item), editionLabel: item.edition.edition_name?.trim() || [
        packagingLabels[item.edition.packaging_type], item.edition.is_special_edition ? 'Especial' : null,
        item.edition.is_limited_edition ? 'Limitada' : null,
      ].filter(Boolean).join(' · ') },
      createdAt: item.created_at, price: item.purchase_price,
    })),
    ...boxes.map(item => ({ card: mapBoxCard(item), createdAt: item.created_at, price: item.purchase_price })),
  ];
  return entries.sort((a, b) => compareCollectionItems(
    { ...a.card, createdAt: a.createdAt, price: a.price },
    { ...b.card, createdAt: b.createdAt, price: b.price }, sort,
  )).map(entry => entry.card);
}
