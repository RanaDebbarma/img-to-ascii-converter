import sharp from "sharp";
import { applyFloydSteinbergDither } from "../utils/dither";
import { rgbColor } from "../utils/ansi";
import type { ConvertOptions } from "../types";

const BRAILLE_BASE = 0x2800;

// Standard Braille 2x4 dot mapping:
// Col 0: Dot 1 (bit 0 = 1), Dot 2 (bit 1 = 2), Dot 3 (bit 2 = 4), Dot 7 (bit 6 = 64)
// Col 1: Dot 4 (bit 3 = 8), Dot 5 (bit 4 = 16), Dot 6 (bit 5 = 32), Dot 8 (bit 7 = 128)
const DOT_MAP: readonly (readonly number[])[] = [
  [1, 8], // dy = 0: Dot 1, Dot 4
  [2, 16], // dy = 1: Dot 2, Dot 5
  [4, 32], // dy = 2: Dot 3, Dot 6
  [64, 128], // dy = 3: Dot 7, Dot 8
];

export interface BrailleOptions {
  threshold?: number;
  invert?: boolean;
}

/**
 * Converts a 2x4 sub-pixel block into a single Unicode Braille character.
 */
export function pixelsToBraille(
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array | Buffer,
  options: BrailleOptions = {}
): string {
  const { threshold = 128, invert = false } = options;
  let pattern = 0;

  for (let dy = 0; dy < 4; dy++) {
    const py = y + dy;
    if (py >= height) break;

    const rowOffset = py * width;
    const dotRow = DOT_MAP[dy]!;

    for (let dx = 0; dx < 2; dx++) {
      const px = x + dx;
      if (px >= width) continue;

      const pixel = data[rowOffset + px] ?? 0;
      const isLit = invert ? pixel < threshold : pixel >= threshold;

      if (isLit) {
        pattern |= dotRow[dx]!;
      }
    }
  }

  return String.fromCharCode(BRAILLE_BASE + pattern);
}

/**
 * Converts an image file path or buffer into a Braille ASCII art string.
 */
export async function convertImageToBraille(
  input: string | Buffer | Uint8Array,
  options: ConvertOptions = {}
): Promise<string> {
  const {
    width: targetWidth = 120,
    threshold = 128,
    invert = false,
    dither = false,
    color = false,
  } = options;

  let pipeline = sharp(input)
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Handle transparent backgrounds
    .resize({
      width: targetWidth,
      withoutEnlargement: true,
    });

  if (!color) {
    pipeline = pipeline.greyscale();
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Extract luminance channel
  let luminance: Uint8Array;
  if (channels === 1) {
    luminance = data;
  } else {
    luminance = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const offset = i * channels;
      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      luminance[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  const pixels = dither ? applyFloydSteinbergDither(luminance, width, height, threshold) : luminance;
  const lines: string[] = [];

  for (let y = 0; y < height; y += 4) {
    let row = "";
    for (let x = 0; x < width; x += 2) {
      const char = pixelsToBraille(x, y, width, height, pixels, {
        threshold,
        invert,
      });

      if (!color || char === "\u2800") {
        row += char;
        continue;
      }

      // Calculate representative RGB color for the lit pixels in this 2x4 cell
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let litCount = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let totalCount = 0;

      for (let dy = 0; dy < 4 && y + dy < height; dy++) {
        const py = y + dy;
        const rowOffset = py * width;
        for (let dx = 0; dx < 2 && x + dx < width; dx++) {
          const px = x + dx;
          const pIdx = rowOffset + px;
          const pixelVal = pixels[pIdx] ?? 0;
          const isLit = invert ? pixelVal < threshold : pixelVal >= threshold;

          const rgbOffset = pIdx * channels;
          const r = data[rgbOffset] ?? 0;
          const g = data[rgbOffset + 1] ?? 0;
          const b = data[rgbOffset + 2] ?? 0;

          totalR += r;
          totalG += g;
          totalB += b;
          totalCount++;

          if (isLit) {
            rSum += r;
            gSum += g;
            bSum += b;
            litCount++;
          }
        }
      }

      const r = litCount > 0 ? Math.round(rSum / litCount) : Math.round(totalR / (totalCount || 1));
      const g = litCount > 0 ? Math.round(gSum / litCount) : Math.round(totalG / (totalCount || 1));
      const b = litCount > 0 ? Math.round(bSum / litCount) : Math.round(totalB / (totalCount || 1));

      row += rgbColor(r, g, b, char);
    }
    lines.push(row);
  }

  return lines.join("\n");
}

