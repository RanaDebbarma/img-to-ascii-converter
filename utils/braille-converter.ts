const BRAILLE_BASE = 0x2800;

// Standard Braille 2x4 dot mapping:
// Col 0: Dot 1 (bit 0 = 1), Dot 2 (bit 1 = 2), Dot 3 (bit 2 = 4), Dot 7 (bit 6 = 64)
// Col 1: Dot 4 (bit 3 = 8), Dot 5 (bit 4 = 16), Dot 6 (bit 5 = 32), Dot 8 (bit 7 = 128)
const DOT_MAP: readonly (readonly number[])[] = [
  [1, 8],     // dy = 0: Dot 1, Dot 4
  [2, 16],    // dy = 1: Dot 2, Dot 5
  [4, 32],    // dy = 2: Dot 3, Dot 6
  [64, 128],  // dy = 3: Dot 7, Dot 8
];

export interface BrailleOptions {
  threshold?: number;
  invert?: boolean;
}

export function pixelsToBraille(
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array | Buffer,
  options: BrailleOptions = {},
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
