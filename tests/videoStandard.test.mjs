import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVideoStandard, regionEncodingDraft } from '../src/utils/videoStandard.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { newEditionPayload, mapCollectionDetails, isStandardEdition } from '../src/services/collection/mappers.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';
import { parseBoxForm } from '../src/services/boxes/mappers.ts';

const form = { editionName: '', publisher: '', country: '', region: '4', discCount: '', customCoverUrl: null };
const draft = { mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', region: '4', country: '', editionName: '', productImageUrl: null, isSpecialEdition: false, isLimitedEdition: false };
const box = { name: 'Box', mediaFormat: 'DVD', barcode: '', coverUrl: '', editionName: '', publisher: '', country: '', region: '4', discCount: '', special: false, limited: false, condition: 'GOOD', price: '', date: '', place: '', notes: '' };
const movie = { id: 'movie', title: 'Filme', poster_url: 'poster', genres: [] };
const edition = { movie_id: 'movie', media_format: 'DVD', packaging_type: 'STANDARD', region: null, country: null, publisher: null, edition_name: null, barcode: null, product_image_url: null, custom_cover_url: null, back_cover_url: null, disc_count: null, release_year: null, is_special_edition: false, is_limited_edition: false, movie };

test('region and video encoding persist independently in manual, barcode, edit and box payloads', () => {
  for (const videoStandard of ['NTSC', 'PAL', 'PAL-M', 'SECAM']) {
    for (const payload of [newEditionPayload('movie', 'DVD', { region: '4', videoStandard }), barcodeEditionPayload('movie', '7892770006398', { ...draft, videoStandard }), parseEditionForm({ ...form, videoStandard }), parseBoxForm({ ...box, videoStandard }).box]) {
      assert.equal(payload.region, '4');
      assert.equal(payload.video_standard, videoStandard);
      assert.equal('poster_url' in payload, false);
    }
  }
});
test('omitted encoding remains compatible with old clients; explicit null removes it', () => {
  assert.equal('video_standard' in parseEditionForm(form), false);
  assert.equal('video_standard' in newEditionPayload('movie', 'DVD', {}), false);
  assert.equal('video_standard' in barcodeEditionPayload('movie', '7892770006398', draft), false);
  assert.equal('video_standard' in parseBoxForm(box).box, false);
  assert.equal(parseEditionForm({ ...form, videoStandard: null }).video_standard, null);
});
test('unknown encodings reject instead of being silently saved', () => {
  for (const value of ['UNKNOWN', 42, false, {}, 'NTSC/PAL']) {
    assert.throws(() => parseVideoStandard(value), /codificação válida/);
    assert.throws(() => parseEditionForm({ ...form, videoStandard: value }), /codificação válida/);
    assert.throws(() => newEditionPayload('movie', 'DVD', { videoStandard: value }), /codificação válida/);
    assert.throws(() => barcodeEditionPayload('movie', '7892770006398', { ...draft, videoStandard: value }), /codificação válida/);
  }
});
test('interpreting old encoding-only regions produces a local draft without modifying the original data', () => {
  for (const value of ['NTSC', 'PAL', 'PAL-M', 'SECAM']) {
    const source = { region: value, videoStandard: null };
    const selection = regionEncodingDraft(source.region, source.videoStandard);
    assert.deepEqual(selection, { region: '', videoStandard: value });
    selection.region = '4';
    selection.videoStandard = null;
    assert.deepEqual(source, { region: value, videoStandard: null });
    assert.equal(parseEditionForm({ ...form, region: source.region }).region, value);
  }
  assert.deepEqual(regionEncodingDraft('1 / 4', null), { region: '1 / 4', videoStandard: null });
  assert.deepEqual(regionEncodingDraft('4', 'NTSC'), { region: '4', videoStandard: 'NTSC' });
});
test('details keep independent encoding and region alongside the existing cover priority', () => {
  const result = mapCollectionDetails({ edition: { ...edition, region: '4', video_standard: 'NTSC', custom_cover_url: 'front', back_cover_url: 'back' }, condition: 'GOOD', is_favorite: false });
  assert.equal(result.edition.region, '4');
  assert.equal(result.edition.videoStandard, 'NTSC');
  assert.deepEqual(result.movie.poster, { uri: 'front' });
  assert.deepEqual(result.edition.backCover, { uri: 'back' });
  assert.equal(movie.poster_url, 'poster');
  const legacy = mapCollectionDetails({ edition, condition: 'GOOD', is_favorite: false });
  assert.equal(legacy.edition.videoStandard, undefined);
});
test('an encoded edition is not reused as a blank standard edition', () => {
  assert.equal(isStandardEdition(edition, 'movie', 'DVD'), true);
  assert.equal(isStandardEdition({ ...edition, video_standard: 'NTSC' }, 'movie', 'DVD'), false);
});
