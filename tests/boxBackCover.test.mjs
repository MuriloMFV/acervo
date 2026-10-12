import assert from 'node:assert/strict';
import test from 'node:test';
import { boxFormValues } from '../src/services/boxes/editing.ts';
import { parseBoxForm, boxCover, boxBackCover, mapBoxCard } from '../src/services/boxes/mappers.ts';
import { storedEditionCover } from '../src/services/covers/storage.ts';
import { exportItems } from '../src/services/export/document.ts';

const root = 'https://project.supabase.co/storage/v1/object/public/edition-covers/';
const back = `${root}11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg`;
const replacement = back.replace('22222222-2222-4222-8222-222222222222.jpg', '33333333-3333-4333-8333-333333333333.png');
const record = { id: 'box-copy', condition: 'GOOD', is_favorite: true, notes: 'Completo', box_set: {
  name: 'Coleção Alien', media_format: 'BLURAY', cover_url: 'https://front.test/box.jpg',
  movies: [{ position: 2, movie: { id: 'b', title: 'Aliens', poster_url: 'second' } }, { position: 1, movie: { id: 'a', title: 'Alien', poster_url: 'first' } }],
} };
test('legacy and empty boxes have no back cover and keep their front/fallback behavior', () => {
  for (const value of [undefined, null, '', ' ']) {
    const box = { ...record, box_set: { ...record.box_set, back_cover_url: value } };
    assert.equal(boxBackCover(box), null);
    assert.equal(boxFormValues(box).backCoverUrl, value ?? null);
    assert.equal(boxCover(box), 'https://front.test/box.jpg');
    assert.equal(boxCover({ ...box, box_set: { ...box.box_set, cover_url: null } }), 'first');
  }
  assert.equal(boxFormValues().backCoverUrl, null);
});
test('back cover belongs only to BoxSet and remains independent from personal and movie data', () => {
  const box = { ...record, box_set: { ...record.box_set, back_cover_url: back } };
  const form = boxFormValues(box); const result = parseBoxForm(form);
  assert.equal(form.backCoverUrl, back); assert.equal(boxBackCover(box), back);
  assert.equal(result.box.back_cover_url, back); assert.equal(result.copy.is_favorite, true);
  assert.equal(result.copy.notes, 'Completo'); assert.equal('back_cover_url' in result.copy, false);
  assert.equal(box.box_set.movies[1].movie.poster_url, 'first');
});
test('add, replace, remove and omitted back covers use distinct payload semantics', () => {
  const form = boxFormValues(record);
  const { backCoverUrl, ...legacy } = form;
  assert.equal('back_cover_url' in parseBoxForm(legacy).box, false);
  assert.equal(parseBoxForm({ ...form, backCoverUrl: ` ${back} ` }).box.back_cover_url, back);
  assert.equal(parseBoxForm({ ...form, backCoverUrl: replacement }).box.back_cover_url, replacement);
  for (const value of [null, '', ' ']) assert.equal(parseBoxForm({ ...form, backCoverUrl: value }).box.back_cover_url, null);
  assert.equal(parseBoxForm({ ...form, backCoverUrl: null }).box.cover_url, record.box_set.cover_url);
});
test('back cover validation rejects unsafe values and reuses the stored-cover validator', () => {
  const form = boxFormValues(record);
  for (const value of ['javascript:alert(1)', 'file:///back.jpg', 'https://test/' + 'x'.repeat(2048)]) assert.throws(() => parseBoxForm({ ...form, backCoverUrl: value }));
  assert.equal(storedEditionCover(back, root), back);
  assert.equal(storedEditionCover(replacement, root), replacement);
  for (const value of ['https://outside.test/back.jpg', back + '?token=bad', back.replace('.jpg', '.svg')]) assert.throws(() => storedEditionCover(value, root));
});
test('a back cover never becomes the grid or PDF front cover, including a box without a front', () => {
  const box = { ...record, box_set: { ...record.box_set, back_cover_url: back } };
  assert.equal(mapBoxCard(box).poster.uri, record.box_set.cover_url);
  assert.equal(exportItems([], [box])[0].coverUrl, record.box_set.cover_url);
  const withoutFront = { ...box, box_set: { ...box.box_set, cover_url: null, movies: [] } };
  assert.equal(boxCover(withoutFront), null); assert.equal(boxBackCover(withoutFront), back);
  assert.equal(mapBoxCard(withoutFront).poster, null);
});
