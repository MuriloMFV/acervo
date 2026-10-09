import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionGridSections, collectionSectionLabel } from '../src/utils/collectionSections.ts';
const movie = (id, title, year = 1999) => ({ id, title, year, poster: null, mediaFormat: 'DVD' });
const flattened = sections => sections.flatMap(section => section.data.flatMap(row => row.items));

test('alphabetic sections normalize Portuguese accents and keep physical copies distinct', () => {
  const items = [movie('a','Água'), movie('b','Alien'), movie('c','Alien'), movie('d','Blade Runner')];
  const sections = collectionGridSections(items, 'TITLE_ASC');
  assert.deepEqual(sections.map(section => section.label), ['A','B']);
  assert.equal(sections[0].data[0].items.length, 3);
  assert.deepEqual(flattened(sections), items);
  assert.equal(collectionSectionLabel(movie('z', '  Éden'), 'TITLE_ASC'), 'E');
  assert.equal(collectionSectionLabel(movie('z', 'Órbita'), 'TITLE_ASC'), 'O');
});
test('descending title sections preserve the existing descending order', () => {
  const items = [movie('z','Zodíaco'), movie('b','Blade Runner'), movie('a','Alien')];
  const sections = collectionGridSections(items, 'TITLE_DESC');
  assert.deepEqual(sections.map(section => section.label), ['Z','B','A']);
  assert.deepEqual(flattened(sections), items);
});
test('numeric, empty and non-Latin initials use a discreet catch-all label', () => {
  for (const title of ['2001: Uma Odisseia no Espaço', '1917', '東京', '', ' ']) {
    assert.equal(collectionSectionLabel(movie('a', title), 'TITLE_ASC'), '#');
  }
});
test('year sections use exact years and preserve null-year items at the end', () => {
  for (const sort of ['YEAR_DESC','YEAR_ASC']) {
    const years = sort === 'YEAR_DESC' ? [2026,2025,2025,null] : [2025,2025,2026,null];
    const items = years.map((year,index) => movie(String(index), 'Filme', year));
    const sections = collectionGridSections(items, sort);
    assert.deepEqual(sections.map(section => section.label), sort === 'YEAR_DESC' ? ['2026','2025','Sem ano'] : ['2025','2026','Sem ano']);
    assert.deepEqual(flattened(sections), items);
  }
});
test('recent, oldest and price sorts have no alphabetic or year separator', () => {
  const items = [movie('b','Blade Runner',1982),movie('a','Alien',1979)];
  for (const sort of ['RECENT','OLDEST','PRICE_ASC','PRICE_DESC']) {
    const sections = collectionGridSections(items, sort);
    assert.equal(sections.length,1); assert.equal(sections[0].label,null);
    assert.deepEqual(flattened(sections),items);
  }
});
test('rows have three columns and an incomplete row never borrows from the next letter', () => {
  const items = [movie('a1','Alien'),movie('a2','Alien 2'),movie('a3','Alien 3'),movie('a4','Alien 4'),movie('b1','Blade Runner')];
  const sections = collectionGridSections(items,'TITLE_ASC');
  assert.deepEqual(sections.map(section => section.data.map(row => row.items.length)),[[3,1],[1]]);
  assert.deepEqual(flattened(sections),items);
});
test('filtered/empty input is reflected without filling missing letters or changing input', () => {
  const items = [movie('a','Alien'),movie('m','Matrix')];
  const before = JSON.stringify(items);
  const sections = collectionGridSections(items,'TITLE_ASC');
  assert.deepEqual(sections.map(section => section.label),['A','M']);
  assert.equal(JSON.stringify(items),before);
  assert.deepEqual(collectionGridSections([],'TITLE_ASC'),[]);
  assert.deepEqual(collectionGridSections([],'RECENT'),[]);
});
test('section and row keys stay stable when later items are appended', () => {
  const items = [movie('a','Alien'),movie('b','Blade Runner')];
  const before = collectionGridSections(items,'TITLE_ASC');
  const after = collectionGridSections([...items,movie('c','Carrie')],'TITLE_ASC');
  assert.equal(before[0].key,after[0].key); assert.equal(before[1].key,after[1].key);
  assert.equal(before[0].data[0].key,after[0].data[0].key);
  // Adjacent grouping also preserves existing sort order for unusual titles.
  const repeated = collectionGridSections([movie('a',' Alien'),movie('b','Blade Runner'),movie('c','Alien')],'TITLE_ASC');
  assert.equal(new Set(repeated.map(section => section.key)).size,3);
});
