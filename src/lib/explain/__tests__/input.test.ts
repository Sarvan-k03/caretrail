import { describe, expect, it } from "vitest";
import { attachToRows, explainInput, labStatus, type LabForExplain } from "../input";

const lab = (over: Partial<LabForExplain>): LabForExplain => ({
  id: "1",
  test_name: "HbA1c",
  value: 7.2,
  value_text: "7.2",
  unit: "%",
  ref_low: 4,
  ref_high: 5.6,
  ref_range_text: "4.0 - 5.6",
  ...over,
});

describe("labStatus", () => {
  it("compares with the lab's printed range", () => {
    expect(labStatus(lab({}))).toBe("above");
    expect(labStatus(lab({ value: 3.1 }))).toBe("below");
    expect(labStatus(lab({ value: 5.6 }))).toBe("within");
  });
  it("handles one-sided and missing ranges", () => {
    expect(labStatus(lab({ ref_low: null, ref_high: 200, value: 180 }))).toBe("within");
    expect(labStatus(lab({ ref_low: 40, ref_high: null, value: 35 }))).toBe("below");
    expect(labStatus(lab({ ref_low: null, ref_high: null }))).toBe("no_range");
    expect(labStatus(lab({ value: null }))).toBe("no_range");
  });
});

describe("explainInput", () => {
  it("sends only test facts, with a range text even when none was printed", () => {
    expect(explainInput([lab({ ref_range_text: null })])).toEqual([{ id: "1", test: "HbA1c", value: "7.2", unit: "%", range: "4-5.6", status: "above" }]);
  });
});

describe("attachToRows", () => {
  const input = [
    { id: "a", test: "HbA1c" },
    { id: "b", test: "Fasting Blood Sugar" },
    { id: "c", test: "TSH" },
  ];
  it("matches by position, then by name, and drops what does not match", () => {
    const out = {
      summary: "s",
      questions: [],
      items: [
        { test: "HbA1c", measures: "m1", meaning: "x1" },
        { test: "TSH", measures: "m3", meaning: "x3" },
        { test: "fasting blood sugar", measures: "m2", meaning: "x2" },
      ],
    };
    expect(attachToRows(input, out).items).toEqual([
      { id: "a", measures: "m1", meaning: "x1" },
      { id: "b", measures: "m2", meaning: "x2" },
      { id: "c", measures: "m3", meaning: "x3" },
    ]);
    expect(attachToRows(input, { ...out, items: [{ test: "Vitamin D", measures: "", meaning: "" }] }).items).toEqual([]);
  });
});
