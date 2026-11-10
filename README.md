# img-to-ascii-converter

Convert images into Braille-based ASCII art in your terminal or use programmatically as a library.

## Prerequisites

- [Bun](https://bun.com) runtime

## Installation

```bash
bun install
```

## CLI Usage

### Interactive Mode (Dynamic Inputs)
Simply run `img2ascii` without parameters to be prompted for the image and optional settings:
```bash
img2ascii
```

### Direct Arguments Mode
Provide arguments directly via the command line:
```bash
img2ascii ./photo.png --width=100 --dither --copy
```

### CLI Options

- `<image-path>`: Path to the image file (required; or prompted interactively)
- `--width=<number>`: Target image width in characters (default: `120`)
- `--color`, `-C`: Enable 24-bit Truecolor ANSI rendering in terminal
- `--no-color`: Disable colors (default: monochrome)
- `--dither`: Apply Floyd-Steinberg error diffusion dithering for smooth shading
- `--no-dither`: Disable dithering (default: hard cutoff)
- `--threshold=<0-255>`: Brightness cutoff threshold (default: `128`)
- `--invert`: Invert light and dark pixels (useful for switching between dark/light terminal themes)
- `--copy`, `-c`: Copy output to clipboard immediately
- `--no-copy`: Skip copying output to clipboard
- `--interactive`, `-i`: Force interactive prompt mode
- `--help`, `-h`: Show usage instructions

---

## Programmatic Library Usage

You can also import and use the converter directly in your own TypeScript/JavaScript code:

```ts
import { convertImageToBraille } from "./index";

const brailleArt = await convertImageToBraille("./assets/dragon.jpg", {
  width: 100,
  threshold: 128,
  invert: false,
});

console.log(brailleArt);
```

---

## Development & Testing

```bash
# Run tests
bun test

# Type check
bun run typecheck
```
