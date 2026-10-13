import type {ItemCondition} from '../supabase/types';
import type {NewCopyDetails} from '../collection/registration';
import {parseCopyForm} from '../collection/mappers.ts';
import {coverCorrectionNote} from './mappers.ts';

export class BarcodeCopyValidationError extends Error {
  constructor(message:string){super(message);this.name='BarcodeCopyValidationError';}
}
export function prepareBarcodeCopy(condition:ItemCondition,details:NewCopyDetails={},coverCorrection=false) {
  const notes=details.notes?.trim()??'';
  const correction=coverCorrection&&!notes.includes(coverCorrectionNote)?coverCorrectionNote:'';
  try {
    return parseCopyForm({condition,price:details.price??'',date:details.date??'',place:details.place??'',
      notes:[notes,correction].filter(Boolean).join('\n\n'),favorite:details.favorite??false});
  } catch(error) {
    throw new BarcodeCopyValidationError(error instanceof Error?error.message:'Confira os dados da cópia.');
  }
}
