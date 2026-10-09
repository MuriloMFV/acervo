import type { CollectionRecord } from '../collection/types.ts';
import { collectionCover } from '../collection/mappers.ts';
import { conditionLabels } from '../../utils/collectionDetails.ts';

export interface ExportItem {
  id: string; title: string; year: number | null; format: string;
  condition: string; discCount: number | null; coverUrl: string | null;
}
const formats = { DVD: 'DVD', BLURAY: 'Blu-ray', UHD_4K: '4K UHD', VHS: 'VHS' };
export function exportItems(records: readonly CollectionRecord[]): ExportItem[] {
  return records.map(item => ({
    id: item.id, title: item.edition.movie.title, year: item.edition.movie.release_year,
    format: formats[item.edition.media_format], condition: conditionLabels[item.condition],
    discCount: item.edition.disc_count, coverUrl: collectionCover(item),
  })).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id));
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
// The printable document accepts only embedded, validated images, never external HTML/URLs.
export function embeddedImage(value: string | undefined): string | null {
  return value && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : null;
}
export function buildCollectionDocument(items: readonly ExportItem[], date: Date, assets: {
  logo: string; bodyFont: string; titleFont: string; covers: Readonly<Record<string, string>>;
}): string {
  const exportedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  const rows = items.map(item => {
    const image = embeddedImage(assets.covers[item.id]);
    return `<tr><td class="cover-cell">${image ? `<img class="cover" src="${image}" alt="" />` : '<div class="no-cover">Sem capa</div>'}</td><td class="title">${escapeHtml(item.title)}</td><td>${item.year ?? '—'}</td><td>${escapeHtml(item.format)}</td><td>${escapeHtml(item.condition)}</td><td>${item.discCount ?? '—'}</td></tr>`;
  }).join('');
  const logo = embeddedImage(assets.logo);
  const font = (data: string) => /^[A-Za-z0-9+/=]+$/.test(data) ? data : '';
  return `<!DOCTYPE html><html lang="pt-BR"><head><title>Acervo</title><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
  @font-face{font-family:AcervoBody;src:url(data:font/ttf;base64,${font(assets.bodyFont)})}
  @font-face{font-family:AcervoTitle;src:url(data:font/ttf;base64,${font(assets.titleFont)})}
  @page{size:A4;margin:18mm 12mm}*{box-sizing:border-box}body{margin:0;color:#191B22;background:white;font:10px AcervoBody,Arial,sans-serif}
  header{background:#11131A;color:#E2E2EC;padding:22px 24px;margin-bottom:20px;border-bottom:3px solid #E5A93C;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .brand{display:flex;align-items:center;justify-content:space-between}.logo{width:110px;height:36px;object-fit:contain}h1{font:28px AcervoTitle,Arial,sans-serif;margin:0}
  .meta{color:#D4C4B0;margin:12px 0 0;font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}
  th{text-align:left;color:#432C00;background:#FFF3DC;padding:10px 7px;font-size:9px}td{padding:10px 7px;border-bottom:1px solid #E4E4E8;vertical-align:middle;overflow-wrap:anywhere}
  tr{break-inside:avoid;page-break-inside:avoid}th:first-child{width:66px}th:nth-child(2){width:34%}th:nth-child(3){width:45px}th:last-child{width:47px}
  .cover{display:block;width:45px;height:68px;object-fit:contain;background:#F3F3F5}.no-cover{width:45px;height:68px;background:#F3F3F5;color:#777;text-align:center;padding-top:25px;font-size:8px}
  .title{font-size:11px}.empty{padding:24px 0;color:#777}footer{margin-top:18px;color:#777;font-size:8px}
  </style></head><body><header><div class="brand"><h1>Acervo</h1>${logo ? `<img class="logo" src="${logo}" alt="" />` : ''}</div><p class="meta">Exportado em ${escapeHtml(exportedAt)} · ${items.length} ${items.length === 1 ? 'item' : 'itens'}</p></header>
  ${items.length ? `<table><thead><tr><th>Capa</th><th>Título</th><th>Ano</th><th>Formato</th><th>Condição</th><th>Discos</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">Seu acervo está vazio.</p>'}
  <footer>Acervo · Coleção de mídia física</footer></body></html>`;
}
