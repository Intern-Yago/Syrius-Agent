import {
  contextBridge,
  ipcRenderer,
} from "electron";

/**
 * ==========================================
 * TIPOS
 * ==========================================
 */

type AgentLogType =
  | "info"
  | "success"
  | "warning"
  | "error";

interface AgentLog {
  type: AgentLogType;
  message: string;
}

interface AgentRunResult {
  success: boolean;
  message?: string;
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

/**
 * ==========================================
 * API EXPOSTA PARA O REACT
 * ==========================================
 */

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    /**
     * Teste IPC.
     */

    ping: () =>
      ipcRenderer.invoke(
        "app:ping"
      ),

    /**
     * Executa o agente.
     *
     * Sem parâmetro:
     * executa pipeline completo.
     *
     * Com parâmetro:
     * continua a partir da etapa.
     */

    runAgent:
      (
        fromStage?: string
      ): Promise<AgentRunResult> =>
        ipcRenderer.invoke(
          "agent:run",
          fromStage
        ),

    /**
     * Escuta logs do agente.
     */

    onAgentLog: (
      callback: (
        log: AgentLog
      ) => void
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        log: AgentLog
      ) => {
        callback(log);
      };

      ipcRenderer.on(
        "agent:log",
        listener
      );

      return () => {
        ipcRenderer.removeListener(
          "agent:log",
          listener
        );
      };
    },

    /**
     * Busca posts no banco.
     */

    getPosts:
      (): Promise<Post[]> =>
        ipcRenderer.invoke(
          "posts:list"
        ),

    /**
     * Atualiza post.
     */

    updatePost:
      (
        postId: string,
        data: UpdatePostData
      ): Promise<Post> =>
        ipcRenderer.invoke(
          "posts:update",
          postId,
          data
        ),

    /**
     * Apaga post.
     */

    deletePost:
      (
        postId: string
      ): Promise<{
        success: boolean;
      }> =>
        ipcRenderer.invoke(
          "posts:delete",
          postId
        ),

    /**
     * Abre imagem local.
     */

    openImage:
      (
        imagePath: string
      ): Promise<{
        success: boolean;
        message?: string;
      }> =>
        ipcRenderer.invoke(
          "posts:open-image",
          imagePath
        ),
  }
);