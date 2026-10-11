# Condição, tipo de capa e país

Os formulários de cadastro manual, confirmação por código de barras e edição
compartilham as opções de tipo de capa e o seletor de país. O cadastro de box
também reutiliza o seletor de país.

- A condição `FAIR` aparece como **Ruim**, inclusive nas cópias existentes.
- **Tipo de capa** substitui **Embalagem**: Case, Snapcase, Digipak, Steelbook,
  Luva e Box. `STANDARD` continua sendo o valor persistido para Case.
- Os botões de foto e busca web de contracapa ficam lado a lado quando há
  espaço. Em telas estreitas ou com fonte maior, passam para linhas separadas.
- O país tem busca por nome ou sigla e mostra a bandeira na seleção. Nos
  detalhes, um país reconhecido mostra somente a bandeira; seu nome continua
  disponível ao leitor de tela. Texto antigo sem país reconhecido é preservado.
  Pode continuar como “Não informado”.
- Região / codificação abre duas etapas na mesma tela: primeiro a região
  (DVD: 1 a 6 e Livre; Blu-ray: A, B, C e Livre; UHD: Livre), depois a
  codificação NTSC, PAL, PAL-M ou SECAM, com os logos fornecidos. Os campos são
  opcionais. “Outra região” permite registrar uma marcação menos comum.

O seletor de região reconhece marcações antigas como “Região 4”, “ALL” e “ABC”
sem regravar o campo ao abrir o formulário. Valores antigos fora das opções
do formato continuam selecionados e disponíveis. Região permanece em `region`;
codificação é salva em `video_standard`. A migration e os detalhes do fluxo
estão em [VIDEO_STANDARD.md](VIDEO_STANDARD.md).

Referências das opções: [regiões de DVD](https://www.sony.com.br/electronics/support/articles/00022799),
[Blu-ray e UHD](https://www.sony.co.uk/electronics/support/articles/00029369) e
[sistemas de cores](https://helpguide.sony.net/gbmig/45306888/v1/pt-br/contents/TP0000518509.html).

## Persistência e compatibilidade

Migration: `supabase/migrations/20261010021419_edition_cover_types.sql`.
Foi aplicada no projeto Supabase conectado (`qdxxfrbznbzophjwpblw`).
Outros ambientes precisam aplicar as migrations pendentes.

A migration acrescenta `SNAPCASE` e `SLIPCASE` ao enum existente e permite
alterar `packaging_type` pela RPC `edit_collection_edition`. O campo é opcional
na RPC: clientes anteriores preservam o tipo e a contracapa atuais. As edições
continuam sendo copiadas ao editar, relincando somente o item do usuário.

País permanece no campo textual `country`, sem nova coluna ou infraestrutura.
A seleção salva o nome em português; nomes já salvos, códigos ISO e nomes em
inglês são reconhecidos para exibir a bandeira. Um valor antigo desconhecido é
preservado sem inventar uma bandeira. O catálogo de 249 países e territórios é
local, baseado no Unicode CLDR, com a licença em `LICENSES/UNICODE.txt`.

Capas, contracapas, pôster, código de barras e dados da cópia são preservados
ao trocar o tipo de capa. Os serviços de busca e upload existentes continuam
sendo utilizados.

## Arquivos principais

- Telas: `app/add/selected.tsx`, `app/collection/edition-edit.tsx`,
  `src/components/add/BarcodeConfirmation.tsx`, `app/add/box.tsx` e
  `app/boxes/[id].tsx`.
- Componentes: `PackagingSelector`, `EditionDetails`, `EditionBackCoverField`,
  `EditionCoverPhotoButton`, `ActionButton`, `CountrySelector`, `CountryDisplay`
  e `RegionSelector`.
- Dados e persistência: `src/data/countries.ts`, `src/utils/countries.ts`,
  `src/utils/regions.ts`, `src/utils/collectionDetails.ts`, tipos de Edition
  e serviços de coleção.
- Testes: `tests/editionMetadata.test.mjs`, testes de condição existentes e
  `tests/sql/copyPhotosAndEditionEditing.mjs`. `tests/regions.test.mjs` verifica
  valores antigos, região livre, mudança de formato e marcações personalizadas.

## Validação

- `npm run typecheck`.
- `npm test`: 215 testes passaram, incluindo região e codificação.
- Exportação dos bundles Android e iOS concluída sem erros.
- PostgreSQL isolado: 132 verificações de edição e 46 de box, incluindo persistência, preservação
  das imagens, compatibilidade com clientes anteriores, concorrência e RLS.
- Consultas no Supabase confirmaram os novos valores, a RPC como
  `SECURITY INVOKER`, a preservação de valores omitidos e acesso restrito.
- Advisor de segurança sem mudança em relação ao estado anterior. Continua
  apenas o aviso existente de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Para executar a validação SQL com PGlite instalado fora do projeto:

```sh
ACERVO_PGLITE_MODULE=/caminho/para/pglite/dist/index.js node tests/sql/copyPhotosAndEditionEditing.mjs
```

## Testar no aplicativo

1. No cadastro, abra **Mais detalhes**, selecione um país e um tipo de capa e
   salve. Confira o nome do tipo e a bandeira nos detalhes.
2. Em **Editar edição**, troque o país e teste Snapcase e Luva. Salve e reabra
   para conferir a persistência. Selecione “Não informado” para limpar o país.
3. Confira um item antigo com condição Regular: agora aparece Ruim. Um país
   reconhecido já salvo, como Brasil, ganha a bandeira sem precisar editar.
4. Confira os botões de contracapa com fonte normal e fonte ampliada. Teste foto
   e busca web e confirme que o flip e a capa frontal continuam funcionando.
5. Toque em **Região / codificação** no cadastro ou em **Editar edição**.
   Selecione uma opção, salve e reabra. Teste também “Não informado” para limpar
   e “Outra região” para uma marcação combinada. Na segunda etapa, escolha a
   codificação e Concluir. Fechar sem concluir deve manter os valores anteriores.

No Expo Go, recarregue o projeto atualizado. Para testar as alterações no
aplicativo instalado por APK, é necessário gerar e instalar um novo APK.
A aparência e os gestos devem ser conferidos no dispositivo; a validação local
verificou tipos, regras de persistência e geração dos bundles.
