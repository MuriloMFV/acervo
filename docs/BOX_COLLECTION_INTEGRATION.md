# Boxes em filtros, estatísticas e PDF

Esta alteração integra boxes aos recursos da coleção usando o modelo existente `BoxSet → BoxSetMovie → CollectionBox`. Não cria migration, colunas, tabelas, buckets ou Edge Functions.

## Filtros

Filmes e boxes reutilizam a mesma função para formato, condição, favorito, região/codificação e indicadores especial/limitada. O filtro “Box” também reconhece os boxes físicos, preservando o comportamento anterior das Editions com embalagem Box.

A seleção “Região / codificação”, que já existia, reúne valores efetivamente cadastrados em Edition e BoxSet, incluindo `video_standard`. Valores antigos de codificação guardados em `region` são interpretados pelo helper existente, sem regravar dados. Várias opções dentro desse grupo combinam com OU; critérios de grupos diferentes combinam com E, seguindo as regras anteriores.

O atalho “Adicionados recentemente” e todas as ordenações usam a data da **CollectionBox**, não a de seus filmes. O nome do box participa da busca por texto. Não existem filtros de distribuidora ou país no app atual; novos filtros não foram acrescentados nesta tarefa.

Gênero e década continuam sendo atributos do filme individual. Se esses critérios forem selecionados, boxes não aparecem como filmes avulsos nem são expandidos em resultados. O catálogo interno de filmes do box permanece intacto.

## Estatísticas

`calculateCollectionStats(filmes, boxes)` mantém a API anterior quando o segundo argumento é omitido e agora retorna:

| Campo | Contagem |
| --- | --- |
| `total` | Itens físicos: cópias avulsas + cópias de boxes |
| `individualMovies` | Cópias de filmes cadastradas individualmente |
| `boxes` | Cópias de boxes cadastradas |
| `totalMovies` | Filmes individuais + filmes incluídos em cada box |

Exemplo: dois filmes individuais e um box com seis filmes resultam em **3 itens físicos, 2 filmes individuais, 1 box e 8 filmes no acervo**.

O perfil mostra os quatro totais. Formatos, valor pago, quantidade de itens com preço, favoritos e edições especiais contam cada box uma única vez. Gênero, década e diretor consideram os filmes incluídos; seus cartões mostram quantidades de filmes. Preço zero é válido e somas monetárias continuam calculadas em centavos.

A contagem preserva a regra anterior por cópia possuída: dois exemplares de um filme, ou o mesmo filme avulso e também em um box, entram novamente no total de filmes. Não há deduplicação por obra/TMDB. Estatísticas usam a coleção completa, independentemente dos filtros da tela.

O perfil espera as duas consultas antes de apresentar as estatísticas e permite tentar carregar novamente se alguma falhar. O contador da coleção e a navegação também usam o total de itens físicos.

## PDF

A exportação consulta filmes e boxes pelos serviços existentes, com a sessão/proprietário verificados. Uma consulta com erro interrompe a exportação, evitando gerar silenciosamente um documento parcial.

Cada cópia de box gera **uma linha**, misturada alfabeticamente com as linhas dos filmes. Essa linha contém nome, “Tipo: Box”, formato, condição, quantidade de filmes e quantidade de discos. Tipo e quantidade de filmes aparecem como uma segunda linha discreta na coluna de título, preservando as seis colunas e a largura da tabela.

A4, margens, cabeçalhos repetidos, linhas sem divisão entre páginas, cores, tipografia, capa e rodapé continuam iguais. A capa usa `boxCover`: capa própria → pôster do primeiro filme na posição cadastrada → placeholder. Falta de imagem não impede exportar. IDs de apresentação com prefixo `box:` evitam colisões de capas entre tabelas distintas.

O pipeline de thumbnails, imagens embutidas, geração de PDF em base64 e compartilhamento foi reutilizado. A correção anterior de acesso ao cache do Expo Print permanece.

## Arquivos desta tarefa

- `app/index.tsx`
- `app/profile.tsx`
- `src/components/profile/CollectionStatistics.tsx`
- `src/types/collectionStats.ts`
- `src/utils/collectionFilters.ts`
- `src/utils/collectionStats.ts`
- `src/services/export/index.ts`
- `src/services/export/document.ts`
- `tests/collectionFilters.test.mjs`
- `tests/boxCollectionIntegration.test.mjs` (novo)
- `docs/BOX_COLLECTION_INTEGRATION.md` (novo)

## Verificação e teste no aparelho

Os testes cobrem filtros combinados, região/codificação, dados antigos, atalhos, busca pelo nome do box, coleção com somente boxes, totais mistos, contagem por cópia, preço zero, somas em centavos, metadados ausentes, uma linha por box no PDF, ordenação, campos necessários, layout preservado, identidade das capas e escape de HTML.

Execute `npm run typecheck` e `npm test`. O bundle Android pode ser validado com `npx expo export --platform android`. Os testes automatizados verificam o HTML e a escrita do PDF; o compartilhamento nativo precisa de teste no aparelho.

Verificação desta tarefa: 261 testes unitários passaram, junto do typecheck e da exportação do bundle Android. A suíte SQL existente de boxes passou com 46 assertivas em PostgreSQL isolado, incluindo leitura e permissões entre usuários.

Para conferir no app, registre um box com seis filmes e dois filmes individuais. No perfil, confira 3 itens físicos / 2 filmes individuais / 1 box / 8 filmes. Teste favoritos, formatos, condições e região/codificação na coleção. Exporte pelo perfil e confira uma linha para o box, indicando seis filmes e sua quantidade de discos, junto das duas linhas de filmes avulsos.

Não é necessária uma nova migration **para esta integração**. A migration de edição de boxes da tarefa anterior continua separada. Um APK já instalado precisa receber o código atualizado por novo build ou atualização OTA compatível.
