#!/usr/bin/env bun
import { existsSync } from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { convertImage, copyToClipboard, stripAnsi } from "./index";
import { cyan, dim, bold, green, red } from "./utils/ansi";
import type { RenderMode } from "./types";

interface CliConfig {
  imagePath: string;
  mode: RenderMode;
  width: number;
  threshold: number;
  invert: boolean;
  dither: boolean;
  color: boolean;
  copy?: boolean;
}

function parseCliArgs(): {
  options: Partial<CliConfig>;
  isInteractive: boolean;
  hasHelp: boolean;
} {
  const args = process.argv.slice(2);

  const hasHelp = args.includes("--help") || args.includes("-h");
  const isInteractive = args.includes("--interactive") || args.includes("-i");

  const imagePath = args.find((a) => !a.startsWith("--") && !a.startsWith("-"));

  // Mode: --mode=ascii / --mode=braille, or flags --ascii / --braille
  let mode: RenderMode | undefined = undefined;
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1]?.toLowerCase();
  if (modeArg === "ascii" || args.includes("--ascii")) {
    mode = "ascii";
  } else if (modeArg === "braille" || args.includes("--braille")) {
    mode = "braille";
  }

  const widthArg = args.find((a) => a.startsWith("--width="))?.split("=")[1];
  const thresholdArg = args.find((a) => a.startsWith("--threshold="))?.split("=")[1];
  const invert = args.includes("--invert");
  const dither = args.includes("--dither") ? true : args.includes("--no-dither") ? false : undefined;
  const color =
    args.includes("--color") || args.includes("-C")
      ? true
      : args.includes("--no-color")
        ? false
        : undefined;

  let copy: boolean | undefined = undefined;
  if (args.includes("--copy") || args.includes("-c")) {
    copy = true;
  } else if (args.includes("--no-copy")) {
    copy = false;
  }

  return {
    options: {
      imagePath,
      mode,
      width: widthArg ? parseInt(widthArg, 10) : undefined,
      threshold: thresholdArg ? parseInt(thresholdArg, 10) : undefined,
      invert: invert ? true : undefined,
      dither,
      color,
      copy,
    },
    // If no image path was passed, enter interactive mode to prompt for it
    isInteractive: isInteractive || !imagePath,
    hasHelp,
  };
}

function printHelp(): void {
  console.log(`
Usage:
  img2ascii [image-path] [options]

Modes:
  --braille               Use high-resolution 2x4 Braille dots (default)
  --ascii                 Use classic ASCII density characters (@%#*+=-:. )
  --mode=<braille|ascii>  Select rendering mode explicitly

Options:
  --width=<number>        Target width in characters (default: 120)
  --color, -C             Enable 24-bit Truecolor terminal rendering
  --no-color              Disable colors (default: monochrome)
  --dither                Apply Floyd-Steinberg dithering for smooth shading
  --no-dither             Disable dithering (default: off)
  --threshold=<0-255>     Brightness cutoff threshold for Braille (default: 128)
  --invert                Invert light and dark pixels
  --copy, -c              Copy result to clipboard immediately
  --no-copy               Skip clipboard copy prompt
  --interactive, -i       Prompt interactively
  --help, -h              Show this help message

Examples:
  img2ascii photo.png
  img2ascii photo.png --ascii
  img2ascii photo.png --ascii --color
  img2ascii photo.png --dither --color --copy
`);
}

async function promptInline(rl: readline.Interface, existing: Partial<CliConfig>): Promise<CliConfig> {
  console.log(`${bold("Image to ASCII / Braille Converter")}\n`);

  // 1. Image Path
  let imagePath = existing.imagePath;
  while (!imagePath) {
    const raw = await rl.question(`${cyan("?")} ${bold("Image path")}: `);
    const selected = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!selected) {
      console.log(`  ${red("✖")} Please enter an image path.`);
      continue;
    }
    if (existsSync(selected)) {
      imagePath = selected;
    } else {
      console.log(`  ${red("✖")} File not found: "${selected}". Please enter a valid path.`);
    }
  }

  // 2. Render Mode (braille / ascii)
  let mode = existing.mode;
  if (!mode) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Render mode (braille / ascii)")} ${dim("[braille]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    mode = trimmed.startsWith("a") ? "ascii" : "braille";
  }

  // 3. Width (optional, default: 120)
  let width = existing.width;
  while (width === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Target width in characters")} ${dim("[120]")}: `
    );
    const trimmed = raw.trim();
    if (!trimmed) {
      width = 120;
      break;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      width = parsed;
    } else {
      console.log(`  ${red("✖")} Please enter a valid positive number.`);
    }
  }

  // 4. Color (optional, default: N)
  let color = existing.color;
  if (color === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Enable color output? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    color = trimmed === "y" || trimmed === "yes";
  }

  // 5. Dither (optional, default: N)
  let dither = existing.dither;
  if (dither === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Apply dithering for smooth shading? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    dither = trimmed === "y" || trimmed === "yes";
  }

  // 6. Invert (optional, default: N)
  let invert = existing.invert;
  if (invert === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Invert light/dark? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    invert = trimmed === "y" || trimmed === "yes";
  }

  return {
    imagePath,
    mode,
    width,
    threshold: existing.threshold ?? 128,
    invert,
    dither,
    color,
    copy: existing.copy,
  };
}

async function main() {
  const { options: parsedOptions, isInteractive, hasHelp } = parseCliArgs();

  if (hasHelp) {
    printHelp();
    return;
  }

  let config: CliConfig;
  let rl: readline.Interface | undefined;

  if (isInteractive) {
    rl = readline.createInterface({ input, output });
    rl.on("SIGINT", () => {
      console.log("\nCancelled.");
      process.exit(0);
    });

    config = await promptInline(rl, parsedOptions);
  } else {
    if (!parsedOptions.imagePath) {
      console.error(`${red("Error:")} Please specify an image path.`);
      console.error(`Usage: img2ascii <image-path> [options]`);
      process.exit(1);
    }

    config = {
      imagePath: parsedOptions.imagePath,
      mode: parsedOptions.mode ?? "braille",
      width: parsedOptions.width ?? 120,
      threshold: parsedOptions.threshold ?? 128,
      invert: parsedOptions.invert ?? false,
      dither: parsedOptions.dither ?? false,
      color: parsedOptions.color ?? false,
      copy: parsedOptions.copy,
    };

    if (!existsSync(config.imagePath)) {
      console.error(`${red("Error:")} File not found: "${config.imagePath}"`);
      process.exit(1);
    }
  }

  let result = "";
  try {
    result = await convertImage(config.imagePath, {
      mode: config.mode,
      width: config.width,
      threshold: config.threshold,
      invert: config.invert,
      dither: config.dither,
      color: config.color,
    });
  } catch (err) {
    console.error(`\n${red("Failed to convert image:")}`, err instanceof Error ? err.message : err);
    rl?.close();
    process.exit(1);
  }

  // Print generated art
  console.log("\n" + result + "\n");

  // Determine whether to copy to clipboard
  let shouldCopy = config.copy;

  if (shouldCopy === undefined && (isInteractive || process.stdout.isTTY)) {
    if (!rl) {
      rl = readline.createInterface({ input, output });
      rl.on("SIGINT", () => {
        console.log("\nCancelled.");
        process.exit(0);
      });
    }

    const raw = await rl.question(
      `${cyan("?")} ${bold("Copy output to clipboard? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    shouldCopy = trimmed === "y" || trimmed === "yes";
  }

  rl?.close();

  if (shouldCopy) {
    // Strip ANSI escape codes when copying to clipboard so it pastes cleanly everywhere
    const cleanArt = stripAnsi(result);
    await copyToClipboard(cleanArt);
    console.log(`${green("✔")} Copied to clipboard! Ready to paste.`);
  } else if (isInteractive) {
    console.log(`${dim("Done.")}`);
  }
}

main();

