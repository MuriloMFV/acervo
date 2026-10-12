# Cadastro completo após escolher o filme

`app/add/selected.tsx` apresenta **Minha edição** e **Minha cópia** na mesma tela,
com um único botão **Adicionar ao Acervo**. Os dados opcionais começam vazios;
favorito, especial e limitada começam desmarcados. Formato e condição mantêm os
valores iniciais existentes, DVD e Bom.

| Entidade | Dados |
| --- | --- |
| Movie | Identificação e informações vindas do TMDB, incluindo poster/backdrop |
| Edition | Formato, tipo de capa, barcode, capa/contracapa, distribuidora, país, região, codificação, discos, nome, especial/limitada |
| CollectionItem | Condição, preço, data/local de compra, notas e favorito |

## Reaproveitamento

- `EditionMetadataFields` é usado no cadastro e em **Editar edição**. Reutiliza
  `FormField`, `PackagingSelector`, `DistributorSelector`, `CountrySelector`,
  `RegionSelector` e o scanner compartilhado. A leitura apenas preenche o campo.
- `EditionCoverFields` reúne os controles existentes de capa frontal,
  contracapa, busca web e câmera/galeria, incluindo o bloqueio durante upload.
  É compartilhado com **Editar edição** e usa o Storage existente.
- `CopyFields` é usado no cadastro e em **Editar minha cópia**, com
  `ConditionSelector`, `PurchaseDateField`, os campos de compra/notas e favorito.
- `parseEditionForm` e `parseCopyForm` validam também o primeiro cadastro.
  Barcode mantém zeros, discos são inteiros e preço/data usam as regras atuais.

## Salvamento

Todos os campos são validados antes de criar registros. O serviço continua
reutilizando o Movie pelo TMDB ID e a Edition padrão quando não há metadados
específicos. Discos, barcode e especial/limitada também identificam uma edição
específica. Os dados da cópia já seguem no INSERT inicial, sem uma segunda tela
de edição e sem contaminar o catálogo com informações da compra.

`registration.ts` prepara os grupos e mantém a ordem Movie → Edition →
CollectionItem. A persistência continua sequencial, como no fluxo anterior;
não foi adicionada uma transação de banco ou migration. O serviço de barcode
continua usando a assinatura e as notas de correção anteriores.

## Verificação

```sh
npm run typecheck
npm test
ACERVO_PGLITE_MODULE=/tmp/acervo-barcode-validation/node_modules/@electric-sql/pglite/dist/index.js node --experimental-strip-types tests/sql/collectionRegistration.mjs
```

O teste SQL usa PGlite temporário, instalado fora do app conforme
`docs/EDITION_BARCODE_EDITING.md`, e verifica os três registros ligados, os
quatro formatos, campos opcionais, zeros e isolamento entre usuários.
