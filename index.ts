import sharp from "sharp";
import { pixelsToBraille, type BrailleOptions } from "./utils/braille-converter";
import { copyToClipboard } from "./utils/clipboard";
import { applyFloydSteinbergDither } from "./utils/dither";

/**
 * Strips ANSI color and formatting escape codes from a string.
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export { pixelsToBraille, copyToClipboard, applyFloydSteinbergDither };
export type { BrailleOptions };

export interface ConvertOptions {
  /**
   * Target width in dots/characters (default: 120).
   */
  width?: number;
  /**
   * Brightness cutoff threshold between 0 and 255 (default: 128).
   */
  threshold?: number;
  /**
   * Invert light and dark pixels (default: false).
   */
  invert?: boolean;
  /**
   * Apply Floyd-Steinberg error diffusion dithering for smooth shading gradients (default: false).
   */
  dither?: boolean;
  /**
   * Enable 24-bit Truecolor ANSI color codes for terminal rendering (default: false).
   */
  color?: boolean;
}

/**
 * Converts an image file path or buffer into a Braille ASCII art string.
 *
 * @param input - File path, Buffer, or Uint8Array of the image.
 * @param options - Conversion options including target width, threshold, invert, dither, and color.
 * @returns The converted multi-line Braille string.
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

      row += `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
    }
    lines.push(row);
  }

  return lines.join("\n");
}

// Alias for convenience
export const convertToBraille = convertImageToBraille;

