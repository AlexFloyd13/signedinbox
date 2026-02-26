#!/usr/bin/env node
/**
 * Generates PNG icons from icon.svg using the `sharp` package.
 * Run: npm run icons (from the extension/ directory)
 */

import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, "icon.svg"));

const sizes = [16, 48, 128];

await Promise.all(
  sizes.map(size =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(__dirname, `icon${size}.png`))
      .then(() => console.log(`✓ icon${size}.png`))
  )
);

console.log("Icons generated.");
