import { Type } from "@google/genai";

import { getBrandInfo } from "./brand-info.js";

import {
  getInstagramProfile,
  getInstagramMedia,
  getInstagramAudience,
} from "../integrations/instagram/client.js";

export const toolRegistry: Record<string, any> = {
  get_brand_info: {
    description:
      "Retorna informações sobre a identidade, posicionamento, público, especialidades, tom e objetivos da marca.",

    parameters: {
      type: Type.OBJECT,
      properties: {},
    },

    execute: async () => {
      return getBrandInfo();
    },
  },

  get_instagram_profile: {
    description:
      "Consulta os dados atuais do perfil do Instagram, incluindo username, seguidores, quantidade de publicações e biografia.",

    parameters: {
      type: Type.OBJECT,
      properties: {},
    },

    execute: async () => {
      return getInstagramProfile();
    },
  },

  get_instagram_media: {
    description:
      "Consulta as publicações existentes no Instagram para analisar histórico de conteúdo, formatos, temas, legendas e datas de publicação.",

    parameters: {
      type: Type.OBJECT,
      properties: {},
    },

    execute: async () => {
      return getInstagramMedia();
    },
  },

  get_instagram_audience: {
    description:
      "Consulta métricas disponíveis de audiência e desempenho do Instagram, como alcance, seguidores, visualizações do perfil e interações.",

    parameters: {
      type: Type.OBJECT,
      properties: {},
    },

    execute: async () => {
      return getInstagramAudience();
    },
  },
};

export const geminiTools =
  Object.entries(toolRegistry).map(
    ([name, tool]) => ({
      type: "function" as const,
      name,
      description: tool.description,
      parameters: tool.parameters,
    })
  );