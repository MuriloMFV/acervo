import assert from 'node:assert/strict';
import test from 'node:test';
import { searchSerpApi, SerpApiError, SERPAPI_TIMEOUT_MS, isEmptyGoogleResult } from '../supabase/functions/_shared/serpapi.ts';
import { resolveBarcode } from '../src/services/barcode/lookup.ts';
import { BarcodeWebError, barcodeWebFailureMessage } from '../src/services/barcode/webErrors.ts';

test('SerpApi uses fixed engine/query, 45 second budget and one request per attempt', async () => {
  assert.equal(SERPAPI_TIMEOUT_MS,45_000);
  let calls=0;
  const result=await searchSerpApi('google','"7891234567890"','fixture-key',async(url,options)=>{
    calls++;
    assert.equal(url.origin,'https://serpapi.com');
    assert.equal(url.searchParams.get('engine'),'google');
    assert.equal(url.searchParams.get('q'),'"7891234567890"');
    assert.equal(options.redirect,'error');
    assert.ok(options.signal);
    return Response.json({organic_results:[]});
  });
  assert.deepEqual(result,{organic_results:[]});assert.equal(calls,1);
});
test('timeouts, quota, upstream errors and malformed responses have safe statuses without retries', async () => {
  const scenarios=[
    [async()=>{const error=new Error('fixture-key in URL');error.name='TimeoutError';throw error;},'timeout',504],
    [async()=>new Response('',{status:429}),'rate-limit',429],
    [async()=>new Response('',{status:503}),'upstream',502],
    [async()=>Response.json({error:'fixture-key quota detail'}),'upstream',502],
    [async()=>new Response('invalid json'),'response',502],
  ];
  for(const [fetcher,kind,status] of scenarios){
    let calls=0;
    await assert.rejects(searchSerpApi('google_images','Homem-Aranha capa','fixture-key',async(...args)=>{calls++;return fetcher(...args);}),error=>error instanceof SerpApiError && error.kind===kind && error.status===status && !error.message.includes('fixture-key'));
    assert.equal(calls,1);
  }
});
test('Google empty-result message is recognized for cover search without hiding provider errors', async () => {
  for(const message of ["Google hasn't returned any results for this query.",'Google has not returned any results for this query']){
    const result=await searchSerpApi('google_images','Homem-Aranha capa','fixture-key',async()=>Response.json({error:message}));
    assert.equal(isEmptyGoogleResult(result),true);
  }
  for(const body of [null,{}, {error:'API quota exhausted'},{error:42}])assert.equal(isEmptyGoogleResult(body),false);
});
test('barcode preserves classified failures and explicit later attempts can succeed',async()=>{
  let webCalls=0;
  const sources={findEdition:async()=>null,lookupProduct:async()=>null,lookupWeb:async()=>{webCalls++;if(webCalls===1)throw new BarcodeWebError('timeout');return [{id:'candidate'}];}};
  const failed=await resolveBarcode('7891234567890',sources);
  assert.equal(failed.webFailure,'timeout');assert.equal(failed.barcode,'7891234567890');assert.equal(webCalls,1);
  assert.match(barcodeWebFailureMessage(failed.webFailure),/demorou/);
  assert.equal((await resolveBarcode('7891234567890',sources)).source,'WEB');assert.equal(webCalls,2);
});
