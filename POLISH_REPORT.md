# Polimento final do Acervo — 13/10/2026

Revisão pelo código das telas principais e dos componentes compartilhados. Sem novas funcionalidades, mudança de arquitetura ou redesenho. A confirmação visual em Android/iOS físicos permanece pendente.

## Ajustes e problemas corrigidos

- Campos e botões de formulário usam altura mínima centralizada de 56 dp; alvos de ícones continuam com mínimo de 44 dp. Espaçamentos e cores existentes foram preservados.
- Observações têm altura mínima de 96 dp e texto alinhado ao topo. Chips, badges e botões acomodam texto maior; botões mantêm nome acessível durante carregamento.
- Seletor de data passou a seguir o acabamento dos demais inputs, com estados pressionado/desabilitado e texto flexível.
- Conta e seleção de filmes do box receberam proteção contra sobreposição do teclado no iOS. Formulários de cadastro/edição permitem dispensar o teclado ao rolar, mantendo o comportamento de toque nos controles.
- Busca de capa/contracapa mantém loading/erro dentro da área rolável. Confirmação tem imagem proporcional e rolagem, evitando esconder ações em telas pequenas/fontes maiores. A pesquisa e seleção fecham o teclado.
- Ordenação da wishlist usa safe area e modal rolável com altura limitada.
- Capa frontal dos detalhes usa contain também quando não existe contracapa. Flip respeita Reduce Motion e é interrompido em background, estabilizando a face selecionada.
- Grid/lista e wishlist mostram o placeholder existente quando a imagem falha. A prévia da edição não mantém uma falha antiga ao receber uma nova URL de capa.
- Detalhes de filmes/boxes reservam largura completa para observações/local de compra. Labels e espaços dos detalhes de box foram alinhados aos de filme; pôsteres incluídos usam contain.
- Removida repetição do formato no cabeçalho de Minha edição; formato permanece nos dados da edição.
- Estatísticas permitem quebra de linha dos blocos de formato em larguras menores. Cabeçalhos de formulários acomodam fontes maiores.
- Login continua com estante/logo aprovados. Versão do login vem do app.json; package.json/lockfile foram alinhados à versão existente 1.0.1. Sobre já usa essa mesma fonte.
- Removidos um import não usado e um estilo morto. Sufixo do ícone PAL-M passou a usar a tipografia centralizada.

Grid continua com três colunas, títulos centralizados, espaçamento horizontal de 8 dp e vertical de 16 dp, sem badge de formato/BOX. SectionList e FlatList existentes, filtros, ordenação e navegação foram preservados. Não existe barra lateral A–Z no código atual; a estrutura das seções preparada para ela foi mantida, sem criar essa funcionalidade.

## Dependências

Somente patches indicados pelo Expo Doctor, dentro do SDK 57, usando npx expo install --fix:

- expo 57.0.28
- expo-crypto 57.0.4
- expo-router 57.0.26
- expo-sharing 57.0.23
- expo-splash-screen 57.0.10

Nenhuma biblioteca nova escolhida para a aplicação. O npm atualizou dependências transitivas no lockfile. Procedimento: [documentação oficial do Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Validação

- TypeScript e checagem adicional de imports/parâmetros não usados: aprovados.
- 293 testes unitários: aprovados.
- 555 assertivas SQL/RLS em PostgreSQL isolado com PGlite: aprovadas (cadastro 31; boxes 46; edição de boxes 180; fotos de perfil 31; fotos da cópia/edições 221; wishlist 46). Incluem dois proprietários, papel anônimo e regras de Storage. Não são testes no projeto remoto.
- Expo Doctor: 21/21 verificações aprovadas após os patches.
- Exportação de produção Android/iOS: aprovada; bundles Hermes em /tmp/acervo-polish-export. Export não substitui compilação/execução do APK ou app iOS.
- git diff --check: aprovado.
- Comparação por SHA-256 dos 175 arquivos protegidos: nenhum alterado nesta tarefa (docs, assets, serviços, hooks, contextos, Supabase/migrations/functions).
- npm audit: 31 avisos preexistentes (19 high, 12 moderate), mesma contagem antes/depois. Raízes: braces, node-forge, uuid e decode-uri-component nas dependências transitivas do Expo/Router. Correções automáticas sugerem mudanças de versão principal, fora deste polimento; não foi usado audit fix --force. Avisos de Node sobre módulos/cores não impediram testes ou bundles.

## Teste no aparelho

- Teclado e scroll nos formulários longos, incluindo barcode, box, wishlist e conta, em Android pequeno e iOS.
- Tamanho de fonte maior, TalkBack/VoiceOver e botões dos modais de capa/ordenação.
- Capas de formatos diferentes no grid/lista e detalhes, troca de capa após falha de imagem, contracapa/flip com Reduce Motion e ao voltar do background.
- Splash e login, estatísticas, filtros e navegação com barras do sistema visíveis.
- Rodada regressiva com dados reais: cadastrar filme/box, favoritar, editar/remover, wishlist adquirida, scanner, PDF e persistência da sessão. Testes automáticos aprovados não substituem essa rodada no dispositivo.

Nenhuma migration criada/aplicada; nenhuma alteração remota. Para distribuir o resultado e incluir os patches nativos, gerar novo APK/build iOS. Expo Go pode carregar o código atualizado sem produzir APK.

## Arquivos alterados nesta tarefa

- `app/account.tsx`
- `app/add/barcode-confirm.tsx`
- `app/add/selected.tsx`
- `app/auth.tsx`
- `app/boxes/[id].tsx`
- `app/collection/edit.tsx`
- `app/collection/edition-edit.tsx`
- `app/index.tsx`
- `app/wishlist/[id].tsx`
- `app/wishlist/add.tsx`
- `app/wishlist/index.tsx`
- `app/wishlist/search.tsx`
- `package-lock.json`
- `package.json`
- `src/components/add/EditionImage.tsx`
- `src/components/boxes/BoxForm.tsx`
- `src/components/boxes/BoxMoviePicker.tsx`
- `src/components/collection/EditionCoverFlip.tsx`
- `src/components/collection/EditionDetails.tsx`
- `src/components/covers/EditionCoverPicker.tsx`
- `src/components/movie/MovieCard.tsx`
- `src/components/movie/MovieListRow.tsx`
- `src/components/profile/CollectionStatistics.tsx`
- `src/components/ui/ActionButton.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Chip.tsx`
- `src/components/ui/CountrySelector.tsx`
- `src/components/ui/DistributorSelector.tsx`
- `src/components/ui/FormField.tsx`
- `src/components/ui/PurchaseDateField.tsx`
- `src/components/ui/RegionSelector.tsx`
- `src/components/visual/VideoStandardIcon.tsx`
- `src/components/wishlist/WishlistRow.tsx`
- `src/theme/controls.ts`
- `POLISH_REPORT.md` (este relatório)

As alterações de compra no cadastro por barcode que já estavam pendentes antes desta tarefa foram preservadas. BarcodeConfirmation.tsx, CopyFields.tsx, services/barcode/save.ts, services/barcode/copy.ts e tests/barcodeCopy.test.mjs não receberam alterações novas deste polimento; app/add/barcode-confirm.tsx recebeu apenas ajuste de cabeçalho e scroll além da mudança anterior.
