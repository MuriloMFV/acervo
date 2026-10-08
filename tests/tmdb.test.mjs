import assert from 'node:assert/strict';
import test from 'node:test';
import { mapMovieCandidate, mapMovieDetails, extractReleaseYear, buildPosterUrl } from '../src/services/tmdb/mappers.ts';
import { searchMovies, getMovieDetails } from '../src/services/tmdb/movies.ts';
import { TmdbError } from '../src/services/tmdb/client.ts';

const fixture = { id: 4232, title: 'Pânico', original_title: 'Scream', release_date: '1996-12-20', poster_path: '/poster.jpg' };

test('details include available synopsis, runtime, backdrop, genres and directors from credits', () => {
  const result = mapMovieDetails({ ...fixture, overview: ' Sinopse ', runtime: 111, backdrop_path: '/scene.jpg', genres: [{ name: 'Terror' }, { name: 'Terror' }, { name: 'Mistério' }], credits: { crew: [{ job: 'Director', name: 'Wes Craven' }, { job: 'Writer', name: 'Kevin Williamson' }] } });
  assert.equal(result.overview, 'Sinopse');
  assert.equal(result.runtime, 111);
  assert.equal(result.backdropUrl, 'https://image.tmdb.org/t/p/w780/scene.jpg');
  assert.deepEqual(result.genres, ['Terror', 'Mistério']);
  assert.equal(result.director, 'Wes Craven');
  const missing = mapMovieDetails(fixture);
  assert.equal(missing.overview, null);
  assert.equal(missing.runtime, null);
  assert.equal(missing.backdropUrl, null);
  assert.equal(missing.director, undefined);
  assert.deepEqual(missing.genres, []);
});

test('mapper returns only internal fields and preserves translated and original titles', () => {
  assert.deepEqual(mapMovieCandidate(fixture), { id: '4232', title: 'Pânico', originalTitle: 'Scream', year: 1996, posterUrl: 'https://image.tmdb.org/t/p/w185/poster.jpg' });
});
test('year extraction tolerates missing dates and rejects malformed or impossible dates', () => {
  assert.equal(extractReleaseYear('2000-02-29'), 2000);
  for (const date of [undefined, null, '', '1996', 'invalid', '2001-02-29', '2020-13-01']) assert.equal(extractReleaseYear(date), null);
});
test('poster URLs use the central image configuration and handle absent or unsafe paths', () => {
  assert.equal(buildPosterUrl('/a-1_2.jpg'), 'https://image.tmdb.org/t/p/w185/a-1_2.jpg');
  for (const path of [null, undefined, '', 'https://example.com/a.jpg', '/../a.jpg', '/a.jpg?x=1']) assert.equal(buildPosterUrl(path), null);
});
test('mapper falls back for absent fields without fabricating year or director', () => {
  assert.deepEqual(mapMovieCandidate({ id: 1 }), { id: '1', title: 'Título indisponível', originalTitle: 'Título indisponível', year: null, posterUrl: null });
  assert.equal(mapMovieCandidate({ id: 2, title: ' ', original_title: 'Original' }).title, 'Original');
  assert.equal(mapMovieCandidate({ id: 2, title: 'Traduzido' }).originalTitle, 'Traduzido');
});

test('blank query performs no network call, including without a configured token', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected network call'); });
  assert.deepEqual(await searchMovies('  '), []);
  assert.equal(fetch.mock.callCount(), 0);
});
test('missing token rejects safely before networking', async (t) => {
  const saved = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
  delete process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
  t.after(() => { if (saved === undefined) delete process.env.EXPO_PUBLIC_TMDB_READ_TOKEN; else process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = saved; });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected network call'); });
  await assert.rejects(searchMovies('Pânico'), (error) => error instanceof TmdbError && error.kind === 'configuration');
  assert.equal(fetch.mock.callCount(), 0);
});
test('services use pt-BR, forward cancellation and return mapped results without per-item calls', async (t) => {
  const saved = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
  process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = 'test-fixture-token';
  t.after(() => { if (saved === undefined) delete process.env.EXPO_PUBLIC_TMDB_READ_TOKEN; else process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = saved; });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.includes('/search/movie') ? { results: [fixture, { id: -1 }, null] } : fixture };
  });
  const controller = new AbortController();
  assert.deepEqual(await searchMovies(' Pânico ', controller.signal), [mapMovieCandidate(fixture)]);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('language'), 'pt-BR');
  assert.equal(url.searchParams.get('query'), 'Pânico');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-fixture-token');
  assert.equal(calls[0].options.signal.aborted, false);
  assert.deepEqual(await getMovieDetails('4232'), mapMovieDetails(fixture));
  assert.equal(new URL(calls[1].url).searchParams.get('append_to_response'), 'credits');
  assert.equal(calls.length, 2);
});
test('HTTP failures and malformed response bodies are sanitized', async (t) => {
  const saved = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
  process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = 'test-fixture-token';
  t.after(() => { if (saved === undefined) delete process.env.EXPO_PUBLIC_TMDB_READ_TOKEN; else process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = saved; });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 401 }));
  await assert.rejects(searchMovies('Pânico'), (error) => error.kind === 'http' && error.status === 401 && !error.message.includes('test-fixture-token'));
  fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: null }) }));
  await assert.rejects(searchMovies('Pânico'), (error) => error.kind === 'response');
  await assert.rejects(getMovieDetails('invalid'), (error) => error.kind === 'response');
});

test('external cancellation reaches the fetch signal', async (t) => {
  const saved = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN;
  process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = 'test-fixture-token';
  t.after(() => { if (saved === undefined) delete process.env.EXPO_PUBLIC_TMDB_READ_TOKEN; else process.env.EXPO_PUBLIC_TMDB_READ_TOKEN = saved; });
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const controller = new AbortController();
  const pending = searchMovies('Pânico', controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error.kind === 'network');
  assert.equal(requestSignal.aborted, true);
});
