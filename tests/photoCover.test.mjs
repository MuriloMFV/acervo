import test from 'node:test';
import assert from 'node:assert/strict';
import { photoCoverRequests, withPhotoCover } from '../src/services/photos/covers.ts';
import { collectionCover, editionCover, mapCollectionCard, mapCollectionDetails, parseCopyForm } from '../src/services/collection/mappers.ts';
const user='11111111-1111-4111-8111-111111111111';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const path=`${user}/${id}/photo-55555555-5555-4555-8555-555555555555.jpg`;
const item={ id,user_id:user,photo_url:path,use_photo_as_cover:false,edition:{custom_cover_url:'catalog',product_image_url:'product',media_format:'DVD',movie:{title:'Platoon',release_year:1986,poster_url:'poster',genres:[]}},condition:'GOOD'};
const urls={[path]:'https://storage.test/signed-photo'};
test('photo remains opt-in; no signing for default, missing photo or foreign scope',()=>{
 assert.deepEqual(photoCoverRequests([item],user),[]);
 assert.deepEqual(photoCoverRequests([{...item,use_photo_as_cover:true}],user),[{itemId:id,path}]);
 assert.deepEqual(photoCoverRequests([{...item,use_photo_as_cover:true,photo_url:null}],user),[]);
 assert.deepEqual(photoCoverRequests([{...item,use_photo_as_cover:true,user_id:'other'}],user),[]);
 assert.deepEqual(photoCoverRequests([{...item,use_photo_as_cover:true,photo_url:'https://external.test/image'}],user),[]);
 assert.equal(collectionCover(withPhotoCover(item,urls)),'catalog');
});
test('enabled private photo appears in cards and details without changing catalog',()=>{
 const copy=withPhotoCover({...item,use_photo_as_cover:true},urls);
 assert.equal(collectionCover(copy),urls[path]);
 assert.equal(mapCollectionCard(copy).poster.uri,urls[path]);
 assert.equal(mapCollectionDetails(copy).movie.poster.uri,urls[path]);
 assert.equal(editionCover(copy.edition),'catalog');
 assert.equal(copy.edition.movie.poster_url,'poster');
 assert.equal(item.photo_cover_url,undefined);
});
test('missing or failed signed URL falls back through custom/product/poster',()=>{
 const copy=withPhotoCover({...item,use_photo_as_cover:true},{});
 assert.equal(collectionCover(copy),'catalog'); copy.edition={...copy.edition,custom_cover_url:null};
 assert.equal(collectionCover(copy),'product'); copy.edition={...copy.edition,product_image_url:null};
 assert.equal(collectionCover(copy),'poster');
});
test('turning preference off clears an in-memory photo override',()=>{
 const copy=withPhotoCover({...item,use_photo_as_cover:true},urls);
 assert.equal(collectionCover(withPhotoCover({...copy,use_photo_as_cover:false},urls)),'catalog');
 assert.equal(collectionCover({...copy,photo_url:null}),'catalog');
});
test('changing photo cannot reuse the previous signed URL',()=>{
 const nextPath=path.replace('55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666');
 const copy=withPhotoCover({...item,use_photo_as_cover:true,photo_url:nextPath},urls);
 assert.equal(copy.photo_cover_url,null); assert.equal(collectionCover(copy),'catalog');
});
test('preference is persisted only on the personal copy payload',()=>{
 const payload=parseCopyForm({condition:'GOOD',price:'',date:'',place:'',notes:'',usePhotoAsCover:true});
 assert.equal(payload.use_photo_as_cover,true); assert.equal('custom_cover_url' in payload,false);
 assert.equal(parseCopyForm({condition:'GOOD',price:'',date:'',place:'',notes:'',usePhotoAsCover:false}).use_photo_as_cover,false);
});
