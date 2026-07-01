import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shouldCheck = args.includes('--check');
const zipPath = args.find((arg) => arg !== '--check') ?? process.env.FUSION_BDF_ZIP;

if (!zipPath && !shouldCheck) {
  throw new Error('Usage: node scripts/build-text-glyph-atlas.mjs [--check] <fusion-12px-monospaced-bdf.zip>');
}

const fontVersion = '2026.05.07';
const sourceDigest = 'sha256:f3ac32b3c9088dd89d640d61e59b5c51c99fd2d4c63fdc94895de2f6c84ecd5b';
const bdfName = 'fusion-pixel-12px-monospaced-zh_hans.bdf';
const requiredCharacters = [
  ...'绿色靓仔拼豆图纸中文',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
  ...'-_/.,!?:;()[] ',
  ...'，。！？：；（）【】、',
];

function glyphKey(codePoint) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function parseBdf(text) {
  const glyphs = new Map();
  const blocks = text.split('\nSTARTCHAR ');

  for (const rawBlock of blocks) {
    const block = rawBlock.startsWith('STARTCHAR ') ? rawBlock : `STARTCHAR ${rawBlock}`;
    const encoding = block.match(/\nENCODING (-?\d+)\n/);
    const dwidth = block.match(/\nDWIDTH (-?\d+) (-?\d+)\n/);
    const bbx = block.match(/\nBBX (-?\d+) (-?\d+) (-?\d+) (-?\d+)\n/);
    const bitmap = block.match(/\nBITMAP\n([\s\S]*?)\nENDCHAR/);
    const name = block.match(/^STARTCHAR (.+)$/m);

    if (!encoding || !dwidth || !bbx || !bitmap) continue;
    const codePoint = Number(encoding[1]);
    if (codePoint < 0) continue;

    const width = Number(bbx[1]);
    const height = Number(bbx[2]);
    const bearingXCells = Number(bbx[3]);
    const bearingYCells = Number(bbx[4]);
    const rows = bitmap[1].trimEnd().split('\n').map((line) => {
      const bits = BigInt(`0x${line || '0'}`).toString(2).padStart(line.length * 4, '0');
      return bits.slice(0, width).padEnd(width, '0');
    });

    glyphs.set(codePoint, {
      codePoint,
      glyphName: name?.[1],
      width,
      height,
      advanceCells: Number(dwidth[1]),
      bearingXCells,
      bearingYCells,
      rows,
    });
  }

  return glyphs;
}

const outputPath = join(
  root,
  'src/features/text-grid-core/generated/fusion-12-zh-hans-mono.v2026.05.07.json',
);

function buildAtlas() {
  const actualSourceDigest = `sha256:${createHash('sha256').update(readFileSync(zipPath)).digest('hex')}`;
  if (actualSourceDigest !== sourceDigest) {
    throw new Error(`Unexpected source digest: ${actualSourceDigest}`);
  }

  const bdfText = execFileSync('unzip', ['-p', zipPath, bdfName], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const parsedGlyphs = parseBdf(bdfText);
  const selectedGlyphs = {};
  const uniqueCharacters = [...new Set(requiredCharacters)];

  for (const char of uniqueCharacters) {
    const codePoint = char.codePointAt(0);
    const glyph = parsedGlyphs.get(codePoint);
    if (!glyph) {
      throw new Error(`Missing glyph for ${char} (${glyphKey(codePoint)})`);
    }
    selectedGlyphs[glyphKey(codePoint)] = glyph;
  }

  const atlasWithoutDigest = {
    atlasId: 'fusion-12-zh-hans-mono',
    fontFamily: 'Fusion Pixel Font',
    fontVersion,
    locale: 'zh_hans',
    sourceFormat: 'bdf',
    baseCellHeight: 12,
    defaultLineHeightCells: 12,
    license: 'OFL-1.1',
    glyphs: selectedGlyphs,
    sourceDigest,
    generatedDigest: '',
  };

  const generatedDigest = `sha256:${createHash('sha256')
    .update(JSON.stringify({ ...atlasWithoutDigest, generatedDigest: '' }))
    .digest('hex')}`;
  return {
    atlas: { ...atlasWithoutDigest, generatedDigest },
    glyphCount: Object.keys(selectedGlyphs).length,
    generatedDigest,
  };
}

if (shouldCheck) {
  if (!existsSync(outputPath)) {
    throw new Error(`Missing generated atlas: ${outputPath}`);
  }
  if (!zipPath) {
    const currentAtlas = JSON.parse(readFileSync(outputPath, 'utf8'));
    const currentDigest = `sha256:${createHash('sha256')
      .update(JSON.stringify({ ...currentAtlas, generatedDigest: '' }))
      .digest('hex')}`;
    if (currentAtlas.generatedDigest !== currentDigest) {
      throw new Error(`Atlas generatedDigest mismatch: expected ${currentDigest}, got ${currentAtlas.generatedDigest}`);
    }
    console.log(`Verified committed atlas metadata: ${outputPath}`);
    console.log(`Glyphs: ${Object.keys(currentAtlas.glyphs ?? {}).length}`);
    console.log(`Digest: ${currentDigest}`);
    process.exit(0);
  }

  const { atlas, glyphCount, generatedDigest } = buildAtlas();
  const serializedAtlas = `${JSON.stringify(atlas, null, 2)}\n`;
  const currentAtlas = readFileSync(outputPath, 'utf8');
  if (currentAtlas !== serializedAtlas) {
    console.error(`Atlas is out of date: ${outputPath}`);
    console.error('Run npm run text-font:build -- <fusion-12px-monospaced-bdf.zip>');
    process.exit(1);
  }
  console.log(`Verified ${outputPath}`);
  console.log(`Glyphs: ${glyphCount}`);
  console.log(`Digest: ${generatedDigest}`);
  process.exit(0);
}

const { atlas, glyphCount, generatedDigest } = buildAtlas();
const serializedAtlas = `${JSON.stringify(atlas, null, 2)}\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, serializedAtlas);
console.log(`Generated ${outputPath}`);
console.log(`Glyphs: ${glyphCount}`);
console.log(`Digest: ${generatedDigest}`);
