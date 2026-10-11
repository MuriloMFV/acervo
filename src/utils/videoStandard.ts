import { videoStandards, type VideoStandard } from '../types/videoStandard.ts';

export function parseVideoStandard(value: unknown): VideoStandard | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !videoStandards.includes(value as VideoStandard)) throw new Error('Selecione uma codificação válida.');
  return value as VideoStandard;
}

export function legacyVideoStandard(region: string | null | undefined): VideoStandard | null {
  const value = region?.trim().toUpperCase().replace(/^PAL\s+M$/, 'PAL-M');
  return videoStandards.includes(value as VideoStandard) ? value as VideoStandard : null;
}

export type RegionEncodingSelection = { region: string; videoStandard: VideoStandard | null };
// A draft may interpret old encoding-only region text. It never modifies storage.
export function regionEncodingDraft(region: string, encoding: VideoStandard | null | undefined): RegionEncodingSelection {
  const legacy = legacyVideoStandard(region);
  return { region: legacy ? '' : region, videoStandard: encoding ?? legacy };
}
