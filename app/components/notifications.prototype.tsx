// PROTOTYPE — throwaway. Question (wayfinder ticket "How are notifications shown
// in the app?"): how do notifications appear in Cadence?
// Three variants inside the real app layout, switch with ?variant=A|B|C (or ←/→).
// Mock data per signed-in role (switch users in the DevUI panel). No Novu, no
// persistence: read state lives in memory and resets on reload.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Bell, Check, ChevronDown, Inbox, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";
import {
  PrototypeSwitcher,
  usePrototypeVariant,
  type PrototypeVariant,
} from "~/components/prototype-switcher";

// ─── Mock data ───

type Kind =
  | "refund-decided"
  | "refund-open"
  | "question"
  | "reply"
  | "seat-claimed";

type Note = {
  id: string;
  kind: Kind;
  text: string;
  quote?: string;
  href: string;
  minutesAgo: number;
  read: boolean;
  expectsAction: boolean;
  /** Set when an action-expecting notification has been dealt with in Cadence. */
  handled?: string;
};

function mockFor(role: UserRole | null, isTeamAdmin: boolean): Note[] {
  if (role === UserRole.Admin)
    return [
      {
        id: "a1",
        kind: "refund-open",
        text: "Maria Gomez asked for a refund on Intro to TypeScript (Individual Purchase)",
        quote: "The course was more basic than I expected from the description.",
        href: "/admin/refunds",
        minutesAgo: 12,
        read: false,
        expectsAction: true,
      },
      {
        id: "a2",
        kind: "refund-open",
        text: "Acme Corp's Team Admin asked for a refund on React Fundamentals (Team Licence)",
        quote: "We bought the wrong course for our team, none of the seats are used.",
        href: "/admin/refunds",
        minutesAgo: 95,
        read: false,
        expectsAction: true,
        handled: "Approved by Ben Admin",
      },
      {
        id: "a3",
        kind: "refund-open",
        text: "Liam Chen asked for a refund on Node.js in Depth (Individual Purchase)",
        quote: "Audio quality in module 3 is unusable.",
        href: "/admin/refunds",
        minutesAgo: 60 * 26,
        read: true,
        expectsAction: true,
      },
      {
        id: "a4",
        kind: "refund-open",
        text: "Sofia Rossi asked for a refund on CSS Layouts (Individual Purchase)",
        quote: "Changed my mind.",
        href: "/admin/refunds",
        minutesAgo: 60 * 50,
        read: true,
        expectsAction: true,
        handled: "Declined by you",
      },
    ];

  if (role === UserRole.Instructor)
    return [
      {
        id: "i1",
        kind: "question",
        text: "Priya Patel asked a question on Generics in practice in Intro to TypeScript",
        quote: "Why does `T extends object` reject arrays here? I expected arrays to be objects.",
        href: "/instructor/questions",
        minutesAgo: 8,
        read: false,
        expectsAction: true,
      },
      {
        id: "i2",
        kind: "question",
        text: "Tom Becker asked a question on Setting up Vite in Intro to TypeScript",
        quote: "The tsconfig paths don't resolve after following step 2.",
        href: "/instructor/questions",
        minutesAgo: 140,
        read: false,
        expectsAction: true,
        handled: "Answered by Alex Co-Instructor",
      },
      {
        id: "i3",
        kind: "reply",
        text: "Priya Patel replied to your comment on Narrowing",
        quote: "That fixed it, thanks!",
        href: "/instructor/questions",
        minutesAgo: 60 * 5,
        read: true,
        expectsAction: false,
      },
      {
        id: "i4",
        kind: "question",
        text: "Noah Kim asked a question on Decorators in Intro to TypeScript",
        quote: "Are decorators stage 3 yet?",
        href: "/instructor/questions",
        minutesAgo: 60 * 30,
        read: true,
        expectsAction: true,
      },
    ];

  const student: Note[] = [
    {
      id: "s1",
      kind: "reply",
      text: "Jordan Lee replied to your comment on Generics in practice",
      quote: "You can constrain it with `extends` — lesson 4 covers it.",
      href: "/courses",
      minutesAgo: 20,
      read: false,
      expectsAction: false,
    },
    {
      id: "s2",
      kind: "refund-decided",
      text: "Your refund request for Node.js in Depth was approved. €49.00 is on its way back to you.",
      quote: "Sorry about the audio in module 3 — we're re-recording it.",
      href: "/courses",
      minutesAgo: 60 * 3,
      read: false,
      expectsAction: false,
    },
    {
      id: "s3",
      kind: "reply",
      text: "Sam Rivera replied to your comment on Setting up Vite",
      href: "/courses",
      minutesAgo: 60 * 48,
      read: true,
      expectsAction: false,
    },
  ];

  if (isTeamAdmin)
    return [
      {
        id: "t1",
        kind: "seat-claimed",
        text: "Sam Rivera claimed a seat on React Fundamentals (4 of 10 claimed).",
        href: "/team",
        minutesAgo: 3,
        read: false,
        expectsAction: false,
      },
      {
        id: "t2",
        kind: "seat-claimed",
        text: "Lena Vogel claimed a seat on React Fundamentals (3 of 10 claimed).",
        href: "/team",
        minutesAgo: 45,
        read: false,
        expectsAction: false,
      },
      {
        id: "t3",
        kind: "refund-decided",
        text: "Your refund request for React Fundamentals (Team Licence) was declined.",
        quote: "Two seats were already claimed, so this licence can't be refunded.",
        href: "/team",
        minutesAgo: 60 * 20,
        read: true,
        expectsAction: false,
      },
      ...student,
    ];

  return student;
}

// ─── Shared bits (status chip + time only; layouts are per variant) ───

function ago(min: number) {
  if (min < 60) return `${min}m ago`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 60 / 24)}d ago`;
}

function StatusChip({ n }: { n: Note }) {
  if (!n.expectsAction) return null;
  return n.handled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      <Check className="size-3" />
      {n.handled}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      Needs action
    </span>
  );
}

const needsAction = (n: Note) => n.expectsAction && !n.handled;

// ─── Variant A: bell in the sidebar header, popover list ───

function VariantA({ s }: { s: ReturnType<typeof useNoteState> }) {
  const [open, setOpen] = useState(false);
  const unread = s.items.filter((n) => !n.read).length;
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-56 top-2 z-50 ml-2 flex max-h-[75vh] w-96 flex-col rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold">Notifications</span>
              <button
                onClick={s.markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            </div>
            <ul className="overflow-y-auto">
              {s.items.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <Link
                    to={n.href}
                    onClick={() => {
                      s.open(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-accent",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={cn("text-sm", !n.read && "font-medium")}>
                        {n.text}
                      </p>
                      {n.quote && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          “{n.quote}”
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <StatusChip n={n} />
                        <span className="text-xs text-muted-foreground">
                          {ago(n.minutesAgo)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

// ─── Variant B: "Inbox" nav item + full inbox page with tabs ───

function VariantBNav({
  s,
  onOpen,
  active,
}: {
  s: ReturnType<typeof useNoteState>;
  onOpen: () => void;
  active: boolean;
}) {
  const todo = s.items.filter(needsAction).length;
  const unread = s.items.filter((n) => !n.read).length;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Inbox className="size-4" />
      Inbox
      <span className="ml-auto flex gap-1">
        {todo > 0 && (
          <span
            title="Needs action"
            className="rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white"
          >
            {todo}
          </span>
        )}
        {unread > 0 && (
          <span
            title="Unread"
            className="rounded-full bg-sidebar-accent px-1.5 text-xs text-sidebar-foreground/70"
          >
            {unread}
          </span>
        )}
      </span>
    </button>
  );
}

function VariantBPage({
  s,
  onClose,
}: {
  s: ReturnType<typeof useNoteState>;
  onClose: () => void;
}) {
  const hasAction = s.items.some((n) => n.expectsAction);
  const [tab, setTab] = useState<"todo" | "unread" | "all">(
    hasAction ? "todo" : "unread"
  );
  const shown = s.items.filter((n) =>
    tab === "todo" ? needsAction(n) : tab === "unread" ? !n.read : true
  );
  const tabs = [
    ...(hasAction
      ? [{ key: "todo" as const, label: "Needs action", count: s.items.filter(needsAction).length }]
      : []),
    { key: "unread" as const, label: "Unread", count: s.items.filter((n) => !n.read).length },
    { key: "all" as const, label: "All", count: s.items.length },
  ];
  return (
    <div className="fixed inset-y-0 left-56 right-0 z-30 overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-1 text-xs text-muted-foreground">
          (prototype: stands in for a real /inbox route){" "}
          <button onClick={onClose} className="underline">
            close
          </button>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <button
            onClick={s.markAllRead}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Mark all as read
          </button>
        </div>
        <div className="mb-4 flex gap-1 border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm",
                tab === t.key
                  ? "border-primary font-semibold"
                  : "border-transparent text-muted-foreground"
              )}
            >
              {t.label} <span className="text-muted-foreground">({t.count})</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Nothing here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {shown.map((n) => (
                <tr key={n.id} className="border-b align-top">
                  <td className="w-6 py-3">
                    {!n.read && <span className="mt-1.5 block size-2 rounded-full bg-primary" />}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      to={n.href}
                      onClick={() => {
                        s.open(n.id);
                        onClose();
                      }}
                      className={cn("hover:underline", !n.read && "font-semibold")}
                    >
                      {n.text}
                    </Link>
                    {n.quote && (
                      <p className="mt-1 text-muted-foreground">“{n.quote}”</p>
                    )}
                  </td>
                  <td className="w-48 py-3">
                    <StatusChip n={n} />
                  </td>
                  <td className="w-20 py-3 text-muted-foreground">
                    {ago(n.minutesAgo)}
                  </td>
                  <td className="w-28 py-3 text-right">
                    <button
                      onClick={() => s.toggleRead(n.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark {n.read ? "unread" : "read"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Variant C: toasts on arrival + right-hand drawer grouped To do / Updates / Done ───

function VariantC({ s }: { s: ReturnType<typeof useNoteState> }) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const toasted = useRef(false);

  useEffect(() => {
    if (toasted.current) return;
    toasted.current = true;
    const unread = s.items.filter((n) => !n.read);
    unread.slice(0, 2).forEach((n) =>
      toast(n.text, {
        description: needsAction(n) ? "Needs action" : undefined,
        action: { label: "View", onClick: () => setOpen(true) },
      })
    );
    if (unread.length > 2)
      toast(`+${unread.length - 2} more notifications`, {
        action: { label: "Open", onClick: () => setOpen(true) },
      });
  }, [s.items]);

  const todo = s.items.filter(needsAction);
  const done = s.items.filter((n) => n.expectsAction && n.handled);
  const updates = s.items.filter((n) => !n.expectsAction);
  const unread = s.items.filter((n) => !n.read).length;

  const card = (n: Note) => (
    <Link
      key={n.id}
      to={n.href}
      onClick={() => {
        s.open(n.id);
        setOpen(false);
      }}
      className={cn(
        "block rounded-lg border p-3 hover:border-primary",
        !n.read ? "border-l-4 border-l-primary" : "opacity-80"
      )}
    >
      <p className="text-sm">{n.text}</p>
      {n.quote && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{n.quote}”</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <StatusChip n={n} />
        <span className="text-xs text-muted-foreground">{ago(n.minutesAgo)}</span>
      </div>
    </Link>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-3 z-30 flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
      >
        <Bell className="size-4" />
        {todo.length > 0 ? (
          <span className="font-semibold text-amber-600">{todo.length} to do</span>
        ) : (
          <span>{unread} new</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[420px] flex-col border-l bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="text-lg font-semibold">Notifications</span>
              <div className="flex items-center gap-3">
                <button onClick={s.markAllRead} className="text-xs text-primary hover:underline">
                  Mark all as read
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {todo.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    To do ({todo.length})
                  </h2>
                  {todo.map(card)}
                </section>
              )}
              {updates.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Updates
                  </h2>
                  {updates.map(card)}
                </section>
              )}
              {done.length > 0 && (
                <section className="space-y-2">
                  <button
                    onClick={() => setShowDone((d) => !d)}
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <ChevronDown className={cn("size-3", !showDone && "-rotate-90")} />
                    Done ({done.length})
                  </button>
                  {showDone && done.map(card)}
                </section>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ─── State + wiring ───

function useNoteState(role: UserRole | null, isTeamAdmin: boolean) {
  const [items, setItems] = useState(() => mockFor(role, isTeamAdmin));
  useEffect(() => setItems(mockFor(role, isTeamAdmin)), [role, isTeamAdmin]);
  const set = (id: string, read: (n: Note) => boolean) =>
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: read(n) } : n)));
  return {
    items,
    open: (id: string) => set(id, () => true),
    toggleRead: (id: string) => set(id, (n) => !n.read),
    markAllRead: () => setItems((xs) => xs.map((n) => ({ ...n, read: true }))),
  };
}

const VARIANTS: PrototypeVariant[] = [
  { key: "A", name: "Bell + popover" },
  { key: "B", name: "Inbox page" },
  { key: "C", name: "Toasts + drawer" },
];

/** Returns the pieces the app layout mounts into its slots. */
export function useNotificationsPrototype(
  role: UserRole | null,
  isTeamAdmin: boolean
): { header: ReactNode; nav: ReactNode; overlay: ReactNode } {
  const variant = usePrototypeVariant(VARIANTS);
  const s = useNoteState(role, isTeamAdmin);
  const [inboxOpen, setInboxOpen] = useState(false);
  useEffect(() => setInboxOpen(false), [variant.key]);

  if (!role)
    return { header: null, nav: null, overlay: <PrototypeSwitcher variants={VARIANTS} current={variant} /> };

  return {
    header: variant.key === "A" ? <VariantA s={s} /> : null,
    nav:
      variant.key === "B" ? (
        <VariantBNav s={s} active={inboxOpen} onOpen={() => setInboxOpen(true)} />
      ) : null,
    overlay: (
      <>
        {variant.key === "B" && inboxOpen && (
          <VariantBPage s={s} onClose={() => setInboxOpen(false)} />
        )}
        {variant.key === "C" && <VariantC key={role} s={s} />}
        <PrototypeSwitcher variants={VARIANTS} current={variant} />
      </>
    ),
  };
}
