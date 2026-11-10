import sharp from "sharp";
import { pixelsToBraille, type BrailleOptions } from "./utils/braille-converter";

export { pixelsToBraille };
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
}

/**
 * Converts an image file path or buffer into a Braille ASCII art string.
 *
 * @param input - File path, Buffer, or Uint8Array of the image.
 * @param options - Conversion options including target width, threshold, and invert flag.
 * @returns The converted multi-line Braille string.
 */
export async function convertImageToBraille(
  input: string | Buffer | Uint8Array,
  options: ConvertOptions = {}
): Promise<string> {
  const { width: targetWidth = 120, threshold = 128, invert = false } = options;

  const { data, info } = await sharp(input)
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Handle transparent backgrounds
    .resize({
      width: targetWidth,
      withoutEnlargement: true,
    })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const lines: string[] = [];

  for (let y = 0; y < height; y += 4) {
    const row: string[] = [];
    for (let x = 0; x < width; x += 2) {
      row.push(
        pixelsToBraille(x, y, width, height, data, {
          threshold,
          invert,
        })
      );
    }
    lines.push(row.join(""));
  }

  return lines.join("\n");
}

// Alias for convenience
export const convertToBraille = convertImageToBraille;

