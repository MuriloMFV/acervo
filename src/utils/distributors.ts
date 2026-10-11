import { distributors, type Distributor } from '../data/distributors.ts';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byName = new Map<string, Distributor>();
for (const distributor of distributors) {
  for (const value of [distributor.name, ...distributor.aliases]) byName.set(normalize(value), distributor);
}

// Only explicit names/aliases receive a logo. Custom and legacy text stays intact.
export function findDistributor(value: string | null | undefined): Distributor | null {
  return value ? byName.get(normalize(value)) ?? null : null;
}

export function distributorName(value: string | null | undefined): string {
  return findDistributor(value)?.name ?? value?.trim() ?? '';
}

export function searchDistributors(query: string): readonly Distributor[] {
  const search = normalize(query);
  return search ? distributors.filter(distributor => [distributor.name, ...distributor.aliases].some(value => normalize(value).includes(search))) : distributors;
}
