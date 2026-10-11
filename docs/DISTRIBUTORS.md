# Seletor de distribuidora

O campo existente `Edition.publisher` continua sendo texto opcional. Não há migration, alteração em serviços ou dependência nova. O mesmo controle é reutilizado no cadastro de boxes.

No cadastro manual, na confirmação por barcode e em **Editar edição**, o campo **Distribuidora** abre uma lista pesquisável com as 15 marcas de `src/data/distributors.ts`. Cada opção mostra uma logo local de `src/assets/distribuidoras/`. A seleção salva o nome da marca em `publisher`.

**Outra distribuidora** permite digitar até 200 caracteres e confirmar o nome. **Não informado** limpa o campo. Fechar o seletor sem selecionar uma opção ou confirmar a entrada manual mantém o valor anterior.

Os detalhes da edição e do box mostram somente a logo para marcas reconhecidas; o nome continua disponível ao leitor de tela. O seletor mantém logo e nome para ajudar na escolha. Nomes antigos conhecidos são reconhecidos por aliases explícitos, sem reescrever dados salvos. Texto personalizado aparece como foi cadastrado; campo vazio aparece como `—`.

## Logos

As imagens são locais, mantêm proporção e aparecem sem uma base retangular. Marcas coloridas mantêm suas cores; as partes pretas dos vetores e as marcas monocromáticas são exibidas em tom claro para o tema escuro.

A Imagem Filmes veio com fundo preto incorporado ao PNG: um filtro SVG usa a arte branca como máscara de transparência. A Paramount usa inversão na exibição para preservar suas letras e espaços vazios. Os filtros não alteram os arquivos originais.

Os sete SVGs são adaptados para `SvgXml`, já usado pelo app. `generate-native.py` remove metadados e definições sem uso, resolve o preenchimento CSS da Miramax e ajusta somente o `viewBox` das margens vazias de BBC e Miramax. A imagem PNG embutida no SVG da Disney é extraída sem modificar seus bytes. Os arquivos originais permanecem intactos.

A opção **Warner Bros.** reconhece também os nomes antigos **Warner Home Video** e **Warner Bros. Home Entertainment**. Sua logo vetorial foi obtida do [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Warner_Home_Video.svg); a atribuição está em `LICENSES/WARNER_LOGO.md`.

A opção **Sony Pictures Home Entertainment** reconhece **Sony**, **Sony Pictures** e **SPHE**, mantendo uma opção própria além de Columbia Pictures. Sua logo vetorial monocromática foi obtida do [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sony_Pictures_Home_Entertainment_Print_Logo.svg); a fonte está em `LICENSES/SONY_LOGO.md`.

Para regenerar os arquivos adaptados:

```sh
python3 src/assets/distribuidoras/generate-native.py
```

## Validação

- `npm run typecheck`.
- `npm test`: testes de busca, aliases, texto manual, persistência no cadastro manual/barcode/edição/box, troca e remoção, metadados preservados e extração exata do PNG da Disney.
- `node --experimental-strip-types --test tests/distributors.test.mjs tests/distributorArtwork.test.mjs`: 9 testes passando, incluindo transparência, letras da Paramount e contornos suavizados da Imagem Filmes.
- Exportação de bundles Android e iOS para conferir os imports dos assets.
- Conferência visual das imagens originais, dos SVGs adaptados e da prévia sobre fundo escuro. A interação na tela ainda precisa ser conferida no dispositivo.

## Teste no app

1. Abra **Mais detalhes da edição → Distribuidora** no cadastro e escolha uma marca. Salve e confira somente a logo em **Minha edição**; com leitor de tela, confira o nome anunciado.
2. Em **Editar edição**, troque a marca; depois escolha **Outra distribuidora** e confirme um nome fora da lista. Confira o nome salvo nos detalhes.
3. Selecione **Não informado**, salve e confira `—`. Fechar o seletor enquanto digita não deve alterar o campo.
4. Confira o mesmo seletor no cadastro por barcode, incluindo uma distribuidora sugerida pela busca.

No Expo Go, recarregue o projeto atualizado. Para testar essas alterações em um APK já instalado, gere e instale um novo APK.
