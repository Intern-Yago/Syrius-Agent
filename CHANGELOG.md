# 📋 Changelog — Syrius Agent

Todas as alterações notáveis, melhorias de arquitetura, correções de bugs e novas funcionalidades do **Syrius Agent** estão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.3.0] — 2026-08-24

### 🚀 Novas Funcionalidades & Melhorias de Arquitetura

- **Radar de Tendências Multi-Abas com Scraping Concorrente de 5 Fontes & Garantia de Cotas**:
  - Nova sub-navbar categorizada com 4 abas dinâmicas:
    - **Destaques & Top Recomendações**: Composição ponderada dos melhores temas gerais, repositórios e breaking news.
    - **Temas Gerais & Arquitetura**: 10 pautas técnicas divididas em 6 pilares de engenharia de software.
    - **Repositórios GitHub (Trending)**: 5 repositórios em alta com dissecação de arquitetura via Repo-to-Post em 1 clique.
    - **Notícias & Lançamentos Tech**: 5 a 10 manchetes e releases das últimas 24h a 7 dias.
  - **Compilador Concorrente de Notícias**: Coleta simultânea via `Promise.allSettled` de 5 fontes nacionais e globais (Hacker News API, Dev.to RSS, InfoQ Architecture, TecMundo Tech e Google News).
  - **Algoritmo de Auto-Preenchimento e Fallback de Scraping**: Garante 100% o cumprimento das cotas exatas de repositórios e notícias, mesmo em caso de corte ou oscilação de tokens do modelo de IA.
  - **Sincronização Reativa em Tempo Real**: Monitoramento global via `ActivitiesContext` e polling que atualiza a tela automaticamente assim que a varredura é concluída sem necessidade de recarregar a página.
  - **Direcionamento Obrigatório de Repositórios**: Injeção obrigatória do link `github.com/owner/repo` na legenda do Instagram e do CTA direcionado no último slide e encerramento em áudio/vídeo.

- **Controles de Áudio Estilo WhatsApp na Sala de Reunião com a Gestora**:
  - Interface de gravação reformulada simulando o comportamento nativo de mensageiros:
    - **Lixeira Vermelha (`cancelRecording`)**: Descarte imediato e cancelamento do áudio sem envio de requisições à IA.
    - **Pausa & Retomada (`pauseRecording` / `resumeRecording`)**: Congelamento temporário do timer e do microfone com badge âmbar e retorno fluido.
    - **Ondas Sonoras & Timer Formatado**: Cronômetro de alta precisão (`mm:ss`), barras de equalizador animadas e transcrição ao vivo por voz.
    - **Disparo Direto (`stopRecordingAndSend`)**: Botão de envio para finalizar e despachar imediatamente para a Gestora analisar a pauta.

- **Persistência Total e Fixa da Publicação Automática (Autoplay)**:
  - Inicialização automática no daemon do Electron lendo o valor salvo em `settings.json` no boot da aplicação.
  - Persistência dupla no frontend via `localStorage` + PostgreSQL, mantendo o Autoplay permanentemente ativado entre fechamentos e aberturas do sistema.

- **Modal Customizado Dark Glass para Confirmação de Publicação**:
  - Remoção de todos os alerts e confirmações nativas do navegador (`window.confirm`).
  - Implementação de modal escuro com backdrop blur, validação de perfil `@handle` e ações explícitas antes de qualquer disparo para a Meta Graph API.

- **Navegação Bidirecional de Linhagem & Diff Visual na Memória RAG**:
  - Rastreabilidade relacional com campo `supersededById` conectando teses refutadas às suas novas diretrizes ativas.
  - Botões de navegação rápida ("Ver Nova Tese" e "Ver Origem Refutada") com modal side-by-side de evolução conceitual.
  - Filtros de status (Validadas, Hipóteses, Refutadas), busca instantânea, seletor de paginação compacta e sanitização visual completa com zero emojis.

---

## [2.2.0] — 2026-08-21

### 🚀 Novas Funcionalidades & Arquitetura

- **Substituição e Cancelamento Inteligente na Sala de Reunião (`REPLACED_PREVIOUS_PAUTA`)**:
  - A Gestora Editorial (Clara / Estelar) agora identifica automaticamente quando o criador muda de ideia (ex: *"mudei de ideia, quero a opção 2"* ou *"cancela e faz a 1"*).
  - O sistema apaga automaticamente o slot planejado anterior no PostgreSQL (`prisma.editorialScheduleSlot`), substituindo-o pela nova pauta sem criar slots fantasmas ou duplicados.
  - No chat, os badges de aprovação de mensagens anteriores são sanitizados para manter apenas o status ativo da pauta vigente.

- **Mapeamento em Tempo Real de Slots Livres & Anti-Concentração**:
  - A Gestora agora realiza uma varredura dinâmica na grade semanal antes de formular a resposta, identificando exatamente quais janelas estão vagas (Segunda 18:30, Terça 18:30, Quarta 19:00, Quinta 18:00, Sexta 17:30, Domingo 19:30).
  - Resolução de conflitos no backend que realoca automaticamente novas pautas para os próximos slots livres, impedindo empilhamento e sobreposição no mesmo dia e horário.

- **Leitura Local Persistida no Radar de Tendências (Zero Chamadas Silenciosas de IA)**:
  - O Radar de Tendências (`trending-service.ts`) foi refatorado para ler exclusivamente os registros existentes no banco de dados PostgreSQL ao abrir o aplicativo ou navegar na aba.
  - Foi eliminada a chamada silenciosa automática ao Gemini na inicialização, economizando tokens e cotas de API.
  - A renovação de tendências passa a ser acionada estritamente sob demanda (clique manual no botão do Radar) ou na rotina semanal do Piloto Noturno.
  - Intervalo de validade padrão estendido de 24h para 7 dias.

---

## [2.1.0] — 2026-08-15

### 🎙️ Sala de Reunião com a Gestora Editorial (Clara / Estelar)
- **Central Conversacional Multimodal**: Ideação em linguagem natural por digitação ou captação de áudio via microfone com transcrição automática por IA.
- **Locução Neural Feminina**: Respostas faladas com voz fluida via Edge TTS local (`pt-BR-FranciscaNeural`) com controle de pausa/reprodução.
- **Abstração Total de Mídia**: O criador conversa apenas sobre o conteúdo técnico, enquanto a Gestora decide formatos (Carrossel, Reels ou Solo), ganchos, ângulos narrativos e janelas de publicação nos bastidores.

### 🐙 Repo-to-Post Engine (Dissecador de Repositórios GitHub)
- Leitura automatizada de repositórios públicos do GitHub com extração de métricas (stars, forks, linguagem principal) e dissecação de arquitetura via `README.md`.
- Geração instantânea de 3 formatos (Carrossel 4:5, Roteiro de Reels com VS Code 9:16 e Post Solo 4:5).

### 🧪 Laboratório de Testes A/B (Content Experiments)
- Criação científica de variantes contrastantes (Técnica & Pragmática vs Provocativa & Quebra de Padrão).
- Persistência de hipóteses e resultados na tabela `ContentExperiment` e integração com a memória vetorial RAG.

---

## [2.0.0] — 2026-08-01

### ⚡ Pipeline de 7 Estágios & Produção de Vídeo Reels
- **Motor de Vídeo Reels**: Renderização vertical 1080x1920 com animação de digitação de código progressivo no VS Code, síntese neural ElevenLabs/Edge TTS e legendas automáticas via OpenAI Whisper.
- **Quality Control Impiedoso (QC $\ge 8.5$)**: Avaliação multicritério (precisão técnica, gancho, design, fluidez) antes da aprovação para o status `READY`.
- **Publicação na Meta Graph API v20.0**: Suporte oficial a Carrosséis (2 a 10 slides), Imagens Únicas, Stories de Foto e Reels de Vídeo com polling de containers.
- **Memória RAG com Auto-Correção (`text-embedding-004`)**: Vetorização densa (768 dimensões) de diretrizes validadas e refutação automática de hipóteses contrariadas por métricas reais.
- **Piloto Noturno Autônomo**: Execução programada aos domingos às 22:00 para renovação de pautas e otimização do cronograma semanal.
