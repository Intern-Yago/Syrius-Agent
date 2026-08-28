const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("app:ping"),
  runAgent: (fromStage, slot) => ipcRenderer.invoke("agent:run", fromStage, slot),
  stopAgent: () => ipcRenderer.invoke("agent:stop"),
  onAgentLog: (callback) => {
    const listener = (_event, log) => callback(log);
    ipcRenderer.on("agent:log", listener);
    return () => ipcRenderer.removeListener("agent:log", listener);
  },
  getPosts: () => ipcRenderer.invoke("posts:list"),
  updatePost: (postId, data) => ipcRenderer.invoke("posts:update", postId, data),
  deletePost: (postId) => ipcRenderer.invoke("posts:delete", postId),
  openImage: (imagePath) => ipcRenderer.invoke("posts:open-image", imagePath),
  downloadImage: (payload) => ipcRenderer.invoke("posts:download-image", payload),
  downloadAllPostImages: (postId) => ipcRenderer.invoke("posts:download-all", postId),
  regenerateImage: (payload) => ipcRenderer.invoke("posts:regenerate-image", payload),
  regenerateVideo: (payload) => ipcRenderer.invoke("posts:regenerate-video", payload),
  updateSlideText: (payload) => ipcRenderer.invoke("posts:update-slide-text", payload),
  setPostStatus: (postId, status) => ipcRenderer.invoke("posts:set-status", postId, status),
  publishPost: (postId, options) => ipcRenderer.invoke("posts:publish", postId, options),
  getActivePublishings: () => ipcRenderer.invoke("posts:get-active-publishings"),
  onPublishProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("posts:publish-progress", listener);
    return () => ipcRenderer.removeListener("posts:publish-progress", listener);
  },
  getActiveRegenerations: () => ipcRenderer.invoke("posts:get-active-regenerations"),
  onRegenerateProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("posts:regenerate-progress", listener);
    return () => ipcRenderer.removeListener("posts:regenerate-progress", listener);
  },

  // Cronograma Editorial
  getSchedule: (weekOffset) => ipcRenderer.invoke("schedule:get", weekOffset),
  saveScheduleSlot: (slot, weekOffset) => ipcRenderer.invoke("schedule:save-slot", slot, weekOffset),
  saveScheduleAll: (slots, weekOffset) => ipcRenderer.invoke("schedule:save-all", slots, weekOffset),
  deleteScheduleSlot: (slotId, weekOffset) => ipcRenderer.invoke("schedule:delete-slot", slotId, weekOffset),
  generateScheduleAI: (payload) => ipcRenderer.invoke("schedule:generate-ai", payload),
  advanceWeek: () => ipcRenderer.invoke("schedule:advance-week"),
  moveSlotWeek: (slotId, targetWeekOffset) => ipcRenderer.invoke("schedule:move-slot-week", slotId, targetWeekOffset),
  getAutoplay: () => ipcRenderer.invoke("schedule:get-autoplay"),
  setAutoplay: (active) => ipcRenderer.invoke("schedule:set-autoplay", active),
  addTopicToSchedule: (payload) => ipcRenderer.invoke("schedule:add-topic", payload),
  getPendingRecommendations: () => ipcRenderer.invoke("schedule:get-pending-recommendations"),
  clearPendingRecommendations: () => ipcRenderer.invoke("schedule:clear-pending-recommendations"),
  onScheduleUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("schedule:update", listener);
    return () => ipcRenderer.removeListener("schedule:update", listener);
  },

  // Configurações, Perfil Dinâmico e E-mail
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getProfile: () => ipcRenderer.invoke("profile:get"),
  generateBio: (payload) => ipcRenderer.invoke("profile:generate-bio", payload),
  generateHighlights: (payload) => ipcRenderer.invoke("profile:generate-highlights", payload),
  sendTestEmail: (targetEmail) => ipcRenderer.invoke("settings:send-test-email", targetEmail),

  // RAG Vetorial & Memória de Aprendizado
  getLearningInsights: () => ipcRenderer.invoke("rag:get-insights"),
  searchLearningInsights: (query, limit) => ipcRenderer.invoke("rag:search-insights", query, limit),
  updateLearningInsight: (payload) => ipcRenderer.invoke("rag:update-insight-status", payload),
  deleteLearningInsight: (id) => ipcRenderer.invoke("rag:delete-insight", id),
  devalidateAllInsights: () => ipcRenderer.invoke("rag:devalidate-all"),

  // Analytics & Inteligência com IA
  getAnalyticsHistory: () => ipcRenderer.invoke("analytics:list"),
  runAnalyticsAudit: (options) => ipcRenderer.invoke("analytics:run", options),
  getAnalyticsRunning: () => ipcRenderer.invoke("analytics:is-running"),
  exportAnalyticsReport: (format, report) => ipcRenderer.invoke("analytics:export-report", { format, report }),
  onAnalyticsStatusChange: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("analytics:status-change", listener);
    return () => ipcRenderer.removeListener("analytics:status-change", listener);
  },

  // Central de Interações & Respostas com IA
  getInteractions: () => ipcRenderer.invoke("interactions:list"),
  generateInteractionReply: (interactionId) => ipcRenderer.invoke("interactions:generate-reply", interactionId),
  sendInteractionReply: (payload) => ipcRenderer.invoke("interactions:send-reply", payload),
  convertInteractionToPost: (payload) => ipcRenderer.invoke("interactions:convert-to-post", payload),
  addManualInteraction: (payload) => ipcRenderer.invoke("interactions:add-manual", payload),
  getInteractionsAutoReply: () => ipcRenderer.invoke("interactions:get-autoreply"),
  setInteractionsAutoReply: (active) => ipcRenderer.invoke("interactions:set-autoreply", active),

  // Auto-Discovery de Testes Unitários
  getTests: () => ipcRenderer.invoke("tests:list"),
  runTest: (filename) => ipcRenderer.invoke("tests:run", filename),
  cancelTest: (filename) => ipcRenderer.invoke("tests:cancel", filename),
  getTestLogs: (filename) => ipcRenderer.invoke("tests:get-logs", filename),
  onTestLog: (callback) => {
    const listener = (_event, log) => callback(log);
    ipcRenderer.on("test:log", listener);
    return () => ipcRenderer.removeListener("test:log", listener);
  },
  onTestStatusChange: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("test:status-change", listener);
    return () => ipcRenderer.removeListener("test:status-change", listener);
  },

  // Alerta de Publicação no Horário Agendado
  onSchedulePublishAlert: (callback) => {
    const listener = (_event, alert) => callback(alert);
    ipcRenderer.on("schedule:publish-alert", listener);
    return () => ipcRenderer.removeListener("schedule:publish-alert", listener);
  },

  // Abertura de links externos seguros no navegador padrão
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),

  // Clonagem de Voz e Áudio & Hardware
  cloneVoiceElevenLabs: (payload) => ipcRenderer.invoke("voice:clone-elevenlabs", payload),
  saveLocalVoiceSample: (payload) => ipcRenderer.invoke("voice:save-sample-local", payload),
  getSavedVoiceSample: () => ipcRenderer.invoke("voice:get-saved-sample"),
  getHardwareInfo: () => ipcRenderer.invoke("system:get-hardware-info"),
  testVoiceTTS: (payload) => ipcRenderer.invoke("voice:test-tts", payload),
  cancelVoiceTTS: () => ipcRenderer.invoke("voice:cancel-tts"),
  getLastSynthesizedAudio: () => ipcRenderer.invoke("voice:get-last-synthesis"),
  getTrainedModelStatus: () => ipcRenderer.invoke("voice:get-trained-model-status"),
  trainVoiceModel: (payload) => ipcRenderer.invoke("voice:train-model", payload),
  onVoiceTrainProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("voice:train-progress", handler);
    return () => ipcRenderer.removeListener("voice:train-progress", handler);
  },
  listElevenLabsVoices: (apiKey) => ipcRenderer.invoke("voice:list-elevenlabs-voices", apiKey),
  getTrendingTopics: () => ipcRenderer.invoke("trending:get-all"),
  refreshTrendingTopics: () => ipcRenderer.invoke("trending:refresh"),
  ignoreTrendingTopic: (topicId) => ipcRenderer.invoke("trending:ignore", topicId),
  inspectGitHubRepo: (urlOrSlug) => ipcRenderer.invoke("github:inspect-repo", urlOrSlug),
  deleteExperiment: (id) => ipcRenderer.invoke("experiments:delete", id),

  // Controle de Janela Customizada (Frameless)
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event, isMax) => callback(isMax);
    ipcRenderer.on("window:maximized-change", listener);
    return () => ipcRenderer.removeListener("window:maximized-change", listener);
  },

  // Notificações Nativas do Sistema Operacional (Windows / Tray)
  sendNativeNotification: (payload) => ipcRenderer.invoke("notification:send", payload),

  // Sala de Reunião com o Gestor Editorial
  agencyGetHistory: () => ipcRenderer.invoke("agency:get-history"),
  agencyIsProcessing: () => ipcRenderer.invoke("agency:is-processing"),
  agencySendMessage: (payload) => ipcRenderer.invoke("agency:send-message", payload),
  agencyTranscribeAudio: (payload) => ipcRenderer.invoke("agency:transcribe-audio", payload),
  agencyClearHistory: () => ipcRenderer.invoke("agency:clear-history"),
  agencyPreviewVoice: (payload) => ipcRenderer.invoke("agency:preview-voice", payload),
  onAgencyStatusChange: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("agency:status-change", listener);
    return () => ipcRenderer.removeListener("agency:status-change", listener);
  },

  // Gestor de Tráfego Pago & Propaganda (Ads Manager)
  getAdsBudgetSummary: () => ipcRenderer.invoke("ads:get-budget-summary"),
  updateAdsBudgetConfig: (data) => ipcRenderer.invoke("ads:update-budget-config", data),
  getAdsCampaigns: () => ipcRenderer.invoke("ads:list-campaigns"),
  saveAdsCampaign: (campaign) => ipcRenderer.invoke("ads:save-campaign", campaign),
  deleteAdsCampaign: (id) => ipcRenderer.invoke("ads:delete-campaign", id),
  updateAdsCampaignStatus: (payload) => ipcRenderer.invoke("ads:update-campaign-status", payload),
  analyzeAdsPostMortem: (data) => ipcRenderer.invoke("ads:analyze-postmortem", data),
  getAdsOpportunities: (forceRefresh) => ipcRenderer.invoke("ads:analyze-opportunities", forceRefresh),
  analyzePostForBoost: (postId) => ipcRenderer.invoke("ads:analyze-post-candidate", postId),
  generateAdsAudience: (payload) => ipcRenderer.invoke("ads:generate-audience", payload),
  calculateAdsProjection: (params) => ipcRenderer.invoke("ads:calculate-projection", params),
  chatAdsConsultant: (payload) => ipcRenderer.invoke("ads:chat-consultant", payload),
  getAdsAudiences: () => ipcRenderer.invoke("ads:list-audiences"),
  saveAdsAudience: (preset) => ipcRenderer.invoke("ads:save-audience", preset),
  deleteAdsAudience: (id) => ipcRenderer.invoke("ads:delete-audience", id),
  syncAdsInstagramInsights: (postId) => ipcRenderer.invoke("ads:sync-instagram-insights", postId),
  dispatchAutonomousBoost: (params) => ipcRenderer.invoke("ads:dispatch-autonomous-boost", params),
  scheduleAutonomousBoost: (params) => ipcRenderer.invoke("ads:schedule-autonomous-boost", params),
  purgeAdsOrphanedCampaigns: () => ipcRenderer.invoke("ads:purge-orphaned-campaigns"),
  onAdsBoostProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("ads:boost-progress", handler);
    return () => ipcRenderer.removeListener("ads:boost-progress", handler);
  },
});
