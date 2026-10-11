import assert from 'node:assert/strict';
import test from 'node:test';
import { regionChoices, regionLabel, regionSelection } from '../src/utils/regions.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';

const form = { editionName: '', publisher: '', country: '', region: '', discCount: '', customCoverUrl: null };

test('region matching recognizes saved variants without rewriting the edit payload', () => {
  for (const [saved, selected] of [['Região 4', '4'], ['region A', 'A'], [' region-free ', 'Livre'], ['PAL M', 'PAL-M']]) {
    assert.equal(regionSelection(saved), selected);
    assert.equal(parseEditionForm({ ...form, region: saved }).region, saved.trim());
  }
});
test('a region-free DVD code of zero is distinct from an unspecified region', () => {
  for (const saved of ['0', 'ALL', 'ABC', 'A/B/C', 'Livre', 'Todas as regiões']) assert.equal(regionSelection(saved), 'Livre');
  for (const saved of [null, undefined, '', '   ']) assert.equal(regionSelection(saved), '');
  assert.equal(regionLabel('0'), 'Livre (todas as regiões)');
  assert.equal(parseEditionForm({ ...form, region: '0' }).region, '0');
  assert.equal(parseEditionForm({ ...form, region: '' }).region, null);
});
test('changing format keeps a selectable legacy region without mixing it into common presets', () => {
  const bluray = regionChoices('BLURAY', 'Região 4');
  assert.equal(bluray.filter(option => regionSelection(option.value) === '4').length, 1);
  assert.equal(bluray.find(option => regionSelection(option.value) === '4').value, 'Região 4');
  assert.equal(regionChoices('BLURAY', '').some(option => option.value === '4'), false);
  assert.equal(regionChoices('DVD', '').some(option => option.value === 'A'), false);
  assert.equal(regionChoices('UHD_4K', '').some(option => option.value === 'A'), false);
});
test('unknown, combined and uncommon regions remain selectable and can still be saved', () => {
  for (const saved of ['1 / 4', 'A/B', 'PAL-N', '8', 'Região 2 · PAL']) {
    const choices = regionChoices('DVD', saved);
    assert.equal(choices.filter(option => option.value === saved).length, 1);
    assert.equal(regionSelection(saved), saved);
    assert.equal(parseEditionForm({ ...form, region: saved }).region, saved);
  }
});
