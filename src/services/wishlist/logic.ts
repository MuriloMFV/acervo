import type { DesiredFormat, WishlistPriority, WishlistStatus, WishlistItemRow } from '../supabase/types';
import type { MovieSearchCandidate } from '../../types/movieSearch';
export const desiredFormatLabels: Record<DesiredFormat,string> = {ANY:'Qualquer formato',DVD:'DVD',BLURAY:'Blu-ray',UHD_4K:'4K UHD',VHS:'VHS'};
export const priorityLabels: Record<WishlistPriority,string> = {HIGH:'Alta',MEDIUM:'Média',LOW:'Baixa'};
export const statusLabels: Record<WishlistStatus,string> = {LOOKING:'Procurando',FOUND:'Encontrado',ACQUIRED:'Adquirido'};
export interface WishlistFormValues {
  format:DesiredFormat;priority:WishlistPriority;status:WishlistStatus;price:string;notes:string;listingUrl:string;
}
export type WishlistEdit = Pick<WishlistItemRow,'desired_format'|'priority'|'status'|'target_price'|'notes'|'listing_url'>;
export type WishlistSort = 'PRIORITY'|'TITLE'|'PRICE'|'RECENT';
export const wishlistSortLabels:Record<WishlistSort,string>={PRIORITY:'Prioridade',TITLE:'Título A–Z',PRICE:'Preço-alvo',RECENT:'Recentes'};
export interface WishlistFilters {priority:WishlistPriority|null;format:DesiredFormat|null;status:WishlistStatus|null}
export const defaultWishlistFilters=():WishlistFilters=>({priority:null,format:null,status:null});
export const emptyWishlistForm=():WishlistFormValues=>({format:'ANY',priority:'MEDIUM',status:'LOOKING',price:'',notes:'',listingUrl:''});
export function wishlistForm(item:WishlistItemRow):WishlistFormValues {
  return {format:item.desired_format,priority:item.priority,status:item.status,price:item.target_price===null?'':String(item.target_price).replace('.',','),notes:item.notes??'',listingUrl:item.listing_url??''};
}
export function validatedListingUrl(value:string):string|null {
  const text=value.trim();if(!text)return null;
  let url:URL;try{url=new URL(text);}catch{throw new Error('Informe um link http/https válido.');}
  if(!['http:','https:'].includes(url.protocol)||!url.hostname||text.length>2048||/\s/.test(text))throw new Error('Informe um link http/https válido.');
  return text;
}
export function parseWishlistForm(form:WishlistFormValues):WishlistEdit {
  if(!Object.keys(desiredFormatLabels).includes(form.format)||!Object.keys(priorityLabels).includes(form.priority)||!Object.keys(statusLabels).includes(form.status))throw new Error('Opção inválida.');
  const amount=form.price.trim();
  if(amount&&!/^\d{1,10}([.,]\d{1,2})?$/.test(amount))throw new Error('Informe um preço-alvo válido.');
  const notes=form.notes.trim();if(notes.length>4000)throw new Error('Use até 4000 caracteres nas observações.');
  return {desired_format:form.format,priority:form.priority,status:form.status,target_price:amount?Number(amount.replace(',','.')):null,notes:notes||null,listing_url:validatedListingUrl(form.listingUrl)};
}
export function wishlistMovieSnapshot(movie:MovieSearchCandidate) {
  const id=Number(movie.id);const title=movie.title.trim();
  if(!/^[1-9]\d*$/.test(movie.id)||!Number.isSafeInteger(id)||!title||title.length>500)throw new Error('Filme inválido.');
  return {tmdb_id:id,title,release_year:movie.year,poster_url:movie.posterUrl};
}
export function offerAcquired(previous:WishlistStatus|null,next:WishlistStatus):boolean {return next==='ACQUIRED'&&previous!=='ACQUIRED';}
export function wishlistCollectionRoute(item:Pick<WishlistItemRow,'tmdb_id'>) {
  return {pathname:'/add/selected' as const,params:{id:String(item.tmdb_id)}};
}
const priorityOrder:Record<WishlistPriority,number>={HIGH:0,MEDIUM:1,LOW:2};
const normalize=(text:string)=>text.trim().normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR');
const created=(item:WishlistItemRow)=>Date.parse(item.created_at)||0;
export function filterWishlist(items:readonly WishlistItemRow[],search:string,filters:WishlistFilters,sort:WishlistSort='PRIORITY'):WishlistItemRow[] {
  const text=normalize(search);
  return items.filter(item=>(!text||normalize(item.title).includes(text))&&(!filters.format||item.desired_format===filters.format)&&(!filters.priority||item.priority===filters.priority)&&(!filters.status||item.status===filters.status)).sort((a,b)=>{
    let order=0;
    if(sort==='PRIORITY')order=priorityOrder[a.priority]-priorityOrder[b.priority];
    else if(sort==='TITLE')order=a.title.localeCompare(b.title,'pt-BR',{sensitivity:'base'});
    else if(sort==='PRICE')order=a.target_price===null?(b.target_price===null?0:1):b.target_price===null?-1:a.target_price-b.target_price;
    return order||created(b)-created(a)||a.id.localeCompare(b.id);
  });
}
