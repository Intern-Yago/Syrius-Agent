import { prisma } from "./database";

export interface SchedulePostInput {
  postId: string;
  scheduledAt: Date;
}

export interface ScheduledPost {
  id: string;
  topic: string;
  format: string;
  scheduledAt: Date;
  status: "SCHEDULED";
}

export async function schedulePost(
  input: SchedulePostInput
): Promise<ScheduledPost> {
  const { postId, scheduledAt } = input;

  console.log("📅 Iniciando agendamento...");

  /*
   * ==========================================
   * 1. VALIDAR DATA
   * ==========================================
   */

  if (!(scheduledAt instanceof Date)) {
    throw new Error(
      "scheduledAt precisa ser uma instância válida de Date."
    );
  }

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error(
      "scheduledAt possui uma data inválida."
    );
  }

  if (scheduledAt <= new Date()) {
    throw new Error(
      "A data de agendamento precisa estar no futuro."
    );
  }

  /*
   * ==========================================
   * 2. BUSCAR POST
   * ==========================================
   */

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      slides: {
        orderBy: {
          number: "asc",
        },
      },
    },
  });

  if (!post) {
    throw new Error(
      `Post ${postId} não encontrado.`
    );
  }

  console.log(`📌 Post encontrado: ${post.id}`);
  console.log(`📌 Status atual: ${post.status}`);

  /*
   * ==========================================
   * 3. VALIDAR STATUS
   * ==========================================
   */

  if (post.status !== "READY") {
    throw new Error(
      `Somente posts READY podem ser agendados. ` +
        `Status atual: ${post.status}`
    );
  }

  /*
   * ==========================================
   * 4. VALIDAR CONTEÚDO
   * ==========================================
   */

  console.log("\n🔎 Validando conteúdo...");

  if (!post.topic?.trim()) {
    throw new Error(
      "O post não possui um topic válido."
    );
  }

  if (!post.caption?.trim()) {
    throw new Error(
      "O post não possui uma caption válida."
    );
  }

  if (!post.format?.trim()) {
    throw new Error(
      "O post não possui um formato válido."
    );
  }

  console.log("✅ Conteúdo válido.");

  /*
   * ==========================================
   * 5. VALIDAR SLIDES
   * ==========================================
   */

  console.log("\n📑 Validando slides...");

  if (post.slides.length === 0) {
    throw new Error(
      "O post não possui slides."
    );
  }

  for (let index = 0; index < post.slides.length; index++) {
    const slide = post.slides[index];

    if (slide.number !== index + 1) {
      throw new Error(
        `Numeração inválida no slide ${slide.number}.`
      );
    }

    if (!slide.title?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui título.`
      );
    }

    if (!slide.text?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui texto.`
      );
    }

    if (!slide.imagePath?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui imagem.`
      );
    }
  }

  console.log(
    `✅ ${post.slides.length} slides válidos.`
  );

  /*
   * ==========================================
   * 6. ATUALIZAR POST
   * ==========================================
   */

  console.log("\n📅 Salvando agendamento...");

  const scheduledPost = await prisma.post.update({
    where: {
      id: post.id,
    },
    data: {
      status: "SCHEDULED",
      scheduledAt,
    },
  });

  /*
   * ==========================================
   * 7. RESULTADO
   * ==========================================
   */

  console.log("\n==============================");
  console.log("POST AGENDADO");
  console.log("==============================");

  console.log(`ID: ${scheduledPost.id}`);
  console.log(`Tema: ${scheduledPost.topic}`);
  console.log(`Formato: ${scheduledPost.format}`);
  console.log(
    `Agendado para: ${scheduledPost.scheduledAt?.toISOString()}`
  );
  console.log(`Status: ${scheduledPost.status}`);

  return {
    id: scheduledPost.id,
    topic: scheduledPost.topic,
    format: scheduledPost.format,
    scheduledAt: scheduledPost.scheduledAt!,
    status: "SCHEDULED",
  };
}
