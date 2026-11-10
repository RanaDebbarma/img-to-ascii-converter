#!/usr/bin/env bun
import { existsSync } from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { convertImageToBraille, copyToClipboard } from "./index";

interface CliOptions {
  imagePath: string;
  width: number;
  threshold: number;
  invert: boolean;
  copy?: boolean;
}

// ANSI styling helpers for a clean, compact inline UI
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;

function parseCliArgs(): {
  options: Partial<CliOptions>;
  isInteractive: boolean;
  hasHelp: boolean;
} {
  const args = process.argv.slice(2);

  const hasHelp = args.includes("--help") || args.includes("-h");
  const isInteractive = args.includes("--interactive") || args.includes("-i");

  const imagePath = args.find((a) => !a.startsWith("--") && !a.startsWith("-"));
  const widthArg = args.find((a) => a.startsWith("--width="))?.split("=")[1];
  const thresholdArg = args.find((a) => a.startsWith("--threshold="))?.split("=")[1];
  const invert = args.includes("--invert");

  let copy: boolean | undefined = undefined;
  if (args.includes("--copy") || args.includes("-c")) {
    copy = true;
  } else if (args.includes("--no-copy")) {
    copy = false;
  }

  return {
    options: {
      imagePath,
      width: widthArg ? parseInt(widthArg, 10) : undefined,
      threshold: thresholdArg ? parseInt(thresholdArg, 10) : undefined,
      invert: invert ? true : undefined,
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

Interactive Mode:
  img2ascii                      (prompts for image path and settings)
  img2ascii -i                   (forces interactive prompt mode)

Options:
  --width=<number>        Target width in characters (default: 120)
  --threshold=<0-255>     Brightness cutoff threshold (default: 128)
  --invert                Invert light and dark pixels
  --copy, -c              Copy result to clipboard immediately
  --no-copy               Skip clipboard copy prompt
  --interactive, -i       Prompt interactively
  --help, -h              Show this help message

Examples:
  img2ascii
  img2ascii ./photo.png
  img2ascii ./photo.png --width=100 --copy
  img2ascii ./photo.png --invert
`);
}

async function promptInline(rl: readline.Interface, existing: Partial<CliOptions>): Promise<CliOptions> {
  console.log(`${bold("Image to ASCII / Braille Converter")}\n`);

  // 1. Image Path (mandatory: no hardcoded sample asset default)
  let imagePath = existing.imagePath;
  while (!imagePath) {
    const raw = await rl.question(`${cyan("?")} ${bold("Image path")}: `);
    // Strip quotes in case the path was dragged and dropped into terminal
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

  // 2. Width (optional, default: 120)
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

  // 3. Threshold (optional, default: 128)
  let threshold = existing.threshold;
  while (threshold === undefined) {
    const raw = await rl.question(
      `${cyan("?")} ${bold("Brightness threshold (0-255)")} ${dim("[128]")}: `
    );
    const trimmed = raw.trim();
    if (!trimmed) {
      threshold = 128;
      break;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 255) {
      threshold = parsed;
    } else {
      console.log(`  ${red("✖")} Please enter a number between 0 and 255.`);
    }
  }

  // 4. Invert (optional, default: N)
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
    width,
    threshold,
    invert,
    copy: existing.copy,
  };
}

async function main() {
  const { options: parsedOptions, isInteractive, hasHelp } = parseCliArgs();

  if (hasHelp) {
    printHelp();
    return;
  }

  let config: CliOptions;
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
      width: parsedOptions.width ?? 120,
      threshold: parsedOptions.threshold ?? 128,
      invert: parsedOptions.invert ?? false,
      copy: parsedOptions.copy,
    };

    if (!existsSync(config.imagePath)) {
      console.error(`${red("Error:")} File not found: "${config.imagePath}"`);
      process.exit(1);
    }
  }

  let result = "";
  try {
    result = await convertImageToBraille(config.imagePath, {
      width: config.width,
      threshold: config.threshold,
      invert: config.invert,
    });
  } catch (err) {
    console.error(`\n${red("Failed to convert image:")}`, err instanceof Error ? err.message : err);
    rl?.close();
    process.exit(1);
  }

  // Print generated ASCII art
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
      `${cyan("?")} ${bold("Copy ASCII art to clipboard? (y/N)")} ${dim("[N]")}: `
    );
    const trimmed = raw.trim().toLowerCase();
    shouldCopy = trimmed === "y" || trimmed === "yes";
  }

  rl?.close();

  if (shouldCopy) {
    await copyToClipboard(result);
    console.log(`${green("✔")} Copied to clipboard! Ready to paste.`);
  } else if (isInteractive) {
    console.log(`${dim("Done.")}`);
  }
}

main();
