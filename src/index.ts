import { convertImageToBraille, pixelsToBraille, type BrailleOptions } from "./converters/braille";
import {
  convertImageToAscii,
  ASCII_RAMP_STANDARD,
  ASCII_RAMP_DETAILED,
} from "./converters/ascii";
import { applyFloydSteinbergDither, applyRampDither } from "./utils/dither";
import { copyToClipboard } from "./utils/clipboard";
import { stripAnsi, rgbColor } from "./utils/ansi";
import type { ConvertOptions, RenderMode } from "./types";

/**
 * Converts an image file path or buffer into ASCII or Braille art.
 * Automatically delegates to Braille or classic ASCII based on `options.mode`.
 *
 * @param input - File path, Buffer, or Uint8Array of the image.
 * @param options - Conversion options.
 * @returns Multi-line ASCII or Braille art string.
 */
export async function convertImage(
  input: string | Buffer | Uint8Array,
  options: ConvertOptions = {}
): Promise<string> {
  const mode = options.mode ?? "braille";
  if (mode === "ascii") {
    return convertImageToAscii(input, options);
  }
  return convertImageToBraille(input, options);
}

// Aliases
export const convertToBraille = convertImageToBraille;
export const convertToAscii = convertImageToAscii;

// Re-exports
export {
  convertImageToBraille,
  convertImageToAscii,
  pixelsToBraille,
  applyFloydSteinbergDither,
  applyRampDither,
  copyToClipboard,
  stripAnsi,
  rgbColor,
  ASCII_RAMP_STANDARD,
  ASCII_RAMP_DETAILED,
};

export type { ConvertOptions, RenderMode, BrailleOptions };

