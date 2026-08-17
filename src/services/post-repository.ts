import { prisma } from "./database";

import type { ContentDecision } from "./content-strategist";

import type {
  GeneratedPostContent,
} from "./content-generator";

export async function saveGeneratedPost(
  _decision: ContentDecision,
  content: GeneratedPostContent
) {
  const post =
    await prisma.post.create({
      data: {
        topic:
          content.topic,

        format:
          content.format,

        caption:
          content.caption,

        hashtags:
          content.hashtags,

        status:
          "GENERATED",

        slides: {
          create:
            content.slides.map(
              (slide) => ({
                number:
                  slide.number,

                title:
                  slide.title,

                text:
                  slide.text,

                visualDirection:
                  slide.visualDirection,
              })
            ),
        },
      },

      include: {
        slides: {
          orderBy: {
            number: "asc",
          },
        },
      },
    });

  return post;
}