import { getSupabaseClient } from '../supabase/client';
import { authenticatedUserId, findOrCreateMovie } from '../collection';
import { isCollectionItemId } from '../collection/mappers';
import type { MovieDetails } from '../../types/movieSearch';
import type { BoxFormValues, CollectionBoxRecord } from './types';
import { parseBoxForm, validateBoxMovieIds } from './mappers';
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
export async function createCollectionBox(form: BoxFormValues, movies: readonly MovieDetails[], expectedUserId: string): Promise<string> {
  validateBoxMovieIds(movies.map(movie=>movie.id));
  const {box,copy}=parseBoxForm(form);
  if (await authenticatedUserId()!==expectedUserId) throw new Error('Sessão alterada.');
  // Reuse existing Movie creation/TMDB mapping, with no physical Edition per included film.
  const movieIds: string[]=[];
  for (const movie of movies) movieIds.push((await findOrCreateMovie(movie)).id);
  if (await authenticatedUserId()!==expectedUserId) throw new Error('Sessão alterada.');
  const {data,error}=await getSupabaseClient().rpc('create_collection_box',{
    p_expected_user_id:expectedUserId,p_box:box,p_movie_ids:movieIds,p_copy:copy,
  });
  if (error) throw error;
  return data;
}
