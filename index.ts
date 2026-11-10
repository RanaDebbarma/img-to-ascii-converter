const BRAILLE_BASE = 0x2800;
const BRAILLE_PALLETE = Array.from(
  { length: 256 },
  (_, i) => String.fromCharCode(BRAILLE_BASE + i)
);

console.log(String.fromCharCode(BRAILLE_BASE + 255));
// console.log(BRAILLE_PALLETE.join(""));