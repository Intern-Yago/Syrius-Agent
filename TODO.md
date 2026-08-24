# 📋 TODO & Planejamento Estratégico — Syrius Agent

> Documento de planejamento, backlog técnico e roadmap de evolução do ecossistema **Syrius Agent**.

---

## 📱 1. Syrius Mobile App (React Native / Expo)

Planejamento da versão mobile para ideação ágil, acompanhamento de cronograma e aprovação com 1 toque no celular.

### 🏛️ Arquitetura & Backend
- [ ] **API Gateway REST / WebSockets (Fastify / Node.js)**:
  - Exposição modular das rotas do pipeline, cronograma, analytics e chat da Gestora já implementadas no core.
  - Autenticação segura via JWT / API Keys com suporte a multi-dispositivos (Desktop + Mobile simultâneos).
  - WebSockets para sincronização em tempo real de status de geração, publicações e novas mensagens.
- [ ] **Frontend Mobile (Expo / React Native + NativeWind / Tailwind)**:
  - Compartilhamento dos tipos TypeScript (`types/index.ts`) e contratos do banco relacional PostgreSQL.
  - Design System Dark Minimalist Tech consistente com o aplicativo Desktop.

---

### 📅 Visão de Cronograma Completo no Mobile
- [ ] **Timeline Editorial Vertical (Segunda a Domingo)**:
  - Cards de slots organizados por horário com pilares técnicos, badges de formato (Carrossel, Reels, Stories) e status.
  - Seletor de Semanas no topo (*Semana Atual* vs *Próxima Semana*).
  - Indicadores visuais de post pronto, em produção ou planejado.
- [ ] **Ações Rápidas nos Slots**:
  - Toque no slot para inspecionar carrosséis (swipe), assistir a vídeos Reels ou ler legendas completas.
  - Botão "Produzir com IA" para disparar geração de slots planejados diretamente pelo celular.
  - Edição rápida de temas, horários e dias da semana.
- [ ] **Controle do Modo Autônomo (Autoplay)**:
  - Chave liga/desliga de Autoplay persistente no topo do cronograma móvel.

---

### 🎙️ Sala de Reunião com a Gestora no Bolso
- [ ] **Ideação por Áudio Estilo WhatsApp**:
  - Gravação de áudio com microfone nativo do celular, botão de cancelamento (lixeira), pausa e envio direto.
  - Respostas faladas por voz neural feminina (`pt-BR-FranciscaNeural`) reproduzidas pelo alto-falante.
  - Abstração total de formato: envio da ideia técnica por voz e a Gestora estrutura o formato, pilar e horário nos bastidores.
  - Suporte a substituição de pautas em tempo real (*"mudei de ideia, prefiro a opção 2"*).

---

### 🔔 Notificações Push & Aprovações em 1 Toque
- [ ] **Push de Quality Control (QC $\ge 8.5$)**:
  - Notificação push instantânea quando o pipeline finalizar a geração de um post com score aprovado.
  - Ação rápida na notificação: `[Aprovar para Publicação]` ou `[Abrir no App para Ajustes]`.
- [ ] **Alertas de Colisão e Oportunidades do Radar**:
  - Notificação de breaking news ou repositório em alta para inclusão na grade da semana.

---

### 📸 Câmera de Stories & Moderação de Interações
- [ ] **Captura de Foto $\rightarrow$ Stories Técnico com IA**:
  - Tirar foto do setup, terminal ou conferência pelo celular e a IA aplicar automaticamente tipografia glassmorphism, enquete/quiz e despachar para o Instagram Stories.
- [ ] **Central de DMs e Comentários Mobile**:
  - Notificações de comentários e geração de respostas no tom de voz do criador com 1 toque.

---

## 🎭 2. Avatar Neural & Vídeos com Rosto do Criador (HeyGen / LivePortrait)

- [ ] **Sincronização Labial Neural (*Lipsync*)**:
  - Integração com **HeyGen API / Replicate Serverless** para gerar vídeos verticais com a face real do criador falando o roteiro técnico.
- [ ] **Layout Dinâmico Picture-in-Picture**:
  - **0 a 4s (Gancho)**: Rosto em destaque com título provocativo para alta retenção no scroll.
  - **4 a 30s (Prática)**: Rosto em moldura flutuante circular no canto superior/inferior, enquanto o centro da tela exibe digitação de código no VS Code, terminal ou diagrama.
  - **30 a 40s (Fechamento)**: Rosto no centro com síntese de aprendizado e chamada para ação (CTA).
- [ ] **Suporte Opcional a LivePortrait Local**:
  - Execução local com aceleração GPU NVIDIA para geração sem custos de API em computadores com RTX.

---

## 🌐 3. Expansão Multi-Plataforma (Fase 2)

- [ ] **LinkedIn Tech Articles & PDF Carousels**:
  - Adaptação automática de carrosséis para o formato PDF de alta resolução do LinkedIn.
  - Legendas em formato de artigo de engenharia de software com tom corporativo/sênior.
- [ ] **Threads & X (Twitter) Threads**:
  - Decomposição automática dos slides de carrossel em fios de posts (threads) com imagens e diagramas anexados.
- [ ] **YouTube Shorts**:
  - Exportação e upload automático dos vídeos Reels 9:16 para o YouTube Shorts via YouTube Data API v3.

---

## 🧠 4. Analytics Preditivo & Inteligência de Audiência

- [ ] **Simulador Preditivo de Engajamento**:
  - Algoritmo de machine learning que prevê a probabilidade de salvamento e compartilhamento de um post antes da publicação com base no histórico do PostgreSQL.
- [ ] **Heatmap de Melhores Horários Dinâmicos**:
  - Leitura contínua dos insights de audiência ativa por hora na Meta API para sugerir os slots mais quentes da semana.
