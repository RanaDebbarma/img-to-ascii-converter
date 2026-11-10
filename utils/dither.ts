/**
 * Applies Floyd-Steinberg error diffusion dithering to an 8-bit grayscale pixel buffer.
 *
 * Distributes quantization error to neighboring pixels using the standard kernel:
 *         [ * ]   7/16
 *  3/16   5/16   1/16
 *
 * @param data - Raw 8-bit grayscale pixel buffer.
 * @param width - Width of the image in pixels.
 * @param height - Height of the image in pixels.
 * @param threshold - Luminance cutoff threshold (default: 128).
 * @returns A new Uint8Array where all pixels are quantized to either 0 or 255 with diffused errors.
 */
export function applyFloydSteinbergDither(
  data: Uint8Array | Buffer,
  width: number,
  height: number,
  threshold: number = 128
): Uint8Array {
  // Use Float32Array to avoid uint8 overflow/underflow when accumulating negative or >255 errors
  const buffer = new Float32Array(data);
  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const nextRowOffset = (y + 1) * width;
    const hasNextRow = y + 1 < height;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const currentVal = buffer[idx]!;

      // Quantize to 0 or 255
      const quantized = currentVal >= threshold ? 255 : 0;
      output[idx] = quantized;

      const error = currentVal - quantized;

      // Distribute error to neighboring pixels:
      // Pixel right (x + 1, y) : 7/16
      if (x + 1 < width) {
        buffer[idx + 1] = (buffer[idx + 1] ?? 0) + error * (7 / 16);
      }

      if (hasNextRow) {
        // Pixel down-left (x - 1, y + 1) : 3/16
        if (x > 0) {
          buffer[nextRowOffset + x - 1] = (buffer[nextRowOffset + x - 1] ?? 0) + error * (3 / 16);
        }
        // Pixel down (x, y + 1) : 5/16
        buffer[nextRowOffset + x] = (buffer[nextRowOffset + x] ?? 0) + error * (5 / 16);
        // Pixel down-right (x + 1, y + 1) : 1/16
        if (x + 1 < width) {
          buffer[nextRowOffset + x + 1] = (buffer[nextRowOffset + x + 1] ?? 0) + error * (1 / 16);
        }
      }
    }
  }

  return output;
}
