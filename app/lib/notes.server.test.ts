import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { getNote, listNotes, saveNote } from "./notes.server";

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

describe("saving a Note", () => {
  it("creates a Note with the body trimmed", () => {
    const result = saveNote(db, base.user.id, lessonIds[0], "  # not a heading  ", NOW);

    expect(result).toMatchObject({
      ok: true,
      note: {
        body: "# not a heading",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("replaces the body and moves the last-edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "first", NOW);
    saveNote(db, base.user.id, lessonIds[0], "second", minutesAfter(10));

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "second",
      createdAt: NOW.toISOString(),
      updatedAt: minutesAfter(10).toISOString(),
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "a".repeat(2000), NOW).ok).toBe(true);
  });

  it("refuses a Note over 2,000 characters and stores nothing", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "a".repeat(2001), NOW)).toEqual({
      ok: false,
      error: "A note must be 2,000 characters or fewer",
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("keeps the current Note unchanged when saved empty", () => {
    saveNote(db, base.user.id, lessonIds[0], "something", NOW);
    saveNote(db, base.user.id, lessonIds[0], "   ", minutesAfter(1));

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "something",
      updatedAt: NOW.toISOString(),
    });
  });

  it("creates nothing when saved empty on a Lesson with no Note", () => {
    saveNote(db, base.user.id, lessonIds[0], "   ", NOW);

    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("refuses a second Note row at the database", () => {
    saveNote(db, base.user.id, lessonIds[0], "first", NOW);

    expect(() =>
      db
        .insert(schema.notes)
        .values({ userId: base.user.id, lessonId: lessonIds[0], body: "dup" })
        .run()
    ).toThrow();
  });
});

describe("listing Notes", () => {
  it("lists only the Student's own Notes, last edited first, with Lesson and Course", () => {
    saveNote(db, base.user.id, lessonIds[0], "older", NOW);
    saveNote(db, base.user.id, lessonIds[1], "newer", minutesAfter(5));
    saveNote(db, base.instructor.id, lessonIds[0], "not yours", minutesAfter(9));

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        body: "newer",
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { body: "older", lessonId: lessonIds[0] },
    ]);
  });

  it("re-saving an older Note moves it to the top", () => {
    saveNote(db, base.user.id, lessonIds[0], "a", NOW);
    saveNote(db, base.user.id, lessonIds[1], "b", minutesAfter(5));
    saveNote(db, base.user.id, lessonIds[0], "a, edited", minutesAfter(10));

    expect(listNotes(db, base.user.id).map((n) => n.body)).toEqual(["a, edited", "b"]);
  });
});
