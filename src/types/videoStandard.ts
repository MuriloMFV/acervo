export const videoStandards = ['NTSC', 'PAL', 'PAL-M', 'SECAM'] as const;
export type VideoStandard = (typeof videoStandards)[number];
