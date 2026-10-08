import { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { CollectionFilters, CollectionShortcut } from '../types/collectionFilters';
import { defaultCollectionFilters, filtersForShortcut, hasActiveFilters } from '../utils/collectionFilters';

interface FiltersState {
  filters: CollectionFilters;
  setFilters: Dispatch<SetStateAction<CollectionFilters>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  active: boolean;
  reset: () => void;
  applyShortcut: (value: CollectionShortcut) => void;
}
const Context = createContext<FiltersState | null>(null);
export function CollectionFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(defaultCollectionFilters);
  const [search, setSearch] = useState('');
  const reset = useCallback(() => { setFilters(defaultCollectionFilters()); setSearch(''); }, []);
  const applyShortcut = useCallback((value: CollectionShortcut) => { setFilters(filtersForShortcut(value)); setSearch(''); }, []);
  return <Context.Provider value={{ filters, setFilters, search, setSearch, active: hasActiveFilters(filters), reset, applyShortcut }}>{children}</Context.Provider>;
}
export function useCollectionFilters() {
  const state = useContext(Context);
  if (!state) throw new Error('CollectionFiltersProvider ausente');
  return state;
}
