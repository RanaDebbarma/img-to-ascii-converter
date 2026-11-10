import { existsSync } from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { convertImageToBraille } from "./index";

interface CliOptions {
  imagePath: string;
  width: number;
  threshold: number;
  invert: boolean;
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

  return {
    options: {
      imagePath,
      width: widthArg ? parseInt(widthArg, 10) : undefined,
      threshold: thresholdArg ? parseInt(thresholdArg, 10) : undefined,
      invert: invert ? true : undefined,
    },
    // If no arguments at all, or --interactive passed, run in interactive mode
    isInteractive: isInteractive || (!imagePath && args.length === 0),
    hasHelp,
  };
}

function printHelp(): void {
  console.log(`
Usage:
  bun run cli.ts [image-path] [options]

Interactive Mode:
  bun start                      (prompts dynamically for image path, width, etc.)
  bun run cli.ts -i              (forces interactive prompt mode)

Options:
  --width=<number>        Target width in characters (default: 120)
  --threshold=<0-255>     Brightness cutoff threshold (default: 128)
  --invert                Invert light and dark pixels
  --interactive, -i       Prompt interactively for missing settings
  --help, -h              Show this help message

Examples:
  bun run cli.ts ./assets/dragon.jpg --width=100 --invert
  bun run cli.ts -i
`);
}

async function promptUserForInputs(existing: Partial<CliOptions>): Promise<CliOptions> {
  const rl = readline.createInterface({ input, output });

  const ask = async (promptText: string, defaultVal?: string): Promise<string> => {
    const answer = await rl.question(promptText);
    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : (defaultVal ?? "");
  };

  try {
    console.log("=== Image to ASCII / Braille Converter ===\n");

    let imagePath = existing.imagePath;
    while (!imagePath) {
      const selected = await ask("Enter image path [default: ./assets/dragon.jpg]: ", "./assets/dragon.jpg");
      if (existsSync(selected)) {
        imagePath = selected;
      } else {
        console.error(`File not found: "${selected}". Please enter a valid path.`);
      }
    }

    let width = existing.width;
    if (width === undefined) {
      const val = await ask("Enter target width in characters [default: 120]: ", "120");
      const parsed = parseInt(val, 10);
      width = Number.isFinite(parsed) && parsed > 0 ? parsed : 120;
    }

    let threshold = existing.threshold;
    if (threshold === undefined) {
      const val = await ask("Enter brightness threshold (0-255) [default: 128]: ", "128");
      const parsed = parseInt(val, 10);
      threshold = Number.isFinite(parsed) && parsed >= 0 && parsed <= 255 ? parsed : 128;
    }

    let invert = existing.invert;
    if (invert === undefined) {
      const val = await ask("Invert light/dark? (y/N) [default: N]: ", "n");
      invert = val.toLowerCase().startsWith("y");
    }

    console.log("");
    return { imagePath, width, threshold, invert };
  } finally {
    rl.close();
  }
}

async function main() {
  const { options: parsedOptions, isInteractive, hasHelp } = parseCliArgs();

  if (hasHelp) {
    printHelp();
    return;
  }

  let config: CliOptions;

  if (isInteractive) {
    config = await promptUserForInputs(parsedOptions);
  } else {
    config = {
      imagePath: parsedOptions.imagePath ?? "./assets/dragon.jpg",
      width: parsedOptions.width ?? 120,
      threshold: parsedOptions.threshold ?? 128,
      invert: parsedOptions.invert ?? false,
    };

    if (!existsSync(config.imagePath)) {
      console.error(`Error: File not found: "${config.imagePath}"`);
      process.exit(1);
    }
  }

  try {
    const result = await convertImageToBraille(config.imagePath, {
      width: config.width,
      threshold: config.threshold,
      invert: config.invert,
    });

    console.log(result);
  } catch (err) {
    console.error("Failed to convert image:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
