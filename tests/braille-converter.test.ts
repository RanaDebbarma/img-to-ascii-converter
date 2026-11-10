import { describe, expect, it } from "bun:test";
import { pixelsToBraille } from "../src/converters/braille";

describe("pixelsToBraille", () => {
  it("renders empty cell when all pixels are dark", () => {
    const data = new Uint8Array(8);
    const result = pixelsToBraille(0, 0, 2, 4, data);
    expect(result).toBe("\u2800"); // ⠀
  });

  it("renders fully filled cell when all pixels are bright", () => {
    const data = new Uint8Array(8).fill(255);
    const result = pixelsToBraille(0, 0, 2, 4, data);
    expect(result).toBe("\u28FF"); // ⣿
  });

  it("maps each individual dot to its correct standard Unicode position", () => {
    const dotCases: [name: string, dx: number, dy: number, expectedChar: string][] = [
      ["Dot 1 (top-left)", 0, 0, "⠁"],
      ["Dot 2 (row 2, left)", 0, 1, "⠂"],
      ["Dot 3 (row 3, left)", 0, 2, "⠄"],
      ["Dot 7 (bottom-left)", 0, 3, "⡀"],
      ["Dot 4 (top-right)", 1, 0, "⠈"],
      ["Dot 5 (row 2, right)", 1, 1, "⠐"],
      ["Dot 6 (row 3, right)", 1, 2, "⠠"],
      ["Dot 8 (bottom-right)", 1, 3, "⢀"],
    ];

    for (const [name, dx, dy, expectedChar] of dotCases) {
      const data = new Uint8Array(8);
      data[dy * 2 + dx] = 255;
      const char = pixelsToBraille(0, 0, 2, 4, data);
      expect(char).toBe(expectedChar);
    }
  });

  it("respects threshold and invert options", () => {
    const data = new Uint8Array([50, 150]);
    // Normal: 50 < 100 (off), 150 >= 100 (on, dot 4)
    expect(pixelsToBraille(0, 0, 2, 1, data, { threshold: 100 })).toBe("⠈");

    // Invert: 50 < 100 (on, dot 1), 150 >= 100 (off)
    expect(pixelsToBraille(0, 0, 2, 1, data, { threshold: 100, invert: true })).toBe("⠁");
  });

  it("safely handles odd widths and partial bounds without leaking", () => {
    // 3x2 image:
    // [255, 0, 255]
    // [0, 255, 0]
    const data = new Uint8Array([255, 0, 255, 0, 255, 0]);
    // Access at x = 2, width = 3 (only col dx=0 is within width=3, dx=1 would be out of bounds x+1=3 >= 3)
    const char = pixelsToBraille(2, 0, 3, 2, data);
    // At x=2, dy=0: px=2 is 255 (Dot 1). dx=1 is out-of-bounds (skipped).
    // At x=2, dy=1: px=2 is 0.
    // dy=2, 3 are >= height=2 (skipped).
    expect(char).toBe("⠁");
  });

  it("stripAnsi removes ANSI escape sequences correctly", async () => {
    const { stripAnsi } = await import("../index");
    const colored = "\x1b[38;2;255;0;128m⣿\x1b[0m \x1b[32mhello\x1b[0m";
    expect(stripAnsi(colored)).toBe("⣿ hello");
  });
});

