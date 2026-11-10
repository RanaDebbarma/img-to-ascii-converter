import { describe, expect, it } from "bun:test";
import { applyFloydSteinbergDither } from "../utils/dither";

describe("applyFloydSteinbergDither", () => {
  it("leaves all-black image as 0", () => {
    const input = new Uint8Array(16).fill(0);
    const result = applyFloydSteinbergDither(input, 4, 4);
    expect(Array.from(result)).toEqual(new Array(16).fill(0));
  });

  it("leaves all-white image as 255", () => {
    const input = new Uint8Array(16).fill(255);
    const result = applyFloydSteinbergDither(input, 4, 4);
    expect(Array.from(result)).toEqual(new Array(16).fill(255));
  });

  it("quantizes all pixels strictly to 0 or 255", () => {
    // Gradient buffer from 0 to 255
    const input = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      input[i] = Math.floor((i / 64) * 255);
    }

    const result = applyFloydSteinbergDither(input, 8, 8);
    for (let i = 0; i < result.length; i++) {
      expect(result[i] === 0 || result[i] === 255).toBe(true);
    }
  });

  it("diffuses midtone error into an alternating stipple pattern", () => {
    // 50% gray image (128)
    const input = new Uint8Array(16).fill(128);
    const result = applyFloydSteinbergDither(input, 4, 4, 128);

    // Expect a mix of 0s and 255s due to error diffusion, not all 0 or all 255
    const zeros = result.filter((v) => v === 0).length;
    const whites = result.filter((v) => v === 255).length;

    expect(zeros).toBeGreaterThan(0);
    expect(whites).toBeGreaterThan(0);
    expect(zeros + whites).toBe(16);
  });
});

