import { describe, expect, it } from "vitest";
import { doseSlots } from "@/lib/normalise/frequency";
import { adherence, DEFAULT_TIMES, readTimes, todaysDoses } from "../schedule";
import type { MedGroup, SafetyMed } from "@/lib/safety/engine";

const med = (id: string, brand: string, frequency: string | null, start_date = "2026-10-01"): SafetyMed => ({
  id,
  brand_name: brand,
  generic_name: null,
  generics: [],
  recognised: true,
  prescriber: "Dr. Suresh",
  start_date,
  duration_days: null,
  dose: "500 mg",
  frequency,
  source_document_id: "doc",
  verified_by_patient: false,
});
const group = (m: SafetyMed, history: SafetyMed[] = []): MedGroup => ({ key: m.brand_name.toLowerCase(), current: m, history, ids: [m.id, ...history.map((h) => h.id)] });

describe("doseSlots", () => {
  it("reads written patterns", () => {
    expect(doseSlots("1-0-1")).toEqual(["morning", "night"]);
    expect(doseSlots("0 0 1")).toEqual(["night"]);
    expect(doseSlots("1-1-1-1")).toEqual(["morning", "afternoon", "evening", "night"]);
    expect(doseSlots("½-0-0")).toEqual(["morning"]);
  });
  it("reads Latin shorthand", () => {
    expect(doseSlots("BD")).toEqual(["morning", "night"]);
    expect(doseSlots("TDS after food")).toEqual(["morning", "afternoon", "night"]);
    expect(doseSlots("HS")).toEqual(["night"]);
    expect(doseSlots("OD")).toEqual(["morning"]);
  });
  it("does not schedule only-when-needed or unknown patterns", () => {
    expect(doseSlots("SOS")).toBeNull();
    expect(doseSlots("as directed")).toBeNull();
    expect(doseSlots(null)).toBeNull();
  });
});

describe("todaysDoses", () => {
  const today = "2026-10-18";
  it("puts each medicine in the slots its pattern names, with today's marks", () => {
    const groups = [group(med("a", "Glycomet", "1-0-1")), group(med("b", "Telma", "OD")), group(med("c", "Dolo", "SOS"))];
    const { slots, unscheduled } = todaysDoses(groups, [{ medication_id: "a", dose_date: today, slot: "morning", status: "taken" }], today, DEFAULT_TIMES);
    expect(slots.map((s) => s.slot)).toEqual(["morning", "night"]);
    expect(slots[0].items.map((i) => [i.name, i.status])).toEqual([["Glycomet", "taken"], ["Telma", null]]);
    expect(slots[1].items.map((i) => [i.name, i.status])).toEqual([["Glycomet", null]]);
    expect(unscheduled).toEqual(["Dolo"]);
  });
  it("counts a mark against an earlier prescription of the same medicine", () => {
    const groups = [group(med("new", "Glycomet", "1-0-0"), [med("old", "Glycomet", "1-0-0", "2026-09-01")])];
    const { slots } = todaysDoses(groups, [{ medication_id: "old", dose_date: today, slot: "morning", status: "skipped" }], today, DEFAULT_TIMES);
    expect(slots[0].items[0].status).toBe("skipped");
  });
});

describe("adherence", () => {
  const today = "2026-10-18";
  it("counts the last 7 full days, not today", () => {
    const logs = [
      { medication_id: "a", dose_date: "2026-10-17", slot: "morning", status: "taken" },
      { medication_id: "a", dose_date: "2026-10-17", slot: "night", status: "skipped" },
      { medication_id: "a", dose_date: "2026-10-18", slot: "morning", status: "taken" },
      { medication_id: "a", dose_date: "2026-10-05", slot: "morning", status: "taken" },
    ];
    expect(adherence([group(med("a", "Glycomet", "1-0-1"))], logs, today)).toEqual([{ key: "glycomet", name: "Glycomet", expected: 14, taken: 1, skipped: 1 }]);
  });
  it("starts counting on the day the medicine was started", () => {
    const [a] = adherence([group(med("a", "Telma", "OD", "2026-10-15"))], [], today);
    expect(a.expected).toBe(3);
  });
  it("leaves out medicines started today and ones without a schedule", () => {
    expect(adherence([group(med("a", "Telma", "OD", today)), group(med("b", "Dolo", "SOS"))], [], today)).toEqual([]);
  });
});

describe("readTimes", () => {
  it("fills missing or malformed times with the defaults", () => {
    expect(readTimes({ morning: "07:30" })).toEqual({ ...DEFAULT_TIMES, morning: "07:30" });
    expect(readTimes({ morning: "7am" })).toEqual(DEFAULT_TIMES);
    expect(readTimes(null)).toEqual(DEFAULT_TIMES);
  });
});
