"use client";

import { SignOut } from "@phosphor-icons/react";
import { logout } from "@/app/(auth)/actions";
import { buttonClass } from "@/components/ui/button";
import { clearOfflineCards } from "@/lib/offline-card";

/** Logging out also removes any emergency card copies saved on this device. */
export function LogoutButton() {
  return (
    <form action={logout} onSubmit={clearOfflineCards}>
      <button type="submit" className={buttonClass("quiet", "dense")}>
        <SignOut aria-hidden className="size-5" />
        <span className="hidden sm:inline">Log out</span>
        <span className="sr-only sm:hidden">Log out</span>
      </button>
    </form>
  );
}
