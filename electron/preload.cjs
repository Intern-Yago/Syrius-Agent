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
  publishPost: (postId) => ipcRenderer.invoke("posts:publish", postId),

  // Cronograma Editorial
  getSchedule: () => ipcRenderer.invoke("schedule:get"),
  saveScheduleSlot: (slot) => ipcRenderer.invoke("schedule:save-slot", slot),
  saveScheduleAll: (slots) => ipcRenderer.invoke("schedule:save-all", slots),
  deleteScheduleSlot: (slotId) => ipcRenderer.invoke("schedule:delete-slot", slotId),
  generateScheduleAI: () => ipcRenderer.invoke("schedule:generate-ai"),
  getAutoplay: () => ipcRenderer.invoke("schedule:get-autoplay"),
  setAutoplay: (active) => ipcRenderer.invoke("schedule:set-autoplay", active),
  addTopicToSchedule: (payload) => ipcRenderer.invoke("schedule:add-topic", payload),

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

  // Analytics & Inteligência com IA
  getAnalyticsHistory: () => ipcRenderer.invoke("analytics:list"),
  runAnalyticsAudit: (options) => ipcRenderer.invoke("analytics:run", options),
  getAnalyticsRunning: () => ipcRenderer.invoke("analytics:is-running"),
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
});
