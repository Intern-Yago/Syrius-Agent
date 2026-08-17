import { GoogleGenAI } from "@google/genai";

import {
  geminiTools,
  toolRegistry,
} from "../tools/index.js";

import {
  SocialPost,
  PostReview,
  PostGenerationResult,
} from "../types/content.js";

type FunctionCall = {
  type: "function_call";
  name: string;
  id: string;
  arguments?:
    | string
    | Record<string, unknown>;
};

type InteractionStep =
  | FunctionCall
  | {
      type: string;
      [key: string]: unknown;
    };

type Interaction = {
  id: string;
  status: string;
  output_text?: string;
  steps: InteractionStep[];
};

type FunctionResult = {
  type: "function_result";
  name: string;
  call_id: string;

  result: {
    type: "text";
    text: string;
  }[];
};

export class SocialAgent {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  private async executeInteraction(
    interaction: Interaction
  ): Promise<Interaction> {
    while (
      interaction.status ===
      "requires_action"
    ) {
      const functionCalls =
        interaction.steps.filter(
          (
            step
          ): step is FunctionCall =>
            step.type ===
            "function_call"
        );

      if (
        functionCalls.length === 0
      ) {
        throw new Error(
          "Gemini solicitou uma ação, mas nenhuma function_call foi encontrada."
        );
      }

      console.log(
        `Gemini solicitou ${functionCalls.length} ferramenta(s).`
      );

      const functionResults: FunctionResult[] =
        [];

      for (const functionCall of functionCalls) {
        console.log(
          `Executando ferramenta: ${functionCall.name}`
        );

        const tool =
          toolRegistry[
            functionCall.name
          ];

        if (!tool) {
          throw new Error(
            `Ferramenta desconhecida: ${functionCall.name}`
          );
        }

        let argumentsParsed: Record<
          string,
          unknown
        > = {};

        if (
          functionCall.arguments
        ) {
          if (
            typeof functionCall.arguments ===
            "string"
          ) {
            try {
              argumentsParsed =
                JSON.parse(
                  functionCall.arguments
                );
            } catch {
              throw new Error(
                `Argumentos inválidos enviados pela ferramenta ${functionCall.name}.`
              );
            }
          } else {
            argumentsParsed =
              functionCall.arguments;
          }
        }

        const toolResult =
          await tool.execute(
            argumentsParsed
          );

        console.log(
          `Ferramenta ${functionCall.name} executada.`
        );

        functionResults.push({
          type: "function_result",

          name: functionCall.name,

          call_id:
            functionCall.id,

          result: [
            {
              type: "text",

              text: JSON.stringify(
                toolResult
              ),
            },
          ],
        });
      }

      const nextInteraction =
        await this.ai.interactions.create(
          {
            model:
              "gemini-3.6-flash",

            previous_interaction_id:
              interaction.id,

            input:
              functionResults,
          }
        );

      interaction =
        nextInteraction as unknown as Interaction;

      console.log(
        "Novo status:",
        interaction.status
      );
    }

    return interaction;
  }

  async analyzeContent(
    idea: string
  ) {
    let interaction =
      await this.ai.interactions.create(
        {
          model:
            "gemini-3.6-flash",

          input: `
Você é o estrategista de redes sociais do Yago.

Você possui ferramentas que fornecem informações sobre:

- identidade e posicionamento da marca;
- estado atual do perfil do Instagram;
- histórico de publicações;
- audiência do Instagram.

Use as ferramentas sempre que precisar dessas informações.

Não invente dados.

Analise esta ideia:

"${idea}"

Considere:

- público;
- posicionamento;
- alcance;
- engajamento;
- autoridade;
- formato;
- gancho;
- CTA;
- nota de 0 a 10.

Não invente informações.
`,

          tools:
            geminiTools,
        }
      );

    interaction =
      await this.executeInteraction(
        interaction as unknown as Interaction
      );

    return (
      interaction.output_text ??
      ""
    );
  }

  async createContentStrategy() {
    let interaction =
      await this.ai.interactions.create(
        {
          model:
            "gemini-3.6-flash",

          input: `
Você é o estrategista de redes sociais do Yago.

Sua função é decidir qual conteúdo deve ser criado
para o Instagram.

Consulte as ferramentas disponíveis para obter:

- identidade da marca;
- posicionamento;
- perfil;
- audiência;
- histórico de publicações.

Não invente dados.

Caso a conta não tenha histórico suficiente,
reconheça essa limitação.

Determine:

1. objetivo;
2. público;
3. pilar;
4. tema;
5. formato;
6. potencial de alcance;
7. potencial de engajamento;
8. potencial de autoridade;
9. gancho;
10. CTA;
11. justificativa;
12. nota.

Priorize:

- crescimento;
- autoridade;
- salvamentos;
- compartilhamentos;
- identidade clara.

Não crie o post ainda.

Entregue somente a estratégia.
`,

          tools:
            geminiTools,
        }
      );

    interaction =
      await this.executeInteraction(
        interaction as unknown as Interaction
      );

    return (
      interaction.output_text ??
      ""
    );
  }

  async createPost(
    strategy: string
  ): Promise<SocialPost> {
    let interaction =
      await this.ai.interactions.create(
        {
          model:
            "gemini-3.6-flash",

          input: `
Você é o criador de conteúdo do Instagram do Yago.

Transforme a estratégia abaixo em um post completo.

ESTRATÉGIA:

${strategy}

Preserve:

- objetivo;
- público;
- pilar;
- tema;
- formato;
- posicionamento;
- gancho;
- CTA.

O conteúdo deve ser:

- direto;
- natural;
- didático;
- humano;
- prático;
- tecnicamente correto.

Não invente:

- clientes;
- resultados;
- experiências;
- números;
- projetos;
- informações pessoais.

### CARROSSEL

Se for carousel:

Crie entre 6 e 10 slides.

A numeração deve ser:

1, 2, 3, 4...

Nunca pule números.

Nunca repita números.

O primeiro slide é a capa.

Os slides seguintes desenvolvem
o conteúdo.

O último slide deve concluir
e apresentar o CTA.

Cada slide precisa possuir:

- title;
- text;
- visualDirection.

### LEGENDA

A legenda deve complementar
o conteúdo e não simplesmente
copiar os slides.

### HASHTAGS

Use somente hashtags relevantes.

### VISUAL

Crie um briefing visual consistente
com a identidade da marca.

### SAÍDA

Retorne SOMENTE JSON válido.

Não use markdown.

Use exatamente:

{
  "format": "carousel",
  "objective": "...",
  "audience": "...",
  "pillar": "...",
  "topic": "...",
  "hook": "...",
  "slides": [
    {
      "number": 1,
      "title": "...",
      "text": "...",
      "visualDirection": "..."
    }
  ],
  "caption": "...",
  "cta": "...",
  "hashtags": [
    "#..."
  ],
  "visualBrief": "..."
}
`,

          tools:
            geminiTools,
        }
      );

    interaction =
      await this.executeInteraction(
        interaction as unknown as Interaction
      );

    const output =
      interaction.output_text ??
      "";

    try {
      return JSON.parse(
        output
      ) as SocialPost;
    } catch {
      console.error(
        "Resposta recebida do Gemini:"
      );

      console.error(output);

      throw new Error(
        "O Gemini retornou conteúdo que não é JSON válido."
      );
    }
  }

  async reviewPost(
    strategy: string,
    post: SocialPost
  ): Promise<PostReview> {
    let interaction =
      await this.ai.interactions.create(
        {
          model:
            "gemini-3.6-flash",

          input: `
Você é o editor-chefe do Instagram do Yago.

Revise o conteúdo abaixo antes da publicação.

ESTRATÉGIA:

${strategy}

POST:

${JSON.stringify(
  post,
  null,
  2
)}

Avalie:

1. coerência com a estratégia;
2. qualidade do gancho;
3. clareza;
4. valor prático;
5. progressão dos slides;
6. qualidade técnica;
7. adequação ao público;
8. CTA;
9. legenda;
10. qualidade visual;
11. potencial de salvamento;
12. potencial de compartilhamento.

Verifique especialmente:

- informações técnicas incorretas;
- afirmações exageradas;
- repetição;
- textos longos;
- slides confusos;
- CTA fraco;
- inconsistências entre estratégia e conteúdo.

Dê uma nota de 0 a 10.

Critério:

9-10 = excelente.

8.5-8.9 = aprovado com pequenas melhorias.

7-8.4 = precisa melhorar.

Abaixo de 7 = precisa ser refeito.

O post só pode ser aprovado se:

- nota >= 8.5;
- não existir problema crítico.

Retorne SOMENTE JSON válido:

{
  "approved": true,
  "score": 9.2,
  "strengths": [],
  "problems": [],
  "suggestions": []
}
`,

          tools:
            geminiTools,
        }
      );

    interaction =
      await this.executeInteraction(
        interaction as unknown as Interaction
      );

    const output =
      interaction.output_text ??
      "";

    try {
      return JSON.parse(
        output
      ) as PostReview;
    } catch {
      console.error(
        "Resposta da revisão:"
      );

      console.error(output);

      throw new Error(
        "O Gemini retornou uma revisão que não é JSON válido."
      );
    }
  }

  async improvePost(
    strategy: string,
    post: SocialPost,
    review: PostReview,
    validationErrors: string[] = []
  ): Promise<SocialPost> {
    let interaction =
      await this.ai.interactions.create(
        {
          model:
            "gemini-3.6-flash",

          input: `
Você é o editor responsável por corrigir
um conteúdo do Instagram do Yago.

A publicação foi revisada e precisa de melhorias.

ESTRATÉGIA ORIGINAL:

${strategy}

POST ATUAL:

${JSON.stringify(
  post,
  null,
  2
)}

AVALIAÇÃO:

${JSON.stringify(
  review,
  null,
  2
)}

ERROS ESTRUTURAIS:

${JSON.stringify(
  validationErrors,
  null,
  2
)}

Sua tarefa é criar uma NOVA VERSÃO do post
corrigindo os problemas encontrados.

IMPORTANTE:

Não mude desnecessariamente aquilo que já está funcionando.

Preserve:

- objetivo;
- público;
- pilar;
- tema;
- formato;
- posicionamento.

Corrija somente o que for necessário.

Se houver uma sugestão opcional útil,
avalie se ela realmente melhora o conteúdo.

Não invente:

- clientes;
- resultados;
- experiências;
- números;
- projetos;
- informações pessoais.

### CARROSSEL

Se o formato for carousel:

Tenha entre 6 e 10 slides.

A numeração deve ser exatamente:

1
2
3
4
5
...

Nunca pule números.

Nunca repita números.

O primeiro slide deve ser a capa.

O último deve possuir conclusão e CTA.

### SAÍDA

Retorne SOMENTE JSON válido.

Não use markdown.

Não explique as alterações.

Use exatamente:

{
  "format": "carousel",
  "objective": "...",
  "audience": "...",
  "pillar": "...",
  "topic": "...",
  "hook": "...",
  "slides": [
    {
      "number": 1,
      "title": "...",
      "text": "...",
      "visualDirection": "..."
    }
  ],
  "caption": "...",
  "cta": "...",
  "hashtags": [],
  "visualBrief": "..."
}
`,

          tools:
            geminiTools,
        }
      );

    interaction =
      await this.executeInteraction(
        interaction as unknown as Interaction
      );

    const output =
      interaction.output_text ??
      "";

    try {
      return JSON.parse(
        output
      ) as SocialPost;
    } catch {
      console.error(
        "Resposta da correção:"
      );

      console.error(output);

      throw new Error(
        "O Gemini retornou uma correção que não é JSON válido."
      );
    }
  }

  async createApprovedPost(
    strategy: string,
    maxAttempts = 3
  ): Promise<PostGenerationResult> {
    let post =
      await this.createPost(
        strategy
      );

    let lastReview: PostReview = {
      approved: false,
      score: 0,
      strengths: [],
      problems: [],
      suggestions: [],
    };

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      console.log(
        `\n===== REVISÃO ${attempt}/${maxAttempts} =====`
      );

      const {
        validateSocialPost,
      } = await import(
        "../services/content-validator.js"
      );

      const validationErrors =
        validateSocialPost(
          post
        );

      if (
        validationErrors.length > 0
      ) {
        console.log(
          "❌ Erros estruturais encontrados:"
        );

        validationErrors.forEach(
          (error) =>
            console.log(
              `- ${error}`
            )
        );
      } else {
        console.log(
          "✅ Estrutura do post válida."
        );
      }

      console.log(
        "Revisando conteúdo..."
      );

      lastReview =
        await this.reviewPost(
          strategy,
          post
        );

      console.log(
        `Nota da revisão: ${lastReview.score}`
      );

      if (
        lastReview.approved &&
        validationErrors.length === 0
      ) {
        console.log(
          "🟢 Post aprovado."
        );

        return {
          post,
          review: lastReview,
          attempts: attempt,
          approved: true,
        };
      }

      if (
        attempt === maxAttempts
      ) {
        console.log(
          "🔴 Limite de tentativas atingido."
        );

        return {
          post,
          review: lastReview,
          attempts: attempt,
          approved: false,
        };
      }

      console.log(
        "🟡 Post precisa de correções."
      );

      console.log(
        "Gerando versão melhorada..."
      );

      post =
        await this.improvePost(
          strategy,
          post,
          lastReview,
          validationErrors
        );

      console.log(
        "✅ Nova versão criada."
      );
    }

    return {
      post,
      review: lastReview,
      attempts: maxAttempts,
      approved: false,
    };
  }
}