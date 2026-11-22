import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { LessonPreview } from "./lesson-preview";

type Stat = { value: number; label: string };

export function LandingHero({
  stats,
  signedIn,
}: {
  stats: Stat[];
  signedIn: boolean;
}) {
  return (
    <section className="border-b border-border bg-gradient-to-b from-muted/60 to-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Self-paced courses for developers
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Learn to code,
            <br />
            <span className="text-muted-foreground">at your own pace</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Structured courses built by experienced instructors. Track your
            progress, take quizzes, and build real-world skills.
          </p>
          <HeroActions signedIn={signedIn} />
          <HeroStats stats={stats} />
        </div>
        <LessonPreview />
      </div>
    </section>
  );
}

function HeroActions({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <Button asChild size="lg">
        <Link to="/courses">
          Browse Courses
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        {signedIn ? (
          <Link to="/dashboard">Go to your dashboard</Link>
        ) : (
          <Link to="/signup">Create a free account</Link>
        )}
      </Button>
    </div>
  );
}

function HeroStats({ stats }: { stats: Stat[] }) {
  return (
    <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="text-2xl font-bold">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
