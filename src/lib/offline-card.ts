import type { EmergencyCard } from "@/lib/emergency/card";

// Browser-only. The patient opts in per profile; the copy lives on their own device and is
// cleared when they log out or delete their account.
const KEY = "ct_offline_cards";

export type SavedCard = { savedAt: string; card: EmergencyCard };

export function readOfflineCards(): Record<string, SavedCard> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(cards: Record<string, SavedCard>) {
  try {
    if (Object.keys(cards).length) localStorage.setItem(KEY, JSON.stringify(cards));
    else localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveOfflineCard(patientId: string, card: EmergencyCard) {
  return write({ ...readOfflineCards(), [patientId]: { savedAt: new Date().toISOString(), card } });
}

export function removeOfflineCard(patientId: string) {
  const cards = readOfflineCards();
  delete cards[patientId];
  return write(cards);
}

export function clearOfflineCards() {
  write({});
}

/** Asks the service worker to re-cache the offline pages (after a new deploy their scripts change). */
export function refreshOfflineCache() {
  navigator.serviceWorker?.controller?.postMessage("refresh-offline");
}
