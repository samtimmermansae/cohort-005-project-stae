import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { isBookmarked, listBookmarks, toggleBookmark } from "./bookmarks.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesAfter(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson that has none, and unbookmarks it on the next press", () => {
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);
  });

  it("never leaves two Bookmarks on the same Lesson", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(listBookmarks(db, base.user.id)).toHaveLength(1);
  });

  it("refuses a second Bookmark row at the database", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);

    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId: lessonIds[0] })
        .run()
    ).toThrow();
  });
});

describe("listing Bookmarks", () => {
  it("lists only the Student's own Bookmarks, newest first, with Lesson and Course", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[1], minutesAfter(5));
    toggleBookmark(db, base.instructor.id, lessonIds[0], NOW);

    expect(listBookmarks(db, base.user.id)).toMatchObject([
      {
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { lessonId: lessonIds[0], lessonTitle: "Lesson 1" },
    ]);
  });
});
