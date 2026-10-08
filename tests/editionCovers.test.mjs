import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildEditionCoverQuery } from '../src/services/covers/query.ts';
import { downloadCover, imageExtension, MAX_IMAGE_BYTES, normalizeCoverResults, readLimited, safeImageUrl, signCover, validateQuery, verifyCover } from '../supabase/functions/_shared/covers.ts';
import { assertSelectedCoverCompatible, barcodeEditionPayload } from '../src/services/barcode/mappers.ts';
import { editionCover, mapCollectionCard, mapCollectionDetails } from '../src/services/collection/mappers.ts';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/serp-covers.json', import.meta.url)));
const url = 'https://http2.mlstatic.com/capa.jpg';
const jpg = new Uint8Array([255,216,255,224,1,2,3]);

test('query prioritizes barcode and includes optional edition data without undefined values', () => {
  assert.equal(buildEditionCoverQuery({ title:'Platoon', mediaFormat:'DVD', barcode:' 789-1234567890 ', editionName:'edição especial', country:'Brasil', region:'4' }), '7891234567890 Platoon DVD edição especial Brasil região 4 capa');
  assert.equal(buildEditionCoverQuery({ title:' Pânico ', mediaFormat:'BLURAY', publisher:'Paramount' }), 'Pânico Blu-ray Paramount capa');
  assert.ok(buildEditionCoverQuery({ title:'X'.repeat(400), mediaFormat:'VHS' }).length <= 240);
});
test('query validation rejects malformed and excessively long inputs', () => {
  assert.equal(validateQuery('  Platoon   DVD '), 'Platoon DVD');
  for (const query of [null,42,'','x','x'.repeat(241)]) assert.throws(() => validateQuery(query));
});
test('Serp results normalize, deduplicate, prioritize vertical and fallback to trusted thumbnail', () => {
  const results = normalizeCoverResults(fixture);
  assert.equal(results.length,3); assert.equal(results[0].imageUrl,url);
  assert.equal(results[0].width,600); assert.equal(results[0].sourceTitle,'Platoon DVD Brasil');
  assert.equal(results[2].imageUrl,'https://encrypted-tbn1.gstatic.com/images?q=capa');
  assert.equal(results[2].width,undefined);
  assert.deepEqual(normalizeCoverResults({ images_results:[] }),[]);
  for (const data of [null,{}, {error:'quota'}, {images_results:'wrong'}]) assert.throws(() => normalizeCoverResults(data));
});
test('SSRF guard allows fixed HTTPS CDNs and rejects private URLs, credentials, ports and lookalikes', () => {
  assert.equal(safeImageUrl(url),url);
  for (const value of ['http://http2.mlstatic.com/a','https://localhost/a','https://127.0.0.1/a','https://[::1]/a','https://169.254.169.254/a','https://http2.mlstatic.com.evil.test/a','https://user@http2.mlstatic.com/a','https://http2.mlstatic.com:444/a','data:image/png,a','https://example.test/a','https://serpapi.com/search?api_key=secret','https://serpapi.com/searches/image?api_key=secret']) assert.equal(safeImageUrl(value),null,value);
});
test('signed selections are user-bound, expire and cannot be altered', async () => {
  const token = await signCover(url,'user-a','fixture-secret',1000);
  assert.equal(await verifyCover(token,'user-a','fixture-secret',2000),url);
  for (const [candidate,user,key,now] of [[token,'user-b','fixture-secret',2000],[token,'user-a','other',2000],[token,'user-a','fixture-secret',1801000],[token.slice(0,-4)+'aaaa','user-a','fixture-secret',2000]]) await assert.rejects(verifyCover(candidate,user,key,now));
  await assert.rejects(signCover('https://localhost/a','user','fixture'));
});
test('download checks content type and magic, HTTP errors, redirect targets and actual byte limit', async () => {
  const ok = await downloadCover(url,async (_url,options) => { assert.equal(options.redirect,'manual'); return new Response(jpg,{headers:{'content-type':'image/jpeg'}}); });
  assert.equal(ok.extension,'jpg'); assert.deepEqual(ok.bytes,jpg);
  for (const response of [new Response('bad',{status:404}),new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}}),new Response('html',{headers:{'content-type':'image/jpeg'}}),new Response(jpg,{headers:{'content-type':'image/jpeg','content-length':String(MAX_IMAGE_BYTES+1)}})]) await assert.rejects(downloadCover(url,async()=>response));
  let calls=0;
  await assert.rejects(downloadCover(url,async()=> { calls++; return new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data'}}); }));
  assert.equal(calls,1);
  await assert.rejects(readLimited(new Response(new Uint8Array(11)),10));
  await assert.rejects(downloadCover(url,async()=>new Response(null,{status:302,headers:{location:url}})));
});
test('PNG/WebP require matching signatures and supported MIME', () => {
  assert.equal(imageExtension(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png'),'png');
  assert.equal(imageExtension(new TextEncoder().encode('RIFF0000WEBP0000'),'image/webp'),'webp');
  assert.throws(()=>imageExtension(jpg,'image/png'));
});
test('chosen cover persists in new edition payload without replacing product or movie poster', () => {
  const product='https://example.test/product.jpg', custom='https://example.test/storage.jpg';
  const payload=barcodeEditionPayload('movie','7891234567890',{mediaFormat:'DVD',packagingType:'STANDARD',publisher:'',region:'',country:'',editionName:'',productImageUrl:product,customCoverUrl:custom,isSpecialEdition:false,isLimitedEdition:false});
  assert.equal(payload.custom_cover_url,custom); assert.equal(payload.product_image_url,product);
  const edition={...payload,movie:{title:'Platoon',poster_url:'poster',genres:[]}};
  const record={id:'copy',edition,condition:'GOOD'};
  assert.equal(mapCollectionCard(record).poster.uri,custom);
  assert.equal(mapCollectionDetails(record).movie.poster.uri,custom);
  assert.equal(editionCover({...edition,custom_cover_url:null}),product);
  assert.equal(editionCover({...edition,custom_cover_url:null,product_image_url:null}),'poster');
  assert.equal(edition.movie.poster_url,'poster');
});

test('a racing shared edition cannot silently discard or overwrite the selected cover', () => {
  assert.doesNotThrow(() => assertSelectedCoverCompatible({custom_cover_url:'chosen'},'chosen'));
  assert.doesNotThrow(() => assertSelectedCoverCompatible({custom_cover_url:'existing'},null));
  assert.throws(() => assertSelectedCoverCompatible({custom_cover_url:'existing'},'chosen'),/Consulte novamente/);
  assert.throws(() => assertSelectedCoverCompatible({custom_cover_url:null},'chosen'),/Consulte novamente/);
});
