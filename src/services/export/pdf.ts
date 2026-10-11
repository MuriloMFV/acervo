interface PdfFile {
  readonly exists: boolean;
  readonly size: number | null;
  write(content: string, options: { encoding: 'base64' }): void;
}
type PrintPdf = (options: { html: string; width: number; height: number; base64: true }) => Promise<{ base64?: string }>;

export async function saveCollectionPdf(html: string, file: PdfFile, print: PrintPdf): Promise<void> {
  const result = await print({ html, width: 595, height: 842, base64: true });
  if (!result.base64) throw new Error('Não foi possível gerar o PDF. Tente novamente.');
  // Expo Go may deny access to Print's native cache. Write the returned bytes
  // into the app's own cache instead of reading or moving the native URI.
  file.write(result.base64, { encoding: 'base64' });
  if (!file.exists || (file.size ?? 0) <= 0) throw new Error('Não foi possível salvar o PDF. Tente novamente.');
}
