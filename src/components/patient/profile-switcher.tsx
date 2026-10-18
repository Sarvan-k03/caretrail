"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, Check, UsersThree } from "@phosphor-icons/react";
import { switchProfile } from "@/app/(patient)/profile/actions";
import { RELATIONSHIP_LABELS } from "@/lib/schemas/profile";
import { cn } from "@/lib/cn";

type Profile = { id: string; name: string; relationship: string };

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Header control for families: shows whose record is open and switches to another profile. */
export function ProfileSwitcher({ profiles, activeId }: { profiles: Profile[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-pill border border-rule bg-sheet py-1 pr-2 pl-1 font-semibold transition-colors duration-150 hover:border-rule-strong sm:pr-3"
      >
        <span aria-hidden className="flex size-9 items-center justify-center rounded-pill bg-primary-soft text-primary">{initial(active.name)}</span>
        <span className="hidden max-w-32 truncate sm:inline">{active.name.split(" ")[0]}</span>
        <span className="sr-only">Viewing the record of {active.name}. Switch profile</span>
        <CaretDown aria-hidden className="size-4 text-ink-2" />
      </button>
      {open ? (
        // Phones: full width under the header, since the button sits mid-header and a right-aligned panel runs off-screen.
        <div id={panelId} className="fixed inset-x-4 top-20 z-30 rounded-card border border-rule bg-sheet p-2 shadow-float sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-72">
          <p className="px-3 pt-2 pb-1 text-meta font-semibold text-ink-2">Whose record?</p>
          <ul>
            {profiles.map((p) => (
              <li key={p.id}>
                <form action={switchProfile}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    aria-current={p.id === active.id ? "true" : undefined}
                    className={cn("flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-sheet-sunk", p.id === active.id && "bg-primary-soft")}
                  >
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-sheet-sunk font-bold">{initial(p.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block text-meta text-ink-2">{RELATIONSHIP_LABELS[p.relationship] ?? "Family"}</span>
                    </span>
                    {p.id === active.id ? <Check aria-hidden weight="bold" className="size-5 text-primary" /> : null}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <Link href="/profile#family" onClick={() => setOpen(false)} className="mt-1 flex min-h-12 items-center gap-2 rounded-control border-t border-rule px-3 font-semibold text-primary hover:bg-primary-soft">
            <UsersThree aria-hidden className="size-5" /> Manage family profiles
          </Link>
        </div>
      ) : null}
    </div>
  );
}
