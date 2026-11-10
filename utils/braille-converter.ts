const BRAILLE_BASE = 0x2800;
const BRAILLE_PALETTE = Array.from({ length: 256 }, (_, i) =>
  String.fromCharCode(BRAILLE_BASE + i),
);

// console.log(String.fromCharCode(BRAILLE_BASE + 255));
// console.log(BRAILLE_PALLETE.join(""));

const DOT_BITS = [
  1, // Dot 1
  2, // Dot 2
  4, // Dot 3
  64, // Dot 7
  8, // Dot 4
  16, // Dot 5
  32, // Dot 6
  128, // Dot 8
];

export function pixelsToBraille(
  x: number,
  y: number,
  width: number,
  data: Buffer,
) {
  let pattern = 0;
  let i = 0;

  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      const pixel = data[(y + dy) * width + (x + dx)];
      if (pixel! >= 128) {
        pattern |= DOT_BITS[i]!;
      }

      i++;
    }
  }

  return String.fromCharCode(BRAILLE_BASE + pattern);
}
