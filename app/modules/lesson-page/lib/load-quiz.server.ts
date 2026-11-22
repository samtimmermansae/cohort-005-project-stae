import type { Db } from "~/lib/notes.server";
import {
  getBestAttempt,
  getQuizByLessonId,
  getQuizWithQuestions,
} from "./quiz.server";

type ClientQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

/** The lesson's quiz without its answers, and the person's best attempt. */
export function loadQuiz(
  db: Db,
  lessonId: number,
  currentUserId: number | null
) {
  const quizRecord = getQuizByLessonId(db, lessonId);
  let quiz: ClientQuiz | null = null;
  let bestAttempt: { score: number; passed: boolean } | null = null;

  if (quizRecord) {
    const quizData = getQuizWithQuestions(db, quizRecord.id);
    if (quizData) {
      // Strip isCorrect from options so answers aren't leaked to the client
      quiz = {
        id: quizData.id,
        title: quizData.title,
        passingScore: quizData.passingScore,
        questions: quizData.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          position: q.position,
          options: q.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
          })),
        })),
      };
    }

    if (currentUserId) {
      const best = getBestAttempt(db, currentUserId, quizRecord.id);
      if (best) {
        bestAttempt = { score: best.score, passed: best.passed };
      }
    }
  }

  return { quiz, bestAttempt };
}
