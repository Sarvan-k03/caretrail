// Browser-only switch for dose reminders. It is per device: a carer may want reminders on their phone,
// not on a shared computer.
const KEY = "ct_reminders";
export const REMINDERS_CHANGED = "ct-reminders-changed";

export function remindersOn() {
  try {
    return localStorage.getItem(KEY) === "on" && "Notification" in window && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export function setReminders(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "on");
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing: reminders simply stay off.
  }
  window.dispatchEvent(new Event(REMINDERS_CHANGED));
}

/** Shown through the service worker when there is one, so it works from an installed app too. */
export async function showReminder(title: string, body: string, tag: string) {
  const options = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) return reg.showNotification(title, options);
  new Notification(title, options);
}
