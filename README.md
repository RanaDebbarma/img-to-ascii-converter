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
Simply run `bun start` without parameters to be interactively prompted for image path, width, threshold, and inversion:
```bash
bun start
# or
bun run cli.ts -i
```

### Direct Arguments Mode
Provide arguments directly via the command line:
```bash
bun run cli.ts ./assets/dragon.jpg --width=100 --threshold=128 --invert
```

### CLI Options

- `<image-path>`: Path to the image file (default: `./assets/dragon.jpg`)
- `--width=<number>`: Target image width in characters (default: `120`)
- `--threshold=<0-255>`: Brightness cutoff threshold (default: `128`)
- `--invert`: Invert light and dark pixels (useful for switching between dark/light terminal themes)
- `--copy`, `-c`: Copy output to clipboard immediately
- `--no-copy`: Skip copying output to clipboard
- `--interactive`, `-i`: Force dynamic prompts with interactive TUI
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
