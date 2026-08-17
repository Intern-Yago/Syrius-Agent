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
      postId: string
    ) => Promise<{
      success: boolean;
      publishedMediaId?: string;
      error?: string;
    }>;

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

    getSchedule: () => Promise<ScheduleSlot[]>;
    saveScheduleSlot: (slot: any) => Promise<ScheduleSlot[]>;
    saveScheduleAll: (slots: any[]) => Promise<ScheduleSlot[]>;
    deleteScheduleSlot: (slotId: string) => Promise<ScheduleSlot[]>;
    generateScheduleAI: () => Promise<{
      slots: ScheduleSlot[];
      aiSuggestion?: {
        detectedManualSlots: string[];
        critiqueAndOptimization: string;
        suggestedAdjustedSlots: ScheduleSlot[];
      } | null;
    }>;
    getAutoplay: () => Promise<boolean>;
    setAutoplay: (active: boolean) => Promise<boolean>;
    addTopicToSchedule: (payload: { topic: string; suggestedFormat?: string; suggestedDay?: string; reason?: string }) => Promise<{ success: boolean; schedule: ScheduleSlot[]; slotId: string }>;

    getSettings: () => Promise<AppSettings>;
    saveSettings: (settings: any) => Promise<any>;
    getProfile: () => Promise<{ success: boolean; profile?: any; error?: string }>;
    generateBio: (payload: { niche: string; positioning: string; accountName: string }) => Promise<{ success: boolean; bios?: string[]; error?: string }>;
    generateHighlights: (payload: { niche: string; positioning: string; accountName: string }) => Promise<{ success: boolean; highlights?: any[]; error?: string }>;
    sendTestEmail: (targetEmail?: string) => Promise<{ success: boolean; message: string }>;

    // RAG Vetorial & Memória de Aprendizado
    getLearningInsights: () => Promise<any[]>;
    searchLearningInsights: (query: string, limit?: number) => Promise<{ activeInsights: any[]; refutedInsights: any[] }>;

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
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}