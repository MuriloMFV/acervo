// A candidate work, independent of editions and the user's collection copies.
export interface MovieSearchCandidate {
  id: string;
  title: string;
  originalTitle: string;
  year: number | null;
  director?: string;
  posterUrl: string | null;
}

export interface MovieDetails extends MovieSearchCandidate {
  overview: string | null;
  runtime: number | null;
  backdropUrl: string | null;
  genres: string[];
}
