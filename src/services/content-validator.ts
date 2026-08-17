import { SocialPost } from "../types/content.js";

export function validateSocialPost(
  post: SocialPost
): string[] {
  const errors: string[] = [];

  if (!post) {
    return ["Post não foi fornecido."];
  }

  if (!post.format) {
    errors.push("Formato não informado.");
  }

  if (!post.objective) {
    errors.push("Objetivo não informado.");
  }

  if (!post.audience) {
    errors.push("Público não informado.");
  }

  if (!post.pillar) {
    errors.push("Pilar não informado.");
  }

  if (!post.topic) {
    errors.push("Tema não informado.");
  }

  if (!post.hook) {
    errors.push("Gancho não informado.");
  }

  if (!Array.isArray(post.slides)) {
    errors.push("Slides inválidos.");
    return errors;
  }

  if (
    post.format === "carousel" &&
    (post.slides.length < 5 ||
      post.slides.length > 10)
  ) {
    errors.push(
      `Carrossel deve possuir entre 5 e 10 slides. Encontrado: ${post.slides.length}.`
    );
  }

  const slideNumbers = new Set<number>();

  post.slides.forEach(
    (slide, index) => {
      const expectedNumber =
        index + 1;

      if (
        slide.number !== expectedNumber
      ) {
        errors.push(
          `Slide ${index + 1} possui numeração incorreta: ${slide.number}. Esperado: ${expectedNumber}.`
        );
      }

      if (
        slideNumbers.has(slide.number)
      ) {
        errors.push(
          `Número de slide duplicado: ${slide.number}.`
        );
      }

      slideNumbers.add(
        slide.number
      );

      if (!slide.title?.trim()) {
        errors.push(
          `Slide ${expectedNumber} não possui título.`
        );
      }

      if (!slide.text?.trim()) {
        errors.push(
          `Slide ${expectedNumber} não possui texto.`
        );
      }

      if (
        !slide.visualDirection?.trim()
      ) {
        errors.push(
          `Slide ${expectedNumber} não possui orientação visual.`
        );
      }
    }
  );

  if (!post.caption?.trim()) {
    errors.push(
      "Legenda não informada."
    );
  }

  if (!post.cta?.trim()) {
    errors.push(
      "CTA não informado."
    );
  }

  if (!Array.isArray(post.hashtags)) {
    errors.push(
      "Hashtags inválidas."
    );
  } else {
    post.hashtags.forEach(
      (hashtag, index) => {
        if (
          typeof hashtag !==
            "string" ||
          !hashtag.startsWith("#")
        ) {
          errors.push(
            `Hashtag ${index + 1} inválida: ${hashtag}`
          );
        }
      }
    );
  }

  if (!post.visualBrief?.trim()) {
    errors.push(
      "Briefing visual não informado."
    );
  }

  return errors;
}