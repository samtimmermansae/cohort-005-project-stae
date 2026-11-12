// PROTOTYPE tooling — throwaway. Floating bar for flipping between UI variants
// via the `?variant=` search param. Never shown in production builds.
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PrototypeVariant = { key: string; name: string };

export function usePrototypeVariant(variants: PrototypeVariant[]) {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("variant");
  return variants.find((v) => v.key === requested) ?? variants[0];
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: PrototypeVariant[];
  current: PrototypeVariant;
}) {
  const [, setSearchParams] = useSearchParams();

  function go(step: number) {
    const i = variants.findIndex((v) => v.key === current.key);
    const next = variants[(i + step + variants.length) % variants.length];
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("variant", next.key);
        return p;
      },
      { replace: true, preventScrollReset: true }
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1.5 text-sm text-white shadow-xl ring-2 ring-fuchsia-500">
      <button
        onClick={() => go(-1)}
        className="rounded-full p-1 hover:bg-white/20"
        aria-label="Previous variant"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 font-mono">
        PROTOTYPE {current.key} ({current.name})
      </span>
      <button
        onClick={() => go(1)}
        className="rounded-full p-1 hover:bg-white/20"
        aria-label="Next variant"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
