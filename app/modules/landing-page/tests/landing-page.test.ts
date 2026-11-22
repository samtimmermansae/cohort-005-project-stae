import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLandingPage, FEATURED_COURSE_LIMIT } from "../index.server";

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
});

function get() {
  return createLandingPage(db).get();
}

// ─── Fixtures ───
// The landing page only reads; nothing in the module writes these tables, so
// rows go in directly. Kept in one place so a schema change touches only this
// block.

let slugCounter = 0;

function addCourse(
  title: string,
  createdAt: string,
  status = CourseStatus.Published
) {
  slugCounter += 1;
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${slugCounter}`,
      description: `About ${title}`,
      salesCopy: markdown(title),
      instructorId: base.instructor.id,
      categoryId: base.category.id,
      status,
      coverImageUrl: `/covers/${slugCounter}.png`,
      createdAt,
    })
    .returning()
    .get();
}

function addLessons(courseId: number, lessonsPerModule: number[]) {
  lessonsPerModule.forEach((lessonCount, index) => {
    const mod = db
      .insert(schema.modules)
      .values({ courseId, title: `Module ${index}`, position: index })
      .returning()
      .get();
    for (let i = 0; i < lessonCount; i++) {
      db.insert(schema.lessons)
        .values({ moduleId: mod.id, title: `Lesson ${i}`, position: i })
        .run();
    }
  });
}

function addCategory(name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: name.toLowerCase() })
    .returning()
    .get();
}

// ─── Tests ───

describe("featured courses", () => {
  it("lists the newest published courses first, up to the limit", () => {
    addCourse("Oldest", "3020-01-01T00:00:00.000Z");
    addCourse("Newest", "3026-03-01T00:00:00.000Z");
    addCourse("Middle", "3025-06-01T00:00:00.000Z");
    addCourse("Older", "3024-01-01T00:00:00.000Z");

    const titles = get().featuredCourses.map((c) => c.title);

    expect(FEATURED_COURSE_LIMIT).toBe(3);
    expect(titles).toEqual(["Newest", "Middle", "Older"]);
  });

  it("leaves out drafts and archived courses", () => {
    addCourse("Draft", "3030-01-01T00:00:00.000Z", CourseStatus.Draft);
    addCourse("Archived", "3030-01-01T00:00:00.000Z", CourseStatus.Archived);

    const titles = get().featuredCourses.map((c) => c.title);

    expect(titles).toEqual(["Test Course"]);
  });

  it("carries what a course card shows", () => {
    const course = addCourse("Card", "3030-01-01T00:00:00.000Z");
    addLessons(course.id, [2, 3]);

    expect(get().featuredCourses[0]).toEqual({
      id: course.id,
      title: "Card",
      slug: course.slug,
      description: "About Card",
      coverImageUrl: course.coverImageUrl,
      instructorName: "Test Instructor",
      categoryName: "Programming",
      lessonCount: 5,
    });
  });

  it("counts zero lessons for a course with no modules", () => {
    expect(get().featuredCourses[0].lessonCount).toBe(0);
  });

  it("counts each course's lessons separately", () => {
    const a = addCourse("A", "3030-01-01T00:00:00.000Z");
    const b = addCourse("B", "3029-01-01T00:00:00.000Z");
    addLessons(a.id, [1]);
    addLessons(b.id, [4, 0, 2]);

    const counts = get().featuredCourses.map((c) => [c.title, c.lessonCount]);

    expect(counts).toEqual([
      ["A", 1],
      ["B", 6],
      ["Test Course", 0],
    ]);
  });
});

describe("catalogue totals", () => {
  it("counts published courses only", () => {
    addCourse("One", "2025-01-01T00:00:00.000Z");
    addCourse("Two", "2025-01-01T00:00:00.000Z");
    addCourse("Three", "2025-01-01T00:00:00.000Z");
    addCourse("Draft", "2025-01-01T00:00:00.000Z", CourseStatus.Draft);

    expect(get().totalCourses).toBe(4);
  });

  it("counts every category", () => {
    addCategory("Design");
    addCategory("Data");

    expect(get().totalCategories).toBe(3);
  });

  it("counts lessons in published courses only, beyond the featured few", () => {
    addLessons(base.course.id, [1]);
    for (const title of ["W", "X", "Y"]) {
      const course = addCourse(title, "3030-01-01T00:00:00.000Z");
      addLessons(course.id, [2]);
    }
    const draft = addCourse(
      "D",
      "3030-01-01T00:00:00.000Z",
      CourseStatus.Draft
    );
    addLessons(draft.id, [10]);

    expect(get().totalLessons).toBe(7);
  });

  it("reports zeros for an empty catalogue", () => {
    const empty = createTestDb();

    expect(createLandingPage(empty).get()).toEqual({
      featuredCourses: [],
      totalCourses: 0,
      totalCategories: 0,
      totalLessons: 0,
    });
  });
});
