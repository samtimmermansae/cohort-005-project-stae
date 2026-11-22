import type { Db } from "~/lib/notes.server";
import type {
  CourseDecisions,
  DenialReason,
} from "~/modules/permissions/course-permissions.server";
import { isBookmarked } from "~/lib/bookmarks.server";
import { getNote } from "~/lib/notes.server";
import { renderMarkdown } from "~/lib/markdown.server";
import {
  flattenCourseLessons,
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
} from "./course.server";
import {
  calculateWatchProgress,
  getLastWatchPosition,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonInProgress,
} from "./progress.server";
import { getLessonThread, renderThread } from "./thread.server";
import { loadQuiz } from "./load-quiz.server";

export type FoundCourseDecisions = Extract<CourseDecisions, { found: true }>;

/**
 * Everything the lesson page shows, or null when the lesson or its module
 * does not exist.
 */
export async function loadLessonPage(
  db: Db,
  decisions: FoundCourseDecisions,
  lessonId: number
) {
  const { course, person, enrolled, view, take, manage } = decisions;
  const currentUserId = person?.id ?? null;

  const courseWithDetails = getCourseWithDetails(db, course.id);
  const lesson = getLessonById(db, lessonId);
  const mod = lesson ? getModuleById(db, lesson.moduleId) : undefined;
  if (!courseWithDetails || !lesson || !mod) return null;

  const curriculum = courseWithDetails.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
    })),
  }));
  const courseSummary = {
    id: courseWithDetails.id,
    title: courseWithDetails.title,
    slug: courseWithDetails.slug,
  };

  // Someone who can't view the content gets the lesson's title, its module and
  // the course outline — never the body, video or quiz — plus the reason, so
  // the page can show the right call to action.
  if (!view.allowed) {
    const lockedReason: DenialReason = view.reason;

    return {
      view: "locked" as const,
      course: courseSummary,
      curriculum,
      module: { id: mod.id, title: mod.title },
      lesson: { id: lesson.id, title: lesson.title },
      enrolled,
      lockedReason,
    };
  }

  // Progress is recorded only for people who can take the course, so a
  // Student under a Country Lock gets none.
  const progress =
    currentUserId && take.allowed
      ? loadProgress(db, currentUserId, lesson)
      : { lessonStatus: null, lastWatchPosition: 0, watchProgress: 0 };
  const lessonProgressMap =
    currentUserId && take.allowed
      ? progressMap(db, currentUserId, course.id)
      : {};

  // Everything from here on is behind the can-view-content bar above:
  // comments, Bookmarks and Notes are confidential to the course.
  const instructor = getUserById(db, course.instructorId);
  const comments = await renderThread(getLessonThread(db, lessonId));

  const bookmarked = currentUserId
    ? isBookmarked(db, currentUserId, lessonId)
    : false;
  const note = currentUserId ? getNote(db, currentUserId, lessonId) : undefined;

  // Render lesson content from Markdown to HTML server-side
  const contentHtml = lesson.content
    ? await renderMarkdown(lesson.content)
    : null;

  // Build prev/next navigation
  const allLessons = flattenCourseLessons(courseWithDetails);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const { quiz, bestAttempt } = loadQuiz(db, lessonId, currentUserId);

  return {
    view: "full" as const,
    course: courseSummary,
    curriculum,
    module: {
      id: mod.id,
      title: mod.title,
    },
    lesson,
    contentHtml,
    ...progress,
    enrolled,
    currentUserId,
    prevLesson,
    nextLesson,
    quiz,
    bestAttempt,
    lessonProgressMap,
    comments,
    canModerate: manage.allowed,
    instructorName: instructor?.name ?? "your instructor",
    bookmarked,
    note: note ? { body: note.body, updatedAt: note.updatedAt } : null,
  };
}

function loadProgress(
  db: Db,
  userId: number,
  lesson: {
    id: number;
    videoUrl: string | null;
    durationMinutes: number | null;
  }
) {
  // Mark lesson as in-progress when viewed
  markLessonInProgress(db, userId, lesson.id);
  const lessonStatus: string | null =
    getLessonProgress(db, userId, lesson.id)?.status ?? null;

  // Get video watch state for resume and progress display
  let lastWatchPosition = 0;
  let watchProgress = 0;
  if (lesson.videoUrl) {
    lastWatchPosition = getLastWatchPosition(db, userId, lesson.id);
    const videoDurationSeconds = (lesson.durationMinutes ?? 0) * 60;
    if (videoDurationSeconds > 0) {
      watchProgress = calculateWatchProgress(
        db,
        userId,
        lesson.id,
        videoDurationSeconds
      );
    }
  }

  return { lessonStatus, lastWatchPosition, watchProgress };
}

/** Progress for every lesson in the course, for the curriculum sidebar. */
function progressMap(db: Db, userId: number, courseId: number) {
  const map: Record<number, string> = {};
  for (const record of getLessonProgressForCourse(db, userId, courseId)) {
    map[record.lessonId] = record.status;
  }
  return map;
}
