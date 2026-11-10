import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { convertImageToBraille, copyToClipboard } from "./index";

interface CliOptions {
  imagePath: string;
  width: number;
  threshold: number;
  invert: boolean;
  copy?: boolean;
}

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
    // Interactive by default if no arguments are provided, or if --interactive is passed
    isInteractive: isInteractive || (args.length === 0 && !imagePath),
    hasHelp,
  };
}

function printHelp(): void {
  console.log(`
Usage:
  bun run cli.ts [image-path] [options]

Interactive Mode:
  bun start                      (TUI mode: prompts dynamically for all inputs)
  bun run cli.ts -i              (forces interactive prompt mode)

Options:
  --width=<number>        Target width in characters (default: 120)
  --threshold=<0-255>     Brightness cutoff threshold (default: 128)
  --invert                Invert light and dark pixels
  --copy, -c              Copy result to clipboard immediately
  --no-copy               Skip clipboard copy prompt
  --interactive, -i       Prompt interactively with TUI
  --help, -h              Show this help message

Examples:
  bun start
  bun run cli.ts ./assets/dragon.jpg --width=100 --copy
  bun run cli.ts ./assets/dragon.jpg --invert
`);
}

async function runInteractiveTui(existing: Partial<CliOptions>): Promise<CliOptions> {
  p.intro("🖼️  Image to ASCII / Braille Converter");

  // 1. Image Path
  let imagePath = existing.imagePath;
  if (!imagePath) {
    const inputPath = await p.text({
      message: "Enter image path [default: ./assets/dragon.jpg]:",
      placeholder: "./assets/dragon.jpg",
      defaultValue: "./assets/dragon.jpg",
      validate(value) {
        const target = (value ?? "").trim() || "./assets/dragon.jpg";
        if (!existsSync(target)) {
          return `File not found: "${target}". Please check the path.`;
        }
      },
    });

    if (p.isCancel(inputPath)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    imagePath = (inputPath ?? "").trim() || "./assets/dragon.jpg";
  }

  // 2. Width
  let width = existing.width;
  if (width === undefined) {
    const inputWidth = await p.text({
      message: "Target width in characters [default: 120]:",
      placeholder: "120",
      defaultValue: "120",
      validate(value) {
        const str = (value ?? "").trim();
        if (!str) return; // Optional: empty input falls back to default
        const parsed = parseInt(str, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          return "Please enter a valid positive number.";
        }
      },
    });

    if (p.isCancel(inputWidth)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    const trimmed = (inputWidth ?? "").trim();
    width = trimmed.length > 0 ? parseInt(trimmed, 10) : 120;
  }

  // 3. Threshold
  let threshold = existing.threshold;
  if (threshold === undefined) {
    const inputThreshold = await p.text({
      message: "Brightness cutoff threshold (0-255) [default: 128]:",
      placeholder: "128",
      defaultValue: "128",
      validate(value) {
        const str = (value ?? "").trim();
        if (!str) return; // Optional: empty input falls back to default
        const parsed = parseInt(str, 10);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > 255) {
          return "Please enter a number between 0 and 255.";
        }
      },
    });

    if (p.isCancel(inputThreshold)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    const trimmed = (inputThreshold ?? "").trim();
    threshold = trimmed.length > 0 ? parseInt(trimmed, 10) : 128;
  }

  // 4. Invert
  let invert = existing.invert;
  if (invert === undefined) {
    const inputInvert = await p.confirm({
      message: "Invert light and dark pixels?",
      initialValue: false,
    });

    if (p.isCancel(inputInvert)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    invert = Boolean(inputInvert);
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

  if (isInteractive) {
    config = await runInteractiveTui(parsedOptions);
  } else {
    config = {
      imagePath: parsedOptions.imagePath ?? "./assets/dragon.jpg",
      width: parsedOptions.width ?? 120,
      threshold: parsedOptions.threshold ?? 128,
      invert: parsedOptions.invert ?? false,
      copy: parsedOptions.copy,
    };

    if (!existsSync(config.imagePath)) {
      console.error(`Error: File not found: "${config.imagePath}"`);
      process.exit(1);
    }
  }

  // Convert image with a spinner if in interactive mode
  let result = "";
  if (isInteractive) {
    const s = p.spinner();
    s.start("Generating Braille ASCII art...");
    try {
      result = await convertImageToBraille(config.imagePath, {
        width: config.width,
        threshold: config.threshold,
        invert: config.invert,
      });
      s.stop("Conversion complete!");
    } catch (err) {
      s.stop("Conversion failed.");
      p.cancel(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else {
    try {
      result = await convertImageToBraille(config.imagePath, {
        width: config.width,
        threshold: config.threshold,
        invert: config.invert,
      });
    } catch (err) {
      console.error("Failed to convert image:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  // Print the generated ASCII art
  console.log("\n" + result + "\n");

  // Determine whether to copy to clipboard
  let shouldCopy = config.copy;

  // If copy wasn't explicitly enabled/disabled via flags, ask via TUI if stdout is interactive
  if (shouldCopy === undefined) {
    if (isInteractive || process.stdout.isTTY) {
      const copyChoice = await p.confirm({
        message: "📋 Copy ASCII art to clipboard?",
        initialValue: true,
      });

      if (!p.isCancel(copyChoice)) {
        shouldCopy = Boolean(copyChoice);
      }
    }
  }

  if (shouldCopy) {
    await copyToClipboard(result);
    if (isInteractive) {
      p.outro("✨ Copied to clipboard! Ready to paste.");
    } else {
      console.log("✔ Copied to clipboard!");
    }
  } else if (isInteractive) {
    p.outro("Done! Enjoy your ASCII art.");
  }
}

main();
