import sharp from "sharp";
import { pixelsToBraille } from "./utils/braille-converter";

// Parse basic command-line arguments
const args = process.argv.slice(2);
const imagePath = args.find((a) => !a.startsWith("--")) ?? "./assets/dragon.jpg";

const widthArg = args.find((a) => a.startsWith("--width="))?.split("=")[1];
const targetWidth = widthArg ? parseInt(widthArg, 10) : 120;

const thresholdArg = args.find((a) => a.startsWith("--threshold="))?.split("=")[1];
const threshold = thresholdArg ? parseInt(thresholdArg, 10) : 128;

const invert = args.includes("--invert");

// Load and process image
const { data, info } = await sharp(imagePath)
  .flatten({ background: { r: 255, g: 255, b: 255 } }) // Handle transparent backgrounds
  .resize({
    width: targetWidth,
    withoutEnlargement: true,
  })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;

for (let y = 0; y < height; y += 4) {
  const row: string[] = [];
  for (let x = 0; x < width; x += 2) {
    row.push(
      pixelsToBraille(x, y, width, height, data, {
        threshold,
        invert,
      }),
    );
  }

  console.log(row.join(""));
}
