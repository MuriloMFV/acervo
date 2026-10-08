# Acervo — Especificação Geral do Projeto

> Documento de referência para desenvolvimento do aplicativo **Acervo**.
> Este arquivo deve ser lido integralmente antes de qualquer implementação.

---

## 1. Visão do produto

**Acervo** é um aplicativo mobile para catalogar coleções pessoais de mídia física.

O MVP será focado exclusivamente em **filmes físicos**, com suporte inicial a:

- DVD
- Blu-ray
- 4K UHD
- VHS

No futuro, o produto poderá crescer para:

- CDs
- Vinis
- Jogos
- Livros
- Outras mídias físicas

A arquitetura deve ser preparada para crescer, mas **o código do MVP deve implementar somente filmes**.

O objetivo do aplicativo é ser uma **estante digital pessoal de mídia física**, e não um serviço de streaming, rede social ou clone do Letterboxd.

---

## 2. Princípios do produto

### 2.1. Priorizar a coleção física

O aplicativo deve distinguir claramente:

- a **obra** (ex.: *Pânico*, 1996)
- a **edição física** (ex.: DVD Região 4, Paramount)
- a **cópia pertencente ao usuário** (ex.: condição, preço pago, data de aquisição)

O mesmo filme pode aparecer mais de uma vez na coleção caso o usuário possua edições diferentes.

Exemplo:

```text
Pânico (1996)
├── DVD Região 4
├── Blu-ray Região A
└── 4K UHD Região A
```

### 2.2. Interface direta

Evitar textos de apoio desnecessários.

A UI deve se explicar pela hierarquia visual, componentes, ícones e nomes das ações.

Evitar microcopy excessiva que deixe a interface com aparência genérica ou gerada por IA.

### 2.3. Aparência

A identidade visual já foi definida no Google Stitch e deve ser usada como referência visual.

Direção visual:

- tema escuro
- preto/grafite como base
- dourado/amarelo como destaque
- tipografia limpa e moderna
- aparência premium
- forte presença das capas dos filmes
- visual de arquivo/coleção
- pouco dourado decorativo
- dourado principalmente em estados ativos e ações principais

### 2.4. Escopo controlado

Não tentar resolver agora:

- rede social
- seguidores
- avaliações públicas
- comentários
- recomendação social
- múltiplos tipos de mídia
- marketplace
- empréstimos entre usuários
- offline-first complexo

O foco do MVP é catalogar filmes físicos muito bem.

---

## 3. Stack escolhida

### Aplicativo

- **React Native**
- **Expo**
- **TypeScript**
- **Expo Router**

### Backend

- **Supabase**
- PostgreSQL
- Supabase Auth
- Supabase Storage quando necessário
- Row Level Security (RLS)

### Dados externos

- **TMDB API** para dados das obras
- **UPCitemdb API** para consultas de UPC / EAN / GTIN / ISBN e identificação de produtos físicos

### Estado e dados remotos

- **TanStack Query**

### Formulários e validação

- **React Hook Form**
- **Zod**

### Scanner

- **Expo Camera**

### Ícones

- **Lucide React Native**

### Opcional posteriormente

- SQLite / persistência local, caso seja necessário evoluir para uma experiência offline mais robusta

---

## 4. Estratégia de implementação

Não implementar backend, APIs e UI simultaneamente desde o primeiro commit.

A ordem inicial deve ser:

1. criar projeto Expo
2. configurar Expo Router
3. criar design system
4. implementar telas com mocks
5. componentizar UI
6. integrar TMDB
7. integrar Supabase
8. implementar autenticação
9. salvar coleção real
10. implementar filtros reais
11. integrar UPCitemdb
12. implementar scanner
13. polimento e testes

A cada etapa o app deve continuar executável.

---

## 5. Telas definidas no design

### 5.1. Minha coleção

Tela principal.

Elementos:

- marca Acervo
- título “Minha coleção”
- contador de itens
- busca local na coleção
- botão de filtros
- botão de ordenação
- filtros rápidos por formato
- grid principal com **3 filmes por linha**
- badges de formato
- alternância futura entre grid e lista
- navegação inferior

Formatos rápidos:

- Todos
- DVD
- Blu-ray
- 4K UHD
- VHS

A coleção deve suportar usuários com centenas ou milhares de itens.

Usar `FlatList` ou solução equivalente otimizada para listas grandes.

### 5.2. Adicionar ao Acervo

Deve aparecer como bottom sheet ao tocar no botão central `+`.

Opções:

- Escanear código de barras
- Buscar filme
- Cadastro manual

Não usar textos de apoio.

O scanner deve receber destaque visual.

### 5.3. Buscar filme

Fluxo interno de cadastro.

Elementos:

- botão voltar
- título “Buscar filme”
- barra de busca
- resultados compactos em lista
- poster oficial da obra
- título
- título original
- ano
- diretor
- cadastro manual quando não encontrar o filme

Não mostrar formato físico nesta etapa.

A tela representa a **obra**, não a edição.

Fluxo desejado:

```text
buscar -> encontrar -> tocar
```

### 5.4. Detalhes do filme

Tela visualmente importante.

Mostrar:

- backdrop
- poster
- título
- título original
- ano
- diretor
- duração
- classificação indicativa
- gêneros
- sinopse
- ações de favorito, editar e remover

Seção **Minha edição**:

- formato
- região
- país
- distribuidora
- condição
- aquisição
- preço pago
- código de barras

Condições devem ser padronizadas em português:

- Lacrado
- Como novo
- Muito bom
- Bom
- Regular

### 5.5. Filtros e ordenação

Pode ser tela ou bottom sheet conforme design final.

#### Ordenação

- Adicionados recentemente
- Título A-Z
- Título Z-A
- Ano de lançamento mais recente
- Ano de lançamento mais antigo
- Maior valor pago
- Menor valor pago

#### Formato da mídia

- DVD
- Blu-ray
- 4K UHD
- VHS

#### Tipo de edição

- SteelBook
- Digipak
- Box
- Edição especial
- Edição limitada

#### Gênero

Filtros dinâmicos conforme os dados cadastrados.

#### Década

Exemplos:

- 2020s
- 2010s
- 2000s
- 1990s
- 1980s
- 1970s

#### Região / codificação

Exemplos:

- Livre / ABC / 0
- Região A / 1
- Região B / 2
- Região 4

#### Estado / condição

- Lacrado
- Como novo
- Muito bom
- Bom
- Regular

#### Parâmetros

- Apenas favoritos
- Apenas edições especiais / limitadas

### 5.6. Perfil / Estatísticas

Mostrar:

- avatar
- nome
- total de itens
- total de DVD
- total de Blu-ray
- total de 4K UHD
- total de VHS
- gênero mais presente
- década mais presente
- diretor mais presente
- valor total registrado

Atalhos:

- Favoritos
- Edições especiais
- Adicionados recentemente

Configurações:

- Conta
- Aparência
- Backup e sincronização
- Exportar acervo
- Sobre o Acervo

Evitar gráficos complexos no MVP.

### 5.7. Selecionar edição

**Ainda não existe um design definitivo.**

Essa tela será estruturada durante a implementação.

Ela deve aparecer depois da seleção da obra e antes de salvar na coleção.

Campos principais previstos:

- formato
- código de barras
- distribuidora
- região
- país
- condição

Campos opcionais em “Mais detalhes”:

- quantidade de discos
- ano da edição
- preço pago
- data da aquisição
- local da compra
- observações

Não transformar essa etapa em um formulário excessivamente longo.

O usuário deve conseguir adicionar rapidamente uma edição preenchendo pouco.

---

## 6. Design system inicial

Os valores exatos devem ser ajustados visualmente para casar com os exports do Stitch.

Usar tokens centralizados e nunca espalhar hex codes e tamanhos arbitrários pelo projeto.

Sugestão inicial:

```ts
export const colors = {
  background: '#0C0D10',
  surface: '#15171E',
  surfaceElevated: '#1D212B',
  border: '#2A2F3D',

  primary: '#E5A93C',

  text: '#F5F5F7',
  textSecondary: '#B4B9C7',
  textMuted: '#8E95A5',

  danger: '#D65C5C',
};
```

Criar tokens também para:

- espaçamento
- radius
- tipografia
- tamanho de ícones
- sombras
- alturas de controles

Componentes visuais esperados:

- `MovieCard`
- `MovieGrid`
- `MediaBadge`
- `SearchBar`
- `FilterChip`
- `SectionTitle`
- `StatCard`
- `InfoCard`
- `BottomSheet`
- `PrimaryButton`
- `IconButton`
- `EmptyState`

Evitar componentes gigantes específicos para uma única tela quando partes puderem ser reutilizadas.

---

## 7. Modelo conceitual dos dados

O modelo central deve separar:

```text
Movie
  ↓
Edition
  ↓
CollectionItem
```

### 7.1. Movie

Representa a obra cinematográfica.

Campos sugeridos:

```text
id
external_source
external_id
tmdb_id
title
original_title
overview
release_date
release_year
runtime
poster_path
backdrop_path
director
content_rating
created_at
updated_at
```

`external_source` permite evolução futura sem acoplar completamente a TMDB.

### 7.2. Genre

```text
id
name
tmdb_id
```

Relacionamento muitos-para-muitos entre Movie e Genre.

### 7.3. Edition

Representa uma edição física conhecida.

Campos sugeridos:

```text
id
movie_id
barcode
format
edition_type
edition_name
publisher
country
region
release_year
disc_count
cover_image_url
source
created_at
updated_at
```

Valores de `format` no MVP:

```text
DVD
BLURAY
UHD_4K
VHS
OTHER
```

Valores possíveis de `edition_type`:

```text
STANDARD
STEELBOOK
DIGIPAK
BOX
SPECIAL
LIMITED
OTHER
```

A mesma Edition pode futuramente ser reutilizada por múltiplos usuários.

### 7.4. CollectionItem

Representa a cópia pertencente a um usuário.

Campos sugeridos:

```text
id
user_id
edition_id
condition
purchase_price
purchase_date
purchase_place
is_favorite
notes
created_at
updated_at
```

`condition`:

```text
SEALED
LIKE_NEW
VERY_GOOD
GOOD
FAIR
```

A UI mostra os nomes em português.

### 7.5. User/Profile

Supabase Auth será a fonte de identidade.

Criar `profiles` para dados públicos/visuais do usuário se necessário.

```text
id
name
avatar_url
created_at
updated_at
```

---

## 8. Supabase

### 8.1. Requisitos

- migrations versionadas
- Row Level Security habilitado
- policies explícitas
- usuário só pode ler/escrever seus próprios `collection_items`
- não expor service role key no aplicativo

### 8.2. Autenticação

Inicialmente:

- e-mail + senha
- Google, se a configuração estiver simples

Apple pode ficar para uma fase posterior.

### 8.3. Storage

Usar apenas quando necessário, por exemplo:

- avatar do usuário
- fotos próprias de edições físicas no futuro

Posters e backdrops oficiais podem continuar referenciando a TMDB.

---

## 9. TMDB

### 9.1. Responsabilidade

TMDB será a fonte principal para dados da **obra**:

- título
- título original
- poster
- backdrop
- sinopse
- data de lançamento
- gêneros
- duração
- diretor / créditos
- classificação, quando disponível

### 9.2. Autenticação

Usar token de leitura da API como Bearer quando aplicável.

Nunca espalhar segredo diretamente pelos componentes.

Configuração via environment variables.

### 9.3. Camada de serviço

A UI não deve depender diretamente do JSON bruto da TMDB.

Criar uma camada:

```text
TMDB response
   ↓
tmdbService / mapper
   ↓
Movie model do Acervo
   ↓
UI
```

Exemplo de tipo interno:

```ts
export interface MovieSearchResult {
  externalId: number;
  title: string;
  originalTitle: string;
  year: number | null;
  posterUrl: string | null;
  director?: string | null;
}
```

### 9.4. Busca

Usar debounce para evitar request a cada tecla.

Sugestão inicial: 300–500 ms.

Buscar apenas após um mínimo razoável de caracteres.

### 9.5. Idioma

Priorizar resultados/localização em **pt-BR** quando disponível.

Manter `original_title` separadamente.

---

## 10. UPCitemdb

### 10.1. Responsabilidade

UPCitemdb será usado para tentar identificar **produto / edição física** a partir de:

- UPC
- EAN
- GTIN
- ISBN quando relevante no futuro

No plano gratuito Explorer, a API permite até 100 requests combinados por dia, suficiente para este projeto pessoal.

### 10.2. Endpoint inicial

Usar o endpoint de lookup do ambiente trial/free para código de barras.

A implementação deve ficar encapsulada em `upcService`.

### 10.3. Importante

UPCitemdb não deve ser considerado fonte perfeita ou definitiva.

O fluxo precisa aceitar:

1. código encontrado
2. código encontrado com dados incompletos
3. código não encontrado

Quando não houver resultado, o usuário deve conseguir associar manualmente o código a uma Edition.

### 10.4. Banco próprio de edições

O Acervo deve aprender com os cadastros realizados.

Fluxo desejado:

```text
scanner
  ↓
consultar nosso banco por barcode
  ↓
se encontrado: reutilizar Edition
  ↓
se não encontrado: consultar UPCitemdb
  ↓
se houver resultado útil: sugerir Edition
  ↓
caso contrário: cadastro manual
```

Depois de uma Edition ser criada com barcode, futuras leituras devem consultar primeiro o banco do próprio Acervo.

Isso reduz dependência externa e cria uma base pessoal de edições.

---

## 11. Scanner de código de barras

Usar Expo Camera.

Suportar inicialmente formatos comuns de códigos EAN/UPC.

Fluxo:

```text
Adicionar
  ↓
Escanear código
  ↓
barcode detectado
  ↓
consultar Edition local/Supabase
  ↓
se não existir, consultar UPCitemdb
  ↓
identificar/sugerir filme
  ↓
confirmar edição
  ↓
salvar CollectionItem
```

Evitar leituras repetidas do mesmo barcode enquanto a tela processa o resultado.

---

## 12. Fluxo principal do MVP

### Adição por busca

```text
Minha coleção
   ↓
+
   ↓
Adicionar ao Acervo
   ↓
Buscar filme
   ↓
Selecionar obra
   ↓
Selecionar/preencher edição
   ↓
Adicionar ao Acervo
   ↓
Minha coleção atualizada
```

### Adição por barcode

```text
Minha coleção
   ↓
+
   ↓
Escanear código
   ↓
identificar Edition
   ↓
confirmar dados
   ↓
Adicionar ao Acervo
```

### Cadastro manual

```text
Minha coleção
   ↓
+
   ↓
Cadastro manual
   ↓
preencher obra e edição
   ↓
Adicionar ao Acervo
```

---

## 13. Estado e cache

Usar **TanStack Query** para:

- TMDB
- UPCitemdb
- coleção do usuário
- detalhes
- estatísticas

Evitar duplicar estado remoto em stores globais desnecessariamente.

Estado puramente visual/local pode permanecer em `useState`, `useReducer` ou contexto específico.

Não adicionar Redux/Zustand sem necessidade concreta.

---

## 14. Formulários

Usar:

- React Hook Form
- Zod

Schemas devem existir fora dos componentes quando reutilizáveis.

Exemplo:

```text
schemas/
  edition.schema.ts
  collectionItem.schema.ts
  auth.schema.ts
```

Validar principalmente:

- barcode
- preço
- datas
- campos obrigatórios
- enums de formato e condição

---

## 15. Estrutura sugerida de pastas

A estrutura pode ser ajustada conforme necessário, mas deve manter separação clara de responsabilidades.

```text
acervo/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── profile.tsx
│   ├── movie/
│   │   └── [id].tsx
│   ├── search.tsx
│   ├── filters.tsx
│   └── add/
│       ├── index.tsx
│       ├── scan.tsx
│       └── manual.tsx
│
├── src/
│   ├── components/
│   │   ├── movie/
│   │   ├── filters/
│   │   ├── forms/
│   │   └── ui/
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   │   ├── tmdb/
│   │   ├── upc/
│   │   └── supabase/
│   ├── schemas/
│   ├── types/
│   ├── utils/
│   └── theme/
│
├── assets/
├── supabase/
│   └── migrations/
├── .env.example
├── app.json
├── package.json
└── README.md
```

---

## 16. Environment variables

Nunca commitar valores reais de tokens.

Criar `.env.example`.

Exemplo conceitual:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_TMDB_READ_TOKEN=
```

UPCitemdb free/trial pode não exigir chave, mas a camada de serviço deve ser preparada para configuração futura.

Importante: qualquer segredo realmente sensível que não possa ser público no bundle mobile deve ficar em backend/Edge Function, não em `EXPO_PUBLIC_*`.

---

## 17. Tipos internos

Evitar passar objetos de API externa diretamente entre telas.

Criar tipos próprios.

Exemplo:

```ts
export type MediaFormat =
  | 'DVD'
  | 'BLURAY'
  | 'UHD_4K'
  | 'VHS'
  | 'OTHER';

export type ItemCondition =
  | 'SEALED'
  | 'LIKE_NEW'
  | 'VERY_GOOD'
  | 'GOOD'
  | 'FAIR';
```

A UI é responsável por mapear enums para nomes em português.

---

## 18. Performance

Considerar desde o início usuários com muitos itens.

### Coleção

- usar FlatList
- `numColumns={3}` no grid padrão
- keys estáveis
- componentes memoizados quando fizer sentido
- imagens com caching adequado
- evitar renderização excessiva

### Busca externa

- debounce
- cache TanStack Query
- cancelar/ignorar buscas obsoletas

### Estatísticas

Evitar recalcular grandes agregações no cliente a cada render.

Usar queries/agregações adequadas conforme a coleção crescer.

---

## 19. Imagens

### Obra

TMDB:

- poster
- backdrop

### Edição

No MVP pode usar poster da obra quando não houver foto própria da edição.

No futuro, permitir upload de foto da capa/caixa física para Supabase Storage.

Não bloquear o MVP por causa disso.

---

## 20. Navegação

Navegação principal inferior:

- Coleção
- botão central `+`
- Perfil

Fluxos internos como:

- busca
- scanner
- cadastro
- detalhes secundários

não precisam exibir a bottom navigation quando isso atrapalhar o fluxo.

O botão `+` deve abrir o bottom sheet “Adicionar ao Acervo”.

---

## 21. Estatísticas do perfil

Calcular inicialmente:

- total de itens
- quantidade por formato
- gênero mais frequente
- década mais frequente
- diretor mais frequente
- soma de `purchase_price` preenchidos

Não tratar preço ausente como zero para estatísticas que dependam de média.

Para “valor total registrado”, somar somente preços existentes.

---

## 22. Busca e filtros locais

A busca na tela “Minha coleção” deve procurar principalmente por:

- título
- título original
- diretor
- distribuidora, se útil

Filtros rápidos de formato devem funcionar em conjunto com filtros avançados.

Ordenação e filtros precisam ter um único estado coerente.

---

## 23. Exclusão

Ao remover um item da coleção:

- remover apenas `CollectionItem`
- não apagar automaticamente Movie
- não apagar automaticamente Edition

Movie e Edition podem ser reutilizados.

Se no futuro for necessário limpar registros órfãos, fazer isso separadamente.

---

## 24. Favoritos

`is_favorite` pertence ao `CollectionItem` no MVP.

Isso permite que o usuário favorite uma edição específica que possui.

---

## 25. Erros e estados vazios

Todo fluxo remoto precisa prever:

- loading
- empty
- error
- retry quando aplicável

Evitar mensagens longas.

Exemplos:

```text
Nenhum filme encontrado

Tentar novamente

Nenhum item no Acervo
```

---

## 26. Convenções de desenvolvimento

### TypeScript

- evitar `any`
- tipos explícitos nos limites entre camadas
- preferir unions/enums controlados para domínio

### Componentes

- componentes pequenos e focados
- separar lógica de dados da apresentação sempre que isso melhorar legibilidade
- evitar arquivo monolítico com centenas de linhas sem necessidade

### Nomes

Código em inglês.

Interface visível ao usuário em português do Brasil.

Exemplo:

```text
MovieCard.tsx
CollectionItem
purchasePrice
```

UI:

```text
Minha coleção
Como novo
Adicionar ao Acervo
```

### Formatação / lint

Configurar ESLint e Prettier.

Não desabilitar regras apenas para “fazer passar” sem entender o problema.

---

## 27. Testes

O MVP não precisa começar com cobertura extensa, mas fluxos centrais devem ser testáveis.

Prioridades:

1. mappers de TMDB
2. validações Zod
3. filtros da coleção
4. transformação dos dados de Edition
5. serviços de barcode

Testes de UI/end-to-end podem entrar depois do fluxo principal estar estável.

---

## 28. Segurança

- nunca usar Supabase service role key no app
- habilitar RLS
- validar dados no backend/banco quando necessário
- não confiar em `user_id` vindo livremente do cliente sem policies
- usar usuário autenticado para ownership
- não expor secrets privados no repositório

---

## 29. O que NÃO fazer

- não transformar o HTML exportado pelo Stitch diretamente no app
- não copiar JS do Stitch como arquitetura de produção
- não usar WebView para reproduzir o design
- não criar mega-store global sem necessidade
- não misturar Movie, Edition e CollectionItem numa tabela única
- não depender exclusivamente do UPCitemdb para edições
- não adicionar recursos futuros antes do MVP funcionar
- não inventar textos auxiliares que não existem no design
- não redesenhar a interface durante a implementação sem necessidade

O Stitch é **referência visual**, não base arquitetural.

---

## 30. Fonte de verdade visual

Os exports/imagens finais do Google Stitch fornecidos no projeto são a referência visual.

Ao implementar:

- reproduzir proporções e hierarquia
- criar componentes reais React Native
- preservar espaçamentos e identidade
- adaptar apenas quando necessário para responsividade e acessibilidade

Se houver conflito entre HTML exportado e screenshot final, **o screenshot final tem prioridade visual**.

---

## 31. Ordem recomendada de tarefas

### Fase 1 — Fundação

1. inicializar Expo + TypeScript
2. configurar Expo Router
3. lint/format
4. tema e tokens
5. componentes UI básicos

### Fase 2 — UI com mocks

6. Minha coleção
7. MovieCard
8. grid 3 colunas
9. bottom navigation
10. bottom sheet Adicionar ao Acervo
11. Buscar filme com mocks
12. Detalhes com mocks
13. Filtros com mocks
14. Perfil com mocks

### Fase 3 — TMDB

15. client TMDB
16. mapper
17. busca real
18. detalhes reais da obra
19. imagens reais

### Fase 4 — Supabase

20. setup Supabase
21. migrations
22. RLS
23. auth
24. profiles
25. collection_items
26. editions
27. persistência real

### Fase 5 — Fluxo completo

28. selecionar edição
29. salvar item
30. coleção real
31. editar
32. remover
33. favorito
34. filtros reais
35. estatísticas reais

### Fase 6 — Barcode

36. Expo Camera
37. scanner
38. consulta por barcode no banco
39. UPCitemdb fallback
40. associação manual

### Fase 7 — Polimento

41. estados vazios
42. erros
43. loading
44. responsividade
45. performance
46. testes
47. build APK de teste

---

## 32. Definition of Done do MVP

O MVP estará funcional quando um usuário puder:

1. criar conta / entrar
2. abrir sua coleção
3. buscar um filme na TMDB
4. selecionar a obra
5. informar a edição física
6. salvar na coleção
7. ver o item no grid
8. abrir detalhes
9. favoritar
10. editar
11. remover
12. buscar dentro da própria coleção
13. filtrar e ordenar
14. ver estatísticas básicas
15. escanear um barcode
16. tentar identificar a edição pelo banco próprio ou UPCitemdb

---

## 33. Observação sobre TMDB + UPCitemdb

As duas fontes têm papéis diferentes e complementares.

### TMDB

Responde:

> “Que filme é este?”

### UPCitemdb

Ajuda a responder:

> “Que produto físico é este código de barras?”

### Banco do Acervo

Deve gradualmente responder:

> “Que edição física deste filme corresponde a este código?”

A lógica ideal é combinar as três camadas, sem acoplar o aplicativo rigidamente a uma API externa.

---

## 34. Instrução para o Codex

Antes de começar qualquer tarefa:

1. leia este arquivo inteiro
2. inspecione o estado atual do repositório
3. não implemente várias fases de uma vez
4. execute apenas a tarefa solicitada no prompt atual
5. respeite as decisões arquiteturais deste documento
6. se encontrar conflito ou limitação técnica importante, explique antes de alterar a arquitetura
7. mantenha o aplicativo executável ao fim de cada tarefa
8. não refatore áreas não relacionadas sem necessidade
9. não invente funcionalidades que não foram solicitadas
10. mantenha o design fiel aos arquivos de referência

---

## 35. Links de referência técnica

- TMDB Developer Documentation: https://developer.themoviedb.org/
- UPCitemdb API: https://upcitemdb.com/api
- Expo: https://docs.expo.dev/
- Expo Router: https://docs.expo.dev/router/introduction/
- Supabase: https://supabase.com/docs
- TanStack Query: https://tanstack.com/query/latest
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/

---

# Resumo em uma frase

**Acervo é um aplicativo React Native/Expo para catalogar coleções pessoais de filmes físicos, usando TMDB para obras, UPCitemdb para ajudar a identificar produtos por código de barras e Supabase para manter a coleção e construir uma base própria de edições físicas.**
