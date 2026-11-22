import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { addComment, addWatchEvent, setUpCourse } from "./fixtures";

const DELETED_AT = new Date(2026, 10, 22).toISOString();

async function loadFull(
  course: ReturnType<typeof setUpCourse>,
  lessonId: number
) {
  const page = await course.page.load(
    course.decisionsFor(course.student, lessonId),
    lessonId
  );
  if (page?.view !== "full") throw new Error("expected the full lesson");
  return page;
}

describe("the lesson's Discussion", () => {
  it("nests replies under their question and renders the bodies", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    const question = addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
      body: "**Why** types?",
    });
    addComment(course.db, {
      lessonId: one,
      userId: course.base.instructor.id,
      body: "Safety.",
      parentId: question,
    });

    const { comments } = await loadFull(course, one);

    expect(comments).toHaveLength(1);
    expect(comments[0].bodyHtml).toContain("<strong>Why</strong>");
    expect(comments[0].author).toMatchObject({
      name: "Test User",
      isInstructor: false,
      isPlatformAdmin: false,
    });
    expect(comments[0].replies).toHaveLength(1);
    expect(comments[0].replies[0].bodyHtml).toContain("Safety.");
    expect(comments[0].replies[0].author.isInstructor).toBe(true);
  });

  it("only shows comments on this lesson", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one, two] = course.lessonIds;
    addComment(course.db, { lessonId: two, userId: course.student.id });

    expect((await loadFull(course, one)).comments).toEqual([]);
  });

  it("hides a deleted question with no replies", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
      deletedAt: DELETED_AT,
    });

    expect((await loadFull(course, one)).comments).toEqual([]);
  });

  it("keeps a deleted question that has replies, without its body", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    const question = addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
      body: "Gone",
      deletedAt: DELETED_AT,
    });
    addComment(course.db, {
      lessonId: one,
      userId: course.base.instructor.id,
      parentId: question,
    });

    const [shown] = (await loadFull(course, one)).comments;

    expect(shown).toMatchObject({
      deleted: true,
      bodyHtml: "",
      editedAt: null,
    });
    expect(shown.body).toBe("");
    expect(shown.replies).toHaveLength(1);
  });

  it("hides a deleted reply", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    const question = addComment(course.db, {
      lessonId: one,
      userId: course.student.id,
    });
    addComment(course.db, {
      lessonId: one,
      userId: course.base.instructor.id,
      parentId: question,
      deletedAt: DELETED_AT,
    });

    const [shown] = (await loadFull(course, one)).comments;

    expect(shown.deleted).toBe(false);
    expect(shown.replies).toEqual([]);
  });
});

describe("video progress", () => {
  function withVideo(course: ReturnType<typeof setUpCourse>, lessonId: number) {
    course.db
      .update(schema.lessons)
      .set({ videoUrl: "https://youtu.be/abc", durationMinutes: 10 })
      .where(eq(schema.lessons.id, lessonId))
      .run();
  }

  it("resumes from the last position and shows the furthest point watched", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    withVideo(course, one);
    const userId = course.student.id;
    addWatchEvent(course.db, { userId, lessonId: one, positionSeconds: 300 });

    const page = await loadFull(course, one);

    expect(page.lastWatchPosition).toBe(300);
    expect(page.watchProgress).toBe(50);
  });

  it("caps progress at 100%", async () => {
    const course = setUpCourse();
    course.enroll(course.student.id);
    const [one] = course.lessonIds;
    withVideo(course, one);
    const userId = course.student.id;
    addWatchEvent(course.db, { userId, lessonId: one, positionSeconds: 900 });

    expect((await loadFull(course, one)).watchProgress).toBe(100);
  });

  it("records no progress for someone who cannot take the course", async () => {
    const course = setUpCourse();
    const [one] = course.lessonIds;
    withVideo(course, one);
    const instructor = {
      id: course.base.instructor.id,
      role: "instructor" as const,
      country: null,
    };

    const page = await course.page.load(
      course.decisionsFor(instructor, one),
      one
    );

    expect(page).toMatchObject({
      view: "full",
      lessonStatus: null,
      watchProgress: 0,
      lessonProgressMap: {},
      canModerate: true,
    });
  });
});
