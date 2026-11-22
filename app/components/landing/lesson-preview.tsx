import { Check, ListChecks, Play } from "lucide-react";

const LESSONS = [
  { title: "Setting up your project", state: "done" },
  { title: "Your first component", state: "done" },
  { title: "Props and state", state: "current" },
  { title: "Module quiz", state: "quiz" },
] as const;

/** A drawing of a lesson in progress. Decoration only: no real data. */
export function LessonPreview() {
  return (
    <div
      aria-hidden="true"
      className="hidden rounded-2xl border border-border bg-card p-4 shadow-xl md:block"
    >
      <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-border">
        <div className="flex size-14 items-center justify-center rounded-full bg-white">
          <Play className="ml-1 size-6 fill-zinc-900 text-zinc-900" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Module 2 · Lesson 3</span>
        <span>64% complete</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div className="h-full w-[64%] rounded-full bg-primary" />
      </div>
      <ul className="mt-4 space-y-1">
        {LESSONS.map((lesson) => (
          <li
            key={lesson.title}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              lesson.state === "current" ? "bg-muted font-medium" : ""
            }`}
          >
            <LessonMarker state={lesson.state} />
            <span
              className={
                lesson.state === "done" ? "text-muted-foreground" : undefined
              }
            >
              {lesson.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonMarker({ state }: { state: (typeof LESSONS)[number]["state"] }) {
  if (state === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    );
  }
  if (state === "quiz") {
    return <ListChecks className="size-5 text-muted-foreground" />;
  }
  return <span className="size-5 rounded-full border-2 border-primary" />;
}
