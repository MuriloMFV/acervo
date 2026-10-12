# Contracapa opcional de boxes

O cadastro e **Meu box → Editar box** oferecem **Adicionar contracapa** e **Buscar contracapa na web**, usando `EditionCoverFields` e seus controles existentes. É possível escolher da galeria, tirar foto, trocar ou remover a imagem. O campo é opcional e uploads bloqueiam o salvamento até terminarem.

As imagens usam os mesmos serviços, validação de bytes/permissões, Edge Functions e bucket `edition-covers` das capas de Edition. Nenhum bucket ou serviço de upload novo foi criado; uma nova contracapa precisa ser uma imagem persistida pelo Acervo, sem hotlink externo.

## Exibição

No detalhe do box, tocar na capa vira para a contracapa e tocar novamente volta à frente. O componente `EditionCoverFlip` existente usa Reanimated, perspectiva e rotação horizontal em 420 ms. A contracapa chega a 360°, evitando espelhamento. O toque só é habilitado depois que a imagem da contracapa carrega; falha de carregamento conserva a frente.

Boxes sem contracapa continuam com a imagem estática em `contain`. A frente mantém o fallback capa própria → pôster do primeiro filme incluído → placeholder. A contracapa nunca substitui a capa frontal no grid ou no PDF.

## Modelo e migration

Migration criada pelo Supabase CLI: `supabase/migrations/20261012213154_box_back_cover.sql`.

**É necessário aplicar esta migration no Supabase antes de salvar uma contracapa. Ela não foi aplicada em produção nesta tarefa.** Ela depende das migrations anteriores de boxes, adiciona apenas `BoxSet.back_cover_url` nullable e estende as funções de cadastro/edição existentes. O modelo `BoxSet → BoxSetMovie → CollectionBox`, seus IDs e os Movie posters são preservados.

O cadastro usa a criação existente e, quando há contracapa, reutiliza a validação e atualização da edição de box dentro da mesma transação. Erro de imagem desfaz o cadastro inteiro. A edição altera o box existente, valida proprietário/versão/Storage e preserva o campo se ele não vier no payload de um APK antigo. `null` remove a contracapa; um novo URL a troca. O cliente omite valores opcionais que não mudaram.

Os tipos do BoxSet, payload e formulário foram ajustados. Não foram abertas permissões gerais de UPDATE no catálogo; a função privilegiada permanece privada, com autenticação, proprietário verificado, `search_path` vazio e execução negada para PUBLIC/anon. Remover uma contracapa desvincula o URL; mantém os objetos imutáveis do Storage, como no fluxo de Edition.

## Arquivos desta alteração

- `app/boxes/[id].tsx`
- `src/components/boxes/BoxForm.tsx`
- `src/components/collection/EditionCoverFlip.tsx` (opção para manter `contain` sem contracapa)
- `src/services/boxes/types.ts`
- `src/services/boxes/editing.ts`
- `src/services/boxes/mappers.ts`
- `src/services/boxes/index.ts`
- `src/services/supabase/types.ts`
- `supabase/migrations/20261012213154_box_back_cover.sql` (nova)
- `tests/boxBackCover.test.mjs` (novo)
- `tests/sql/boxEditing.mjs`
- `docs/BOX_BACK_COVER.md` (novo)

## Verificação

Typecheck e 266 testes unitários passaram. A suíte de boxes passou com 180 assertivas PostgreSQL/RLS, incluindo o campo vazio em boxes anteriores, criação com contracapa, adição/troca/remoção, payload antigo preservando imagem, rollback e tentativa de alteração por outro usuário/sessão anônima. As regras de frente no grid/PDF continuam cobertas.

Comandos: `npm run typecheck`, `npm test` e `ACERVO_PGLITE_MODULE=/private/tmp/acervo-barcode-validation/node_modules/@electric-sql/pglite/dist/index.js node --experimental-strip-types tests/sql/boxEditing.mjs` (PostgreSQL isolado via PGlite, instalado fora do projeto).

O advisor local da CLI foi tentado e não pôde conectar à porta 54322 porque o stack local Supabase não está ativo. Permissões, contexto das funções e RLS foram verificados por consultas nos testes isolados. A exportação Android valida o bundle; não gera APK nem aplica migrations.

No aparelho, aplique a migration e teste: criar um box com contracapa, reabrir e virar a capa; editar um box antigo e adicionar a imagem; trocar; remover; confirmar que a capa frontal e o fallback permanecem. Teste busca web, galeria e câmera. O Expo Go usa o código atualizado; o APK instalado precisa de um novo build ou atualização OTA compatível.
