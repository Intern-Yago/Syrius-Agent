import { prisma } from "./database";

import type { ContentReview } from "./content-reviewer";

export async function saveContentReview(
  postId: string,
  review: ContentReview
) {
  if (!postId) {
    throw new Error(
      "saveContentReview recebeu um postId inválido."
    );
  }

  if (!review) {
    throw new Error(
      "saveContentReview recebeu uma review inválida."
    );
  }

  const savedReview =
    await prisma.contentReview.create({
      data: {
        postId,

        status: review.status,

        score: review.score,

        technicalAccuracy:
          review.technicalAccuracy,

        hookQuality:
          review.hookQuality,

        structureQuality:
          review.structureQuality,

        educationalValue:
          review.educationalValue,

        engagementPotential:
          review.engagementPotential,

        visualConsistency:
          review.visualConsistency,

        strengths:
          review.strengths,

        problems:
          review.problems,

        suggestions:
          review.suggestions,

        summary:
          review.summary,
      },
    });

  return savedReview;
}

export async function updatePostReviewStatus(
  postId: string,
  review: ContentReview
) {
  if (!postId) {
    throw new Error(
      "updatePostReviewStatus recebeu um postId inválido."
    );
  }

  if (!review) {
    throw new Error(
      "updatePostReviewStatus recebeu uma review inválida."
    );
  }

  const status =
    review.status === "APPROVED"
      ? "APPROVED"
      : "REVIEW";

  const updatedPost =
    await prisma.post.update({
      where: {
        id: postId,
      },

      data: {
        status,
      },
    });

  return updatedPost;
}

