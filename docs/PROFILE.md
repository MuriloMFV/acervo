# Perfil e foto do usuário

## Comportamento

- O cabeçalho não mostra mais a contagem “N itens no Acervo” nem o título genérico “Perfil”. As estatísticas e a navegação da coleção continuam disponíveis.
- O nome usa primeiro `profiles.display_name`; para contas antigas sem nome, tenta os metadados de exibição e depois o identificador do e-mail.
- **Conta → Nome → Salvar nome** define o nome de exibição. A atualização preserva a foto do perfil.
- Tocar no avatar ou em **Adicionar foto / Alterar foto** oferece galeria, câmera e, quando houver imagem salva, remoção. As alterações da foto são salvas imediatamente na conta.
- Cancelar o seletor ou falhar no envio preserva a imagem anterior. O app bloqueia operações simultâneas e não atualiza a interface de outra sessão.
- “Sobre o Acervo” mostra **Versão 1.0.1 (beta)** e o texto: “Projeto de estudos criado por um colecionador de mídia física, sem fins comerciais.” O número base vem de `app.json`.

## Persistência

A coluna `profiles.avatar_url` já existia e foi reutilizada. Ela armazena a chave permanente do objeto no bucket privado `profile-photos`, no formato `user UUID/avatar-UUID.ext`; a URL temporária para exibição não vai para o banco. As URLs assinadas expiram em 15 minutos e são renovadas pela consulta de imagem enquanto o perfil está aberto.

O seletor, o preparo JPEG, o redimensionamento, a leitura de arquivo, a validação de bytes/MIME/tamanho e a sequência de substituição reaproveitam os serviços de fotos existentes. O bucket aceita JPEG, PNG e WebP de até 5 MB. A substituição usa um nome UUID novo, sem sobrescrever objetos.

O perfil só passa a apontar para a imagem após o upload. A troca exige que a foto anterior ainda seja a esperada, para rejeitar um formulário desatualizado. A imagem antiga é removida depois de desvinculada; RLS impede excluir a imagem ainda vinculada, inclusive se uma resposta de rede for ambígua. Falha apenas na limpeza não desfaz uma alteração já salva; nesse caso pode permanecer um arquivo privado sem vínculo.

Migration: `supabase/migrations/20261010012629_profile_photos.sql`. Ela configura bucket, políticas de acesso pelo dono, validação do objeto existente e proteção contra acesso de usuário anônimo. Não acrescenta coluna nem Edge Function. A função do trigger usa `SECURITY INVOKER`.

**A migration já foi aplicada ao projeto Supabase vinculado**, com o mesmo número do histórico remoto. Outro ambiente precisa aplicar a migration antes de testar a foto.

## Testes e conferência

- TypeScript: aprovado.
- `npm test`: 196 testes aprovados; os 9 testes novos cobrem nome de contas antigas, chave da foto, adicionar/trocar/remover, falha de upload/salvamento, limpeza e mudança de sessão.
- PostgreSQL/PGlite: 31 verificações de persistência, RLS, usuário anônimo, outro dono, imagem ausente, URL inválida, foto vinculada, substituição e remoção.
- Exportação Expo: Android/iOS aprovados em `/private/tmp/acervo-profile-photo-export`.
- Conferência remota: bucket privado, MIME/tamanho, três políticas, constraint, trigger e função sem privilégios elevados confirmados.
- Advisors: nenhum aviso novo. Permanece o aviso anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Para repetir o teste de banco com a ferramenta temporária já usada no projeto:

```sh
ACERVO_PGLITE_MODULE=/private/tmp/acervo-back-cover-sql/node_modules/@electric-sql/pglite/dist/index.js node tests/sql/profilePhotos.mjs
```

Conferência em aparelho, ainda necessária:

1. Recarregar o Expo Go e conferir o cabeçalho sem contagem.
2. Em Conta, salvar um nome e voltar ao perfil; conferir também após sair e entrar.
3. Tocar no avatar, escolher uma imagem da galeria e reabrir o perfil.
4. Trocar a foto usando a câmera; cancelar uma nova seleção e conferir que a anterior permanece.
5. Remover a foto e conferir que o avatar padrão volta, inclusive após reabrir o app.
6. Em Sobre, conferir versão e descrição do projeto.

O APK instalado precisa de uma nova build para receber a interface. As bibliotecas de imagem já estavam instaladas; não foi adicionada dependência. As mensagens de permissão em `app.json` agora incluem a foto do perfil.

## Arquivos

- Telas: `app/profile.tsx`, `app/account.tsx`, `app/about.tsx`, `app.json`.
- Interface e consulta: `src/components/profile/ProfileHeader.tsx`, `src/hooks/useProfilePhoto.ts`.
- Serviços: `src/services/supabase/profile.ts`, `src/services/supabase/types.ts`, `src/services/profile/{identity,photo,photoSaving,photoValidation}.ts`.
- Banco e testes: migration acima, `tests/profilePhoto.test.mjs`, `tests/sql/profilePhotos.mjs`.
