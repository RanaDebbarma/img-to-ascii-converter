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
  // 1. Image Path (uses existing path as default if in a re-run loop)
  let imagePath = "";
  const defaultPath = existing.imagePath;
  const pathPrompt = defaultPath
    ? `${cyan("?")} ${bold("Image path")} ${dim(`[${defaultPath}]`)}: `
    : `${cyan("?")} ${bold("Image path")}: `;

  while (!imagePath) {
    const raw = await rl.question(pathPrompt);
    const selected = raw.trim().replace(/^['"]|['"]$/g, "") || defaultPath || "";
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
  const defaultMode = existing.mode ?? "braille";
  const rawMode = await rl.question(
    `${cyan("?")} ${bold("Render mode (braille / ascii)")} ${dim(`[${defaultMode}]`)}: `
  );
  const trimmedMode = rawMode.trim().toLowerCase();
  const mode: RenderMode = trimmedMode
    ? trimmedMode.startsWith("a")
      ? "ascii"
      : "braille"
    : defaultMode;

  // 3. Width (optional, default: 120 or previous)
  let width: number | undefined;
  const defaultWidth = existing.width ?? 120;
  while (width === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Target width in characters")} ${dim(`[${defaultWidth}]`)}: `
    );
    const trimmed = raw.trim();
    if (!trimmed) {
      width = defaultWidth;
      break;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      width = parsed;
    } else {
      console.log(`  ${red("✖")} Please enter a valid positive number.`);
    }
  }

  // 4. Color (optional, default: previous or N)
  const defaultColor = existing.color ? "Y" : "N";
  const rawColor = await rl.question(
    `${cyan("?")} ${bold("Enable color output? (y/N)")} ${dim(`[${defaultColor}]`)}: `
  );
  const trimmedColor = rawColor.trim().toLowerCase();
  const color =
    trimmedColor === ""
      ? existing.color ?? false
      : trimmedColor === "y" || trimmedColor === "yes";

  // 5. Dither (optional, default: previous or N)
  const defaultDither = existing.dither ? "Y" : "N";
  const rawDither = await rl.question(
    `${cyan("?")} ${bold("Apply dithering for smooth shading? (y/N)")} ${dim(`[${defaultDither}]`)}: `
  );
  const trimmedDither = rawDither.trim().toLowerCase();
  const dither =
    trimmedDither === ""
      ? existing.dither ?? false
      : trimmedDither === "y" || trimmedDither === "yes";

  // 6. Invert (optional, default: previous or N)
  const defaultInvert = existing.invert ? "Y" : "N";
  const rawInvert = await rl.question(
    `${cyan("?")} ${bold("Invert light/dark? (y/N)")} ${dim(`[${defaultInvert}]`)}: `
  );
  const trimmedInvert = rawInvert.trim().toLowerCase();
  const invert =
    trimmedInvert === ""
      ? existing.invert ?? false
      : trimmedInvert === "y" || trimmedInvert === "yes";

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

async function renderImage(config: CliConfig, rl?: readline.Interface): Promise<void> {
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
    return;
  }

  // Print generated art
  console.log("\n" + result + "\n");

  // Determine whether to copy to clipboard
  let shouldCopy = config.copy;

  if (shouldCopy === undefined && rl) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Copy output to clipboard? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    shouldCopy = trimmed === "y" || trimmed === "yes";
  }

  if (shouldCopy) {
    // Strip ANSI escape codes when copying to clipboard so it pastes cleanly everywhere
    const cleanArt = stripAnsi(result);
    await copyToClipboard(cleanArt);
    console.log(`${green("✔")} Copied to clipboard! Ready to paste.`);
  }
}

async function main() {
  const { options: parsedOptions, isInteractive, hasHelp } = parseCliArgs();

  if (hasHelp) {
    printHelp();
    return;
  }

  if (!isInteractive) {
    if (!parsedOptions.imagePath) {
      console.error(`${red("Error:")} Please specify an image path.`);
      console.error(`Usage: img2ascii <image-path> [options]`);
      process.exit(1);
    }

    const config: CliConfig = {
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

    await renderImage(config);
    return;
  }

  // Interactive session loop (keeps previous settings in memory for the duration of the session)
  const rl = readline.createInterface({ input, output });
  rl.on("SIGINT", () => {
    console.log("\nCancelled.");
    process.exit(0);
  });

  console.log(`${bold("Image to ASCII / Braille Converter")}\n`);

  let currentDefaults: Partial<CliConfig> = parsedOptions;
  let keepGoing = true;

  while (keepGoing) {
    const config = await promptInline(rl, currentDefaults);
    await renderImage(config, rl);

    const rawAgain = await rl.question(
      `\n${cyan("?")} ${bold("Adjust settings or convert another?")} ${dim("(y/N) [N]")}: `
    );
    const trimmedAgain = rawAgain.trim().toLowerCase();
    keepGoing = trimmedAgain === "y" || trimmedAgain === "yes";

    if (keepGoing) {
      currentDefaults = { ...config };
      console.log("\n" + dim("───────────────────────── Next Run ─────────────────────────") + "\n");
    }
  }

  rl.close();
  console.log(`${dim("Done.")}`);
}

main();
