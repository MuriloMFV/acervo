export const distributors = [
  { id: 'fox', name: '20th Century Fox', aliases: ['Fox', '20th Century Fox Home Entertainment'] },
  { id: 'bbc', name: 'BBC', aliases: [] },
  { id: 'miramax', name: 'Miramax', aliases: ['Miramax Films'] },
  { id: 'columbia', name: 'Columbia Pictures', aliases: ['Columbia'] },
  { id: 'europa', name: 'Europa Filmes', aliases: [] },
  { id: 'playarte', name: 'PlayArte', aliases: ['Grupo PlayArte', 'PlayArte Filmes'] },
  { id: 'imagem', name: 'Imagem Filmes', aliases: [] },
  { id: 'marvel', name: 'Marvel Studios', aliases: [] },
  { id: 'mgm', name: 'MGM', aliases: ['Metro-Goldwyn-Mayer', 'MGM DVD', 'MGM Home Entertainment'] },
  { id: 'paramount', name: 'Paramount', aliases: ['Paramount Pictures', 'Paramount Home Entertainment'] },
  { id: 'touchstone', name: 'Touchstone Home Entertainment', aliases: ['Touchstone'] },
  { id: 'universal', name: 'Universal Pictures', aliases: ['Universal', 'Universal Pictures Home Entertainment'] },
  { id: 'disney', name: 'Walt Disney Home Entertainment', aliases: ['Disney', 'Walt Disney'] },
  { id: 'warner', name: 'Warner Bros.', aliases: ['Warner', 'Warner Brothers', 'Warner Home Video', 'Warner Bros. Home Video', 'Warner Bros. Home Entertainment', 'Warner Bros. Pictures'] },
  { id: 'sony', name: 'Sony Pictures Home Entertainment', aliases: ['Sony', 'Sony Pictures', 'SPHE'] },
] as const;

export type Distributor = (typeof distributors)[number];
export type DistributorId = Distributor['id'];
