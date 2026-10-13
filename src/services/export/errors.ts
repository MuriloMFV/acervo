export type ExportStage = 'availability' | 'session' | 'movies' | 'boxes' | 'cache' | 'document' | 'pdf' | 'sharing';
const messages: Record<ExportStage, string> = {
  availability: 'O compartilhamento de arquivos não está disponível neste dispositivo.',
  session: 'Sua sessão mudou. Entre novamente antes de exportar o acervo.',
  movies: 'Não foi possível carregar os filmes para o PDF. Confira a conexão e tente novamente.',
  boxes: 'Não foi possível carregar os boxes para o PDF. Confira a conexão e tente novamente.',
  cache: 'Não foi possível preparar o arquivo PDF. Confira o espaço disponível no dispositivo.',
  document: 'Não foi possível montar o PDF com os dados do acervo.',
  pdf: 'Não foi possível gerar ou salvar o PDF no dispositivo. Tente novamente.',
  sharing: 'O PDF foi gerado, mas não foi possível abrir o compartilhamento. Tente novamente.',
};
export class CollectionExportError extends Error {
  readonly stage: ExportStage;
  constructor(stage: ExportStage, cause?: unknown) {
    super(messages[stage], { cause }); this.name = 'CollectionExportError'; this.stage = stage;
  }
}
export async function exportStep<T>(stage: ExportStage, action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (cause) { throw cause instanceof CollectionExportError ? cause : new CollectionExportError(stage, cause); }
}
export function exportErrorMessage(cause: unknown): string {
  return cause instanceof CollectionExportError ? cause.message : 'Não foi possível exportar o acervo. Tente novamente.';
}
export function exportDiagnostic(cause: unknown) {
  const underlying = cause instanceof CollectionExportError ? cause.cause : cause;
  const fields = underlying && typeof underlying === 'object' ? underlying as { message?: unknown; code?: unknown } : {};
  // Native errors may contain signed image URLs or private device paths.
  const message = typeof fields.message === 'string' ? fields.message.replace(/(?:https?|file|content|asset):\/{1,3}[^\s"'<>)]*/gi, '[arquivo]').slice(0, 350) : 'Falha sem mensagem';
  return { etapa: cause instanceof CollectionExportError ? cause.stage : 'export', codigo: typeof fields.code === 'string' ? fields.code.slice(0, 80) : undefined, motivo: message };
}
