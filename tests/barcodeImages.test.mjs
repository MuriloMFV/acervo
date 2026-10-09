import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupBarcodeWebCandidates, normalizeBarcodeImageResults } from '../supabase/functions/_shared/barcodeWeb.ts';
const code='7892770016182';
const images={images_results:[
  {title:'Homem-Aranha 3 DVD',link:'https://catalog.example/homem-aranha-3',thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=fixture'},
  {title:'Homem-Aranha 3 DVD',link:'https://catalog.example/homem-aranha-3',thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=fixture'},
  {title:'Site em Manutenção',link:'https://catalog.example/offline',thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=offline'},
  {title:'Homem-Aranha 3',link:'https://localhost/private',thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=private'},
  {title:'Homem-Aranha 3',link:'https://catalog.example/unsafe',thumbnail:'https://untrusted.example/image.jpg'},
]};

test('textual candidate skips Google Images and preserves original query',async()=>{
  const calls=[];
  const result=await lookupBarcodeWebCandidates(code,async(engine,query)=>{calls.push([engine,query]);return {organic_results:[{title:'Homem-Aranha 3 DVD',link:'https://catalog.example/3'}]};});
  assert.equal(result.length,1);assert.deepEqual(calls,[['google',`"${code}"`]]);
});
test('textual empty triggers one visual request, yielding visual suggestions only',async()=>{
  const calls=[];
  const result=await lookupBarcodeWebCandidates(` ${code} `,async(engine,query)=>{calls.push([engine,query]);return engine==='google'?{organic_results:[]}:images;});
  assert.deepEqual(calls,[['google',`"${code}"`],['google_images',`"${code}"`]]);
  assert.equal(result.length,1);assert.equal(result[0].detectedTitle,'Homem-Aranha 3');
  assert.equal(result[0].detectedFormat,'DVD');assert.equal(result[0].imageUrl,'https://encrypted-tbn0.gstatic.com/images?q=fixture');
  assert.equal(result[0].detectedPublisher,null);assert.equal(result[0].detectedRegion,null);
  assert.deepEqual(result[0].confidenceHints,['Sugestão visual']);
  assert.equal('edition' in result[0],false);assert.equal('custom_cover_url' in result[0],false);
});
test('no useful text also reaches visual fallback, without preserving unrelated text',async()=>{
  const result=await lookupBarcodeWebCandidates(code,async engine=>engine==='google'?{organic_results:[{title:'Suplemento alimentar',link:'https://pharmacy.example/1'}]}:images);
  assert.equal(result.length,1);assert.equal(result[0].title,'Homem-Aranha 3 DVD');
});
test('empty visual results permit final manual fallback; malformed bodies remain errors',async()=>{
  for(const body of [{images_results:[]},{error:"Google hasn't returned any results for this query."}]){
    assert.deepEqual(await lookupBarcodeWebCandidates(code,async engine=>engine==='google'?{organic_results:[]}:body),[]);
  }
  assert.throws(()=>normalizeBarcodeImageResults({}),/Resposta inválida/);
});
test('textual quota/network failures never trigger another paid request',async()=>{
  let calls=0;
  await assert.rejects(lookupBarcodeWebCandidates(code,async()=>{calls++;throw new Error('rate-limit');}),/rate-limit/);
  assert.equal(calls,1);
});
test('visual suggestions preserve absent format; duplicate, unsafe and maintenance images discarded',()=>{
  assert.equal(normalizeBarcodeImageResults(images).length,1);
  const results=normalizeBarcodeImageResults({images_results:[{title:'Homem-Aranha 3',link:'https://catalog.example/3',thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=movie'}]});
  assert.equal(results[0].detectedFormat,null);assert.equal(results[0].detectedEditionName,null);
});
