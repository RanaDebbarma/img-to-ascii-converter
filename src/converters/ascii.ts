import sharp from "sharp";
import { applyRampDither } from "../utils/dither";
import { rgbColor } from "../utils/ansi";
import type { ConvertOptions } from "../types";

export const ASCII_RAMP_STANDARD = " .:-=+*#%@";
export const ASCII_RAMP_DETAILED =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/**
 * Vertical aspect ratio scaling factor.
 * Terminal monospace characters are approximately 1.8x to 2.0x taller than they are wide.
 * Scaling vertical height by ~0.55 preserves real-world image proportions.
 */
const TERMINAL_ASPECT_RATIO = 0.55;

/**
 * Converts an image file path or buffer into classic ASCII art using character density ramps.
 */
export async function convertImageToAscii(
  input: string | Buffer | Uint8Array,
  options: ConvertOptions = {}
): Promise<string> {
  const {
    width: targetWidth = 120,
    invert = false,
    dither = false,
    color = false,
    ramp = ASCII_RAMP_STANDARD,
  } = options;

  // Read metadata to calculate aspect-ratio-corrected height
  const metadata = await sharp(input).metadata();
  const origWidth = metadata.width ?? targetWidth;
  const origHeight = metadata.height ?? targetWidth;

  const targetHeight = Math.max(
    1,
    Math.round(targetWidth * (origHeight / origWidth) * TERMINAL_ASPECT_RATIO)
  );

  let pipeline = sharp(input)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(targetWidth, targetHeight, { fit: "fill" });

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

  // Active character ramp (reverse if inverted)
  const activeRamp = invert ? ramp.split("").reverse().join("") : ramp;
  const numLevels = activeRamp.length;

  // Quantized ramp indices for each pixel
  let rampIndices: Uint8Array;
  if (dither) {
    rampIndices = applyRampDither(luminance, width, height, numLevels);
  } else {
    rampIndices = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const val = luminance[i] ?? 0;
      rampIndices[i] = Math.min(numLevels - 1, Math.floor((val / 256) * numLevels));
    }
  }

  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let row = "";
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const pIdx = rowOffset + x;
      const levelIdx = rampIndices[pIdx] ?? 0;
      const char = activeRamp[levelIdx] ?? " ";

      if (!color || char === " ") {
        row += char;
        continue;
      }

      const rgbOffset = pIdx * channels;
      const r = data[rgbOffset] ?? 0;
      const g = data[rgbOffset + 1] ?? 0;
      const b = data[rgbOffset + 2] ?? 0;

      row += rgbColor(r, g, b, char);
    }

    lines.push(row);
  }

  return lines.join("\n");
}

