import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { markdown } from "~/lib/text";
import { createCoursePermissions } from "~/modules/permissions/course-permissions.server";
import type { Person } from "~/modules/permissions/person.server";
import { createLessonPage } from "../index.server";

/**
 * A course with two modules: "Basics" holds lessons one and two, "Next
 * steps" holds lesson three. The course, its lessons, Enrollments, quizzes
 * and comments belong to other parts of the app, so they are inserted here.
 */
export function setUpCourse() {
  const db = createTestDb();
  const base = seedBaseData(db);
  const basics = addModule(db, {
    courseId: base.course.id,
    title: "Basics",
    position: 1,
  });
  const nextSteps = addModule(db, {
    courseId: base.course.id,
    title: "Next steps",
    position: 2,
  });
  const lessonIds = [
    addLesson(db, { moduleId: basics, title: "One", position: 1 }),
    addLesson(db, { moduleId: basics, title: "Two", position: 2 }),
    addLesson(db, { moduleId: nextSteps, title: "Three", position: 1 }),
  ];
  const permissions = createCoursePermissions(db);
  const page = createLessonPage(db);

  const student: Person = { id: base.user.id, role: "student", country: null };

  function decisionsFor(person: Person | null, lessonId: number) {
    const decisions = permissions.decide(person, {
      slug: base.course.slug,
      lessonId: String(lessonId),
    });
    if (!decisions.found) throw new Error("lesson not in course");
    return decisions;
  }

  function enroll(userId: number) {
    db.insert(schema.enrollments)
      .values({ userId, courseId: base.course.id })
      .run();
  }

  return { db, base, lessonIds, page, student, decisionsFor, enroll };
}

function addModule(
  db: TestDb,
  values: { courseId: number; title: string; position: number }
) {
  return db.insert(schema.modules).values(values).returning().get().id;
}

function addLesson(
  db: TestDb,
  values: { moduleId: number; title: string; position: number }
) {
  return db
    .insert(schema.lessons)
    .values({ ...values, content: markdown(`# ${values.title}`) })
    .returning()
    .get().id;
}

export function addComment(
  db: TestDb,
  comment: {
    lessonId: number;
    userId: number;
    body?: string;
    parentId?: number;
    deletedAt?: string;
  }
) {
  return db
    .insert(schema.comments)
    .values({ ...comment, body: markdown(comment.body ?? "A question") })
    .returning()
    .get().id;
}

/** A quiz with one true/false question; returns the ids of both options. */
export function addQuiz(db: TestDb, lessonId: number) {
  const quizId = db
    .insert(schema.quizzes)
    .values({ lessonId, title: "Check", passingScore: 0.7 })
    .returning()
    .get().id;
  const questionId = db
    .insert(schema.quizQuestions)
    .values({
      quizId,
      questionText: "Is TypeScript typed?",
      questionType: schema.QuestionType.TrueFalse,
      position: 1,
    })
    .returning()
    .get().id;
  const [rightId, wrongId] = [true, false].map(
    (isCorrect) =>
      db
        .insert(schema.quizOptions)
        .values({ questionId, optionText: String(isCorrect), isCorrect })
        .returning()
        .get().id
  );
  return { quizId, questionId, rightId, wrongId };
}

/** A Student watched the lesson's video up to `positionSeconds`. */
export function addWatchEvent(
  db: TestDb,
  event: { userId: number; lessonId: number; positionSeconds: number }
) {
  db.insert(schema.videoWatchEvents)
    .values({ ...event, eventType: "progress" })
    .run();
}
