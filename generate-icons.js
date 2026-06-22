/**
 * generate-icons.js
 *
 * Run this ONCE locally to generate all required PWA icon PNGs.
 *
 * Prerequisites:
 *   npm install canvas
 *
 * Usage:
 *   node generate-icons.js
 *
 * Output:
 *   frontend/icons/icon-{size}.png  for all required sizes
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, 'frontend', 'icons');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const bg = '#1e2327';
  const red = '#c0392b';
  const gold = '#d4a017';
  const textColor = '#e8e0d5';

  // Background
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // Red accent bar at top
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, size, size * 0.08);
  // Round top corners of bar
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size * 0.08, [size * 0.18, size * 0.18, 0, 0]);
  ctx.fill();

  // Barbell shaft (horizontal line)
  const barY = size * 0.52;
  const barH = size * 0.06;
  ctx.fillStyle = gold;
  ctx.fillRect(size * 0.05, barY - barH / 2, size * 0.9, barH);

  // Left plate
  const plateW = size * 0.10;
  const plateH = size * 0.32;
  ctx.fillStyle = red;
  ctx.fillRect(size * 0.08, barY - plateH / 2, plateW, plateH);

  // Right plate
  ctx.fillRect(size * 0.82, barY - plateH / 2, plateW, plateH);

  // Collar (inner)
  ctx.fillStyle = gold;
  const collarW = size * 0.04;
  const collarH = size * 0.20;
  ctx.fillRect(size * 0.20, barY - collarH / 2, collarW, collarH);
  ctx.fillRect(size * 0.76, barY - collarH / 2, collarW, collarH);

  // "IL" text (IRONLOG abbreviation)
  const fontSize = Math.round(size * 0.22);
  ctx.fillStyle = textColor;
  ctx.font = `900 ${fontSize}px "Oswald", "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IL', size / 2, size * 0.77);

  return canvas;
}

for (const size of SIZES) {
  const canvas = drawIcon(size);
  const out = path.join(OUTPUT_DIR, `icon-${size}.png`);
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(out, buf);
  console.log(`✓ Generated icon-${size}.png`);
}

console.log('\nAll icons generated in frontend/icons/');
console.log('Also create frontend/icons/screenshot-wide.png (1280×720)');
console.log('and frontend/icons/screenshot-narrow.png (750×1334) manually,');
console.log('or take screenshots of your deployed site.');
