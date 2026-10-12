# Boxes na coleção e edição

Boxes aparecem no mesmo grid de três colunas e na mesma lista dos filmes. Não existem mais cabeçalhos separados “Boxes” e “Filmes”. A busca por texto também considera o nome do box.

## Ordenação

O comparador existente foi extraído e é usado pelos dois tipos de item:

- Recentes/primeiros: `CollectionItem.created_at` ou `CollectionBox.created_at`.
- Título: título do Movie ou nome do BoxSet, com a colação `pt-BR` e os mesmos desempates.
- Preço: preço pago na cópia; zero é preservado e valores ausentes ficam no fim.
- Ano: o BoxSet não tem ano próprio no modelo atual. Os boxes permanecem sem ano e ficam no fim, junto dos filmes sem ano.

O badge BOX, as rotas distintas, os títulos e o contador de filmes incluídos continuam disponíveis. PDF, cálculo de estatísticas e regras de filtros avançados não foram modificados; esses filtros continuam com a abrangência anterior.

## Editar um box

Abra o box na coleção e toque em **Editar box**. O formulário permite alterar nome, barcode, formato, discos, distribuidora, país, região, codificação e filmes incluídos, além dos dados de compra, condição, notas e favorito. Nome da edição e os indicadores especial/limitada continuam disponíveis.

Cadastro e edição usam o mesmo `BoxForm`. Foram reaproveitados `EditionMetadataFields` (sem tipo de embalagem), `CopyFields`, `BoxMoviePicker` e `EditionCoverFields` (somente capa frontal). Os defaults desses componentes continuam iguais nos fluxos de Edition e CollectionItem.

A busca de capa usa o picker e os serviços de busca/Storage existentes. **Usar minha foto como capa** oferece galeria ou câmera, com as mesmas permissões, validação e upload. **Usar capa padrão** remove a capa própria e volta ao pôster do primeiro filme incluído; sem pôster, aparece o placeholder. As novas imagens são armazenadas no bucket `edition-covers`, sem novo bucket ou Edge Function. URLs externas antigas podem ser mantidas sem alteração.

O barcode permanece texto, reutilizando validação/normalização e scanner existentes, preservando zeros iniciais. Não é disparada uma busca por barcode ao editar o box.

## Persistência e migration

Migration criada com Supabase CLI: `supabase/migrations/20261012205822_box_editing.sql`.

**É necessário aplicar esta migration no ambiente Supabase usado pelo aplicativo. Ela não foi aplicada em produção nesta tarefa.** Não cria colunas nem muda o modelo `BoxSet → BoxSetMovie → CollectionBox`.

A nova RPC `edit_collection_box` atualiza os mesmos IDs, substitui os vínculos/posições dos filmes e grava os dados da cópia em uma transação. Falha em qualquer etapa desfaz todas essas alterações. Movies novos são resolvidos pelo serviço existente antes da transação; isso não gera Editions ou CollectionItems para os filmes incluídos. Filmes já vinculados mantêm o UUID e não precisam ser buscados novamente no TMDB, inclusive os que não têm `tmdb_id`.

A implementação verifica proprietário, sessão e versões `updated_at` do box e da cópia. Um formulário antigo recebe a orientação para reabrir os detalhes. Não foram concedidas permissões gerais de UPDATE/DELETE no catálogo de boxes: a rotina privilegiada fica no schema privado, com `search_path` vazio e acesso negado para PUBLIC/anon. A criação existente é reaproveitada, com suporte opcional a favorito, preservando payloads de APKs antigos.

## Arquivos desta alteração

- `app/index.tsx`
- `app/_layout.tsx`
- `app/add/box.tsx`
- `app/boxes/[id].tsx`
- `app/boxes/edit.tsx` (novo)
- `src/components/boxes/BoxForm.tsx` (novo)
- `src/components/collection/EditionMetadataFields.tsx`
- `src/components/covers/EditionCoverFields.tsx`
- `src/components/movie/MovieGrid.tsx`
- `src/components/movie/MovieListRow.tsx`
- `src/services/boxes/index.ts`
- `src/services/boxes/mappers.ts`
- `src/services/boxes/types.ts`
- `src/services/boxes/editing.ts` (novo)
- `src/services/supabase/types.ts`
- `src/utils/collectionFilters.ts` (somente extração do comparador)
- `src/utils/collectionItems.ts` (novo)
- `supabase/migrations/20261012205822_box_editing.sql` (nova)
- `tests/collectionBoxes.test.mjs` (novo)
- `tests/sql/boxEditing.mjs` (novo)
- `docs/BOX_EDITING.md` (novo)

## Verificação

Os testes cobrem as oito ordenações, células/agrupamentos compartilhados, carregamento dos dados, preço zero, zeros no barcode, troca/remoção de capa, favorito, seleção de filmes e preservação de filmes sem TMDB. A suíte SQL verifica persistência mantendo IDs, substituição dos vínculos, rollback, conflitos, RLS e permissões entre dois usuários e sessão anônima.

Resultado: typecheck passou; 250 testes unitários passaram; a suíte SQL de edição de boxes passou com 123 assertivas e a suíte anterior de boxes com 46. As regressões SQL de Edition/CollectionItem também passaram (221 assertivas de edição e 31 de cadastro). O bundle Android foi exportado com sucesso.

Comandos: `npm run typecheck`, `npm test`, e os scripts `tests/sql/boxSets.mjs` / `tests/sql/boxEditing.mjs` usando PostgreSQL isolado via PGlite (`ACERVO_PGLITE_MODULE` quando a dependência está fora do projeto). A exportação Android valida o bundle; não gera nem publica APK. O stack Supabase local não está disponível nesta máquina, portanto o advisor local não pôde ser executado; permissões e RLS foram auditadas pelas consultas dos testes isolados.

### Teste no aparelho

1. Após aplicar a migration, abra uma coleção com pelo menos um box e dois filmes; alterne grid/lista e as opções de ordenação.
2. Abra um box → Editar box. Altere os campos e a lista de filmes, salve e reabra.
3. Teste Buscar capa, Galeria e Câmera; salve cada escolha e confirme a capa no detalhe e na coleção.
4. Use capa padrão, salve e confirme o fallback.
5. Marque/desmarque favorito; confira condição e dados de compra após reabrir.

Galeria/câmera e aparência final precisam de teste no aparelho. O Expo Go usa o código atualizado; um APK já instalado precisa de novo build ou de uma atualização OTA compatível para receber a nova interface.
