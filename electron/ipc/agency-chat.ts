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

        // Se a Clara tomou a decisão de despachar autonomamente a pauta ou substituir uma anterior
        if (
          (claraMsg.actionTaken === "DISPATCHED_TO_PIPELINE" ||
            claraMsg.actionTaken === "SCHEDULED_FOR_GRADE" ||
            claraMsg.actionTaken === "SCHEDULED_URGENT" ||
            claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA") &&
          claraMsg.dispatchedPauta
        ) {
          const pauta = claraMsg.dispatchedPauta;
          const settings = await getSettings();
          const managerName = settings.agencyManager?.name || "Clara";

          const canceledTopic = pauta.canceledPreviousTopic;

          // Se houve uma pauta anterior substituída ou se a ação for de substituição, limpa o slot antigo do cronograma
          if (canceledTopic) {
            try {
              await prisma.editorialScheduleSlot.deleteMany({
                where: {
                  OR: [
                    { topic: { contains: canceledTopic.slice(0, 30) } },
                    { editorialPillar: { contains: managerName } },
                  ],
                  status: "PLANNED",
                },
              });
              console.log(`[AgencyChat] Pauta anterior "${canceledTopic}" cancelada e removida do cronograma.`);
            } catch (delErr) {
              console.warn("[AgencyChat] Aviso ao remover pauta substituída:", delErr);
            }
          } else if (claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA") {
            try {
              const lastClaraSlot = await prisma.editorialScheduleSlot.findFirst({
                where: { editorialPillar: { contains: managerName }, status: "PLANNED" },
                orderBy: { id: "desc" },
              });
              if (lastClaraSlot) {
                await prisma.editorialScheduleSlot.delete({ where: { id: lastClaraSlot.id } });
                console.log(`[AgencyChat] Slot planejado anterior de ${managerName} (${lastClaraSlot.topic}) substituído.`);
              }
            } catch (delErr) {
              console.warn("[AgencyChat] Aviso ao substituir slot anterior:", delErr);
            }
          }

          const topic =
            pauta.topic ||
            (pauta as any).title ||
            (pauta as any).theme ||
            (pauta as any).headline ||
            pauta.hook ||
            userMsg?.text?.slice(0, 80) ||
            "Pauta aprovada na Reunião Editorial";
          const rawDay = pauta.scheduledDay || (pauta.isUrgent ? "Hoje" : "Terça-feira");
          const lowerDay = rawDay.toLowerCase();
          const isUrgent = Boolean(pauta.isUrgent || claraMsg.actionTaken === "SCHEDULED_URGENT");
          const isNextWeek = !isUrgent && (lowerDay.includes("próxima") || lowerDay.includes("proxima") || claraMsg.actionTaken === "SCHEDULED_FOR_GRADE" || claraMsg.actionTaken === "DISPATCHED_TO_PIPELINE" || claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA");

          let cleanDay = "Terça-feira";
          if (lowerDay.includes("segunda")) cleanDay = "Segunda-feira";
          else if (lowerDay.includes("terça") || lowerDay.includes("terca")) cleanDay = "Terça-feira";
          else if (lowerDay.includes("quarta")) cleanDay = "Quarta-feira";
          else if (lowerDay.includes("quinta")) cleanDay = "Quinta-feira";
          else if (lowerDay.includes("sexta")) cleanDay = "Sexta-feira";
          else if (lowerDay.includes("sábado") || lowerDay.includes("sabado")) cleanDay = "Sábado";
          else if (lowerDay.includes("domingo")) cleanDay = "Domingo";
          else if (lowerDay.includes("hoje")) cleanDay = "Hoje";
          else if (lowerDay.includes("amanhã") || lowerDay.includes("amanha")) cleanDay = "Amanhã";
          else cleanDay = rawDay;

          let targetDay = cleanDay;
          let targetTime = pauta.scheduledTime || "18:30";
          const weekOffset = isUrgent ? 0 : (isNextWeek ? 1 : 0);

          // Verifica se o dia e horário já estão ocupados por outro slot na mesma semana e redistribui para o próximo slot livre
          const existingSlotSameTime = await prisma.editorialScheduleSlot.findFirst({
            where: {
              dayOfWeek: targetDay,
              timeSlot: targetTime,
              weekOffset,
            },
          });

          if (existingSlotSameTime) {
            const candidateSlots = [
              { day: "Quinta-feira", time: "18:00" },
              { day: "Quarta-feira", time: "19:00" },
              { day: "Sexta-feira", time: "17:30" },
              { day: "Segunda-feira", time: "18:30" },
              { day: "Domingo", time: "19:30" },
              { day: "Terça-feira", time: "18:30" },
            ];

            const occupiedWeekSlots = await prisma.editorialScheduleSlot.findMany({
              where: { weekOffset },
              select: { dayOfWeek: true, timeSlot: true },
            });

            const occupiedSet = new Set(occupiedWeekSlots.map((s) => `${s.dayOfWeek}_${s.timeSlot}`));
            const freeSlot = candidateSlots.find((c) => !occupiedSet.has(`${c.day}_${c.time}`));

            if (freeSlot) {
              targetDay = freeSlot.day;
              targetTime = freeSlot.time;
            }
          }

          const slotId = `slot-clara-${Date.now()}`;

          // Cria o novo slot no banco de dados
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
              weekOffset,
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

          const notificationTitle = claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA"
            ? `Pauta Substituída por ${managerName}`
            : `Pauta Aprovada por ${managerName}`;

          const notificationBody = claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA"
            ? `${managerName} atualizou a pauta no cronograma para "${topic}" (${pauta.format || "CAROUSEL"} - ${targetDay}).`
            : `${managerName} despachou "${topic}" para o pipeline (${pauta.format || "CAROUSEL"} - ${targetDay}).`;

          sendNativeNotification(notificationTitle, notificationBody);
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
