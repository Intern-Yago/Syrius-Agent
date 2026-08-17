import { prisma } from "./database";

export interface SchedulingDecision {
  scheduledAt: Date;
  reasoning: string;
}

export async function decidePublicationTime(
  postId: string
): Promise<SchedulingDecision> {
  console.log("🧠 Iniciando estratégia de agendamento...");

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      topic: true,
      format: true,
      status: true,
    },
  });

  if (!post) {
    throw new Error(
      `Post ${postId} não encontrado.`
    );
  }

  console.log(`📌 Post: ${post.id}`);
  console.log(`📌 Tema: ${post.topic}`);
  console.log(`📌 Status: ${post.status}`);

  if (post.status !== "READY") {
    throw new Error(
      `Somente posts READY podem receber uma estratégia de agendamento. ` +
        `Status atual: ${post.status}`
    );
  }

  /*
   * ==========================================
   * 1. BUSCAR AGENDAMENTOS EXISTENTES
   * ==========================================
   */

  console.log(
    "\n📚 Consultando publicações agendadas..."
  );

  const scheduledPosts =
    await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          not: null,
        },
        NOT: {
          id: postId,
        },
      },

      select: {
        id: true,
        scheduledAt: true,
      },

      orderBy: {
        scheduledAt: "asc",
      },
    });

  console.log(
    `Encontrados ${scheduledPosts.length} posts agendados.`
  );

  /*
   * ==========================================
   * 2. ESTRATÉGIA DE TESTE
   * ==========================================
   *
   * Durante os testes NÃO vamos esperar pelo
   * melhor horário.
   *
   * O objetivo agora é validar o fluxo:
   *
   * READY
   *   ↓
   * Scheduling Strategy
   *   ↓
   * Publication Manager
   *   ↓
   * SCHEDULED
   *   ↓
   * Publisher / Meta API
   *
   * Por isso o post será agendado para
   * aproximadamente 1 minuto no futuro.
   *
   * Depois substituiremos esta regra pelo
   * mecanismo real de Analytics + RAG.
   */

  const now = new Date();

  const scheduledAt =
    getNextTestSlot(
      now,
      scheduledPosts
        .map(
          (post) => post.scheduledAt
        )
        .filter(
          (
            date
          ): date is Date =>
            date instanceof Date
        )
    );

  const reasoning =
    [
      "Modo de teste ativo.",
      "O post será agendado para aproximadamente 1 minuto após a execução.",
      "A estratégia atual não utiliza RAG nem Analytics.",
      "A escolha de horário será substituída posteriormente pela estratégia baseada em dados reais.",
    ].join(" ");

  console.log(
    "\n=============================="
  );

  console.log(
    "DECISÃO DE AGENDAMENTO"
  );

  console.log(
    "=============================="
  );

  console.log(
    `Agora: ${now.toISOString()}`
  );

  console.log(
    `Data escolhida: ${scheduledAt.toISOString()}`
  );

  console.log(
    `Motivo: ${reasoning}`
  );

  return {
    scheduledAt,
    reasoning,
  };
}

/**
 * Encontra o próximo horário disponível
 * durante os testes.
 *
 * Regra:
 *
 * - aproximadamente 1 minuto no futuro;
 * - evita conflito com outro agendamento;
 * - se houver conflito, avança 2 minutos;
 * - não depende de horário fixo;
 * - não depende de RAG;
 * - não depende de Analytics.
 *
 * Isso existe somente para conseguirmos
 * testar rapidamente o pipeline de publicação.
 */
function getNextTestSlot(
  now: Date,
  existingSchedules: Date[]
): Date {
  /*
   * Primeiro candidato:
   *
   * agora + 1 minuto
   */
  let candidate =
    new Date(
      now.getTime() +
        60 * 1000
    );

  /*
   * Procuramos um horário livre
   * dentro dos próximos 30 minutos.
   */
  for (
    let attempt = 0;
    attempt < 15;
    attempt++
  ) {
    const hasConflict =
      existingSchedules.some(
        (scheduled) => {
          const difference =
            Math.abs(
              scheduled.getTime() -
                candidate.getTime()
            );

          /*
           * Consideramos conflito
           * qualquer agendamento dentro
           * de 60 segundos.
           */
          return (
            difference <
            60 * 1000
          );
        }
      );

    if (!hasConflict) {
      return candidate;
    }

    /*
     * Se houver conflito,
     * avançamos 2 minutos.
     */
    candidate =
      new Date(
        candidate.getTime() +
          2 * 60 * 1000
      );
  }

  throw new Error(
    "Não foi possível encontrar um horário disponível para o teste."
  );
}

