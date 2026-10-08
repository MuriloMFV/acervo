import { collectionPreviewItems } from './collection';
import type { CollectionItemDetailsPreview, ItemCondition, MovieDetailsPreview } from '../types/collectionDetails';

type MovieSupplement = Pick<MovieDetailsPreview, 'originalTitle' | 'director' | 'genres' | 'runtime' | 'overview'>;
const movieSupplements: Record<string, MovieSupplement> = {
  'preview-scream': { originalTitle: 'Scream', director: 'Wes Craven', genres: ['Terror', 'Mistério', 'Slasher'], runtime: 111, overview: 'Uma jovem e seus amigos são perseguidos por um assassino mascarado que transforma a cidade em cenário de um mistério.' },
  'preview-alien': { originalTitle: 'Alien', director: 'Ridley Scott', genres: ['Terror', 'Ficção científica'], runtime: 117, overview: 'A tripulação de uma nave encontra uma forma de vida desconhecida e precisa lutar pela sobrevivência.' },
  'preview-blade-runner': { originalTitle: 'Blade Runner 2049', director: 'Denis Villeneuve', genres: ['Ficção científica', 'Drama'], runtime: 164, overview: 'Um investigador descobre um segredo que o leva a procurar um antigo caçador de replicantes.' },
  'preview-twin-peaks': { originalTitle: 'Twin Peaks: Fire Walk with Me', director: 'David Lynch', genres: ['Mistério', 'Drama'], runtime: 135, overview: 'Os últimos dias de uma jovem revelam os segredos e as inquietações escondidos em uma pequena cidade.' },
  'preview-godfather': { originalTitle: 'The Godfather', director: 'Francis Ford Coppola', genres: ['Drama', 'Crime'], runtime: 175, overview: 'Um jovem é atraído para os negócios da família enquanto seu pai enfrenta disputas de poder.' },
  'preview-jaws': { originalTitle: 'Jaws', director: 'Steven Spielberg', genres: ['Suspense', 'Aventura'], runtime: 124, overview: 'Um chefe de polícia, um cientista e um pescador partem em busca de um tubarão que ameaça uma comunidade costeira.' },
  'preview-suspiria': { originalTitle: 'Suspiria', director: 'Dario Argento', genres: ['Terror', 'Mistério'], runtime: 99, overview: 'Uma estudante chega a uma academia de dança e encontra acontecimentos perturbadores por trás de sua rotina.' },
  'preview-matrix': { originalTitle: 'The Matrix', director: 'Lana e Lilly Wachowski', genres: ['Ficção científica', 'Ação'], runtime: 136, overview: 'Um programador descobre que a realidade que conhece esconde um sistema de controle.' },
  'preview-shining': { originalTitle: 'The Shining', director: 'Stanley Kubrick', genres: ['Terror', 'Drama'], runtime: 146, overview: 'Uma família passa o inverno em um hotel isolado, onde acontecimentos estranhos ameaçam sua convivência.' },
};
const conditions: ItemCondition[] = ['SEALED', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR'];

// Edition/acquisition values are illustrative, not verified physical releases.
export const collectionDetailsMocks: CollectionItemDetailsPreview[] = collectionPreviewItems.map((preview, index) => ({
  id: preview.id,
  movie: { title: preview.title, year: preview.year, poster: preview.poster, backdrop: null, ...movieSupplements[preview.id] },
  edition: {
    mediaFormat: preview.mediaFormat,
    region: preview.mediaFormat === 'VHS' ? null : preview.mediaFormat === 'DVD' ? 'Região 4' : 'Livre (ABC)',
    country: 'Brasil',
    publisher: null,
    barcode: index === 0 ? '0000000000000' : null,
    packagingType: index === 1 ? 'STEELBOOK' : 'STANDARD',
    ...(index === 1 ? { editionName: 'Edição de demonstração' } : {}),
  },
  copy: {
    condition: conditions[index % conditions.length],
    purchasePrice: index === 0 ? 49.9 : null,
    purchaseDate: index === 0 ? '2023-03-14' : null,
    favorite: index === 0,
  },
}));
