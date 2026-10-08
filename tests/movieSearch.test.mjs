import assert from 'node:assert/strict';
import test from 'node:test';
import { searchMovieCandidates, findMovieCandidate } from '../src/utils/movieSearch.ts';

const movies = [
  { id: 'scream', title: 'Pânico', originalTitle: 'Scream' },
  { id: 'scream-2', title: 'Pânico 2', originalTitle: 'Scream 2' },
  { id: 'matrix', title: 'Matrix', originalTitle: 'The Matrix' },
];

test('search finds movies by Portuguese title', () => {
  assert.deepEqual(searchMovieCandidates(movies, 'Pânico').map((movie) => movie.id), ['scream', 'scream-2']);
});
test('search finds movies by original title', () => {
  assert.deepEqual(searchMovieCandidates(movies, 'Scream 2'), [movies[1]]);
  assert.deepEqual(searchMovieCandidates(movies, 'The Matrix'), [movies[2]]);
});
test('search ignores case and leading/trailing spaces', () => {
  assert.deepEqual(searchMovieCandidates(movies, '  PÂNICO  '), movies.slice(0, 2));
  assert.deepEqual(searchMovieCandidates(movies, ' sCrEaM 2 '), [movies[1]]);
});
test('empty search returns suggestions without changing their order', () => {
  assert.equal(searchMovieCandidates(movies, ''), movies);
  assert.equal(searchMovieCandidates(movies, '   '), movies);
});
test('unmatched search returns an empty list without mutating the candidates', () => {
  const frozen = Object.freeze(movies.map((movie) => Object.freeze({ ...movie })));
  assert.deepEqual(searchMovieCandidates(frozen, 'inexistente'), []);
  assert.deepEqual(searchMovieCandidates(frozen, 'Matrix'), [movies[2]]);
  assert.deepEqual(frozen, movies);
});
test('selection resolves a candidate id and rejects missing or ambiguous ids', () => {
  assert.equal(findMovieCandidate(movies, 'scream-2'), movies[1]);
  for (const id of ['unknown', undefined, ['scream', 'scream-2']]) {
    assert.equal(findMovieCandidate(movies, id), undefined);
  }
});
