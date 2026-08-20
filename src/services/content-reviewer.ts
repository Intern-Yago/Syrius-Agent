import { GoogleGenAI } from "@google/genai";

import type { GeneratedPostContent } from "./content-generator";

export function getReviewerModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
}

export type ReviewStatus =
  | "APPROVED"
  | "NEEDS_REVISION";

export interface ContentReview {
  status: ReviewStatus;
  score: number;

  strengths: string[];
  problems: string[];
  suggestions: string[];

  technicalAccuracy: number;
  hookQuality: number;
  structureQuality: number;
  educationalValue: number;
  engagementPotential: number;
  visualConsistency: number;

  summary: string;
}

export async function reviewPostContent(
  apiKey: string,
  content: GeneratedPostContent
): Promise<ContentReview> {
  if (!apiKey) {
    throw new Error(
      "API key não fornecida para o Content Reviewer."
    );
  }

  if (!content) {
    throw new Error(
      "Content Reviewer recebeu conteúdo vazio."
    );
  }

  if (
    !content.slides ||
    !Array.isArray(content.slides) ||
    content.slides.length === 0
  ) {
    throw new Error(
      "Content Reviewer recebeu um post sem slides."
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const serializedContent = JSON.stringify(
    content,
    null,
    2
  );

  const prompt = `
Você é o QUALITY CONTROL de um sistema profissional
de produção de conteúdo para Instagram.

Sua função é REVISAR um conteúdo já produzido.

Você NÃO deve reescrever o post.

Você NÃO deve criar novos slides.

Você NÃO deve criar uma nova legenda.

Você deve apenas avaliar se o conteúdo está bom o suficiente
para avançar para a próxima etapa do pipeline.

==============================
CONTEÚDO PARA REVISÃO
==============================

${serializedContent}

==============================
CRITÉRIOS
==============================

Avalie cuidadosamente:

1. PRECISÃO TÉCNICA

O conteúdo possui informações tecnicamente corretas?

Procure:
- comandos incorretos;
- conceitos errados;
- simplificações perigosas;
- afirmações absolutas;
- exemplos que podem induzir o leitor ao erro.

2. QUALIDADE DO HOOK

O primeiro slide:
- chama atenção?
- apresenta claramente o benefício?
- desperta curiosidade?
- é específico?
- evita clickbait exagerado?

3. ESTRUTURA

O carrossel possui uma progressão lógica?

Deve existir algo próximo de:

HOOK
↓
PROBLEMA
↓
EXPLICAÇÃO
↓
APLICAÇÃO
↓
CONCLUSÃO
↓
CTA

4. VALOR EDUCACIONAL

O leitor realmente aprende alguma coisa?

Evite aprovar conteúdos que apenas definem conceitos
sem ensinar como utilizá-los.

5. POTENCIAL DE ENGAJAMENTO

O conteúdo possui potencial natural para:
- salvamentos;
- compartilhamentos;
- comentários;

Sem utilizar clickbait artificial.

6. CONSISTÊNCIA VISUAL

A visualDirection de cada slide deve fazer sentido
com seu conteúdo.

Verifique:
- se o visual representa o assunto;
- se existe coerência entre os slides;
- se há espaço suficiente para texto;
- se o design não depende de texto gerado pela imagem;
- se a direção visual é específica.

7. LEGIBILIDADE

Verifique se o texto dos slides é adequado para Instagram.

Não aprove slides excessivamente longos.

8. LEGENDA

A legenda deve complementar o carrossel.

Não deve simplesmente repetir todos os slides.

9. CTA

O CTA deve ser natural e relacionado ao conteúdo.

==============================
REGRA DE APROVAÇÃO
==============================

O conteúdo deve receber:

APPROVED

somente se estiver suficientemente bom para continuar
no pipeline.

Se existir algum problema relevante:

NEEDS_REVISION

Não aprove um conteúdo tecnicamente incorreto apenas
porque ele possui bom potencial de engajamento.

A precisão técnica possui prioridade.

==============================
PONTUAÇÃO
==============================

Dê notas de 0 a 10 para:

technicalAccuracy
hookQuality
structureQuality
educationalValue
engagementPotential
visualConsistency

Depois calcule uma nota geral de 0 a 10.

==============================
IMPORTANTE
==============================

Se encontrar um problema:

- explique claramente;
- seja específico;
- não reescreva o conteúdo;
- não invente uma solução completa.

A etapa de correção será realizada posteriormente
por outro componente do sistema.

==============================
RESPOSTA
==============================

Responda SOMENTE com JSON válido:

{
  "status": "APPROVED",
  "score": 8.5,
  "strengths": [
    "ponto positivo"
  ],
  "problems": [
    "problema encontrado"
  ],
  "suggestions": [
    "sugestão de melhoria"
  ],
  "technicalAccuracy": 9,
  "hookQuality": 8,
  "structureQuality": 9,
  "educationalValue": 9,
  "engagementPotential": 8,
  "visualConsistency": 9,
  "summary": "resumo objetivo da avaliação"
}

Não inclua markdown.
Não inclua explicações fora do JSON.
`;

  const modelToUse = getReviewerModel();
  console.log(`🤖 Reviewer Modelo: ${modelToUse}`);

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error(
      "O Content Reviewer não retornou uma avaliação."
    );
  }

  let review: ContentReview;

  try {
    review = JSON.parse(text);
  } catch {
    throw new Error(
      `O Content Reviewer retornou JSON inválido:\n${text}`
    );
  }

  validateReview(review);

  return review;
}

function validateReview(
  review: ContentReview
) {
  if (!review) {
    throw new Error(
      "Avaliação vazia."
    );
  }

  if (
    review.status !== "APPROVED" &&
    review.status !== "NEEDS_REVISION"
  ) {
    throw new Error(
      `Status de revisão inválido: ${review.status}`
    );
  }

  if (
    typeof review.score !== "number" ||
    review.score < 0 ||
    review.score > 10
  ) {
    throw new Error(
      "Score geral inválido."
    );
  }

  const scores = [
    "technicalAccuracy",
    "hookQuality",
    "structureQuality",
    "educationalValue",
    "engagementPotential",
    "visualConsistency",
  ] as const;

  for (const field of scores) {
    const value = review[field];

    if (
      typeof value !== "number" ||
      value < 0 ||
      value > 10
    ) {
      throw new Error(
        `Nota inválida em ${field}: ${value}`
      );
    }
  }

  if (!Array.isArray(review.strengths)) {
    throw new Error(
      "strengths precisa ser um array."
    );
  }

  if (!Array.isArray(review.problems)) {
    throw new Error(
      "problems precisa ser um array."
    );
  }

  if (!Array.isArray(review.suggestions)) {
    throw new Error(
      "suggestions precisa ser um array."
    );
  }

  if (!review.summary?.trim()) {
    throw new Error(
      "summary não pode estar vazio."
    );
  }
}