import { describe, expect, it } from "bun:test";
import { ASCII_RAMP_STANDARD, convertImageToAscii } from "../src/converters/ascii";
import sharp from "sharp";

describe("ASCII converter", () => {
  it("exposes valid ASCII ramp constants", () => {
    expect(ASCII_RAMP_STANDARD.length).toBeGreaterThan(0);
    expect(ASCII_RAMP_STANDARD[0]).toBe(" ");
    expect(ASCII_RAMP_STANDARD[ASCII_RAMP_STANDARD.length - 1]).toBe("@");
  });

  it("converts a solid white image to dark characters with standard ramp", async () => {
    // 10x10 white image
    const whiteImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const result = await convertImageToAscii(whiteImage, { width: 10 });
    const lines = result.trim().split("\n");

    // All pixels are 255 (brightest), so should map to the densest char '@'
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]!.length).toBe(10);
    expect(lines[0]!).toBe("@@@@@@@@@@");
  });

  it("converts a solid black image to spaces with standard ramp", async () => {
    // 10x10 black image
    const blackImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await convertImageToAscii(blackImage, { width: 10 });
    const lines = result.split("\n");

    // All pixels are 0 (darkest), so should map to ' '
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]!).toBe("          ");
  });

  it("respects invert option", async () => {
    // White image with invert=true should map to ' '
    const whiteImage = await sharp({
      create: {
        width: 5,
        height: 5,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const result = await convertImageToAscii(whiteImage, { width: 5, invert: true });
    const lines = result.split("\n");
    expect(lines[0]!).toBe("     ");
  });
});
