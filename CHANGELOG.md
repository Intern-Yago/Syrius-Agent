# 📋 Changelog — Syrius Agent

Todas as alterações notáveis, melhorias de arquitetura, correções de bugs e novas funcionalidades do **Syrius Agent** estão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
