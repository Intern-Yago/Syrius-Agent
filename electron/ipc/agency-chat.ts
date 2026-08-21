import { ipcMain } from "electron";
import {
  getAgencyChatHistory,
  saveAgencyChatHistory,
  clearAgencyChatHistory,
  processAgencyMessage,
  transcribeUserAudio,
  synthesizeClaraVoice,
  ChatMessage,
} from "../../src/services/agency-chat-service.js";
import { prisma } from "../../src/core/database.js";
import { getSettings } from "../../src/config/settings.js";
import { sendNativeNotification } from "../notification.js";

export function registerAgencyChatHandlers(getMainWindow?: () => any) {
  // 1. Obter Histórico do Chat
  ipcMain.handle("agency:get-history", async (): Promise<ChatMessage[]> => {
    return getAgencyChatHistory();
  });

  // 2. Limpar Histórico
  ipcMain.handle("agency:clear-history", async (): Promise<boolean> => {
    await clearAgencyChatHistory();
    return true;
  });

  // 2.1. Testar / Preview de Voz do Gestor (Edge TTS)
  ipcMain.handle(
    "agency:preview-voice",
    async (_event, payload: { voice: string; text?: string }): Promise<{ success: boolean; audioPath?: string; error?: string }> => {
      try {
        const text = payload.text || "Olá! Este é um teste de voz para o gestor editorial da agência.";
        const audioPath = await synthesizeClaraVoice(text, payload.voice);
        return { success: true, audioPath };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Erro ao sintetizar voz." };
      }
    }
  );

  // 3. Transcrever Áudio do Microfone do Usuário
  ipcMain.handle(
    "agency:transcribe-audio",
    async (_event, payload: { audioBase64: string; mimeType?: string }): Promise<{ success: boolean; text?: string; error?: string }> => {
      try {
        const text = await transcribeUserAudio(payload.audioBase64, payload.mimeType || "audio/webm");
        return { success: true, text };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Erro na transcrição de voz." };
      }
    }
  );

  // 4. Enviar Mensagem para a Clara (Texto ou Áudio Transcrito)
  ipcMain.handle(
    "agency:send-message",
    async (
      _event,
      payload: { text: string; voiceEnabled?: boolean }
    ): Promise<{
      success: boolean;
      userMsg?: ChatMessage;
      claraMsg?: ChatMessage;
      autoDispatched?: boolean;
      dispatchedSlot?: any;
      error?: string;
    }> => {
      try {
        const { userMsg, claraMsg } = await processAgencyMessage(payload.text, payload.voiceEnabled ?? true);

        let autoDispatched = false;
        let dispatchedSlot: any = null;

        // Se a Clara tomou a decisão de despachar autonomamente a pauta
        if (
          (claraMsg.actionTaken === "DISPATCHED_TO_PIPELINE" ||
            claraMsg.actionTaken === "SCHEDULED_FOR_GRADE" ||
            claraMsg.actionTaken === "SCHEDULED_URGENT") &&
          claraMsg.dispatchedPauta
        ) {
          const pauta = claraMsg.dispatchedPauta;
          const topic =
            pauta.topic ||
            (pauta as any).title ||
            (pauta as any).theme ||
            (pauta as any).headline ||
            pauta.hook ||
            userMsg?.text?.slice(0, 80) ||
            "Pauta aprovada na Reunião Editorial";
          const targetDay = pauta.scheduledDay || (pauta.isUrgent ? "Hoje" : "Próxima Terça");
          const targetTime = pauta.scheduledTime || (pauta.isUrgent ? "18:30" : "18:30");

          const slotId = `slot-clara-${Date.now()}`;
          const isUrgent = Boolean(pauta.isUrgent || claraMsg.actionTaken === "SCHEDULED_URGENT");

          const settings = await getSettings();
          const managerName = settings.agencyManager?.name || "Clara";

          // Cria o slot no banco de dados
          const createdSlot = await prisma.editorialScheduleSlot.create({
            data: {
              id: slotId,
              dayOfWeek: targetDay,
              timeSlot: targetTime,
              editorialPillar: `Briefing de ${managerName}`,
              format: pauta.format || "CAROUSEL",
              narrativeAngle: pauta.narrativeAngle || "BEFORE_AFTER",
              topic,
              objective: pauta.objective || "AUTHORITY",
              reasoning: pauta.reasoning || `Pauta aprovada na Sala de Reunião com ${managerName}.`,
              baseCopyPrompt: pauta.baseCopyPrompt || undefined,
              baseVisualPrompt: pauta.baseVisualPrompt || undefined,
              weekOffset: isUrgent ? 0 : 1,
              status: "PLANNED",
              isCustom: true,
            },
          });

          dispatchedSlot = {
            id: createdSlot.id,
            dayOfWeek: createdSlot.dayOfWeek,
            timeSlot: createdSlot.timeSlot,
            format: createdSlot.format,
            narrativeAngle: createdSlot.narrativeAngle,
            topic: createdSlot.topic,
            objective: createdSlot.objective,
            reasoning: createdSlot.reasoning,
            baseCopyPrompt: createdSlot.baseCopyPrompt,
            baseVisualPrompt: createdSlot.baseVisualPrompt,
            status: "PLANNED",
            isUrgent,
          };

          autoDispatched = true;

          sendNativeNotification(
            `Pauta Aprovada por ${managerName}`,
            `${managerName} despachou "${topic}" para o pipeline (${pauta.format || "CAROUSEL"} - ${targetDay}).`
          );
        }

        return {
          success: true,
          userMsg,
          claraMsg,
          autoDispatched,
          dispatchedSlot,
        };
      } catch (err) {
        console.error("[AgencyChat] Erro no processamento:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido ao falar com a Gestora.",
        };
      }
    }
  );
}
