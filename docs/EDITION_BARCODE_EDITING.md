# Edição manual do código de barras

Em **Editar edição**, o campo **Código de barras** aceita digitação manual. O
botão **Escanear código de barras** abre o mesmo componente de câmera usado no
cadastro. Uma leitura válida preenche o campo e fecha a câmera; não faz busca,
cadastro ou salvamento automático. **Digitar código** e voltar apenas fecham a
câmera, preservando os valores do formulário.

Ao salvar, a normalização e a validação existentes aceitam 8, 12 ou 13 dígitos e
mantêm o código como texto, incluindo zeros à esquerda. Esvaziar o campo envia
`barcode: null`. Os caches da coleção e da busca por barcode são invalidados.

## Persistência

Aplicar `supabase/migrations/20261012194452_edition_barcode_editing.sql` antes de
testar o salvamento. O campo `Edition.barcode` já existe; nenhum campo novo foi
criado. Foram ampliados os tipos do formulário e do payload da RPC existente.

O cliente envia `barcode` e `expected_updated_at`, obtido da edição carregada.
A RPC `edit_collection_edition` usa um atualizador privado que altera a edição
atual, retorna o mesmo ID e não insere edições nem muda o vínculo da cópia.
Valida autenticação, propriedade da cópia, timestamp e os mesmos campos/capas
já permitidos. Uma edição usada por outro usuário só aceita salvar sem
alterações; mudanças são bloqueadas para proteger os outros acervos. Várias
cópias da mesma edição pertencentes ao próprio usuário continuam vinculadas.

O atualizador privado tem `search_path` vazio, permissões explícitas e verifica
propriedade e compartilhamento antes de qualquer escrita. O cliente continua
sem permissão de UPDATE direto no catálogo. `acervo_private` deve permanecer
fora dos schemas expostos pela Data API.

Payloads de APKs anteriores, sem `barcode`, continuam usando o comportamento
original de edição por cópia. Busca, UPCitemdb, SerpApi e associações de filmes
não foram alteradas.

## Validação

```sh
npm run typecheck
npm test
```

O teste `tests/editionBarcodeEditing.test.mjs` cobre inserir, alterar, remover,
normalização/zeros, validação e a leitura passando pelo bloqueio do scanner até
o preenchimento do formulário, sem sobrescrever os outros campos.

O teste SQL existente também aplica a migration nova e verifica persistência
na mesma edição, ausência de novos registros, campos/vínculos preservados,
concorrência, compartilhamento, permissões e regressões dos clientes antigos.
O Supabase local não estava ativo na porta 54322 para executar os advisors da
CLI; permissões, contexto das funções e isolamento foram verificados nas
consultas do teste SQL.
Para rodá-lo em PostgreSQL isolado sem instalar dependências no app:

```sh
npm install --prefix /tmp/acervo-barcode-validation --no-package-lock --no-audit --no-fund @electric-sql/pglite
ACERVO_PGLITE_MODULE=/tmp/acervo-barcode-validation/node_modules/@electric-sql/pglite/dist/index.js node tests/sql/copyPhotosAndEditionEditing.mjs
```

Validação automatizada não substitui testar a câmera e o retorno do modal no
dispositivo: digite um código com zeros, abra/cancele o scanner, faça uma leitura,
salve, reabra a edição e por fim esvazie o campo para confirmar a remoção.
