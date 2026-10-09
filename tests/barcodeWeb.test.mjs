import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { barcodeWebQuery, normalizeBarcodeWebResults } from '../src/services/barcode/webParsing.ts';
import { canLookupBarcodeWeb, resolveBarcode, resolveBarcodeWebFallback } from '../src/services/barcode/lookup.ts';
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
test('organic results normalize, deduplicate canonical URLs, cap domains and reject unrelated pages',()=>{
  assert.equal(candidates.length,3);
  const first=candidates[0];
  assert.equal(first.detectedTitle,'Premonição 2'); assert.equal(first.sourceDomain,'loja.example');
  assert.equal(first.detectedFormat,'DVD'); assert.equal(first.detectedPublisher,'Warner Home Video');
  assert.equal(first.detectedCountry,'Brasil'); assert.equal(first.detectedRegion,'4'); assert.equal(first.detectedEditionName,'Colecionador');
  assert.deepEqual(first.confidenceHints,['Código citado na página','Formato citado na página']);
  assert.equal(candidates[2].detectedPublisher,null); assert.equal(candidates[2].detectedCountry,null);
  assert.equal(candidates[2].imageUrl,null);
});
test('empty results are distinct from malformed response and quota failures',()=>{
  assert.deepEqual(normalizeBarcodeWebResults({organic_results:[]},barcode),[]);
  assert.deepEqual(normalizeBarcodeWebResults({error:"Google hasn't returned any results for this query."},barcode),[]);
  assert.deepEqual(normalizeBarcodeWebResults({search_information:{total_results:0}},barcode),[]);
  for(const body of [null,{}, {error:'quota exceeded'}, {organic_results:'bad'}]) assert.throws(()=>normalizeBarcodeWebResults(body,barcode));
});
