import { describe, expect, it } from "vitest";
import {
  formatHoursMinutes,
  formatPrintTime,
  parsePrintTime,
} from "@/shared/lib/printTime";

describe("parsePrintTime (MakerWorld style)", () => {
  it.each([
    ["5.3", 5.3],
    ["5,3", 5.3],
    ["5.3 h", 5.3],
    ["5.3h", 5.3],
    [" 6 ", 6],
    ["30 min", 0.5],
    ["30min", 0.5],
    ["30m", 0.5],
    ["36 MIN", 0.6],
    ["90 min", 1.5],
  ])("reads %j as %s hours", (input, hours) => {
    expect(parsePrintTime(input)).toBeCloseTo(hours, 10);
  });

  it.each(["", "abc", "5h18", "1:40", "-2", "5.3 days"])(
    "rejects %j",
    (input) => {
      expect(parsePrintTime(input)).toBeNull();
    },
  );
});

describe("formatPrintTime", () => {
  it("shows minutes under an hour and decimal hours above, like MakerWorld", () => {
    expect(formatPrintTime(0.5)).toBe("30 min");
    expect(formatPrintTime(0.6)).toBe("36 min");
    expect(formatPrintTime(5.3)).toBe("5.3 h");
    expect(formatPrintTime(1)).toBe("1 h");
  });
});

describe("formatHoursMinutes", () => {
  it("gives the clock reading of decimal hours", () => {
    expect(formatHoursMinutes(5.3)).toBe("5h 18min");
    expect(formatHoursMinutes(0.5)).toBe("30min");
    expect(formatHoursMinutes(2)).toBe("2h");
  });
});
