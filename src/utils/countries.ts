import { countries } from '../data/countries.ts';

export type Country = (typeof countries)[number];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byName = new Map<string, Country>();
for (const country of countries) for (const value of [country.code, country.name, ...country.aliases]) byName.set(normalize(value), country);
const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export function findCountry(value: string | null | undefined): Country | null {
  return value ? byName.get(normalize(value)) ?? null : null;
}

export function countryFlag(code: string): string {
  const country = findCountry(code);
  return country ? String.fromCodePoint(...[...country.code].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65)) : '';
}

export function countryName(value: string | null | undefined): string {
  return findCountry(value)?.name ?? value?.trim() ?? '';
}

export function searchCountries(query: string): readonly Country[] {
  const exact = findCountry(query);
  if (exact) return [exact];
  const search = normalize(query);
  return search ? sorted.filter(country => [country.code, country.name, ...country.aliases].some(value => normalize(value).includes(search))) : sorted;
}
