# img-to-ascii-converter

Convert images into Braille-based ASCII art in your terminal.

## Prerequisites

- [Bun](https://bun.com) runtime

## Installation

```bash
bun install
```

## Usage

Run with the default asset:
```bash
bun start
# or
bun run ascii-converter.ts
```

Run with custom image and options:
```bash
bun run ascii-converter.ts ./assets/dragon.jpg --width=100 --threshold=128 --invert
```

### Options

- `<image-path>`: Path to the image file (default: `./assets/dragon_head logo.png`)
- `--width=<number>`: Target image width in dots (default: `120`)
- `--threshold=<0-255>`: Brightness cutoff threshold (default: `128`)
- `--invert`: Invert light and dark pixels (useful for switching between dark/light terminal themes)

## Development

```bash
# Type check
bun run typecheck

# Format code
bun fmt
```
