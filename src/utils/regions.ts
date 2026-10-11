import type { MediaFormat } from '../types/collectionPreview';

export type RegionChoice = { value: string; label: string };
const unspecified: RegionChoice = { value: '', label: 'Não informado' };
const free: RegionChoice = { value: 'Livre', label: 'Livre (todas as regiões)' };
// Region conventions: Sony support articles 00022799 (DVD) and 00029369 (Blu-ray/4K).
const dvd: RegionChoice[] = ['1', '2', '3', '4', '5', '6'].map(value => ({ value, label: `Região ${value}` }));
const bluray: RegionChoice[] = ['A', 'B', 'C'].map(value => ({ value, label: `Região ${value}` }));
const video: RegionChoice[] = ['NTSC', 'PAL', 'PAL-M', 'SECAM'].map(value => ({ value, label: value }));
const presets = [unspecified, ...dvd, ...bluray, free, ...video];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/^(REGIAO|REGION)\s*/, '').replace(/[^A-Z0-9]/g, '');
const freeAliases = new Set(['0', 'ALL', 'ABC', 'FREE', 'LIVRE', 'TODAS', 'TODASASREGIOES', 'SEMREGIAO']);

// Matching is display-only. Opening a form must not rewrite a legacy value.
export function regionSelection(value: string | null | undefined): string {
  const text = value?.trim() ?? '';
  const normalized = normalize(text);
  if (freeAliases.has(normalized)) return free.value;
  return presets.find(option => normalize(option.value) === normalized)?.value ?? text;
}

export function regionLabel(value: string | null | undefined): string {
  const selected = regionSelection(value);
  return presets.find(option => option.value === selected)?.label ?? selected;
}

export function regionChoices(format: MediaFormat | null | undefined, current: string): readonly RegionChoice[] {
  const options = format === 'DVD' ? [...dvd, free]
    : format === 'BLURAY' ? [...bluray, free]
    : format === 'UHD_4K' ? [free]
    : format === 'VHS' ? []
    : [...dvd, ...bluray, free];
  const selected = regionSelection(current);
  const legacy = selected && !options.some(option => option.value === selected)
    ? [{ value: current.trim(), label: `${regionLabel(current)} (atual)` }]
    : [];
  return [unspecified, ...legacy, ...options];
}
