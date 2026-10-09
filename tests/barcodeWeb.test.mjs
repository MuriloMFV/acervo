import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canLookupBarcodeWeb, resolveBarcode, resolveBarcodeWebFallback } from '../src/services/barcode/lookup.ts';
import { lookupBarcode } from '../src/services/upc/products.ts';
import { mapUpcResponse } from '../src/services/upc/mappers.ts';
import { barcodeWebQuery, normalizeBarcodeWebResults } from '../src/services/barcode/webParsing.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';
const code = '7891234567890';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/serp-barcode.json', import.meta.url)));
const candidates = normalizeBarcodeWebResults(fixture, code);

test('Google query uses quoted normalized barcode and preserves leading zeroes', () => {
  for (const barcode of ['96385074', '012345678905', code]) assert.equal(barcodeWebQuery(` ${barcode} `), `"${barcode}"`);
});
test('organic results normalize evidence, discard useless rows and deduplicate URLs', () => {
  assert.equal(candidates.length, 2);
  const first = candidates[0];
  assert.equal(first.sourceDomain, 'loja.example');
  assert.equal(first.detectedTitle, 'Pânico 2');
  assert.equal(first.detectedFormat, 'DVD');
  assert.equal(first.detectedPublisher, 'Paramount');
  assert.equal(first.detectedCountry, 'Brasil');
  assert.equal(first.detectedRegion, '4');
  assert.equal(first.detectedEditionName, 'Especial');
  assert.equal(first.imageUrl, 'https://images.example/cover.jpg');
  assert.equal('organic_results' in first, false);
});
test('missing metadata is never invented; empty responses and API errors remain distinct', () => {
  const second = candidates[1];
  assert.equal(second.detectedCountry, null);
  assert.equal(second.detectedPublisher, null);
  for (const body of [{organic_results: []}, {search_information:{total_results:0}}, {error:"Google hasn't returned any results for this query."}]) assert.deepEqual(normalizeBarcodeWebResults(body, code), []);
  for (const body of [null, {}, {error:'Invalid API key'}, {organic_results:{}}]) assert.throws(() => normalizeBarcodeWebResults(body, code));
});
test('Supabase and UPC hits skip all later sources', async () => {
  for (const hit of ['supabase', 'upc']) {
    const calls = [];
    const result = await resolveBarcode(code, {
      findEdition: async () => { calls.push('supabase'); return hit === 'supabase' ? {id:'known'} : null; },
      lookupProduct: async () => { calls.push('upc'); return {title:'Pânico DVD'}; },
      lookupWeb: async () => { assert.fail('SerpApi must not run'); },
    });
    assert.deepEqual(calls, hit === 'supabase' ? ['supabase'] : ['supabase','upc']);
    assert.equal(result.source, hit === 'supabase' ? 'SUPABASE' : 'UPCITEMDB');
  }
});
test('all valid UPC misses reach web sequentially with same barcode and signal', async () => {
  for (const body of [{code:'NOT_FOUND'}, {code:'OK',items:[]}, {code:'OK',items:[{}]}, {code:'OK',items:[null]}, {code:'OK',items:[{ean:'9999999999999',title:'Other DVD'}]}, {code:'OK',items:[{},{}]}]) {
    const calls = []; const controller = new AbortController();
    const result = await resolveBarcode(` ${code} `, {
      findEdition: async (value, signal) => { assert.equal(value,code); assert.equal(signal,controller.signal); calls.push('supabase'); return null; },
      lookupProduct: async (value) => { calls.push('upc'); return mapUpcResponse(body,value); },
      lookupWeb: async (value, signal) => { assert.equal(value,code); assert.equal(signal,controller.signal); calls.push('web'); return candidates; },
    },controller.signal);
    assert.deepEqual(calls,['supabase','upc','web']);
    assert.deepEqual(result,{source:'WEB',barcode:code,candidates});
    assert.equal('edition' in result,false);
  }
});
test('untitled candidate also reaches web; empty and unavailable fallback permit manual flow', async () => {
  for (const lookupWeb of [async () => [], async () => { throw new Error('offline'); }]) {
    const result = await resolveBarcode(code,{findEdition:async()=>null,lookupProduct:async()=>({title:' ',rawProductName:null}),lookupWeb});
    assert.equal(result.source,'NOT_FOUND'); assert.equal(result.barcode,code);
  }
});
test('cancellation propagates instead of becoming an empty result', async () => {
  const controller = new AbortController();
  await assert.rejects(resolveBarcode(code,{findEdition:async()=>null,lookupProduct:async()=>null,lookupWeb:async()=>{controller.abort();throw new Error('cancelled');}},controller.signal),/cancelled/);
});
test('saving after human TMDB association keeps barcode and never saves web thumbnail', () => {
  const payload = barcodeEditionPayload('confirmed-tmdb-movie',code,{mediaFormat:candidates[0].detectedFormat,packagingType:'STANDARD',publisher:'',region:'',country:'',editionName:'',productImageUrl:null,isSpecialEdition:false,isLimitedEdition:false});
  assert.equal(payload.barcode,code); assert.equal(payload.movie_id,'confirmed-tmdb-movie');
  assert.equal(payload.custom_cover_url,null); assert.equal(payload.product_image_url,null);
});
test('app wiring displays suggestions and requires TMDB selection before confirmation', () => {
  const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(read('../src/services/barcode/index.ts'),/lookupWeb: lookupBarcodeWeb/);
  assert.match(read('../app/add/barcode.tsx'),/BarcodeWebCandidates/);
  assert.match(read('../app/add/barcode.tsx'),/Nenhum desses/);
  assert.match(read('../app/add/barcode-match.tsx'),/useMovieSearch\(query\)/);
  assert.match(read('../app/add/barcode-match.tsx'),/params: \{ code, id, candidateId:/);
  assert.match(read('../app/add/barcode-confirm.tsx'),/getMovieDetails\(id, signal\)/);
  for (const path of ['../src/services/barcode/lookup.ts','../src/services/barcode/web.ts','../src/components/add/BarcodeWebCandidates.tsx']) assert.doesNotMatch(read(path),/addNewBarcodeEdition|\.insert\(/);
});

 test('provider INVALID_UPC permits web lookup but malformed requests stay errors', async () => {
  const original = globalThis.fetch;
  try {
    for (const providerCode of ['INVALID_UPC', 'INVALID_QUERY']) {
      globalThis.fetch = async () => new Response(JSON.stringify({code:providerCode}),{status:400});
      let webCalls = 0;
      const pending = resolveBarcode(code,{findEdition:async()=>null,lookupProduct:lookupBarcode,lookupWeb:async()=>{webCalls++;return candidates;}});
      if (providerCode === 'INVALID_UPC') {assert.equal((await pending).source,'WEB');assert.equal(webCalls,1);}
      else {await assert.rejects(pending,error=>error.kind==='http');assert.equal(webCalls,0);}
    }
  } finally {globalThis.fetch=original;}
 });

test('catalog title plus explicit barcode is useful even when snippet omits media words', () => {
  // Fixture modeled on a publicly indexed catalog excerpt, not a captured SerpApi response.
  const catalog = JSON.parse(readFileSync(new URL('./fixtures/serp-barcode-catalog.json', import.meta.url)));
  const result = normalizeBarcodeWebResults(catalog, '7892770006398');
  assert.equal(result.length, 1);
  assert.equal(result[0].detectedTitle, 'Homem-Aranha');
  assert.equal(result[0].detectedFormat, null);
  assert.equal(result[0].detectedPublisher, null);
  assert.deepEqual(result[0].confidenceHints, ['Código citado na página']);
});
test('barcode evidence must match whole code and still have a useful title', () => {
  const row = {title:'Homem-Aranha - Catálogo',link:'https://catalog.example/1'};
  for (const snippet of ['024 __ |a 17892770006398', '024 __ |a 78927700063980', 'Sem código']) {
    assert.deepEqual(normalizeBarcodeWebResults({organic_results:[{...row,snippet}]},'7892770006398'),[]);
  }
  for (const title of ['7892770006398','EAN 7892770006398', 'Código de barras 7892770006398']) {
    assert.deepEqual(normalizeBarcodeWebResults({organic_results:[{...row,title,snippet:'7892770006398'}]},'7892770006398'),[]);
  }
});

test('diagnostics distinguish rejected evidence, unsafe URL and duplicate without altering candidates', () => {
  const diagnostics=[];
  const diagnosed=normalizeBarcodeWebResults(fixture,code,row=>diagnostics.push(row));
  assert.deepEqual(diagnosed,candidates);
  assert.deepEqual(diagnostics.map(row=>row.reason),['accepted','duplicate','no-evidence','unsafe-url','accepted']);
  assert.equal(diagnostics[2].title,'Produto sem identificação');
  assert.equal(diagnostics[3].sourceDomain,null);
  for(const row of diagnostics)assert.equal('sourceUrl' in row,false);
});

// Preserve the incoming branch coverage and its separate catalog fixture.
{
const barcode='7890552001548';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/serp-barcode-web.json',import.meta.url)));
const candidates=normalizeBarcodeWebResults(fixture,barcode);
const product={title:'Scream DVD',rawProductName:'Scream DVD',barcode};

test('web query quotes barcode without assuming a physical format and preserves zeroes',()=>{
  assert.equal(barcodeWebQuery(barcode),'"7890552001548"');
  assert.equal(barcodeWebQuery(' 012-345-678-905 '),'"012345678905"');
  for(const value of ['96385074','0012345678905']) assert.equal(barcodeWebQuery(value),`"${value}"`);
  assert.throws(()=>barcodeWebQuery('invalid'));
});
test('Supabase match skips both external providers',async()=>{
  const edition={id:'known'};
  const result=await resolveBarcode(barcode,{findEdition:async()=>edition,lookupProduct:async()=>assert.fail('UPC called'),lookupWeb:async()=>assert.fail('web called')});
  assert.equal(result.source,'SUPABASE'); assert.equal(canLookupBarcodeWeb(result),false);
});
test('useful UPC product skips SerpApi and preserves the prior result',async()=>{
  const result=await resolveBarcode(barcode,{findEdition:async()=>null,lookupProduct:async()=>product,lookupWeb:async()=>assert.fail('web called')});
  assert.equal(result.source,'UPCITEMDB'); assert.equal(result.candidate,product);
});
test('UPC miss permits explicit web fallback and preserves normalized barcode',async()=>{
  const calls=[];
  const result=await resolveBarcode(` ${barcode} `,{findEdition:async()=>{calls.push('supabase');return null;},lookupProduct:async()=>{calls.push('upc');return null;},lookupWeb:async code=>{calls.push('serpapi');assert.equal(code,barcode);return candidates;}});
  assert.deepEqual(calls,['supabase','upc','serpapi']);
  assert.equal(result.source,'WEB'); assert.equal(result.barcode,barcode); assert.equal(result.candidates,candidates);
  assert.equal('edition' in result,false); assert.equal('movie' in result,false);
});
test('no explicit web provider means no call on the initial lookup',async()=>{
  const result=await resolveBarcode(barcode,{findEdition:async()=>null,lookupProduct:async()=>null});
  assert.deepEqual(result,{source:'NOT_FOUND',barcode});
});
test('incomplete UPC product permits fallback, failure is not mistaken for a miss',async()=>{
  const result=await resolveBarcode(barcode,{findEdition:async()=>null,lookupProduct:async()=>({title:null,rawProductName:null}),lookupWeb:async()=>candidates});
  assert.equal(result.source,'WEB');
  await assert.rejects(resolveBarcode(barcode,{findEdition:async()=>null,lookupProduct:async()=>{throw Error('network');},lookupWeb:async()=>assert.fail('web called')}),/network/);
});
test('web miss keeps barcode and manual path available',async()=>{
  assert.deepEqual(await resolveBarcodeWebFallback({source:'NOT_FOUND',barcode},async()=>[]),{source:'NOT_FOUND',barcode});
});
test('organic results normalize, deduplicate canonical URLs, cap domains and retain exact barcode evidence',()=>{
  // The catalog correction also accepts a named page citing the complete code;
  // media metadata stays absent until the user confirms the movie via TMDB.
  assert.equal(candidates.length,4);
  const first=candidates[0];
  assert.equal(first.detectedTitle,'Premonição 2'); assert.equal(first.sourceDomain,'loja.example');
  assert.equal(first.detectedFormat,'DVD'); assert.equal(first.detectedPublisher,'Warner Home Video');
  assert.equal(first.detectedCountry,'Brasil'); assert.equal(first.detectedRegion,'4'); assert.equal(first.detectedEditionName,'Colecionador');
  assert.deepEqual(first.confidenceHints,['Código citado na página','Formato citado na página']);
  assert.equal(candidates[2].detectedPublisher,null); assert.equal(candidates[2].detectedCountry,null);
  assert.equal(candidates[2].imageUrl,null);
  assert.equal(candidates[3].detectedTitle,'Celular');
  assert.equal(candidates[3].detectedFormat,null);
  assert.deepEqual(candidates[3].confidenceHints,['Código citado na página']);
});
test('empty results are distinct from malformed response and quota failures',()=>{
  assert.deepEqual(normalizeBarcodeWebResults({organic_results:[]},barcode),[]);
  assert.deepEqual(normalizeBarcodeWebResults({error:"Google hasn't returned any results for this query."},barcode),[]);
  assert.deepEqual(normalizeBarcodeWebResults({search_information:{total_results:0}},barcode),[]);
  for(const body of [null,{}, {error:'quota exceeded'}, {organic_results:'bad'}]) assert.throws(()=>normalizeBarcodeWebResults(body,barcode));
});

}
