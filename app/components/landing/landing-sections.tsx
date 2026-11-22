import { Link } from "react-router";
import { BookOpen, ListChecks, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Structured modules",
    body: "Every course is split into short modules and lessons, so you always know what comes next.",
  },
  {
    icon: ListChecks,
    title: "Quizzes that check your understanding",
    body: "Test what you have learned before moving on, and come back to anything that did not stick.",
  },
  {
    icon: TrendingUp,
    title: "Progress that follows you",
    body: "Pick up exactly where you left off. Your dashboard shows how far through each course you are.",
  },
];

export function LandingFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="max-w-xl text-3xl font-bold tracking-tight">
        Everything you need to keep learning
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const COURSES_LINK = { to: "/courses", label: "Courses" };
const SIGNED_IN_LINKS = [
  COURSES_LINK,
  { to: "/dashboard", label: "Dashboard" },
];
const SIGNED_OUT_LINKS = [
  COURSES_LINK,
  { to: "/login", label: "Log In" },
  { to: "/signup", label: "Sign Up" },
];

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/" className="text-lg font-bold tracking-tight">
            Cadence
          </Link>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Courses for developers. Learn at your own pace.
          </p>
        </div>
        <nav className="flex gap-6 text-sm">
          {(signedIn ? SIGNED_IN_LINKS : SIGNED_OUT_LINKS).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-8 text-xs text-muted-foreground">
        © Cadence
      </div>
    </footer>
  );
}
