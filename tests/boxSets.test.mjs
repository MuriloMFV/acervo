import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBoxForm,validateBoxMovieIds,includedBoxMovies,boxCover,mapBoxCard} from '../src/services/boxes/mappers.ts';
const form={name:'  Trilogia Alien  ',mediaFormat:'DVD',barcode:'',coverUrl:'',editionName:'',publisher:'',country:'',region:'',discCount:'',special:false,limited:false,condition:'VERY_GOOD',price:'',date:'',place:'',notes:''};
const copy={id:'copy-id',box_set:{name:'Alien',cover_url:null,media_format:'DVD',movies:[{position:2,movie:{id:'b',title:'Aliens',poster_url:'second'}},{position:1,movie:{id:'a',title:'Alien',poster_url:'first'}}]}};
test('minimal box form leaves optional fields null and keeps box separate from movie/edition',()=>{
 const {box,copy}=parseBoxForm(form);
 assert.equal(box.name,'Trilogia Alien');assert.equal(box.media_format,'DVD');
 for(const key of ['barcode','cover_url','disc_count','publisher','country','region','edition_name'])assert.equal(box[key],null);
 assert.equal(copy.condition,'VERY_GOOD');assert.equal(copy.purchase_price,null);
 assert.equal('movie_id' in box,false);assert.equal('edition_id' in copy,false);assert.equal('user_id' in copy,false);
});
test('optional metadata and personal purchase values are normalized without changing format',()=>{
 const {box,copy}=parseBoxForm({...form,barcode:'789 0552 001548',coverUrl:' https://images.test/box.jpg ',discCount:' 4 ',publisher:' Fox ',country:' Brasil ',region:' 4 ',editionName:' Especial ',special:true,limited:true,price:'99,90',date:'2026-10-09',place:' Loja ',notes:' Completo '});
 assert.equal(box.barcode,'7890552001548');assert.equal(box.disc_count,4);assert.equal(box.publisher,'Fox');assert.equal(box.country,'Brasil');assert.equal(box.region,'4');
 assert.equal(box.is_special_edition,true);assert.equal(box.is_limited_edition,true);
 assert.equal(copy.purchase_price,99.9);assert.equal(copy.purchase_place,'Loja');assert.equal(copy.notes,'Completo');
});
test('invalid form data is rejected before any network request',()=>{
 for(const patch of [{name:' '},{name:'x'.repeat(201)},{discCount:'0'},{discCount:'1.5'},{barcode:'123'},{coverUrl:'javascript:alert(1)'},{condition:'MINT'},{mediaFormat:'BOX'},{price:'-2'},{date:'2026-02-30'}]) assert.throws(()=>parseBoxForm({...form,...patch}));
});
test('box selection requires two to one hundred unique valid TMDB works',()=>{
 assert.doesNotThrow(()=>validateBoxMovieIds(['1','2']));
 for(const ids of [[],['1'],['1','1'],['1','not-a-number'],['1','0'],Array.from({length:101},(_,i)=>String(i+1))])assert.throws(()=>validateBoxMovieIds(ids));
});
test('included movie order is explicit and never mutates database relation results',()=>{
 const before=JSON.stringify(copy);
 assert.deepEqual(includedBoxMovies(copy).map(movie=>movie.id),['a','b']);
 assert.equal(JSON.stringify(copy),before);
});
test('box cover uses selected URL then the first included movie poster or placeholder',()=>{
 assert.equal(boxCover(copy),'first');
 assert.equal(boxCover({...copy,box_set:{...copy.box_set,cover_url:'https://cover.test/box'}}),'https://cover.test/box');
 assert.equal(boxCover({...copy,box_set:{...copy.box_set,movies:[]}}),null);
});
test('one physical box produces one card, with movie count and an independent route identity',()=>{
 const card=mapBoxCard(copy);
 assert.equal(card.id,'box:copy-id');assert.equal(card.kind,'box');assert.equal(card.movieCount,2);assert.equal(card.title,'Alien');assert.equal(card.mediaFormat,'DVD');assert.equal(card.poster.uri,'first');
});
