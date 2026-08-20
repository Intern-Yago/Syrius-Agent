export {};

declare global {
  interface AgentLog {
    type: "info" | "success" | "warning" | "error";
    message: string;
    timestamp?: string;
    stageId?: string;
  }

  interface AgentRunResult {
    success: boolean;
    message?: string;
    postId?: string;
    topic?: string;
    score?: number;
  }

  interface PostSlide {
    id: string;
    number: number;
    title: string;
    text: string;
    visualDirection: string;
    imagePath?: string | null;
  }

  interface Post {
    id: string;
    topic: string;
    format: string;
    caption: string | null;
    hashtags: string[];
    status: string;
    createdAt: string;
    slides: PostSlide[];
  }

  interface UpdatePostData {
    topic: string;
    caption: string;
    hashtags: string[];
  }

  interface OpenImageResult {
    success: boolean;
    message?: string;
  }

  interface TestModuleInfo {
    id: string;
    filename: string;
    title: string;
    description: string;
    category: string;
  }

  interface TestRunResult {
    success: boolean;
    message?: string;
    duration?: string;
  }

  interface ElectronAPI {
    ping: () => Promise<{
      success: boolean;
      message: string;
    }>;

    runAgent: (fromStage?: string, slot?: any) => Promise<AgentRunResult>;
    stopAgent: () => Promise<{ success: boolean; message?: string }>;

    onAgentLog: (
      callback: (log: AgentLog) => void
    ) => () => void;

    getPosts: () => Promise<Post[]>;

    updatePost: (
      postId: string,
      data: UpdatePostData
    ) => Promise<Post>;

    deletePost: (
      postId: string
    ) => Promise<{
      success: boolean;
    }>;

    openImage: (
      imagePath: string
    ) => Promise<OpenImageResult>;

    publishPost: (
      postId: string,
      options?: { deletePrevious?: boolean }
    ) => Promise<{
      success: boolean;
      publishedMediaId?: string;
      error?: string;
      permalink?: string;
    }>;

    getActivePublishings: () => Promise<
      Array<{
        postId: string;
        topic: string;
        format: string;
        status: "running" | "completed" | "error";
        message: string;
        progress: number;
        startedAt: number;
        error?: string;
        publishedMediaId?: string;
      }>
    >;

    onPublishProgress: (
      callback: (data: {
        postId: string;
        topic?: string;
        format?: string;
        status: "running" | "completed" | "error";
        message: string;
        progress: number;
        error?: string;
        publishedMediaId?: string;
      }) => void
    ) => () => void;

    downloadImage: (payload: { imageUrl: string; defaultFilename?: string }) => Promise<{
      success: boolean;
      path?: string;
      error?: string;
    }>;

    downloadAllPostImages: (postId: string) => Promise<{
      success: boolean;
      path?: string;
      count?: number;
      error?: string;
    }>;

    updateSlideText: (payload: {
      postId: string;
      slideNumber: number;
      title: string;
      text?: string;
    }) => Promise<{
      success: boolean;
      imagePath?: string;
      error?: string;
    }>;

    getSchedule: (weekOffset?: number) => Promise<ScheduleSlot[]>;
    saveScheduleSlot: (slot: any, weekOffset?: number) => Promise<ScheduleSlot[]>;
    saveScheduleAll: (slots: any[], weekOffset?: number) => Promise<ScheduleSlot[]>;
    deleteScheduleSlot: (slotId: string, weekOffset?: number) => Promise<ScheduleSlot[]>;
    generateScheduleAI: (payload?: { weekOffset?: number }) => Promise<{
      slots: ScheduleSlot[];
      aiSuggestion?: {
        detectedManualSlots: string[];
        critiqueAndOptimization: string;
        suggestedAdjustedSlots: ScheduleSlot[];
      } | null;
    }>;
    advanceWeek: () => Promise<{ success: boolean; slots: ScheduleSlot[] }>;
    getAutoplay: () => Promise<boolean>;
    setAutoplay: (active: boolean) => Promise<boolean>;
    addTopicToSchedule: (payload: { topic: string; suggestedFormat?: string; suggestedDay?: string; suggestedTime?: string; reason?: string; baseCopyPrompt?: string; baseVisualPrompt?: string; objective?: string }) => Promise<{ success: boolean; schedule: ScheduleSlot[]; slotId?: string; isNextWeek?: boolean; message?: string }>;
    getPendingRecommendations: () => Promise<any[]>;
    clearPendingRecommendations: () => Promise<{ success: boolean }>;

    getSettings: () => Promise<AppSettings>;
    saveSettings: (settings: any) => Promise<any>;
    getProfile: () => Promise<{ success: boolean; profile?: any; error?: string }>;
    generateBio: (payload: { niche: string; positioning: string; accountName: string }) => Promise<{ success: boolean; bios?: string[]; error?: string }>;
    generateHighlights: (payload: { niche: string; positioning: string; accountName: string }) => Promise<{ success: boolean; highlights?: any[]; error?: string }>;
    sendTestEmail: (targetEmail?: string) => Promise<{ success: boolean; message: string }>;

    // RAG Vetorial & Memória de Aprendizado
    getLearningInsights: () => Promise<any[]>;
    searchLearningInsights: (query: string, limit?: number) => Promise<{ activeInsights: any[]; refutedInsights: any[] }>;
    updateLearningInsight: (payload: { id: string; status: "HYPOTHESIS" | "VALIDATED" | "REFUTED"; confidenceScore?: number; correctionReasoning?: string }) => Promise<{ success: boolean; error?: string }>;
    deleteLearningInsight: (id: string) => Promise<{ success: boolean; error?: string }>;
    devalidateAllInsights: () => Promise<{ success: boolean; count?: number; error?: string }>;

    getAnalyticsHistory: () => Promise<any[]>;
    runAnalyticsAudit: (options: { days?: number; startDate?: string; endDate?: string }) => Promise<{ success: boolean; report?: any; error?: string }>;
    getAnalyticsRunning: () => Promise<boolean>;
    exportAnalyticsReport: (format: "markdown" | "json", report: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    onAnalyticsStatusChange: (
      callback: (data: { running: boolean; report?: any; error?: string }) => void
    ) => () => void;

    // Central de Interações & Respostas com IA
    getInteractions: () => Promise<CommunityInteraction[]>;
    generateInteractionReply: (interactionId: string) => Promise<{ success: boolean; reply?: string; error?: string }>;
    sendInteractionReply: (payload: { interactionId: string; replyText: string }) => Promise<{ success: boolean; error?: string }>;
    convertInteractionToPost: (payload: { interactionId: string; preferredFormat?: string }) => Promise<{ success: boolean; createdSlot?: any; error?: string }>;
    addManualInteraction: (payload: {
      authorHandle: string;
      authorName?: string;
      content: string;
      sourcePostTopic?: string;
      sourcePostFormat?: string;
      sourcePostUrl?: string;
      type?: "COMMENT" | "QUESTION_STICKER" | "DIRECT_MESSAGE";
    }) => Promise<{ success: boolean; interaction?: CommunityInteraction; error?: string }>;
    getInteractionsAutoReply: () => Promise<boolean>;
    setInteractionsAutoReply: (active: boolean) => Promise<boolean>;

    getTests: () => Promise<TestModuleInfo[]>;
    runTest: (filename: string) => Promise<TestRunResult>;
    cancelTest: (filename: string) => Promise<boolean>;
    getTestLogs: (filename: string) => Promise<Array<{ type: "info" | "success" | "warning" | "error"; message: string; timestamp: string }>>;

    onTestLog: (
      callback: (log: { filename: string; type: "info" | "success" | "warning" | "error"; message: string; timestamp?: string }) => void
    ) => () => void;

    onTestStatusChange: (
      callback: (data: { filename: string; status: "running" | "success" | "error"; duration?: string; runningCount?: number }) => void
    ) => () => void;

    onSchedulePublishAlert: (
      callback: (alert: { slot: any; dayOfWeek: string; timeSlot: string; topic: string; postId?: string }) => void
    ) => () => void;

    // Clonagem de Voz e Áudio
    cloneVoiceElevenLabs: (payload: { apiKey: string; voiceName: string; audioBase64: string; mimeType?: string }) => Promise<{ success: boolean; voiceId?: string; error?: string }>;
    saveLocalVoiceSample: (payload: { audioBase64: string; mimeType?: string }) => Promise<{ success: boolean; samplePath?: string; error?: string }>;
    getSavedVoiceSample: () => Promise<{ exists: boolean; audioBase64?: string; samplePath?: string; modifiedAt?: string; sizeKb?: number }>;
    getHardwareInfo: () => Promise<{
      gpu_available: boolean;
      gpu_name: string;
      gpu_vram_total_mb: number;
      gpu_vram_free_mb: number;
      gpu_utilization_percent: number;
      cuda_torch_available: boolean;
      cuda_version?: string;
      cpu_name: string;
      cpu_cores: number;
      ram_total_gb: number;
      ram_free_gb: number;
      ram_usage_percent: number;
      recommended_device: string;
      warning?: string;
    }>;
    testVoiceTTS: (payload: { apiKey?: string; voiceId?: string; text: string; provider?: string }) => Promise<{ success: boolean; audioBase64?: string; error?: string }>;
    cancelVoiceTTS: () => Promise<{ success: boolean; message?: string }>;
    getLastSynthesizedAudio: () => Promise<{ exists: boolean; audioBase64?: string; filename?: string }>;
    getTrainedModelStatus: () => Promise<{ trained: boolean; modelPath?: string; sizeMb?: number; trainedAt?: string; epochs?: number; finalLoss?: number; totalSeconds?: number }>;
    trainVoiceModel: (payload?: { epochs?: number; samplePath?: string }) => Promise<{ success: boolean; error?: string; modelPath?: string }>;
    onVoiceTrainProgress: (callback: (data: { progress: number; stage: string }) => void) => () => void;
    listElevenLabsVoices: (apiKey: string) => Promise<{ success: boolean; voices?: Array<{ voice_id: string; name: string }>; error?: string }>;
    advanceWeek: () => Promise<any>;
    getTrendingTopics: () => Promise<any[]>;
    refreshTrendingTopics: () => Promise<{ success: boolean; topics?: any[]; error?: string }>;
    ignoreTrendingTopic: (topicId: string) => Promise<{ success: boolean; error?: string }>;
    markTrendingAsGenerated: (topicId: string, postId: string) => Promise<{ success: boolean; error?: string }>;
    inspectGitHubRepo: (urlOrSlug: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getExperiments: () => Promise<{ success: boolean; experiments?: any[]; error?: string }>;
    generateExperimentVariants: (payload: { topic: string; format?: string; targetVariable?: "HOOK" | "VISUAL_DESIGN" | "CTA_SAVES" | "BODY_DENSITY" }) => Promise<{ success: boolean; data?: any; error?: string }>;
    saveExperiment: (payload: any) => Promise<{ success: boolean; experiment?: any; error?: string }>;
    updateExperimentStatus: (payload: { id: string; status: string }) => Promise<{ success: boolean; experiment?: any; error?: string }>;
    deleteExperiment: (id: string) => Promise<{ success: boolean; error?: string }>;

    // Controle de Janela Customizada (Frameless)
    minimizeWindow: () => Promise<boolean>;
    maximizeWindow: () => Promise<boolean>;
    closeWindow: () => Promise<boolean>;
    isWindowMaximized: () => Promise<boolean>;
    onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;

    // Notificações Nativas do SO
    sendNativeNotification: (payload: { title: string; body: string }) => Promise<{ success: boolean }>;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}