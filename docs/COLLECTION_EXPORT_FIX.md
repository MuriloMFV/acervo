# Exportação: imagens nativas e diagnóstico de falhas

O relato recebido foi o alerta genérico “Não foi possível gerar ou compartilhar o PDF”. Esse alerta não identificava a etapa nem registrava a causa no terminal. Não foi possível reproduzir a tentativa no aparelho a partir dessa mensagem; esta alteração remove um ponto de falha de leitura de cache e permite identificar qualquer erro que permaneça.

## Alterações

- As miniaturas e a logo agora usam `ImageManipulator.saveAsync({ base64: true })`, lendo o base64 retornado pelo próprio módulo. O conteúdo do arquivo criado no cache nativo não é reaberto com `File.base64()`.
- Falhas ao carregar logo ou fontes não descartam a exportação. O HTML já tem título de texto “Acervo” e fontes de fallback. A arte e as fontes originais continuam sendo usadas quando disponíveis.
- Falha ao consultar filmes ou boxes interrompe a exportação com uma mensagem específica. Não é gerado silenciosamente um PDF sem boxes.
- Preparação do cache, montagem do documento, geração/gravação e compartilhamento têm mensagens próprias. O Expo Go registra `[Acervo PDF]` com etapa, código e motivo, ocultando URLs assinadas e URIs de arquivos.
- Erros ao limpar temporários não descartam uma imagem já obtida nem substituem o erro original de exportação.

O layout, a lista de filmes/boxes, ordenação, autenticação, Storage e a gravação do PDF a partir do base64 do Expo Print foram preservados. Não há migration nem alteração no banco.

O retorno base64 foi conferido no SDK instalado e na [documentação oficial do Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/#saveoptions).

## Arquivos

- `app/profile.tsx`
- `src/services/export/index.ts`
- `src/services/export/assets.ts` (novo)
- `src/services/export/errors.ts` (novo)
- `tests/collectionExportAssets.test.mjs` (novo)
- `docs/COLLECTION_EXPORT_FIX.md` (novo)

## Verificação

Typecheck e 273 testes unitários passaram. Os novos testes simulam um URI nativo sem permissão READ, falha de limpeza, fontes/logo inacessíveis, preservação de todas as linhas de filmes e boxes, erros de consulta/geração/compartilhamento e ocultação de tokens nos logs.

A exportação Android valida o bundle. Ela não equivale a gerar APK nem a testar o compartilhamento no aparelho.

Após carregar a correção, o usuário confirmou que a exportação do PDF funcionou no APK instalado.

No Expo Go, recarregue o código atualizado e toque novamente em Exportar acervo. Se falhar, envie a nova mensagem e as linhas `[Acervo PDF]` do terminal. Em um APK instalado, é necessário um novo build ou uma atualização OTA compatível para executar esta alteração. Se continuar aparecendo exatamente o alerta antigo, a versão instalada ainda contém o código anterior.
