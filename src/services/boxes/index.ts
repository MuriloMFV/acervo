import { getSupabaseClient } from '../supabase/client';
import { authenticatedUserId, findOrCreateMovie } from '../collection';
import { isCollectionItemId } from '../collection/mappers';
import type { MovieDetails } from '../../types/movieSearch';
import type { BoxFormValues, BoxMovieSelection, CollectionBoxRecord } from './types';
import { parseBoxForm } from './mappers';
import { BoxChangedError, resolveBoxMovieIds, validateBoxSelection } from './editing';
import { storedEditionCover } from '../covers/storage';
const relations = '*,box_set:box_sets!inner(*,movies:box_set_movies(position,movie:movies!inner(*)))' as const;
export async function listCollectionBoxes(signal?: AbortSignal): Promise<CollectionBoxRecord[]> {
  const userId = await authenticatedUserId();
  let query = getSupabaseClient().from('collection_boxes').select(relations).eq('user_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false});
  if (signal) query = query.abortSignal(signal);
  const items: CollectionBoxRecord[] = [];
  for (let offset=0;;offset+=500) {
    const { data,error } = await query.range(offset,offset+499);
    if (error) throw error;
    items.push(...data);
    if (data.length<500) return items;
  }
}
export async function getCollectionBox(id: string, signal?: AbortSignal): Promise<CollectionBoxRecord | null> {
  if (!isCollectionItemId(id)) return null;
  const userId = await authenticatedUserId();
  let query = getSupabaseClient().from('collection_boxes').select(relations).eq('user_id',userId).eq('id',id);
  if (signal) query=query.abortSignal(signal);
  const {data,error}=await query.maybeSingle();
  if (error) throw error;
  return data;
}
async function prepareBoxSave(form: BoxFormValues, movies: readonly BoxMovieSelection[], expectedUserId: string, loadMovie: (id: string) => Promise<MovieDetails>, original?: CollectionBoxRecord) {
  validateBoxSelection(movies);
  const {box,copy}=parseBoxForm(form);
  if (original && original.user_id !== expectedUserId) throw new Error('Box indisponível.');
  const existingIds = new Set(original?.box_set.movies.map(link => link.movie.id));
  if (movies.some(movie => movie.storedMovieId && !existingIds.has(movie.storedMovieId))) throw new Error('Filme inválido. Reabra o box.');
  if (await authenticatedUserId()!==expectedUserId) throw new Error('Sessão alterada.');
  if (box.cover_url && box.cover_url !== original?.box_set.cover_url) storedEditionCover(box.cover_url, getSupabaseClient().storage.from('edition-covers').getPublicUrl('').data.publicUrl);
  const movieIds = await resolveBoxMovieIds(movies, async movie => {
    if (await authenticatedUserId()!==expectedUserId) throw new Error('Sessão alterada.');
    return (await findOrCreateMovie(await loadMovie(movie.id))).id;
  });
  if (await authenticatedUserId()!==expectedUserId) throw new Error('Sessão alterada.');
  return {box,copy,movieIds};
}
export async function createCollectionBox(form: BoxFormValues, movies: readonly BoxMovieSelection[], expectedUserId: string, loadMovie: (id: string) => Promise<MovieDetails>): Promise<string> {
  const {box,copy,movieIds} = await prepareBoxSave(form,movies,expectedUserId,loadMovie);
  const {data,error}=await getSupabaseClient().rpc('create_collection_box',{
    p_expected_user_id:expectedUserId,p_box:box,p_movie_ids:movieIds,p_copy:copy,
  });
  if (error) throw error;
  return data;
}
export async function editCollectionBox(original: CollectionBoxRecord, form: BoxFormValues, movies: readonly BoxMovieSelection[], expectedUserId: string, loadMovie: (id: string) => Promise<MovieDetails>): Promise<string> {
  const {box,copy,movieIds} = await prepareBoxSave(form,movies,expectedUserId,loadMovie,original);
  const {data,error} = await getSupabaseClient().rpc('edit_collection_box', {
    p_item_id: original.id, p_expected_box_set_id: original.box_set_id,
    p_expected_box_updated_at: original.box_set.updated_at, p_expected_copy_updated_at: original.updated_at,
    p_box: box, p_copy: copy, p_movie_ids: movieIds,
  });
  if (error?.code === '40001') throw new BoxChangedError();
  if (error) throw new Error('Não foi possível salvar o box. Confira a conexão e tente novamente.');
  return data;
}
