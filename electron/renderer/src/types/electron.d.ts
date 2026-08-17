export {};

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<{
        success: boolean;
        message: string;
      }>;

      runAgent: () => Promise<{
        success: boolean;
        message: string;
      }>;
    };
  }
}
