// External response shapes stay inside this service boundary.
export interface TmdbMovie {
  id: number;
  title?: string | null;
  original_title?: string | null;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  runtime?: number | null;
  genres?: { name: string }[];
  credits?: { crew?: { job: string; name: string }[] };
}

export interface TmdbSearchResponse {
  results?: TmdbMovie[];
}
