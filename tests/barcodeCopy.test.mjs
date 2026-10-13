import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareBarcodeCopy,BarcodeCopyValidationError} from '../src/services/barcode/copy.ts';
import {copyPayload} from '../src/services/collection/mappers.ts';
import {coverCorrectionNote} from '../src/services/barcode/mappers.ts';

test('barcode registration accepts the same purchase fields as normal registration',()=>{
 const copy=prepareBarcodeCopy('VERY_GOOD',{price:'79,90',date:'2026-10-13',place:' Loja física ',notes:' Compra em promoção ',favorite:true});
 assert.deepEqual(copy,{condition:'VERY_GOOD',purchase_price:79.9,purchase_date:'2026-10-13',purchase_place:'Loja física',notes:'Compra em promoção',is_favorite:true});
 const payload=copyPayload('user','edition','VERY_GOOD',copy);
 assert.equal(payload.edition_id,'edition');assert.equal(payload.user_id,'user');assert.equal(payload.purchase_price,79.9);assert.equal(payload.purchase_place,'Loja física');assert.equal(payload.is_favorite,true);
 assert.equal('publisher' in payload,false);assert.equal('movie_id' in payload,false);
});
test('optional purchase fields remain nullable and zero price is preserved',()=>{
 const empty=prepareBarcodeCopy('GOOD');
 assert.equal(empty.purchase_price,null);assert.equal(empty.purchase_date,null);assert.equal(empty.purchase_place,null);assert.equal(empty.notes,null);assert.equal(empty.is_favorite,false);
 assert.equal(prepareBarcodeCopy('SEALED',{price:'0'}).purchase_price,0);
});
test('invalid price/date is rejected before any barcode catalog persistence',()=>{
 for(const details of [{price:'-2'},{price:'abc'},{price:'12,345'},{date:'2026-02-30'},{date:'13/10/2026'}])assert.throws(()=>prepareBarcodeCopy('GOOD',details),BarcodeCopyValidationError);
});
test('cover correction retains purchase information and user notes',()=>{
 const copy=prepareBarcodeCopy('LIKE_NEW',{price:'120.50',date:'2026-10-13',place:'Site',notes:'Veio lacrado',favorite:true},true);
 assert.equal(copy.purchase_price,120.5);assert.equal(copy.purchase_place,'Site');assert.equal(copy.is_favorite,true);
 assert.equal(copy.notes,`Veio lacrado\n\n${coverCorrectionNote}`);
 assert.equal(prepareBarcodeCopy('GOOD',{},true).notes,coverCorrectionNote);
});
test('the correction marker is not repeated when already present in observations',()=>{
 assert.equal(prepareBarcodeCopy('GOOD',{notes:coverCorrectionNote},true).notes,coverCorrectionNote);
});
