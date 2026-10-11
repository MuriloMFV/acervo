# Região e codificação

O controle **Região / codificação** abre uma única tela com duas etapas:

1. Escolher a região. As opções acompanham DVD, Blu-ray ou UHD. VHS pode seguir
   com “Não informado”. Uma região menos comum pode ser digitada em “Outra região”.
2. Escolher NTSC, PAL, PAL-M, SECAM ou “Não informado”, e tocar em **Concluir**.

O fluxo é compartilhado pelo cadastro manual, confirmação de uma nova edição
por código de barras, **Editar edição** e cadastro de box. As escolhas ficam
somente no rascunho até Concluir; fechar a tela descarta ambas. Voltar à região
mantém o rascunho da codificação. O cadastro/edição precisa ser salvo em seguida.

## Logos

Os arquivos originais em `src/assets/icons/code icons/` são utilizados:

- NTSC: PNG original, sem alteração.
- PAL: o path do SVG é reproduzido em `native.ts`, seguindo o padrão dos ícones
  SVG nativos do projeto. PAL-M reutiliza o logo PAL com um sufixo `-M` dentro
  do ícone para distinguir as duas codificações.
- SECAM: o PNG embutido no SVG foi extraído sem alterar seus bytes, em
  `secam-native.png`, para renderizar com o componente Image existente.

Os detalhes da edição e do box mostram somente o ícone da codificação, sem
repetir o nome ao lado. O nome continua disponível ao leitor de tela. As opções
do seletor mantêm seus nomes para ajudar na escolha. Sem codificação, os
detalhes mostram apenas “—”.

## Persistência

Migration criada e aplicada no Supabase conectado:
`supabase/migrations/20261010025750_edition_video_standard.sql`.

Foi adicionado `video_standard`, texto opcional com validação de NTSC, PAL,
PAL-M ou SECAM, em `editions` e `box_sets`. Região continua em `region`.
O campo novo é opcional nas RPCs existentes; a edição preserva a codificação
quando um APK anterior omite a chave. Enviar null remove a codificação.

As RPCs permanecem como SECURITY INVOKER, com as mesmas permissões e regras
de propriedade. Editar a codificação copia a Edition e relinca somente a cópia
do usuário, preservando capas, contracapa, barcode, pôster e dados da cópia.

Valores antigos como NTSC em `region` são interpretados para exibição e para
iniciar o rascunho, sem modificar os registros ao abrir ou fechar a tela.
Confirmar as escolhas e salvar pode passar essa informação para o campo novo.

## Arquivos principais

- `src/components/ui/RegionSelector.tsx`: fluxo em duas etapas.
- `src/components/visual/VideoStandardIcon.tsx` e
  `src/components/ui/VideoStandardDisplay.tsx`: logos e nomes.
- `src/types/videoStandard.ts` e `src/utils/videoStandard.ts`: opções,
  validação, compatibilidade e rascunho.
- Formulários de cadastro/edição, `EditionDetails` e detalhes de box.
- Tipos e mapeadores de Supabase, coleção, barcode e box; filtro de reutilização
  de edição padrão passa a excluir edições com codificação.
- `tests/videoStandard.test.mjs` e testes SQL existentes atualizados para usar
  a nova migration.

## Validação e teste no dispositivo

- TypeScript e 215 testes passaram.
- Bundles Android e iOS gerados sem erros, incluindo os assets de codificação.
- PostgreSQL isolado: 132 verificações de edição e RLS; 46 de box e RLS.
- As verificações incluem gravar, trocar, remover, rejeitar códigos inválidos,
  preservar os campos antigos, imagens e valores omitidos por clientes antigos.
- Supabase confirmou os campos opcionais e as RPCs com as permissões anteriores.
- Advisor de segurança sem novos avisos; permanece somente o aviso anterior de
  [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

No Expo Go, recarregue o projeto atualizado. No aplicativo instalado por APK,
gere e instale um novo APK. A migration já está aplicada no projeto conectado;
outros ambientes precisam aplicá-la antes de usar o campo novo.

No cadastro, abra Mais detalhes e toque em Região / codificação. Escolha 4,
depois NTSC e Concluir. Salve e confira os dois valores e o logo nos detalhes.
Em Editar edição, troque para PAL e depois remova escolhendo “Não informado”.
Confira também que fechar a tela na segunda etapa mantém os valores anteriores.
A aparência e a navegação final devem ser conferidas no dispositivo.
