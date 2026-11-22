import { count, desc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import {
  CourseStatus,
  categories,
  courses,
  lessons,
  modules,
  users,
} from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

export const FEATURED_COURSE_LIMIT = 3;

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  categoryName: string;
  lessonCount: number;
};

export type LandingPage = {
  featuredCourses: FeaturedCourse[];
  totalCourses: number;
  totalCategories: number;
  totalLessons: number;
};

const isPublished = eq(courses.status, CourseStatus.Published);

function getFeaturedCourses(db: Db) {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
      categoryName: categories.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .where(isPublished)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(FEATURED_COURSE_LIMIT)
    .all();
}

function getLessonCounts(db: Db, courseIds: number[]) {
  const rows = db
    .select({ courseId: modules.courseId, lessonCount: count(lessons.id) })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds))
    .groupBy(modules.courseId)
    .all();
  return new Map(rows.map((row) => [row.courseId, row.lessonCount]));
}

/** The single figure an aggregate `count()` query returns. */
function onlyCount(rows: { n: number }[]) {
  const [{ n }] = rows;
  return n;
}

function countPublishedLessons(db: Db) {
  return onlyCount(
    db
      .select({ n: count() })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(isPublished)
      .all()
  );
}

function countPublishedCourses(db: Db) {
  return onlyCount(
    db.select({ n: count() }).from(courses).where(isPublished).all()
  );
}

function countCategories(db: Db) {
  return onlyCount(db.select({ n: count() }).from(categories).all());
}

export function getLandingPage(db: Db): LandingPage {
  const featured = getFeaturedCourses(db);
  const lessonCounts = getLessonCounts(
    db,
    featured.map((course) => course.id)
  );

  return {
    featuredCourses: featured.map((course) => ({
      ...course,
      lessonCount: lessonCounts.get(course.id) ?? 0,
    })),
    totalCourses: countPublishedCourses(db),
    totalCategories: countCategories(db),
    totalLessons: countPublishedLessons(db),
  };
}
