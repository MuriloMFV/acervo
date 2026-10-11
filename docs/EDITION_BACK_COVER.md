# Contracapa opcional de Edition

## Comportamento

- O modelo foi conferido: não havia campo para contracapa. `Edition.back_cover_url` é nullable, sem valor padrão além de `NULL`.
- O cadastro manual e a confirmação de uma edição nova por barcode oferecem **Adicionar contracapa** depois dos controles da capa frontal. A opção não impede salvar sem contracapa; dentro da busca, **Pular contracapa** retorna sem alterar a seleção.
- **Adicionar contracapa** e **Trocar contracapa** oferecem **Escolher da galeria** e **Tirar foto**. **Buscar contracapa na web** mantém disponível a busca de imagens existente.
- Em **Editar edição**, o usuário pode adicionar, trocar ou remover a contracapa. O botão Salvar edição confirma a alteração; Cancelar preserva o registro.
- Para a capa frontal, **Editar edição → Usar minha foto como capa** permite escolher da galeria ou tirar uma foto. A imagem é enviada pelo mesmo componente e serviço da contracapa e salva no campo existente `custom_cover_url`. **Buscar nova capa** e **Usar capa padrão** continuam disponíveis. Alterar a frente preserva a contracapa e `Movie.poster_url`; salvar fica bloqueado durante qualquer envio de imagem.
- Uma Edition já encontrada no catálogo continua sendo reutilizada no cadastro por barcode. Para alterar suas imagens, usa-se **Editar edição**, como no fluxo existente.
- A busca reaproveita `EditionCoverPicker`, `search-edition-covers` e `save-edition-cover`. A consulta da contracapa acrescenta “contracapa”, com o mesmo limite de 240 caracteres; a consulta frontal permanece igual.
- A imagem escolhida é copiada pelas validações e pelo upload existentes para o bucket público `edition-covers`, com URLs do Storage verificadas antes da persistência. Não foi criado bucket nem Edge Function.
- Fotos locais da frente ou da contracapa reutilizam o seletor, o preparo JPEG, o redimensionamento e a validação das fotos da cópia. O mesmo leitor de arquivo é usado nos uploads. O upload é autenticado, usa UUID novo e `upsert: false`, com limite de 5 MB. Somente a URL permanente do Storage entra no formulário após sucesso; cancelar ou falhar preserva a seleção anterior. Salvar fica desabilitado durante o preparo/envio.
- Remover ou trocar desvincula a imagem daquela edição. Os objetos do bucket permanecem imutáveis, conforme a infraestrutura existente, pois outra edição pode utilizá-los.
- A RPC existente continua criando uma Edition e vinculando somente a cópia do usuário, sem alterar a Edition compartilhada. Payloads antigos que omitem `back_cover_url` preservam a contracapa atual.

## Flip nos detalhes

`EditionCoverFlip` usa React Native Reanimated, `withTiming` de 420 ms, easing suave, perspective 1000 e rotateY. A frente gira de 0° a 180°; a contracapa, de 180° a 360°, ficando legível ao final. Backface visibility e a alternância de opacidade impedem mostrar o verso espelhado. Um novo toque retorna à frente. As imagens mantêm a proporção com `contain` dentro da área existente.

A capa ocupa 39% da linha de detalhes (antes 36%), com fundo transparente e sem a legenda “toque para virar”. O toque continua alternando as faces após o carregamento da contracapa. Falha de carregamento desativa o flip e mantém a frente. Sem contracapa, a capa usa o componente estático, sem ação de toque. A preferência de movimento reduzido do sistema é respeitada pelo comportamento padrão de `withTiming`.

`Movie.poster_url`, a prioridade frontal `custom_cover_url → product_image_url → movie.poster_url`, as buscas de barcode/TMDB/SerpApi e o modelo de CollectionItem foram preservados. A preferência já existente por foto pessoal também continua funcionando.

## Migration e entrega

Migration criada: `supabase/migrations/20261010002750_edition_back_cover.sql`.

Ela adiciona a coluna opcional e estende a RPC `edit_collection_edition`, mantendo SECURITY INVOKER, RLS, verificação do dono e proteção contra formulário desatualizado. Não modifica o esquema de CollectionItem nem permissões do bucket.

**A migration já consta aplicada no projeto Supabase vinculado.** Na conferência remota feita para orientar o teste, foram confirmados o histórico `20261010002750`, a coluna nullable `editions.back_cover_url` e o suporte da RPC `edit_collection_edition` ao novo campo. O banco desse projeto já está pronto para testar a contracapa.

O suporte a fotos locais usa as permissões e as políticas já existentes do bucket; não acrescenta migration nem modifica as Edge Functions.

**É preciso gerar e instalar um novo APK** para o app instalado receber a interface e a animação. O teste pelo Expo Go pode usar o código local após a migration. Não é preciso redeploy das Edge Functions existentes nem adicionar dependência nativa: Reanimated já faz parte do projeto.

## Validação

- `npm test`: 187 testes aprovados, incluindo 16 novos testes de imagens da Edition. Os testes de foto cobrem upload, bytes/MIME/tamanho inválidos, sessão alterada, falha sem substituir a imagem anterior, URL permanente do Storage e foto frontal mantendo contracapa/pôster.
- PostgreSQL/PGlite: 67 verificações da migration, RPC, persistência e RLS, incluindo adicionar/trocar/remover, edição compartilhada com outro dono, payload antigo, URL inválida, objeto ausente, usuário anônimo, upload somente na pasta do dono, imutabilidade, edição da foto frontal preservando contracapa/pôster e restauração da capa padrão.
- `npm run typecheck`: aprovado.
- Exportação Expo Android/iOS: bundles com fotos da capa frontal e contracapa aprovados, em `/private/tmp/acervo-front-cover-photo-export`.
- `git diff --check`: aprovado.
- A animação ainda precisa de conferência visual em aparelho; os testes automatizados validam seus ângulos e a seleção de faces.

Para repetir o teste SQL sem acrescentar dependências ao aplicativo:

```sh
npm install --prefix /private/tmp/acervo-back-cover-sql --no-save --package-lock=false --no-audit --no-fund @electric-sql/pglite
ACERVO_PGLITE_MODULE=/private/tmp/acervo-back-cover-sql/node_modules/@electric-sql/pglite/dist/index.js node tests/sql/copyPhotosAndEditionEditing.mjs
```

Conferência em aparelho: salvar uma edição sem contracapa; adicionar uma contracapa da galeria em Editar edição; reabrir detalhes e tocar duas vezes; trocar por uma foto tirada na câmera; cancelar o seletor para conferir que a imagem anterior permanece; trocar pela busca web; remover a contracapa; confirmar que a capa frontal permanece igual em todos os casos. Câmera e galeria ainda precisam de teste manual no aparelho.

Para a frente: abrir **Editar edição → Usar minha foto como capa**, selecionar uma foto, salvar e conferir a coleção/detalhes. Repetir com câmera; cancelar a seleção; restaurar **Usar capa padrão**; confirmar que a contracapa continua igual e o flip funciona após salvar.

## Arquivos alterados ou criados

Telas:

- `app/add/selected.tsx`
- `app/collection/edition-edit.tsx`
- `app/collection/[id].tsx`

Componentes e animação:

- `src/components/add/BarcodeConfirmation.tsx`
- `src/components/covers/EditionCoverPicker.tsx`
- `src/components/covers/EditionBackCoverField.tsx` (novo)
- `src/components/covers/EditionCoverPhotoButton.tsx` (novo, compartilhado entre frente e contracapa)
- `src/components/collection/MovieHero.tsx`
- `src/components/collection/EditionCoverFlip.tsx` (novo)
- `src/utils/editionCoverFlip.ts` (novo)

Tipos e persistência:

- `src/services/supabase/types.ts`
- `src/types/barcode.ts`
- `src/types/collectionDetails.ts`
- `src/services/collection/types.ts`
- `src/services/collection/index.ts`
- `src/services/collection/mappers.ts`
- `src/services/collection/editionEditing.ts`
- `src/services/collection/editing.ts`
- `src/services/barcode/save.ts`
- `src/services/barcode/mappers.ts`
- `src/services/covers/index.ts`
- `src/services/covers/query.ts`
- `src/services/covers/storage.ts` (novo)
- `src/services/covers/photo.ts` (novo)
- `src/services/covers/photoUpload.ts` (novo)
- `src/services/photos/file.ts` (novo, leitor compartilhado)
- `src/services/photos/index.ts`
- `supabase/migrations/20261010002750_edition_back_cover.sql` (nova)

Testes e documentação:

- `tests/editionBackCover.test.mjs` (novo)
- `tests/sql/copyPhotosAndEditionEditing.mjs`
- `docs/EDITION_BACK_COVER.md` (novo)
