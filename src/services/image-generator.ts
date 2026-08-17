import { uploadImageBuffer } from "./storage.js";
import sharp from "sharp";

import {
  buildImagePrompt,
} from "./image-prompt-builder.js";

const IMAGE_PROVIDER =
  process.env.IMAGE_PROVIDER ||
  "cloudflare-gateway";

const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID;

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN;

const CLOUDFLARE_IMAGE_MODEL =
  process.env.CLOUDFLARE_IMAGE_MODEL ||
  "recraft/recraftv4-1";

const CLOUDFLARE_AI_GATEWAY_ID =
  process.env.CLOUDFLARE_AI_GATEWAY_ID ||
  "default";

const IMAGE_SIZE = "896x1152";

interface Slide {
  number: number;
  title: string;
  text: string;
  visualDirection: string;
}

interface Post {
  id?: string;
  format: string;
  topic: string;
  slides: Slide[];
}

interface CloudflareResponse {
  success?: boolean;

  errors?: Array<{
    code?: number;
    message?: string;
  }>;

  messages?: Array<{
    code?: number;
    message?: string;
  }>;

  result?: {
    image?: string;

    result?: {
      image?: string;
    };
  };

  state?: string;

  gatewayMetadata?: {
    keySource?: string;
  };
}

/**
 * Gera as imagens dos slides utilizando:
 *
 * Cloudflare AI Gateway
 *        ↓
 * Recraft
 *        ↓
 * Buffer
 *        ↓
 * Sharp
 *        ↓
 * MinIO
 *
 * O retorno contém as objectKeys armazenadas no MinIO.
 */
export async function generatePostImages(
  _apiKey: string,
  post: Post
): Promise<string[]> {
  if (!post) {
    throw new Error(
      "generatePostImages recebeu um post undefined."
    );
  }

  if (!post.slides || !Array.isArray(post.slides)) {
    throw new Error(
      "O post recebido não possui um array válido de slides."
    );
  }

  if (post.slides.length === 0) {
    throw new Error(
      "O post não possui slides para gerar."
    );
  }

  if (IMAGE_PROVIDER !== "cloudflare-gateway") {
    throw new Error(
      `IMAGE_PROVIDER="${IMAGE_PROVIDER}" não é suportado. ` +
        `Use IMAGE_PROVIDER=cloudflare-gateway.`
    );
  }

  if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID não está configurado no .env."
    );
  }

  if (!CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN não está configurado no .env."
    );
  }

  /*
   * ==========================================
   * IDENTIFICAÇÃO DO POST
   * ==========================================
   *
   * Precisamos de um identificador para organizar
   * as imagens dentro do MinIO.
   *
   * Estrutura:
   *
   * posts/
   *   {postId}/
   *     slides/
   *       slide-01.png
   *       slide-02.png
   *       ...
   */

  const postId =
    post.id ||
    `temporary-${Date.now()}`;

  console.log(
    `\n📦 Armazenamento: MinIO`
  );

  console.log(
    `📌 Post ID: ${postId}`
  );

  console.log(
    `📁 Prefixo: posts/${postId}/slides/`
  );

  console.log(
    `\n🖼️ Provedor de imagem: ${IMAGE_PROVIDER}`
  );

  console.log(
    `🤖 Modelo: ${CLOUDFLARE_IMAGE_MODEL}`
  );

  console.log(
    `🌐 AI Gateway: ${CLOUDFLARE_AI_GATEWAY_ID}`
  );

  console.log(
    `📐 Tamanho de geração: ${IMAGE_SIZE}`
  );

  console.log(
    `📐 Tamanho final: 1080x1350`
  );

  console.log(
    `📚 Total de slides: ${post.slides.length}`
  );

  console.log(
    `🎨 Identidade visual: BRAND VISUAL IDENTITY`
  );

  const generatedImages: string[] = [];

  /*
   * ==========================================
   * GERAR CADA SLIDE
   * ==========================================
   */

  for (const slide of post.slides) {
    console.log(
      `\n=================================`
    );

    console.log(
      `🎨 GERANDO SLIDE ${slide.number}/${post.slides.length}`
    );

    console.log(
      `=================================`
    );

    try {
      /*
       * ==========================================
       * 1. CONSTRUIR PROMPT
       * ==========================================
       */

      const imagePrompt =
        buildImagePrompt(
          slide,
          post.slides.length
        );

      console.log(
        "🎨 Identidade visual aplicada."
      );

      /*
       * ==========================================
       * 2. CHAMAR CLOUDFLARE
       * ==========================================
       */

      const endpoint =
        `https://api.cloudflare.com/client/v4/accounts/` +
        `${CLOUDFLARE_ACCOUNT_ID}/ai/run`;

      console.log(
        "☁️ Enviando requisição para Cloudflare..."
      );

      const requestBody = {
        model: CLOUDFLARE_IMAGE_MODEL,

        input: {
          prompt: imagePrompt.prompt,
          size: imagePrompt.size,
        },
      };

      const response = await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${CLOUDFLARE_API_TOKEN}`,

            "cf-aig-gateway-id":
              CLOUDFLARE_AI_GATEWAY_ID,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            requestBody
          ),
        }
      );

      const responseText =
        await response.text();

      let result: CloudflareResponse;

      try {
        result =
          JSON.parse(
            responseText
          ) as CloudflareResponse;
      } catch {
        throw new Error(
          `Cloudflare retornou uma resposta que não é JSON:\n${responseText}`
        );
      }

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          `Cloudflare API ${response.status}: ` +
            `${JSON.stringify(result)}`
        );
      }

      console.log(
        `✅ Resposta recebida para o slide ${slide.number}.`
      );

      /*
       * ==========================================
       * 3. OBTER URL DA IMAGEM
       * ==========================================
       *
       * O Recraft pode retornar em:
       *
       * result.image
       *
       * ou:
       *
       * result.result.image
       */

      const imageUrl =
        result?.result?.result?.image ??
        result?.result?.image;

      if (!imageUrl) {
        console.error(
          `❌ Cloudflare não retornou URL da imagem para o slide ${slide.number}.`
        );

        console.error(
          "Resposta completa:"
        );

        console.error(
          JSON.stringify(
            result,
            null,
            2
          )
        );

        continue;
      }

      console.log(
        `🔗 URL da imagem recebida.`
      );

      /*
       * ==========================================
       * 4. BAIXAR IMAGEM
       * ==========================================
       */

      console.log(
        "⬇️ Baixando imagem..."
      );

      const imageResponse =
        await fetch(
          imageUrl
        );

      if (!imageResponse.ok) {
        throw new Error(
          `Falha ao baixar a imagem gerada: ` +
            `${imageResponse.status} ` +
            `${imageResponse.statusText}`
        );
      }

      const imageBuffer =
        Buffer.from(
          await imageResponse.arrayBuffer()
        );

      console.log(
        `📦 Imagem recebida: ${imageBuffer.length} bytes`
      );

      /*
       * ==========================================
       * 5. PROCESSAR COM SHARP
       * ==========================================
       *
       * A imagem NÃO será salva permanentemente
       * no disco.
       *
       * Sharp trabalha diretamente em memória.
       */

      console.log(
        "⚙️ Processando imagem com Sharp..."
      );

      const processedImage =
        await sharp(
          imageBuffer
        )
          .resize(
            1080,
            1350,
            {
              fit: "cover",
              position: "centre",
            }
          )
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
          })
          .toBuffer();

      console.log(
        `✅ Imagem processada: ${processedImage.length} bytes`
      );

      /*
       * ==========================================
       * 6. DEFINIR OBJECT KEY
       * ==========================================
       *
       * Exemplo:
       *
       * posts/
       *   cm123/
       *     slides/
       *       slide-01.png
       */

      const filename =
        `slide-${String(
          slide.number
        ).padStart(
          2,
          "0"
        )}.png`;

      const objectKey =
        `posts/${postId}/slides/${filename}`;

      console.log(
        `🔑 Object Key: ${objectKey}`
      );

      /*
       * ==========================================
       * 7. ENVIAR PARA MINIO
       * ==========================================
       */

      console.log(
        "☁️ Enviando imagem processada para MinIO..."
      );

      const storedObject =
        await uploadImageBuffer(
          processedImage,
          objectKey
        );

      console.log(
        `✅ Imagem armazenada no MinIO.`
      );

      console.log(
        `📁 ${storedObject}`
      );

      /*
       * ==========================================
       * 8. GUARDAR REFERÊNCIA
       * ==========================================
       *
       * Não guardamos uma URL.
       *
       * Guardamos somente o objectKey.
       *
       * O banco poderá armazenar:
       *
       * posts/cm123/slides/slide-01.png
       */

      generatedImages.push(
        storedObject
      );

      console.log(
        `✅ Slide ${slide.number} concluído.`
      );

    } catch (error) {
      console.error(
        `❌ Erro ao gerar slide ${slide.number}:`
      );

      console.error(
        error
      );
    }
  }

  /*
   * ==========================================
   * RESULTADO
   * ==========================================
   */

  console.log(
    `\n=================================`
  );

  console.log(
    "🖼️ GERAÇÃO DE IMAGENS CONCLUÍDA"
  );

  console.log(
    "================================="
  );

  console.log(
    `Slides solicitados: ${post.slides.length}`
  );

  console.log(
    `Slides armazenados: ${generatedImages.length}`
  );

  if (
    generatedImages.length === 0
  ) {
    throw new Error(
      "Nenhuma imagem foi gerada e armazenada no MinIO."
    );
  }

  generatedImages.forEach(
    (objectKey, index) => {
      console.log(
        `${index + 1}. ${objectKey}`
      );
    }
  );

  return generatedImages;
}