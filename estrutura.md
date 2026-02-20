# Sistema de Prospecção no Google Maps (Busca + Mapa + Exportação)

## 1) Objetivo
Criar um sistema de prospecção que permita ao usuário pesquisar **“termo + localização”** (ex.: *“clínica estética + Florianópolis”*) e retornar uma **lista extensa de empresas** encontradas, com:
- Visualização em **lista** (tabela com filtros)
- Visualização em **mapa** (pins/markers)
- Seleção e organização de leads
- **Exportação para Excel**
- Histórico de buscas e reuso

---

## 2) Perfis de Usuário e Permissões
### 2.1 Usuário (Operador)
- Criar buscas e visualizar resultados
- Filtrar, selecionar, marcar status
- Exportar dados
- Salvar listas (coleções)

### 2.2 Admin
- Tudo do Operador
- Configurar limites (créditos, quota por dia)
- Acompanhar uso e logs
- Ajustar campos do export e regras de duplicidade

---

## 3) Experiência Principal (UX)
### 3.1 Tela: Prospecção (Página principal)
**Componentes**
- **Search Box** (input principal):
  - Campo “O que buscar?” (termo)
  - Campo “Onde?” (localização)
  - Botão: **Buscar**
- **Painel de filtros rápidos**:
  - Categoria/segmento
  - Avaliação mínima
  - Com telefone / com site
  - Faixa de distância (opcional)
  - Status do lead (novo, contatado, etc.)
- **Tabs de visualização**:
  - **Lista**
  - **Mapa**
  - **Lista + Mapa** (split view)

**Estados**
- Vazio (sem busca)
- Carregando
- Resultados (com paginação/scroll)
- Sem resultados
- Erro (limite/timeout/consulta inválida)

---

## 4) Resultado em Lista (Tabela)
### 4.1 Colunas sugeridas
- Nome da empresa
- Categoria
- Endereço
- Cidade/UF
- Telefone
- Website
- Avaliação (rating) + nº de avaliações
- Status (Novo / Qualificado / Contatado / Ignorar)
- Tags (custom)
- Ações: abrir detalhes | abrir no mapa | salvar | excluir

### 4.2 Controles da lista
- **Ordenar por**: relevância, rating, nº avaliações, distância
- **Busca dentro dos resultados** (search local)
- **Seleção em massa**:
  - Selecionar todos da página
  - Selecionar filtrados
  - Remover selecionados
- **Salvar lista**:
  - “Salvar como Lista” (nome + descrição)
- **Deduplicação**:
  - Impedir repetidos por Place ID
  - Se já existe, marcar como “já capturado”

---

## 5) Visualização em Mapa
### 5.1 Comportamentos essenciais
- Pins (markers) para cada empresa carregada
- **Clusterização** quando há muitos pontos
- Click no pin abre **card** com:
  - Nome, rating, endereço, telefone
  - Botões: “Ver detalhes”, “Selecionar”, “Salvar”

### 5.2 Interação Lista ↔ Mapa
- Ao clicar em uma linha da tabela:
  - Centraliza o mapa na empresa e destaca o pin
- Ao clicar em um pin:
  - Destaca a linha correspondente na tabela

### 5.3 Filtros aplicados no mapa
- O mapa deve refletir **os mesmos filtros** da lista
- Alterar filtros atualiza pins sem recarregar a página inteira

---

## 6) Tela de Detalhes da Empresa
**Campos**
- Dados principais (nome, categoria, endereço completo)
- Contato (telefone, site)
- Links rápidos (abrir no Google / copiar endereço)
- Observações internas (nota do operador)
- Tags e status
- Data de captura
- Origem da busca (termo + localização)

---

## 7) Exportação para Excel
### 7.1 Modos de export
- Exportar **selecionados**
- Exportar **resultado filtrado**
- Exportar **lista salva**

### 7.2 Campos no Excel
- place_id (ou id interno)
- nome
- categoria
- endereco
- cidade
- estado
- telefone
- website
- rating
- total_reviews
- latitude
- longitude
- status
- tags
- termo_busca
- localizacao_busca
- data_captura

### 7.3 Regras
- Exportar respeitando filtros e seleção
- Nome do arquivo: `prospeccao_termo_local_data.xlsx`
- Sempre incluir `place_id` para deduplicação futura

---

## 8) Motor de Busca e Carregamento (Funcional)
### 8.1 Como a busca funciona (conceito)
- Usuário envia: **termo + localização**
- Sistema cria uma “Busca”
- Sistema coleta empresas em lotes (paginação):
  - Carrega inicial rápido (ex.: 20–50)
  - Carregamento incremental (“carregar mais” / infinite scroll)

### 8.2 Escalabilidade de lista “imensa”
- Paginação real (não carregar tudo de uma vez)
- Cache por busca (para reabrir sem refazer tudo)
- Atualização incremental:
  - “Continuar coletando resultados” em background (opcional)
  - Indicador: “X encontrados / coletando mais…”

### 8.3 Deduplicação e consistência
- Chave única: `place_id`
- Se uma empresa aparecer em múltiplas buscas:
  - Reutilizar registro da empresa
  - Criar vínculo “empresa ↔ busca” (para rastreio)

---

## 9) Estrutura de Dados (Modelo)
### 9.1 Tabela: buscas
- id
- user_id
- termo
- localizacao
- status (criando | coletando | concluida | erro)
- total_encontrados
- created_at
- finished_at

### 9.2 Tabela: empresas
- id
- place_id (único)
- nome
- categoria
- endereco
- cidade
- estado
- telefone
- website
- rating
- total_reviews
- lat
- lng
- created_at
- updated_at

### 9.3 Tabela: busca_empresas (relacionamento)
- id
- busca_id
- empresa_id
- posição (rank/relevância)
- created_at

### 9.4 Tabela: lead_status (por usuário)
- id
- user_id
- empresa_id
- status
- tags (array)
- notes
- updated_at

---

## 10) Regras e Limites (Governança)
- Limite por busca (ex.: máximo de X resultados coletados)
- Limite diário por usuário (quota/créditos)
- Bloqueio de repetição excessiva (anti-spam)
- Logs de erros e tentativas

---

## 11) UI/Estados e Mensagens
- “Digite um termo e uma localização para começar.”
- “Coletando resultados… você já pode filtrar e selecionar.”
- “Nenhuma empresa encontrada para esta combinação.”
- “Limite diário atingido. Tente novamente amanhã ou aumente seu plano.”
- “Erro ao coletar resultados. Tente novamente.”

---

## 12) Funcionalidades Extras (Opcional)
- Enriquecimento de dados (email/Instagram quando disponível)
- Pipeline simples (Kanban de status)
- Integração com CRM (export direto / webhook)
- Listas compartilháveis (time)
- Templates de mensagem (WhatsApp/email) por segmento

---

## 13) Critérios de Aceite (MVP)
- Usuário pesquisa “termo + localização” e recebe lista com **muitos resultados**
- Usuário alterna entre **Lista** e **Mapa** com sincronização
- Filtros e ordenação funcionam
- Seleção em massa funciona
- Exportação para Excel funciona em todos os modos (selecionados/filtrados/lista salva)
- Deduplicação por `place_id` evita repetidos
- Sistema mantém histórico de buscas e permite reabrir

---