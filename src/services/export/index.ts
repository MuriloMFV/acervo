import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { authenticatedUserId, listCollectionItems } from '../collection';
import { listCollectionBoxes } from '../boxes';
import { signedCopyPhotoCovers } from '../photos';
import { photoCoverRequests, withPhotoCover } from '../photos/covers';
import { fontAssets, fontFamilies } from '../../theme/fonts';
import { buildCollectionDocument, exportItems } from './document';
import { saveCollectionPdf } from './pdf';

async function localAsset(module: number): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error('Asset indisponível.');
  return asset.localUri;
}
async function thumbnail(uri: string, logo = false): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  try {
    if (logo) context.crop({ originX: 150, originY: 1320, width: 630, height: 205 }).resize({ width: 504 });
    else context.resize({ width: 120 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: logo ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.75 });
      const file = new File(saved.uri);
      try { return `data:image/${logo ? 'png' : 'jpeg'};base64,${await file.base64()}`; }
      finally { if (file.exists) file.delete(); }
    } finally { image.release(); }
  } finally { context.release(); }
}
async function coverImage(url: string, folder: Directory, index: number): Promise<string> {
  if (!/^https?:\/\//i.test(url)) throw new Error('Capa inválida.');
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || !mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime) || !response.body) throw new Error('Capa indisponível.');
  const maxBytes = 8 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > maxBytes) { await response.body.cancel(); throw new Error('Capa muito grande.'); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error('Capa muito grande.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  if (!size) throw new Error('Capa vazia.');
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const file = new File(folder, `${index}.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`);
  file.write(bytes);
  try { return await thumbnail(file.uri); }
  finally { if (file.exists) file.delete(); }
}

export async function exportCollectionPdf(expectedUserId: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível.');
  if (await authenticatedUserId() !== expectedUserId) throw new Error('Sessão alterada.');
  const [records, boxes] = await Promise.all([listCollectionItems(), listCollectionBoxes()]);
  if (await authenticatedUserId() !== expectedUserId || records.some(item => item.user_id !== expectedUserId) || boxes.some(item => item.user_id !== expectedUserId)) throw new Error('Sessão alterada.');
  const requests = photoCoverRequests(records, expectedUserId);
  const photos = requests.length ? await signedCopyPhotoCovers(expectedUserId, requests).catch(() => ({})) : {};
  const items = exportItems(records.map(item => withPhotoCover(item, photos)), boxes);
  const folder = new Directory(Paths.cache, `acervo-export-${Date.now()}`);
  folder.create();
  let pdf: File | undefined;
  try {
    const [logoUri, bodyUri, titleUri] = await Promise.all([
      localAsset(require('../../assets/splash animation/logo-acervo.png')),
      localAsset(fontAssets[fontFamilies.body]), localAsset(fontAssets[fontFamilies.title]),
    ]);
    const covers: Record<string, string> = {};
    const imageCache = new Map<string, Promise<string>>();
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++; const item = items[index];
        if (!item.coverUrl) continue;
        let image = imageCache.get(item.coverUrl);
        if (!image) { image = coverImage(item.coverUrl, folder, index); imageCache.set(item.coverUrl, image); }
        try { covers[item.id] = await image; } catch { /* Missing cover never blocks the document. */ }
      }
    }));
    const date = new Date();
    const html = buildCollectionDocument(items, date, {
      logo: await thumbnail(logoUri, true), bodyFont: await new File(bodyUri).base64(),
      titleFont: await new File(titleUri).base64(), covers,
    });
    if (await authenticatedUserId() !== expectedUserId) throw new Error('Sessão alterada.');
    pdf = new File(Paths.cache, `Acervo-${date.toISOString().slice(0, 10)}-${date.getTime()}.pdf`);
    await saveCollectionPdf(html, pdf, Print.printToFileAsync);
    if (await authenticatedUserId() !== expectedUserId) throw new Error('Sessão alterada.');
    await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Exportar Acervo' });
  } catch (error) {
    if (pdf?.exists) pdf.delete();
    throw error;
  } finally {
    if (folder.exists) folder.delete();
    // Keep the PDF in cache: Android recipients may read it after the chooser closes.
  }
}
