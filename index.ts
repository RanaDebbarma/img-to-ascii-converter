import sharp from "sharp";
import { pixelsToBraille } from "./utils/braille-converter";

const IMAGE_PATH = "./assets/dragon.jpg";

const { data, info } = await sharp(IMAGE_PATH)
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

// console.log(info);
// console.log(data);

const height = info.height;
const width = info.width;

for (let y = 0; y < height; y += 4) {
  let row = [];
  for (let x = 0; x < width; x += 2) {
    // Read 8 pixels (2×4)
    // Generate one Braille character
    row.push(pixelsToBraille(x, y, width, data));
  }

  console.log(row.join(""));
}
