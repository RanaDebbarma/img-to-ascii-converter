# img-to-ascii-converter

Convert images into high-resolution Braille or classic ASCII art in your terminal, with support for 24-bit Truecolor, Floyd-Steinberg dithering, and clipboard export.

## Prerequisites

- [Bun](https://bun.com) runtime

## Installation

```bash
bun install
```

To make `img2ascii` globally executable anywhere in your terminal:
```bash
bun link
```

---

## CLI Usage

### Interactive Mode
Run without arguments to interactively configure settings on the same line:
```bash
img2ascii
```
Prompts:
```text
? Image path: ./photo.png
? Render mode (braille / ascii) [braille]: 
? Target width in characters [120]: 
? Enable color output? (y/N) [N]: 
? Apply dithering for smooth shading? (y/N) [N]: 
? Invert light/dark? (y/N) [N]: 
? Copy output to clipboard? (y/N) [N]: 
```

### Direct Arguments Mode
```bash
# High-resolution Braille (default)
img2ascii ./photo.png --dither --color

# Classic ASCII density characters (@%#*+=-:. )
img2ascii ./photo.png --ascii --width=80

# Classic ASCII in Truecolor with dithering, copied to clipboard
img2ascii ./photo.png --ascii --color --dither --copy
```

### CLI Options

- `<image-path>`: Path to the image file (drag-and-drop supported)
- `--braille`: Render using 2x4 Unicode Braille dots (default)
- `--ascii`: Render using classic ASCII density characters
- `--mode=<braille|ascii>`: Explicitly select render mode
- `--width=<number>`: Target image width in characters (default: `120`)
- `--color`, `-C`: Enable 24-bit Truecolor ANSI rendering in terminal
- `--no-color`: Disable colors (monochrome)
- `--dither`: Apply Floyd-Steinberg error diffusion dithering
- `--no-dither`: Disable dithering (default)
- `--threshold=<0-255>`: Brightness cutoff threshold for Braille (default: `128`)
- `--invert`: Invert light and dark pixels
- `--copy`, `-c`: Copy output to clipboard immediately
- `--no-copy`: Skip copying output to clipboard
- `--interactive`, `-i`: Force interactive prompt mode
- `--help`, `-h`: Show usage instructions

---

## Programmatic Library Usage

```ts
import { convertImage, convertImageToBraille, convertImageToAscii } from "./index";

// 1. Unified function (defaults to braille)
const art = await convertImage("./photo.png", {
  mode: "ascii", // or "braille"
  width: 100,
  color: true,
  dither: true,
});
console.log(art);

// 2. Dedicated converters
const brailleArt = await convertImageToBraille("./photo.png", { width: 120, dither: true });
const classicAscii = await convertImageToAscii("./photo.png", { width: 80, invert: false });
```

---

## Project Structure

```text
src/
├── converters/
│   ├── braille.ts        # 2x4 Braille matrix renderer
│   └── ascii.ts          # Classic ASCII character ramp renderer with aspect ratio correction
├── utils/
│   ├── ansi.ts           # ANSI Truecolor escape codes & stripAnsi
│   ├── clipboard.ts      # Native Bun spawn + OSC 52 clipboard utility
│   └── dither.ts         # Floyd-Steinberg error diffusion algorithms
├── types.ts              # Shared TypeScript interfaces & types
├── index.ts              # Public library exports
└── cli.ts                # Interactive CLI runner
```

---

## Development & Testing

```bash
# Run tests
bun test

# Type check
bun run typecheck
```
