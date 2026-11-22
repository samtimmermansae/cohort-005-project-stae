import { describe, it, expect } from "vitest";
import { LessonProgressStatus } from "~/db/schema";
import { saveNote } from "~/lib/notes.server";
import type { FullLessonPage } from "../index.server";
import { addComment, addQuiz, setUpCourse } from "./fixtures";

const NOW = new Date(2026, 10, 22, 12, 0, 0);

async function loadFull(
  course: ReturnType<typeof setUpCourse>,
  lessonId: number
): Promise<FullLessonPage> {
  const page = await course.page.load(
    course.decisionsFor(course.student, lessonId),
    lessonId
  );
  if (page?.view !== "full")
    throw new Error(`expected full, got ${page?.view}`);
  return page;
}

describe("loading the lesson page", () => {
  it("gives an enrolled Student the full lesson with its outline", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [, two] = course.lessonIds;

    const page = await loadFull(course, two);

    expect(page.lesson.title).toBe("Two");
    expect(page.module.title).toBe("Basics");
    expect(page.contentHtml).toContain("Two");
    expect(page.curriculum.map((m) => m.lessons.map((l) => l.title))).toEqual([
      ["One", "Two"],
      ["Three"],
    ]);
    expect(page.instructorName).toBe("Test Instructor");
    expect(page.canModerate).toBe(false);
  });

  it("links to the lessons either side, across modules", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one, two, three] = course.lessonIds;

    const middle = await loadFull(course, two);
    expect(middle.prevLesson?.id).toBe(one);
    expect(middle.nextLesson).toMatchObject({
      id: three,
      moduleTitle: "Next steps",
    });

    expect((await loadFull(course, one)).prevLesson).toBeNull();
    expect((await loadFull(course, three)).nextLesson).toBeNull();
  });

  it("marks the lesson in progress when an enrolled Student opens it", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;

    const page = await loadFull(course, one);

    expect(page.lessonStatus).toBe(LessonProgressStatus.InProgress);
    expect(page.lessonProgressMap).toEqual({
      [one]: LessonProgressStatus.InProgress,
    });
  });

  it("shows the lesson as completed after marking it complete", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;

    course.page.markComplete(course.student.id, one);
    const page = await loadFull(course, one);

    expect(page.lessonStatus).toBe(LessonProgressStatus.Completed);
  });

  it("includes the Student's own Note", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    saveNote(course.db, course.student.id, one, "Remember this", NOW);

    const page = await loadFull(course, one);

    expect(page.note?.body).toBe("Remember this");
    expect(page.bookmarked).toBe(false);
  });

  it("locks the lesson for someone signed out", async () => {
    const course = setUpCourse();
    const [one] = course.lessonIds;

    const page = await course.page.load(course.decisionsFor(null, one), one);

    expect(page).toMatchObject({
      view: "locked",
      lesson: { id: one, title: "One" },
      lockedReason: { kind: "signed-out" },
    });
    expect(page).not.toHaveProperty("contentHtml");
  });

  it("gives null for a lesson that does not exist", async () => {
    const course = setUpCourse();
    const [one] = course.lessonIds;

    const page = await course.page.load(
      course.decisionsFor(course.student, one),
      9999
    );

    expect(page).toBeNull();
  });
});

describe("the lesson's quiz", () => {
  it("is sent without the answers", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    addQuiz(course.db, one);

    const page = await loadFull(course, one);

    const options = page.quiz?.questions[0].options ?? [];
    expect(options).toHaveLength(2);
    for (const option of options)
      expect(option).not.toHaveProperty("isCorrect");
    expect(page.bestAttempt).toBeNull();
  });

  it("scores a right answer as a pass and keeps it as the best attempt", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    const quiz = addQuiz(course.db, one);

    const result = course.page.submitQuiz({
      userId: course.student.id,
      lessonId: one,
      quizId: quiz.quizId,
      answers: {
        [quiz.questionId]: quiz.rightId,
      },
    });

    expect(result).toMatchObject({ passed: true, grade: "A", totalCorrect: 1 });
    expect((await loadFull(course, one)).bestAttempt).toEqual({
      score: 1,
      passed: true,
    });
  });

  it("scores a wrong answer as a fail", () => {
    const course = setUpCourse();
    const [one] = course.lessonIds;
    const quiz = addQuiz(course.db, one);

    const result = course.page.submitQuiz({
      userId: course.student.id,
      lessonId: one,
      quizId: quiz.quizId,
      answers: {
        [quiz.questionId]: quiz.wrongId,
      },
    });

    expect(result).toMatchObject({
      passed: false,
      grade: "F",
      totalCorrect: 0,
    });
  });

  it("refuses a quiz from another lesson", () => {
    const course = setUpCourse();
    const [one, two] = course.lessonIds;
    const quiz = addQuiz(course.db, one);

    expect(
      course.page.submitQuiz({
        userId: course.student.id,
        lessonId: two,
        quizId: quiz.quizId,
        answers: {},
      })
    ).toBe("not-found");
  });
});

describe("finding a comment", () => {
  it("finds a comment on this lesson", () => {
    const course = setUpCourse();
    const [one] = course.lessonIds;
    const commentId = addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
    });

    expect(course.page.findComment(commentId, one)?.id).toBe(commentId);
  });

  it("does not find a comment on another lesson", () => {
    const course = setUpCourse();
    const [one, two] = course.lessonIds;
    const commentId = addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
    });

    expect(course.page.findComment(commentId, two)).toBeUndefined();
  });
});
