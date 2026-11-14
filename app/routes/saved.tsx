import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/saved";
import { db } from "~/db";
import { requireUserId } from "~/lib/access.server";
import { listBookmarks } from "~/lib/bookmarks.server";
import { listNotes } from "~/lib/notes.server";
import { Card, CardContent } from "~/components/ui/card";
import { Bookmark, NotebookPen } from "lucide-react";
import { formatRelativeTime } from "~/lib/utils";

export function meta() {
  return [
    { title: "Saved — Cadence" },
    { name: "description", content: "Your bookmarks and notes" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);

  // Only the signed-in Student's own rows. Rows for a Course they no longer
  // have access to are kept (see the Refund rules) and the Lesson page itself
  // refuses them.
  return {
    savedBookmarks: listBookmarks(db, userId),
    savedNotes: listNotes(db, userId),
  };
}

export default function Saved({ loaderData }: Route.ComponentProps) {
  const { savedBookmarks, savedNotes } = loaderData;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved</h1>
        <p className="text-sm text-muted-foreground">
          The lessons you flagged, and what you wrote about them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SavedSection
          title="Bookmarks"
          icon={<Bookmark className="size-4 text-muted-foreground" />}
          emptyText="No bookmarks yet."
        >
          {savedBookmarks.map((bookmark) => (
            <SavedLessonRow key={bookmark.id} row={bookmark} />
          ))}
        </SavedSection>

        <SavedSection
          title="Notes"
          icon={<NotebookPen className="size-4 text-muted-foreground" />}
          emptyText="No notes yet."
        >
          {savedNotes.map((note) => (
            <SavedLessonRow key={note.id} row={note}>
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
              <p
                suppressHydrationWarning
                className="text-xs text-muted-foreground"
              >
                Edited {formatRelativeTime(note.updatedAt)}
              </p>
            </SavedLessonRow>
          ))}
        </SavedSection>
      </div>
    </div>
  );
}

function SavedSection({
  title,
  icon,
  emptyText,
  children,
}: {
  title: string;
  icon: ReactNode;
  emptyText: string;
  children: ReactNode[];
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

interface SavedLesson {
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
}

function SavedLessonRow({
  row,
  children,
}: {
  row: SavedLesson;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <Link
          to={`/courses/${row.courseSlug}/lessons/${row.lessonId}`}
          className="text-sm font-medium hover:underline"
        >
          {row.lessonTitle}
        </Link>
        <p className="text-xs text-muted-foreground">{row.courseTitle}</p>
        {children}
      </CardContent>
    </Card>
  );
}
