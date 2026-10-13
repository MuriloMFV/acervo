import test from 'node:test';
import assert from 'node:assert/strict';
import {createWish,editWish,removeWish,WishlistDuplicateError,WishlistChangedError} from '../src/services/wishlist/operations.ts';
import {withSavedWish,withoutRemovedWish} from '../src/services/wishlist/cache.ts';
import {emptyWishlistForm,parseWishlistForm,wishlistForm,filterWishlist,defaultWishlistFilters,priorityLabels,statusLabels,desiredFormatLabels,offerAcquired,wishlistCollectionRoute,validatedListingUrl} from '../src/services/wishlist/logic.ts';
const movie={id:'603',title:'Matrix',year:1999,posterUrl:'https://image.tmdb.org/matrix.jpg'};
const record=(id,extra={})=>({id,user_id:'a',tmdb_id:603,title:'Matrix',release_year:1999,poster_url:movie.posterUrl,desired_format:'ANY',priority:'MEDIUM',status:'LOOKING',target_price:null,notes:null,listing_url:null,duplicate_confirmed:false,created_at:'2026-10-13T12:00:00Z',updated_at:'2026-10-13T12:00:00Z',...extra});
function backend() {
  const rows=[];let user='a';let serial=0;
  const calls=[];
  const store={
    userId:async()=>user,
    insert:async payload=>{calls.push(['insert',payload]);if(!payload.duplicate_confirmed&&rows.some(row=>row.user_id===payload.user_id&&row.tmdb_id===payload.tmdb_id))throw{code:'23505'};const row=record(String(++serial),payload);rows.push(row);return row;},
    update:async(id,uid,version,payload)=>{calls.push(['update',id,uid,version,payload]);const index=rows.findIndex(row=>row.id===id&&row.user_id===uid&&row.updated_at===version);if(index<0)return null;const next={...rows[index],...payload,updated_at:'2026-10-13T13:00:00Z'};rows[index]=next;return next;},
    remove:async(id,uid,version)=>{calls.push(['remove',id,uid,version]);const index=rows.findIndex(row=>row.id===id&&row.user_id===uid&&row.updated_at===version);if(index<0)return false;rows.splice(index,1);return true;},
  };
  return{store,rows,calls,login:uid=>{user=uid;}};
}
test('only the TMDB movie is required; optional fields use documented defaults',async()=>{
 const db=backend();const row=await createWish(db.store,movie,emptyWishlistForm(),'a');
 assert.equal(row.tmdb_id,603);assert.equal(row.desired_format,'ANY');assert.equal(row.priority,'MEDIUM');assert.equal(row.status,'LOOKING');assert.equal(row.poster_url,movie.posterUrl);assert.equal(row.target_price,null);
 assert.equal('movie_id' in row,false);assert.equal('edition_id' in row,false);assert.equal(db.rows.length,1);
});
test('create validates before persistence and rejects changed sessions',async()=>{
 const db=backend();await assert.rejects(createWish(db.store,{...movie,id:'0'},emptyWishlistForm(),'a'));assert.equal(db.calls.length,0);
 db.login('b');await assert.rejects(createWish(db.store,movie,emptyWishlistForm(),'a'),/Sessão alterada/);assert.equal(db.calls.length,0);
});
test('duplicate is prevented until explicit confirmation, and remains detectable afterwards',async()=>{
 const db=backend();await createWish(db.store,movie,emptyWishlistForm(),'a');
 await assert.rejects(createWish(db.store,movie,emptyWishlistForm(),'a'),WishlistDuplicateError);assert.equal(db.rows.length,1);
 await createWish(db.store,movie,{...emptyWishlistForm(),format:'BLURAY'},'a',true);assert.equal(db.rows.length,2);assert.equal(db.rows[1].duplicate_confirmed,true);
 db.rows.splice(0,1);await assert.rejects(createWish(db.store,movie,emptyWishlistForm(),'a'),WishlistDuplicateError);assert.equal(db.rows.length,1);
});
test('different owners can independently wish for the same movie',async()=>{
 const db=backend();await createWish(db.store,movie,emptyWishlistForm(),'a');db.login('b');await createWish(db.store,movie,emptyWishlistForm(),'b');assert.equal(db.rows.length,2);
});
test('editing updates only wishlist fields, preserving selected movie and owner',async()=>{
 const db=backend();const row=await createWish(db.store,movie,emptyWishlistForm(),'a');
 const next=await editWish(db.store,row,{format:'UHD_4K',priority:'HIGH',status:'FOUND',price:'99,90',notes:'  Edição desejada  ',listingUrl:' https://shop.test/item '},'a');
 assert.equal(next.target_price,99.9);assert.equal(next.notes,'Edição desejada');assert.equal(next.listing_url,'https://shop.test/item');assert.equal(next.title,'Matrix');assert.equal(next.user_id,'a');assert.equal(next.tmdb_id,603);
 assert.deepEqual(Object.keys(db.calls.at(-1)[4]).sort(),['desired_format','listing_url','notes','priority','status','target_price']);
 assert.deepEqual(parseWishlistForm(wishlistForm(next)),parseWishlistForm({format:'UHD_4K',priority:'HIGH',status:'FOUND',price:'99,90',notes:'Edição desejada',listingUrl:'https://shop.test/item'}));
});
test('owner cannot edit/remove another owner or overwrite a newer version',async()=>{
 const db=backend();const row=await createWish(db.store,movie,emptyWishlistForm(),'a');
 db.login('b');await assert.rejects(editWish(db.store,row,emptyWishlistForm(),'b'),/Item indisponível/);await assert.rejects(removeWish(db.store,row,'b'),/Item indisponível/);assert.equal(db.calls.length,1);
 db.login('a');await editWish(db.store,row,{...emptyWishlistForm(),status:'FOUND'},'a');await assert.rejects(editWish(db.store,row,emptyWishlistForm(),'a'),WishlistChangedError);await assert.rejects(removeWish(db.store,row,'a'),WishlistChangedError);assert.equal(db.rows.length,1);
});
test('removing a wish affects only the targeted wish',async()=>{
 const db=backend();const a=await createWish(db.store,movie,emptyWishlistForm(),'a');const b=await createWish(db.store,{...movie,id:'604',title:'Matrix Reloaded'},emptyWishlistForm(),'a');
 await removeWish(db.store,a,'a');assert.deepEqual(db.rows.map(row=>row.id),[b.id]);
});
test('priority defaults order High then Medium then Low, with newest first inside each',()=>{
 const rows=[record('l',{priority:'LOW'}),record('m',{priority:'MEDIUM'}),record('h1',{priority:'HIGH',created_at:'2026-10-12T12:00:00Z'}),record('h2',{priority:'HIGH'})];
 assert.deepEqual(filterWishlist(rows,'',defaultWishlistFilters()).map(row=>row.id),['h2','h1','m','l']);assert.equal(rows[0].id,'l');
});
test('search and format/priority/status filters combine without touching the input',()=>{
 const rows=[record('a',{title:'Água',desired_format:'DVD',priority:'HIGH',status:'FOUND'}),record('b',{title:'Água',status:'LOOKING'}),record('c',{title:'Alien',desired_format:'DVD'})];
 assert.deepEqual(filterWishlist(rows,'  AGUA ',{format:'DVD',priority:'HIGH',status:'FOUND'}).map(row=>row.id),['a']);
 assert.deepEqual(filterWishlist(rows,'', {...defaultWishlistFilters(),format:'ANY'}).map(row=>row.id),['b']);
 assert.equal(filterWishlist(rows,'inexistente',defaultWishlistFilters()).length,0);
 for(const status of ['LOOKING','FOUND','ACQUIRED'])assert.equal(filterWishlist([record('s',{status})],'',{...defaultWishlistFilters(),status}).length,1);
});
test('optional ordering keeps null prices last and treats zero as a real price',()=>{
 const rows=[record('a',{title:'Zodíaco'}),record('b',{title:'Alien',target_price:50}),record('c',{title:'Matrix',target_price:0,created_at:'2026-10-14T12:00:00Z'})];
 assert.deepEqual(filterWishlist(rows,'',defaultWishlistFilters(),'TITLE').map(row=>row.id),['b','c','a']);
 assert.deepEqual(filterWishlist(rows,'',defaultWishlistFilters(),'PRICE').map(row=>row.id),['c','b','a']);
 assert.equal(filterWishlist(rows,'',defaultWishlistFilters(),'RECENT')[0].id,'c');
});
test('only supported statuses/priorities/formats and nonnegative prices are accepted',()=>{
 const defaults=emptyWishlistForm();assert.equal(parseWishlistForm({...defaults,price:'0'}).target_price,0);
 for(const patch of [{format:'BOX'},{format:'toString'},{priority:'URGENT'},{priority:'__proto__'},{status:'SOLD'},{price:'-1'},{price:'NaN'},{price:'1,234'},{notes:'x'.repeat(4001)}])assert.throws(()=>parseWishlistForm({...defaults,...patch}));
 assert.deepEqual(Object.values(priorityLabels),['Alta','Média','Baixa']);assert.deepEqual(Object.values(statusLabels),['Procurando','Encontrado','Adquirido']);assert.equal(desiredFormatLabels.ANY,'Qualquer formato');
});
test('listing links allow only usable external http/https URLs',()=>{
 assert.equal(validatedListingUrl(' https://shop.test/a?b=c '),'https://shop.test/a?b=c');assert.equal(validatedListingUrl(''),null);
 for(const url of ['javascript:alert(1)','file:///private','intent://host','https://','https://shop.test/a b'])assert.throws(()=>validatedListingUrl(url));
});
test('Acquired offers the existing manual collection flow without deleting or creating copies',async()=>{
 assert.equal(offerAcquired('LOOKING','ACQUIRED'),true);assert.equal(offerAcquired('FOUND','ACQUIRED'),true);assert.equal(offerAcquired(null,'ACQUIRED'),true);assert.equal(offerAcquired('ACQUIRED','ACQUIRED'),false);assert.equal(offerAcquired('ACQUIRED','FOUND'),false);
 const db=backend();const row=await createWish(db.store,movie,emptyWishlistForm(),'a');const acquired=await editWish(db.store,row,{...emptyWishlistForm(),status:'ACQUIRED'},'a');
 assert.deepEqual(wishlistCollectionRoute(acquired),{pathname:'/add/selected',params:{id:'603'}});assert.equal(db.rows.length,1);assert.equal(db.rows[0].status,'ACQUIRED');assert.equal(db.calls.some(call=>call[0]==='remove'),false);
});
test('cache reflects returned saves immediately while preserving intentional duplicate wishes',()=>{
 const items=[record('a'),record('b')];const saved=record('a',{status:'FOUND'});
 const next=withSavedWish(items,saved);
 assert.equal(next.length,2);assert.equal(next.find(row=>row.id==='a').status,'FOUND');assert.equal(items[0].status,'LOOKING');
 const added=withSavedWish(items,record('c'));
 assert.equal(added.length,3);assert.equal(withSavedWish(undefined,saved),undefined);
});
test('cache removal affects only the removed wish, not other wishes for the same work',()=>{
 const items=[record('a'),record('b')];assert.deepEqual(withoutRemovedWish(items,'a').map(row=>row.id),['b']);assert.equal(items.length,2);
 assert.equal(withoutRemovedWish(undefined,'a'),undefined);
});
