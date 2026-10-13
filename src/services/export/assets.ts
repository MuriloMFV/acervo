export async function exportImageBase64(
  mime: 'image/png' | 'image/jpeg',
  save: (options: { base64: true; compress: number }) => Promise<{ uri: string; base64?: string }>,
  cleanup?: (uri: string) => void,
): Promise<string> {
  const result = await save({ base64: true, compress: 0.75 });
  try {
    if (!result.base64 || !/^[A-Za-z0-9+/=]+$/.test(result.base64)) throw new Error('Imagem indisponível para o PDF.');
    // Embed the native return value without reading the cached file's contents.
    return `data:${mime};base64,${result.base64}`;
  } finally {
    try { cleanup?.(result.uri); } catch { /* Cache cleanup cannot discard a valid image. */ }
  }
}
type Decorations = { logo: string; bodyFont: string; titleFont: string };
export async function optionalExportAssets(
  readers: { [K in keyof Decorations]: () => Promise<string> },
  onFailure?: (asset: keyof Decorations, cause: unknown) => void,
): Promise<Decorations> {
  const load = async (key: keyof Decorations) => {
    try { return await readers[key](); }
    catch (cause) { onFailure?.(key, cause); return ''; }
  };
  const [logo, bodyFont, titleFont] = await Promise.all([load('logo'), load('bodyFont'), load('titleFont')]);
  // The HTML already has text branding and Arial fallbacks for missing decorations.
  return { logo, bodyFont, titleFont };
}
