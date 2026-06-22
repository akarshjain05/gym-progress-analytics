const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, 'frontend', 'icons');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function roundRect(ctx, x, y, w, h, r) {
  let tl, tr, br, bl;
  if (typeof r === 'object') { tl=r.tl||0; tr=r.tr||0; br=r.br||0; bl=r.bl||0; }
  else { tl=tr=br=bl=r; }
  ctx.beginPath();
  ctx.moveTo(x+tl, y);
  ctx.lineTo(x+w-tr, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+tr);
  ctx.lineTo(x+w, y+h-br);
  ctx.quadraticCurveTo(x+w, y+h, x+w-br, y+h);
  ctx.lineTo(x+bl, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-bl);
  ctx.lineTo(x, y+tl);
  ctx.quadraticCurveTo(x, y, x+tl, y);
  ctx.closePath();
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;
  const R = s * 0.22;

  // Background
  ctx.fillStyle = '#1e2327';
  roundRect(ctx, 0, 0, s, s, R);
  ctx.fill();

  const centerY = s * 0.50;
  const shaftH = s * 0.05;
  const shaftY = centerY - shaftH / 2;
  const plateW = s * 0.085;
  const plateH = s * 0.38;
  const plateR = s * 0.018;
  const leftPlateX = s * 0.13;
  const rightPlateX = s - leftPlateX - plateW;
  const collarW = s * 0.038;
  const collarH = s * 0.22;
  const leftCollarX = leftPlateX + plateW + s * 0.008;
  const rightCollarX = rightPlateX - collarW - s * 0.008;
  const sleeveX = leftCollarX + collarW;
  const sleeveW = rightCollarX - sleeveX;

  // Full shaft (gold)
  ctx.fillStyle = '#c9a84c';
  roundRect(ctx, s*0.12, shaftY, s*0.76, shaftH, shaftH/2);
  ctx.fill();

  // Sleeve highlight
  ctx.fillStyle = '#e0bc60';
  roundRect(ctx, sleeveX, shaftY, sleeveW, shaftH, shaftH/2);
  ctx.fill();

  // Plates
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, leftPlateX, centerY-plateH/2, plateW, plateH, plateR);
  ctx.fill();
  roundRect(ctx, rightPlateX, centerY-plateH/2, plateW, plateH, plateR);
  ctx.fill();

  // Plate shine
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, leftPlateX, centerY-plateH/2, plateW, plateH*0.4, plateR);
  ctx.fill();
  roundRect(ctx, rightPlateX, centerY-plateH/2, plateW, plateH*0.4, plateR);
  ctx.fill();

  // Collars
  ctx.fillStyle = '#a07830';
  roundRect(ctx, leftCollarX, centerY-collarH/2, collarW, collarH, s*0.008);
  ctx.fill();
  roundRect(ctx, rightCollarX, centerY-collarH/2, collarW, collarH, s*0.008);
  ctx.fill();

  // Collar highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, leftCollarX, centerY-collarH/2, collarW, collarH*0.45, s*0.008);
  ctx.fill();
  roundRect(ctx, rightCollarX, centerY-collarH/2, collarW, collarH*0.45, s*0.008);
  ctx.fill();

  // Bottom red accent (rounded bottom corners only)
  const barH = s * 0.048;
  const barY = s - barH;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(s, barY);
  ctx.lineTo(s, s - R);
  ctx.quadraticCurveTo(s, s, s - R, s);
  ctx.lineTo(R, s);
  ctx.quadraticCurveTo(0, s, 0, s - R);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

for (const size of SIZES) {
  const canvas = drawIcon(size);
  const out = path.join(OUTPUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`✓ icon-${size}.png`);
}
console.log('\n✅ All icons generated in frontend/icons/');
