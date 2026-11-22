import type { Db } from "~/lib/notes.server";
import { loadLessonPage, type FoundCourseDecisions } from "./lib/load.server";
import { markLessonComplete } from "./lib/progress.server";
import { getCommentById } from "./lib/thread.server";
import { computeResult } from "./lib/quiz.server";
import { quizzes } from "~/db/schema";
import { eq } from "drizzle-orm";

/**
 * The data behind the Student's lesson page: the lesson, its course outline,
 * progress, Discussion, Bookmark, Note and quiz.
 */
export function createLessonPage(db: Db) {
  return {
    /**
     * What the page shows to the person in `decisions`. A person who cannot
     * view the content gets the "locked" view. Null when the lesson or its
     * module does not exist.
     */
    load(decisions: FoundCourseDecisions, lessonId: number) {
      return loadLessonPage(db, decisions, lessonId);
    },

    markComplete(userId: number, lessonId: number) {
      return markLessonComplete(db, userId, lessonId);
    },

    /**
     * The comment, only if it belongs to this lesson, so a comment elsewhere
     * can't be reached by posting its id to this lesson's route.
     */
    findComment(commentId: number, lessonId: number) {
      const comment = getCommentById(db, commentId);
      return comment && comment.lessonId === lessonId ? comment : undefined;
    },

    /**
     * Scores and records an attempt at the lesson's quiz. "not-found" when
     * the quiz belongs to another lesson; null when scoring failed.
     */
    submitQuiz(
      userId: number,
      lessonId: number,
      quizId: number,
      selectedAnswers: Record<number, number>
    ) {
      const quiz = db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, quizId))
        .get();
      if (!quiz || quiz.lessonId !== lessonId) return "not-found" as const;
      return computeResult(db, userId, quizId, selectedAnswers);
    },
  };
}

export type LessonPage = NonNullable<
  Awaited<ReturnType<typeof loadLessonPage>>
>;
export type FullLessonPage = Extract<LessonPage, { view: "full" }>;
export type LockedLessonPage = Extract<LessonPage, { view: "locked" }>;
