# Auditoria do fallback de barcode

> Revisão após teste no APK: barcode versão 8 e capas versão 4 publicadas após autorização do usuário. O usuário confirmou cinco cadastros; os logs confirmaram resultados do fallback visual. Alta Fidelidade ainda falhou na etapa Google Images (seção 24). Nesta última análise, somente o relatório foi atualizado; a implementação e os deploys foram preservados.

## 1. Problema encontrado

`src/services/barcode/index.ts` chamava `resolveBarcode` sem fornecer `lookupWeb`. Portanto, o caminho usado pelo scanner terminava em UPCitemdb/NOT_FOUND. `app/add/barcode.tsx` também não renderizava resultados WEB. O hook `useBarcodeWebLookup` existia, mas não era usado pelas telas.

Respostas UPC válidas sem título, sem produto correspondente ou com entradas inutilizáveis também podiam interromper a sequência. O teste real revelou outro caso: HTTP 400 com `INVALID_UPC`.

README não existe no checkout. `docs/ACERVO_PROJECT_SPEC.md` foi lido integralmente; suas seções de barcode ainda descrevem o fluxo anterior sem SerpApi. O código atual foi priorizado.

## 2. Tarefa 13.1

Já existia no repositório e no projeto remoto Acervo (`qdxxfrbznbzophjwpblw`). A função `lookup-barcode-web` foi inspecionada via plugin Supabase: ACTIVE, versão 2, `verify_jwt=true`.

A implementação usa autenticação remota `getUser`, rejeita usuário anônimo, limita o corpo a 8 KiB e o campo barcode a 32 caracteres antes da normalização. Usa `SERPAPI_API_KEY` exclusivamente no backend, endpoint fixo, `engine=google`, sem URL fornecida pelo cliente.

## 3. Arquivos criados

- `src/components/add/BarcodeWebCandidates.tsx`
- `tests/barcodeWeb.test.mjs`
- `tests/fixtures/serp-barcode.json`
- `docs/BARCODE_FALLBACK_AUDIT.md` (este relatório)

## 4. Arquivos alterados pela tarefa

- `app/add/barcode.tsx`
- `app/add/barcode-match.tsx`
- `app/add/barcode-confirm.tsx`
- `src/components/add/BarcodeConfirmation.tsx`
- `src/hooks/useBarcodeLookup.ts`
- `src/services/barcode/index.ts`
- `src/services/barcode/lookup.ts`
- `src/services/barcode/webParsing.ts`
- `src/services/upc/client.ts`
- `src/services/upc/mappers.ts`
- `src/types/barcode.ts`
- `tests/barcode.test.mjs`

`app.json` já estava modificado antes da tarefa; essa alteração não faz parte da correção.

## 5. Edge Function

Na primeira correção, nenhum entrypoint foi alterado. Após o teste no APK, `lookup-barcode-web` e `search-edition-covers` foram alteradas para usar o novo helper `_shared/serpapi.ts`. O helper amplia o timeout para 45 segundos, fornece status de erro adequados e logs seguros. A pesquisa de capas reconhece a mensagem Google de busca vazia. Deploy desta revisão executado após autorização: lookup-barcode-web versão 3 e search-edition-covers versão 4.

## 6. Ordem final

Supabase → UPCitemdb → SerpApi, de forma sequencial. Uma Edition conhecida encerra o lookup. Um produto UPC com título útil encerra o lookup. A busca web só ocorre após miss.

## 7. Definição de UPC miss

- `NOT_FOUND`;
- `OK` com `items` vazio;
- itens sem objeto aproveitável;
- ausência de correspondência com o barcode ou seus aliases existentes;
- produto correspondente sem título;
- HTTP 404 com código `NOT_FOUND`;
- HTTP 400 especificamente com código `INVALID_UPC`.

O último caso significa rejeição pelo provedor, não ausência comprovada no catálogo. Ainda pode ser pesquisado na web, pois a validação existente do app aceita comprimento EAN/UPC sem impor checksum novo. HTTP 400 `INVALID_QUERY`, limites, falhas de rede, envelopes malformados e erros de servidor continuam erros distintos, com opção de seguir pela associação TMDB.

## 8. Consulta SerpApi

Uma consulta textual Google com barcode normalizado entre aspas: `"7891234567890"`, `hl=pt`, `gl=br`. Não presume DVD/Blu-ray e não faz tentativas automáticas adicionais.

## 9. Normalização

Usa `organic_results`, entrega `BarcodeWebCandidate` e limita a dez sugestões. Filtra título/URL/evidência útil, deduplica URL canônica, limita resultados por domínio e extrai formato, distribuidora, país, região e nome da edição apenas quando há indícios explícitos. Busca Google vazia retorna lista vazia; erros do provedor permanecem distintos. A UI recebe somente os tipos internos.

## 10. UI

A tela de barcode apresenta “Possíveis edições”, título, snippet de até três linhas, domínio e thumbnail opcional. Tocar seleciona a sugestão. “Nenhum desses” abre a busca TMDB sem sugestão; “Continuar manualmente” abre o modo manual existente. Uma falha web permite continuar pelo filme, preservando o código.

## 11. Associação TMDB

A escolha web abre `barcode-match` com sugestão de título editável. O usuário seleciona um resultado TMDB; `barcode-confirm` carrega seus detalhes e só então apresenta o formulário da Edition. A busca web não cria Movie, Edition ou CollectionItem.

Formato, nome da edição, distribuidora, país e região são pré-preenchidos quando detectados e permanecem editáveis. Thumbnail web não é persistida como capa. “Buscar capa” continua usando o picker/Edge Function/Storage existentes.

## 12. Preservação do barcode e custo

Scanner passa `code` à tela de lookup, que passa `code` e `candidateId` à associação TMDB e depois à confirmação. O candidato selecionado é recuperado do cache do lookup. O save existente revalida o código e persiste `editions.barcode`, verificando antes se a Edition já existe. Após salvar, o cache de barcode é invalidado, permitindo resolução pelo Supabase na próxima leitura.

A normalização original foi preservada, inclusive zeros iniciais e EAN-8/UPC-A/EAN-13. O lookup completo tem cache de dez minutos por usuário/barcode. Não há retry automático nem refetch de navegação, foco ou reconexão. Erros não são repetidos automaticamente ao montar as telas seguintes. Busca web indisponível também é mantida no resultado para permitir continuidade sem repetir a consulta.

## 13. Verificações

- TypeScript: aprovado.
- Suíte Node: 108 testes aprovados, zero falhas; fixtures/mocks, sem APIs reais na suíte.
- Casos novos: hits Supabase/UPC não chamam web; misses UPC chamam web sequencialmente; barcode/signal preservados; normalização e deduplicação; vazio/erro/cancelamento; INVALID_UPC versus INVALID_QUERY; payload sem thumbnail; verificações estáticas da ligação de UI/TMDB e ausência de escrita durante lookup/seleção.
- Expo Doctor: 21/21 verificações aprovadas.
- Bundles Android/iOS: exportados com sucesso; não equivalem a APK nem a teste no aparelho.
- Deno check: aprovado para `lookup-barcode-web` e `search-edition-covers`.
- `git diff --check`: aprovado.

Os testes de ligação de telas são verificações estáticas de código, não testes de renderização ou E2E.

## 14. Teste real e limites da evidência

UPCitemdb real retornou `025192103179` → “Scarface (Blu-ray)”. Testando o resolvedor com miss de Supabase simulado e UPC real, o resultado foi UPCITEMDB e o fallback web recebeu zero chamadas.

`7891234567890` é uma fixture ilustrativa, não um barcode brasileiro real confirmado. UPCitemdb real retorna HTTP 400 `INVALID_UPC`. Após a correção, o resolvedor chegou uma única vez ao fallback (web simulada vazia), mantendo o código e retornando NOT_FOUND.

A consulta inicial a `0000000000000` encontrou produto alimentício no UPCitemdb; esse código não serve como teste de ausência de resultados.

A auditoria remota confirmou três barcodes cadastrados e dois logs anteriores da função web com status 200 e zero candidatos. Esses logs são históricos; não são teste E2E desta alteração.

Não havia barcode brasileiro real confirmado nem sessão autenticada disponível para executar consulta SerpApi real e confirmar a UI no aparelho. Os cenários completos B/C continuam pendentes de validação no dispositivo.

### Teste no aparelho

1. Gere/instale uma build atualizada e entre na sua conta. Abra Adicionar → Escanear código, ou Digitar código.
2. Leia `025192103179`, já cadastrado no Supabase: deve abrir a Edition existente, com log Supabase hit e sem início de UPC/SerpApi.
3. Para validar UPC hit no app, use um barcode real de DVD/Blu-ray reconhecido pelo UPCitemdb que ainda não esteja no catálogo. Espere Supabase miss → UPCitemdb hit e nenhuma chamada SerpApi. O teste real do serviço já confirmou Scarface, mas seu barcode existente resolve antes pelo Supabase no app.
4. Use um barcode brasileiro real de sua edição que não esteja cadastrado e que UPCitemdb não encontre. Espere Supabase miss → UPCitemdb miss → SerpApi fallback start → SerpApi candidates: N. Com N maior que zero, a tela deve mostrar candidatos com título/domínio/snippet.
5. Escolha o candidato, confirme o filme no TMDB, revise os campos da Edition, use Buscar capa se necessário, escolha condição e salve. Confira o barcode nos detalhes. Leia novamente: deve resolver pelo Supabase sem chamadas externas.
6. Teste “Nenhum desses” e “Continuar manualmente”: o código deve permanecer visível até a confirmação. Ambos preservam a obrigação de selecionar Movie no TMDB.
7. Use um código válido sem resultado útil em ambos os provedores: deve mostrar Buscar filme/Cadastro manual, mantendo o barcode. A fixture `7891234567890` exercita rejeição UPC, mas não garante busca Google vazia.
8. Logs de debug com prefixo `[barcode]` mostram cada etapa. Logs do backend podem ser inspecionados em Supabase → Edge Functions → lookup-barcode-web → Logs.

## 15. Deploy

A revisão foi publicada no projeto Acervo após autorização explícita do usuário. `lookup-barcode-web` está ACTIVE na versão 3 e `search-edition-covers` ACTIVE na versão 4, ambas com `verify_jwt=true`. A leitura do código remoto confirmou o helper com timeout de 45 segundos em ambas. Comando equivalente para uma futura republicação:

```sh
npx --yes supabase functions deploy lookup-barcode-web search-edition-covers --project-ref qdxxfrbznbzophjwpblw --use-api
```

Execute na raiz do repositório, pois a função importa helpers em `src/`. Preserve `verify_jwt=true`. `SERPAPI_API_KEY` deve existir nos secrets desse projeto; não no bundle mobile. Os logs históricos provam que a configuração já permitiu consultas, mas não asseguram quota atual.

## 16. APK

É necessário gerar e instalar novo APK para incluir a correção do app. Os bundles exportados não atualizam o APK já instalado. O perfil preview atual usa distribuição interna; comando:

```sh
npx eas-cli build --platform android --profile preview
```

A build EAS não foi executada nesta tarefa.

## 17. Limitações restantes

- Validação visual/E2E em aparelho e consultas SerpApi reais dos cenários B/C pendentes.
- Sugestões dependem dos resultados do Google e do filtro de informação útil já existente; não há garantia de identificação.
- Google Images secundário foi implementado na revisão da seção 23: uma consulta adicional apenas quando a busca textual não produz candidatos úteis. Eficácia nos códigos reais ainda pendente de reteste.
- Cadastro manual preserva o modo existente de busca digitada; não cria Movie fora do TMDB.
- Logs adicionados são diagnósticos temporários, sem chaves, JWTs ou tokens.

Fontes consultadas: [Autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth), [Changelog Supabase](https://supabase.com/changelog), [Respostas UPCitemdb](https://www.upcitemdb.com/wp/docs/main/development/responses/).

## 18. Revisão após falhas relatadas no APK

O usuário relatou falhas em Alta Fidelidade, Pânico na Floresta 2 e Homem-Aranha 3, além de busca de capa sem sucesso para Homem-Aranha 1.

A consulta aos logs recentes mostrou buscas barcode bem-sucedidas com 1 e 4 candidatos, outras com zero candidatos, e duas falhas com HTTP 400 após aproximadamente 15,4 segundos. A duração coincide com o timeout de 15 segundos implementado, indicando fortemente timeout da consulta. Os logs antigos não registram a exceção, portanto não permitem provar a causa exata de cada chamada.

Na pesquisa de capas, houve três HTTP 400 com duração entre 431 e 2436 ms. A etapa de salvamento de capa teve sucesso em outra tentativa. Não há resposta do provedor nos logs antigos para identificar a causa das três falhas. O código local e remoto tratavam a mensagem Google de ausência de resultados como erro na busca de capas; isso foi corrigido, mas ainda precisa ser confirmado com o caso do usuário.

Alterações adicionais:

- Novo `supabase/functions/_shared/serpapi.ts`: request único, timeout de 45 segundos, erros 504/429/502 e logs de engine/duração/categoria, sem secrets nem texto bruto do provedor.
- `lookup-barcode-web` e `search-edition-covers` usam o helper; a busca de capas retorna lista vazia para a mensagem explícita Google de ausência de resultados.
- Novo `src/services/barcode/webErrors.ts`: categorias e mensagens seguras para timeout, quota, sessão e indisponibilidade.
- `src/services/barcode/web.ts`, `lookup.ts`, `src/types/barcode.ts` e `app/add/barcode.tsx`: preservação da categoria de erro e botão de tentativa explícita. Buscar novamente o mesmo código após falha agora consulta novamente, em vez de ficar preso ao resultado indisponível no cache. Não há retry automático.
- Novo `tests/serpApi.test.mjs`: request único, tratamento de timeout/quota/JSON inválido, busca vazia e tentativa posterior bem-sucedida.

Validação: 108 testes aprovados, TypeScript aprovado, Deno check aprovado para ambas as funções, bundles Android/iOS gerados e diff sem erros de whitespace.

A busca/seleção de capa, assinatura, cópia para Storage e prioridade de imagens continuam no fluxo existente. Não foi alterada a função de salvar capas, Storage ou RLS. A revisão foi publicada e conferida remotamente; ainda falta validá-la com consultas autenticadas reais dos filmes relatados. A nova instrumentação permitirá distinguir timeout, erro do provedor e resposta inválida no reteste.

## 19. Barcode 7892770006398 — resultado de catálogo descartado

O usuário forneceu o código `7892770006398`. Uma pesquisa pública pelo código encontrou [Homem-Aranha no catálogo AABB Porto Alegre](https://www.aabbportoalegre.com.br/biblioteca/detalhes/homem-aranha/2130), associado ao filme de 2002 em DVD. O trecho indexado mostrava somente `024 __ |a 7892770006398`, enquanto o título era Homem-Aranha. Isso demonstra um caso legítimo que o filtro anterior descartava por não encontrar palavras como DVD/filme no título ou snippet.

A busca pública não é a resposta SerpApi da tentativa no APK; portanto não prova que esse foi o resultado retornado naquela chamada. A última consulta do APK teve HTTP 200 e zero candidatos, mas os logs anteriores não registravam a quantidade de resultados orgânicos antes do filtro.

A revisão aceita uma sugestão com título útil e barcode explicitamente citado, mesmo sem formato/palavras de cinema. O código deve ser uma sequência inteira, não parte de outro número. Títulos compostos apenas por barcode/EAN/código de barras continuam descartados. Nenhuma obra ou edição é criada automaticamente, e metadados ausentes permanecem ausentes.

Arquivos adicionais desta revisão:

- Alterado `src/services/barcode/webParsing.ts`.
- Alterado `supabase/functions/lookup-barcode-web/index.ts`: log seguro com barcode normalizado, `organicCount` e candidatos após filtragem.
- Alterado `tests/barcodeWeb.test.mjs`.
- Criado `tests/fixtures/serp-barcode-catalog.json`, baseado no trecho público; não é uma captura real SerpApi.

Validação: 110 testes aprovados, TypeScript e Deno check aprovados. A função barcode foi republicada na versão 4, ACTIVE, mantendo `verify_jwt=true`; a leitura remota confirmou filtro e diagnóstico novos. Não exige novo APK para este ajuste de backend. Ainda é necessário repetir a consulta autenticada no aparelho para verificar os resultados reais Google. Aguarde dez minutos desde o lookup anterior ou feche completamente e reabra o APK para evitar o resultado vazio mantido em cache de memória.

## 20. Reteste do código: Google retornou zero resultados orgânicos

O reteste do APK após a versão 4 confirmou, para `7892770006398`, `organicCount: 0` e `candidates: 0`, com HTTP 200. Portanto, nessa tentativa o resultado vazio já veio da SerpApi, antes do filtro. A busca pública em outro mecanismo não prova que Google/SerpApi indexa ou retorna aquela mesma página. O ajuste do filtro da seção 19 resolve um caso de descarte legítimo, mas não explica o vazio desta consulta real.

A consulta da função foi alterada de código entre aspas para código normalizado sem aspas, mantendo uma única chamada textual Google, idioma/região existentes e confirmação humana obrigatória. A busca menos restrita pode trazer sugestões aproximadas; não garante encontrar a edição, e o usuário precisa confirmar filme e dados físicos. Não há segunda chamada automática, formato presumido ou inclusão automática de imagem.

Arquivos desta revisão: `src/services/barcode/webParsing.ts`, `tests/barcodeWeb.test.mjs` e `supabase/functions/lookup-barcode-web/index.ts` (log `queryMode: unquoted`). 110 testes, TypeScript e Deno check aprovados. Publicada `lookup-barcode-web` versão 5, ACTIVE, JWT obrigatório; código remoto conferido. Sem necessidade de novo APK para esta revisão. A eficácia da consulta sem aspas ainda depende do novo reteste autenticado no aparelho. Reinicie completamente o app para limpar o resultado anterior em memória.

## 21. Versão 5 trouxe dez resultados, todos descartados

O reteste após reinstalar o APK atingiu a versão 5. Para `7892770006398`, os logs mostraram HTTP 200, `queryMode: unquoted`, `organicCount: 10` e `candidates: 0`. A consulta sem aspas mudou a recuperação de resultados, mas isso não prova que os dez resultados correspondem ao filme ou à edição. O cache do app ou atraso de deploy não explica esta chamada observada.

A versão 6 adiciona diagnóstico temporário, restrito ao código relatado e somente quando não há candidatos. Para até dez resultados, registra título/snippet limitados, domínio seguro e motivo de rejeição (URL insegura, título ausente, ausência de evidência, duplicação, limite de domínio). Não registra URLs de provedor, chaves ou JWTs; o texto diagnóstico remove a chave backend e padrões JWT. Não altera novamente o critério de seleção.

Arquivos: `src/services/barcode/webParsing.ts`, `supabase/functions/lookup-barcode-web/index.ts` e `tests/barcodeWeb.test.mjs`. 111 testes, TypeScript e Deno check aprovados. Versão 6 da função publicada com JWT obrigatório. É necessário repetir a consulta no APK para registrar a evidência antes de fazer nova alteração do filtro. O diagnóstico temporário deve ser removido após identificar a causa.

## 22. Diagnóstico real: resultados sem relação com o filme

O reteste na versão 6 registrou os dez resultados da busca sem aspas. Eram páginas de farmácia/site em manutenção, dermocosméticos, distribuição, supermercado, lápis labial, chocolate e suplemento em cápsulas. Todos foram rejeitados por ausência de evidência. Nenhum resultado identificava Homem-Aranha ou citava o barcode em seu título/snippet.

Conclusão limitada à consulta observada: o filtro descartou corretamente resultados sem informação útil; a pesquisa sem aspas não resolveu a identificação deste código. Com aspas, a consulta anterior tinha zero resultados orgânicos. A página encontrada em outra busca pública não foi retornada nessas consultas SerpApi. Isso não permite concluir que o código não existe ou que Google jamais encontrará resultados, apenas que essas tentativas não o identificaram.

Foi restaurada a consulta textual com barcode entre aspas, evitando relaxar a busca para resultados irrelevantes. Os logs temporários de títulos/snippets foram removidos; permanecem contagens e categorias seguras. `lookup-barcode-web` versão 7 publicada, ACTIVE, `verify_jwt=true`, código remoto conferido. 111 testes, TypeScript, Deno check e diff check aprovados.

Para este barcode, o fallback final existente é Buscar filme → selecionar Homem-Aranha (2002) no TMDB → confirmar dados físicos/condição → salvar Edition com `7892770006398`. A normalização e o save preservam o código; a próxima leitura deve reutilizar a Edition no Supabase. A identificação do filme pelo barcode e a busca da capa são consultas distintas. A dificuldade específica de encontrar a capa ainda não tem causa confirmada pelos resultados deste diagnóstico.

## 23. Teste comparativo de quatro edições e fallback visual

O usuário testou quatro edições ainda desconhecidas. Os logs reais da função confirmaram:

| Filme | Barcode confirmado | Resultados textuais | Candidatos |
| --- | --- | ---: | ---: |
| Homem-Aranha 2 Blu-ray | 7892770026570 | 3 | 3 |
| Homem-Aranha 3 | 7892770016182 | 0 | 0 |
| Alta Fidelidade | 7896012247211 | 0 | 0 |
| O Segredo de Brokeback Mountain | 7897119445401 | 0 | 0 |

O usuário inicialmente transcreveu `786012247211` para Alta Fidelidade. Após comparar com o log, confirmou que o código impresso é `7896012247211`. Não houve regra de normalização que alterasse o barcode; a primeira mensagem tinha uma transcrição diferente.

O sucesso do primeiro código demonstra o caminho real Supabase miss → UPC miss → SerpApi Google → candidatos. Nos outros três, a ausência já ocorreu na busca textual antes do filtro. Pesquisas públicas externas encontraram referências aos códigos de Homem-Aranha 3 e Brokeback Mountain, mas não permitem atribuir esses mesmos resultados ao Google/SerpApi. Para Alta Fidelidade, a busca pública exata pelo código confirmado também não trouxe resultado.

Foi implementado o fallback secundário Google Images previsto na seção 13 do pedido original. O backend faz primeiro uma única busca textual Google pelo código entre aspas; somente quando não há candidato útil faz uma única busca Google Images pelo mesmo código entre aspas. Com candidato textual, não há consulta visual. Falhas de quota/rede na etapa textual não disparam outra consulta paga. O limite é duas consultas por miss de barcode, sem retry automático; cache do app permanece em dez minutos.

A normalização visual reutiliza `normalizeCoverResults`, os hosts de imagem seguros e a prioridade de imagem vertical já existentes. Produz `BarcodeWebCandidate` com título, domínio e thumbnail; deduplica imagens, rejeita links inválidos e páginas em manutenção. O snippet indica “Busca de imagens pelo código”. A seleção é apenas uma sugestão visual, sem garantia de correspondência; usuário e TMDB continuam obrigatórios. Só o formato explicitamente citado no título pode ser sugerido; distribuidora, país, região e nome da edição permanecem ausentes nessa modalidade. A thumbnail não é salva como capa: buscar/selecionar a capa final continua usando o fluxo existente de cópia para Storage.

Arquivos da revisão:

- Criado `supabase/functions/_shared/barcodeWeb.ts` (orquestração textual/visual e normalização de imagens).
- Criado `tests/barcodeImages.test.mjs`.
- Alterado `src/services/barcode/webParsing.ts` para exportar o validador de URLs já existente.
- Alterado `supabase/functions/lookup-barcode-web/index.ts` para usar o orquestrador.

117 testes aprovados; TypeScript, Deno check e diff check aprovados. `lookup-barcode-web` versão 8 publicada, ACTIVE, JWT obrigatório, helper remoto conferido. Esta revisão é backend e funciona com a UI WEB já presente no APK atual. Não exige novo APK.

Na publicação desta revisão, ainda faltava testar a etapa visual com os barcodes reais no aparelho. O reteste posterior está registrado na seção 24. Não houve acesso a uma sessão autenticada para fazer esse teste remoto diretamente. Resultado vazio continua possível caso o Google Images também não retorne imagem útil. Logs distinguem `barcode-results` (texto), `barcode-images-fallback` e `barcode-image-results` (quantidade de imagens e candidatos).

Fontes públicas externas consultadas (não são capturas SerpApi): [Homem-Aranha 2 Blu-ray](https://www.travessa.com.br/blu-ray-homem-aranha-2/artigo/6a4f222d-affb-4234-8af7-103d1e607140), [Brokeback Mountain](https://www.travessa.com.br/o-segredo-de-brokeback-mountain/artigo/792da4c4-6644-41cd-a753-dc8a594b56f6), [Catálogo com Homem-Aranha 3](https://pt.scribd.com/doc/6656004/Catalogo-Geral-CD-Dvd).

## 24. Reteste positivo e falha isolada de Alta Fidelidade

Em 09/10/2026, o usuário informou que conseguiu registrar cinco filmes no APK. A consulta aos logs da versão 8, entre 03:18 e 03:26 UTC, confirmou que códigos sem resultado textual chegaram à etapa visual e produziram candidatos:

| Filme ou código | Barcode | Imagens retornadas | Candidatos |
| --- | --- | ---: | ---: |
| O Segredo de Brokeback Mountain | 7897119445401 | 6 | 6 |
| Homem-Aranha 3 | 7892770016182 | 15 | 10 |
| Outro código testado | 7899154513084 | 17 | 10 |
| Outro código testado | 7899154514043 | 4 | 4 |

Essa evidência confirma a recuperação de sugestões visuais. A quantidade de cadastros concluídos foi relatada pelo usuário; os logs consultados são de lookup, não de persistência dos cinco itens.

Para Alta Fidelidade (`7896012247211`), houve três tentativas às 03:22:41, 03:22:47 e 03:25:20 UTC. Em todas, a etapa textual retornou HTTP 200 com zero resultados, acionou `barcode-images-fallback`, e a etapa `google_images` terminou com categoria `upstream` e status interno 502. As durações dessa etapa foram 1694 ms, 7 ms e 9 ms. Não houve categoria de timeout ou rate-limit. Por isso, o app exibiu corretamente o estado de busca web indisponível e permitiu continuar pelo filme. O lookup não chegou à normalização das imagens nem à seleção/salvamento de capa.

Limite importante: 502 é o status produzido pelo helper do Acervo. O log atual não distingue HTTP de erro retornado pela SerpApi de um campo `error` não reconhecido em JSON, nem de uma falha de transporte. Não é possível afirmar qual foi a resposta HTTP original do provedor. As tentativas posteriores muito rápidas podem refletir cache do provedor, mas isso não está comprovado.

Na mesma análise, o [incidente oficial da SerpApi](https://status.serpapi.com/incidents/5pybr6gr3dq4), iniciado em 06/10 e ainda aberto, informava degradação persistente; a última atualização era de 08/10/2026 às 21:11 UTC. A [página de status](https://status.serpapi.com/) mostrava indisponibilidade parcial de Google Search e Google Images. Isso é compatível com a falha observada, mas não comprova a causa desta consulta específica. A [documentação de erros](https://serpapi.com/api-status-and-error-codes) também distingue uma busca concluída sem resultados de uma busca que falhou; uma falha não deve ser convertida silenciosamente em ausência de edição.

Decisão desta análise: preservar a implementação que funcionou no aparelho. Não foram alterados consulta, filtros, timeout, cache, fluxo de capa, banco ou APK; não houve novo deploy. Não há evidência suficiente para justificar outra mudança de estratégia ou ampliar chamadas pagas. Alta Fidelidade permanece uma pendência específica: uma nova tentativa após a estabilização do provedor poderá mostrar se era transitória; se persistir, investigar a resposta com diagnóstico seguro de status HTTP/categoria, sem registrar chaves ou texto bruto do provedor.

Validação final do estado atual: 117 testes aprovados, zero falhas; TypeScript e `git diff --check` aprovados. Os testes usam mocks/fixtures e não garantem disponibilidade ou resultados do provedor real.
